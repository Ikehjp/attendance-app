const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, transaction } = require('../config/database');
const JWTUtil = require('../utils/jwt');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

/**
 * 認証サービス（マルチテナント対応版）
 */
class AuthService {
  /**
   * ユーザーログイン
   */
  static async login(email, password) {
    try {
      logger.info('ログイン試行', { email });

      const users = await query(
        'SELECT id, name, email, password, student_id, organization_id, role FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        logger.warn('ログイン失敗 - ユーザーが見つかりません', { email });
        return {
          success: false,
          message: 'メールアドレスまたはパスワードが正しくありません'
        };
      }

      const user = users[0];

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn('ログイン失敗 - パスワードが一致しません', { email });
        return {
          success: false,
          message: 'メールアドレスまたはパスワードが正しくありません'
        };
      }

      let studentId = user.student_id;
      let tokenPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      if (user.role === 'student' && studentId) {
        tokenPayload.student_id = studentId;
      }

      // ▼▼▼ 修正: JWTUtilを使ってトークンを生成する形に戻す ▼▼▼
      // これにより、jwt.jsで設定した issuer/audience が正しく付与されます
      const token = JWTUtil.generateToken(tokenPayload);
      console.log("🎟️ [DEBUG] 生成されたトークン:", token);
      // ▲▲▲ 修正完了 ▲▲▲

      logger.info('Token generated:', { tokenLength: token.length });

      logger.info('ログイン成功', {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id
      });

      return {
        success: true,
        message: 'ログインに成功しました',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            studentId: studentId,
            organizationId: user.organization_id,
            role: user.role
          }
        }
      };
    } catch (error) {
      logger.error('ログインエラー:', error.message);
      return {
        success: false,
        message: 'サーバーエラーが発生しました'
      };
    }
  }

  /**
   * ユーザー新規登録（SaaS型サインアップ対応）
   */
  static async register(userData) {
    let connection;
    try {
      const { name, email, password, role, organizationName, joinCode } = userData;

      logger.info('=== 新規登録開始 ===', {
        name,
        email,
        role,
        organizationName: organizationName || '(なし)',
        joinCode: joinCode ? `${joinCode.substring(0, 10)}...` : '(なし)',
        hasPassword: !!password
      });

      // 1. メールアドレスの重複チェック
      logger.info('ステップ1: メールアドレス重複チェック', { email });
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        logger.warn('メールアドレス重複エラー', {
          email,
          existingUserId: existingUsers[0].id
        });
        return {
          success: false,
          message: 'このメールアドレスは既に使用されています'
        };
      }
      logger.info('メールアドレスOK（重複なし）');

      // パスワードハッシュ化
      logger.info('ステップ2: パスワードハッシュ化');
      const hashedPassword = await bcrypt.hash(password, 10);
      logger.info('パスワードハッシュ化完了', {
        originalLength: password.length,
        hashedLength: hashedPassword.length
      });

      // トランザクション開始
      logger.info('ステップ3: トランザクション開始');
      connection = await transaction.begin();
      logger.info('トランザクション接続取得完了');

      let organizationId;
      let studentId = userData.studentId || null;

      // 2. ロールごとの処理
      logger.info('ステップ4: ロール別処理', { role });

      if (role === 'owner') {
        // --- オーナー登録（新規組織作成） ---
        logger.info('オーナー登録フロー開始', { organizationName });

        if (!organizationName) {
          logger.error('組織名が未指定');
          await transaction.rollback(connection);
          return { success: false, message: '組織名は必須です' };
        }

        // 組織作成
        logger.info('組織を作成中...', { organizationName });
        const [orgResult] = await connection.query(
          'INSERT INTO organizations (name, type, is_active, created_at) VALUES (?, ?, 1, NOW())',
          [organizationName, 'school'] // typeはデフォルトでschool
        );
        organizationId = orgResult.insertId;
        logger.info('組織作成完了', {
          organizationId,
          organizationName,
          insertId: orgResult.insertId,
          affectedRows: orgResult.affectedRows
        });

        // 生徒用参加コードの生成（簡易的）
        const newJoinCode = `SCHOOL-${organizationId}-${Math.floor(1000 + Math.random() * 9000)}`;
        logger.info('参加コード生成', { joinCode: newJoinCode });

        await connection.query(
          'UPDATE organizations SET student_join_code = ? WHERE id = ?',
          [newJoinCode, organizationId]
        );
        logger.info('参加コード設定完了');

      } else if (role === 'student') {
        // --- 生徒登録（既存組織に参加） ---
        logger.info('生徒登録フロー開始', { joinCode });

        if (!joinCode) {
          logger.error('参加コードが未指定');
          await transaction.rollback(connection);
          return { success: false, message: '参加コードは必須です' };
        }

        // 参加コードから組織を特定
        logger.info('参加コードで組織検索中...', { joinCode });
        const [orgs] = await connection.query(
          'SELECT id FROM organizations WHERE student_join_code = ? AND is_active = 1',
          [joinCode]
        );

        if (orgs.length === 0) {
          logger.warn('無効な参加コード', {
            joinCode,
            searchResult: '組織が見つかりません'
          });
          await transaction.rollback(connection);
          return { success: false, message: '無効な参加コードです' };
        }
        organizationId = orgs[0].id;
        logger.info('組織特定完了', {
          organizationId,
          joinCode
        });

      } else {
        // --- 教師などは招待のみ ---
        logger.warn('招待のみ許可のロールで登録試行', { role });
        await transaction.rollback(connection);
        return {
          success: false,
          message: '教師アカウントは管理者からの招待でのみ作成可能です'
        };
      }

      // 3. ユーザー作成
      logger.info('ステップ5: ユーザーレコード作成', {
        name,
        email,
        role,
        organizationId,
        studentId
      });

      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, password, role, organization_id, student_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [name, email, hashedPassword, role, organizationId, studentId]
      );
      const userId = userResult.insertId;

      logger.info('ユーザーレコード作成完了', {
        userId,
        insertId: userResult.insertId,
        affectedRows: userResult.affectedRows
      });

      // オーナーの場合、組織のowner_idを更新
      if (role === 'owner') {
        logger.info('組織のowner_id更新中...', { userId, organizationId });
        await connection.query(
          'UPDATE organizations SET owner_id = ? WHERE id = ?',
          [userId, organizationId]
        );
        logger.info('組織のowner_id更新完了');
      }

      // トランザクションコミット
      logger.info('ステップ6: トランザクションコミット');
      await transaction.commit(connection);
      logger.info('トランザクションコミット完了');

      // 4. トークン生成
      logger.info('ステップ7: JWTトークン生成');
      const tokenPayload = {
        id: userId,
        email: email,
        role: role
      };
      if (role === 'student' && studentId) {
        tokenPayload.student_id = studentId;
      }

      // ▼▼▼ 修正: ここも JWTUtil に戻す ▼▼▼
      const token = JWTUtil.generateToken(tokenPayload);
      // ▲▲▲ 修正完了 ▲▲▲

      logger.info('新規登録成功', {
        userId,
        email,
        role,
        organizationId,
        studentId,
        tokenLength: token.length
      });

      logger.info('=== 新規登録完了 ===');

      return {
        success: true,
        message: 'アカウントが作成されました',
        data: {
          token,
          user: {
            id: userId,
            name,
            email,
            role,
            organizationId,
            studentId
          }
        }
      };

    } catch (error) {
      if (connection) {
        logger.error('トランザクションロールバック実行');
        await transaction.rollback(connection);
      }

      logger.error('=== 新規登録エラー ===', {
        errorMessage: error.message,
        errorCode: error.code,
        errorErrno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        errorStack: error.stack,
        userData: {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          hasPassword: !!userData.password,
          organizationName: userData.organizationName,
          joinCode: userData.joinCode ? `${userData.joinCode.substring(0, 10)}...` : undefined
        }
      });

      return {
        success: false,
        message: 'サーバーエラーが発生しました'
      };
    }
  }

  /**
   * トークンからユーザー情報を取得
   */
  static async getUserFromToken(token) {
    try {
      const payload = JWTUtil.verifyToken(token);

      const users = await query(
        'SELECT id, name, email, student_id, organization_id, role FROM users WHERE id = ?',
        [payload.id]
      );

      if (users.length === 0) {
        logger.warn('トークンからユーザーが見つかりません', { userId: payload.id });
        return null;
      }

      const user = users[0];

      if (user.role !== payload.role) {
        logger.warn('トークンのロールとDBのロールが不一致です', { userId: payload.id });
        return null;
      }

      let studentId = user.student_id;
      if (user.role === 'student') {
        if (payload.student_id && payload.student_id !== user.student_id) {
          logger.warn('トークンの学生IDとDBの学生IDが不一致です', { userId: payload.id });
          return null;
        }
        studentId = payload.student_id || user.student_id;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: studentId,
        organizationId: user.organization_id,
        role: user.role
      };
    } catch (error) {
      logger.warn('トークン検証エラー:', error.message);
      return null;
    }
  }

  // ... (changePassword, updateProfile はそのままでOK) ...
  
  static async changePassword(userId, currentPassword, newPassword) {
      // (省略:元のコードのまま)
      try {
        const users = await query(
          'SELECT password FROM users WHERE id = ?',
          [userId]
        );
  
        if (users.length === 0) {
          return {
            success: false,
            message: 'ユーザーが見つかりません'
          };
        }
  
        const user = users[0];
  
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return {
            success: false,
            message: '現在のパスワードが正しくありません'
          };
        }
  
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
        await query(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedNewPassword, userId]
        );
  
        logger.info('パスワード変更成功', { userId });
  
        return {
          success: true,
          message: 'パスワードが変更されました'
        };
      } catch (error) {
        logger.error('パスワード変更エラー:', error.message);
        return {
          success: false,
          message: 'サーバーエラーが発生しました'
        };
      }
    }
  
    static async updateProfile(userId, updateData) {
      // (省略:元のコードのまま)
      logger.info('=== プロフィール更新開始 ===', { userId, updateData });

    try {
      const allowedFields = ['name', 'email', 'department', 'student_id'];
      const updateFields = [];
      const updateValues = [];

      logger.info('許可フィールドチェック中', { allowedFields, receivedFields: Object.keys(updateData) });

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
          logger.info(`フィールド追加: ${field}`, { value: updateData[field] });
        }
      }

      if (updateFields.length === 0) {
        logger.warn('更新データなし', { userId, updateData });
        return {
          success: false,
          message: '更新するデータがありません'
        };
      }

      logger.info('更新フィールド確定', { updateFields, updateValues });

      // メールアドレスの重複チェック
      if (updateData.email) {
        logger.info('メールアドレス重複チェック', { email: updateData.email });
        const existingEmail = await query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [updateData.email, userId]
        );

        if (existingEmail.length > 0) {
          logger.warn('メールアドレス重複', { email: updateData.email, existingUserId: existingEmail[0].id });
          return {
            success: false,
            message: 'このメールアドレスは既に使用されています'
          };
        }
        logger.info('メールアドレス重複なし');
      }

      // 学生IDの変更がある場合、重複チェックと整合性確認
      if (updateData.student_id) {
        logger.info('学生ID更新処理開始', { newStudentId: updateData.student_id });

        // 現在のユーザー情報を取得
        const currentUser = await query(
          'SELECT student_id, role FROM users WHERE id = ?',
          [userId]
        );

        if (currentUser.length === 0) {
          logger.error('ユーザーが見つからない', { userId });
          return { success: false, message: 'ユーザーが見つかりません' };
        }

        const oldStudentId = currentUser[0].student_id;
        const userRole = currentUser[0].role;
        logger.info('現在のユーザー情報', { oldStudentId, userRole });

        // 学生ロールの場合のみ学生IDを更新可能
        if (userRole !== 'student') {
          logger.warn('学生ロール以外で学生ID変更試行', { userId, userRole });
          return {
            success: false,
            message: '学生IDは学生ロールのユーザーのみが設定・変更できます'
          };
        }

        // 新しい学生IDが他のユーザーに使われていないかチェック
        logger.info('学生ID重複チェック', { studentId: updateData.student_id });
        const existingStudentId = await query(
          'SELECT id FROM users WHERE student_id = ? AND id != ?',
          [updateData.student_id, userId]
        );

        if (existingStudentId.length > 0) {
          logger.warn('学生ID重複', { studentId: updateData.student_id, existingUserId: existingStudentId[0].id });
          return {
            success: false,
            message: 'この学生IDは既に使用されています'
          };
        }
        logger.info('学生ID重複なし');

        // studentsテーブルにレコードがあるか確認
        const existingStudent = await query(
          'SELECT student_id FROM students WHERE student_id = ?',
          [updateData.student_id]
        );
        logger.info('studentsテーブルチェック', { exists: existingStudent.length > 0 });

        // studentsテーブルに新しいIDのレコードがなければ作成
        if (existingStudent.length === 0) {
          // 古いstudent_idのレコードを更新するか、新規作成するか判断
          if (oldStudentId) {
            // 古いIDのレコードがあれば更新
            const oldStudent = await query(
              'SELECT student_id FROM students WHERE student_id = ?',
              [oldStudentId]
            );
            if (oldStudent.length > 0) {
              // 古いレコードの学生IDを更新
              await query(
                'UPDATE students SET student_id = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
                [updateData.student_id, oldStudentId]
              );
              logger.info('studentsテーブルの学生ID更新', { oldStudentId, newStudentId: updateData.student_id });
            } else {
              // 古いレコードがなければ新規作成
              const userInfo = await query(
                'SELECT name FROM users WHERE id = ?',
                [userId]
              );
              await query(
                'INSERT INTO students (student_id, name, status, created_at) VALUES (?, ?, ?, NOW())',
                [updateData.student_id, userInfo[0].name, 'active']
              );
              logger.info('studentsテーブルに新規レコード作成', { studentId: updateData.student_id });
            }
          } else {
            // 古いIDがなければ新規作成
            const userInfo = await query(
              'SELECT name FROM users WHERE id = ?',
              [userId]
            );
            await query(
              'INSERT INTO students (student_id, name, status, created_at) VALUES (?, ?, ?, NOW())',
              [updateData.student_id, userInfo[0].name, 'active']
            );
            logger.info('studentsテーブルに新規レコード作成', { studentId: updateData.student_id });
          }
        }
      }

      updateValues.push(userId);

      const updateQuery = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      logger.info('SQL実行', { query: updateQuery, values: updateValues });

      await query(updateQuery, updateValues);

      logger.info('=== プロフィール更新完了 ===', { userId, updatedFields: updateFields });

      return {
        success: true,
        message: 'プロフィールが更新されました'
      };
    } catch (error) {
      logger.error('=== プロフィール更新エラー ===', {
        userId,
        updateData,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack
      });
      return {
        success: false,
        message: `サーバーエラー: ${error.message}`
      };
    }
  }
}

module.exports = AuthService;