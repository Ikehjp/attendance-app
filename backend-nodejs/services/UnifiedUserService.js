/**
 * 統合ユーザーサービス (新スキーマ対応)
 * users テーブルを使用した統合ユーザー管理
 * students テーブルのデータも users に統合
 */
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

class UnifiedUserService {
    /**
     * ユーザー作成
     */
    static async createUser(data) {
        try {
            const {
                organization_id,
                email,
                password,
                name,
                role = 'student',
                identifier = null,
                card_id = null,
                department = null,
                grade = null,
                class_name = null,
                phone = null
            } = data;

            if (!organization_id || !email || !password || !name) {
                return {
                    success: false,
                    message: '必須項目が不足しています: organization_id, email, password, name'
                };
            }

            // メール重複チェック
            const existing = await query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existing.length > 0) {
                return {
                    success: false,
                    message: 'このメールアドレスは既に登録されています'
                };
            }

            // パスワードハッシュ化
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await query(
                `INSERT INTO users 
         (organization_id, email, password, name, role, identifier, 
          card_id, department, grade, class_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    organization_id, email, hashedPassword, name, role, identifier,
                    card_id, department, grade, class_name, phone
                ]
            );

            logger.info('ユーザーを作成しました', { userId: result.insertId, email, role });

            return {
                success: true,
                message: 'ユーザーを作成しました',
                data: { id: result.insertId }
            };
        } catch (error) {
            logger.error('ユーザー作成エラー:', error.message);
            return {
                success: false,
                message: error.message || 'ユーザーの作成に失敗しました'
            };
        }
    }

    /**
     * ユーザー取得（ID）
     */
    static async getUserById(userId) {
        try {
            const users = await query(
                `SELECT 
          id, organization_id, email, name, role, identifier,
          card_id, department, grade, class_name, phone, avatar_url,
          is_active, status, enrollment_date, last_login_at,
          created_at, updated_at
        FROM users WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                return {
                    success: false,
                    message: 'ユーザーが見つかりません'
                };
            }

            return {
                success: true,
                data: users[0]
            };
        } catch (error) {
            logger.error('ユーザー取得エラー:', error.message);
            return {
                success: false,
                message: 'ユーザーの取得に失敗しました'
            };
        }
    }

    /**
     * ユーザー取得（メールアドレス）
     */
    static async getUserByEmail(email) {
        try {
            const users = await query(
                `SELECT * FROM users WHERE email = ?`,
                [email]
            );

            if (users.length === 0) {
                return {
                    success: false,
                    message: 'ユーザーが見つかりません'
                };
            }

            return {
                success: true,
                data: users[0]
            };
        } catch (error) {
            logger.error('ユーザー取得エラー:', error.message);
            return {
                success: false,
                message: 'ユーザーの取得に失敗しました'
            };
        }
    }

    /**
     * ユーザー取得（識別子 = 学籍番号/社員番号）
     */
    static async getUserByIdentifier(organizationId, identifier) {
        try {
            const users = await query(
                `SELECT * FROM users 
         WHERE organization_id = ? AND identifier = ?`,
                [organizationId, identifier]
            );

            if (users.length === 0) {
                return {
                    success: false,
                    message: 'ユーザーが見つかりません'
                };
            }

            return {
                success: true,
                data: users[0]
            };
        } catch (error) {
            logger.error('ユーザー取得エラー:', error.message);
            return {
                success: false,
                message: 'ユーザーの取得に失敗しました'
            };
        }
    }

    /**
     * 組織内のユーザー一覧取得
     */
    static async getOrganizationUsers(organizationId, options = {}) {
        try {
            const {
                role,
                status,
                search,
                limit,
                offset = 0
            } = options;

            let sql = `
        SELECT 
          id, organization_id, email, name, role, identifier,
          department, grade, class_name, phone, avatar_url,
          is_active, status, enrollment_date, last_login_at,
          created_at, updated_at
        FROM users
        WHERE organization_id = ?
      `;
            const params = [organizationId];

            if (role) {
                sql += ' AND role = ?';
                params.push(role);
            }

            if (status) {
                sql += ' AND status = ?';
                params.push(status);
            }

            if (search) {
                sql += ' AND (name LIKE ? OR email LIKE ? OR identifier LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            // カウント取得
            const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
            const countResult = await query(countSql, params);
            const total = countResult[0]?.total || 0;

            sql += ' ORDER BY name';

            if (limit) {
                sql += ' LIMIT ?';
                params.push(parseInt(limit));
            }

            if (offset) {
                sql += ' OFFSET ?';
                params.push(parseInt(offset));
            }

            const users = await query(sql, params);

            return {
                success: true,
                data: {
                    users,
                    total,
                    limit: limit || users.length,
                    offset
                }
            };
        } catch (error) {
            logger.error('ユーザー一覧取得エラー:', error.message);
            return {
                success: false,
                message: 'ユーザー一覧の取得に失敗しました'
            };
        }
    }

    /**
     * 学生一覧取得（後方互換性用）
     */
    static async getStudents(organizationId, options = {}) {
        return await this.getOrganizationUsers(organizationId, {
            ...options,
            role: 'student'
        });
    }

    /**
     * ユーザー更新
     */
    static async updateUser(userId, data) {
        try {
            const updateFields = [];
            const params = [];

            const allowedFields = [
                'name', 'role', 'identifier', 'card_id', 'department',
                'grade', 'class_name', 'phone', 'avatar_url', 'is_active', 'status'
            ];

            allowedFields.forEach(field => {
                if (data[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    params.push(data[field]);
                }
            });

            if (updateFields.length === 0) {
                return {
                    success: false,
                    message: '更新するフィールドがありません'
                };
            }

            params.push(userId);

            await query(
                `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                params
            );

            logger.info('ユーザーを更新しました', { userId, fields: updateFields });

            return {
                success: true,
                message: 'ユーザーを更新しました'
            };
        } catch (error) {
            logger.error('ユーザー更新エラー:', error.message);
            return {
                success: false,
                message: 'ユーザーの更新に失敗しました'
            };
        }
    }

    /**
     * パスワード変更
     */
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            const users = await query('SELECT password FROM users WHERE id = ?', [userId]);

            if (users.length === 0) {
                return {
                    success: false,
                    message: 'ユーザーが見つかりません'
                };
            }

            const isMatch = await bcrypt.compare(currentPassword, users[0].password);
            if (!isMatch) {
                return {
                    success: false,
                    message: '現在のパスワードが正しくありません'
                };
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await query(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, userId]
            );

            logger.info('パスワードを変更しました', { userId });

            return {
                success: true,
                message: 'パスワードを変更しました'
            };
        } catch (error) {
            logger.error('パスワード変更エラー:', error.message);
            return {
                success: false,
                message: 'パスワードの変更に失敗しました'
            };
        }
    }

    /**
     * ユーザー削除（論理削除）
     */
    static async deleteUser(userId) {
        try {
            await query(
                'UPDATE users SET is_active = 0, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['inactive', userId]
            );

            logger.info('ユーザーを削除しました', { userId });

            return {
                success: true,
                message: 'ユーザーを削除しました'
            };
        } catch (error) {
            logger.error('ユーザー削除エラー:', error.message);
            return {
                success: false,
                message: 'ユーザーの削除に失敗しました'
            };
        }
    }

    /**
     * 最終ログイン日時更新
     */
    static async updateLastLogin(userId) {
        try {
            await query(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );
            return { success: true };
        } catch (error) {
            logger.error('最終ログイン更新エラー:', error.message);
            return { success: false };
        }
    }

    /**
     * ロール変更
     */
    static async changeRole(userId, newRole, adminUserId) {
        try {
            const validRoles = ['owner', 'admin', 'teacher', 'employee', 'student'];
            if (!validRoles.includes(newRole)) {
                return {
                    success: false,
                    message: '無効なロールです'
                };
            }

            await query(
                `UPDATE users 
         SET role = ?, last_role_update = CURDATE(), updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
                [newRole, userId]
            );

            logger.info('ユーザーロールを変更しました', { userId, newRole, changedBy: adminUserId });

            return {
                success: true,
                message: 'ロールを変更しました'
            };
        } catch (error) {
            logger.error('ロール変更エラー:', error.message);
            return {
                success: false,
                message: 'ロールの変更に失敗しました'
            };
        }
    }

    /**
     * 一括ユーザー登録（CSV等からのインポート用）
     */
    static async bulkCreateUsers(organizationId, users, defaultRole = 'student') {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const userData of users) {
            const result = await this.createUser({
                organization_id: organizationId,
                email: userData.email,
                password: userData.password || 'defaultPassword123',
                name: userData.name,
                role: userData.role || defaultRole,
                identifier: userData.identifier || userData.student_id,
                grade: userData.grade,
                class_name: userData.class_name,
                department: userData.department,
                phone: userData.phone
            });

            if (result.success) {
                results.success++;
            } else {
                results.failed++;
                results.errors.push({
                    email: userData.email,
                    message: result.message
                });
            }
        }

        return {
            success: true,
            message: `${results.success}件登録、${results.failed}件失敗`,
            data: results
        };
    }
}

module.exports = UnifiedUserService;
