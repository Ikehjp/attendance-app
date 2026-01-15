const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * グループ管理サービス
 */
class GroupService {
  /**
   * [完全版] グループの作成 (作成者IDも保存)
   */
  static async createGroup(data, creatorId) {
    try {
      // 1. 作成者の所属組織を取得 (ここを追加)
      const users = await query('SELECT organization_id FROM users WHERE id = ?', [creatorId]);
      if (users.length === 0) {
        throw new Error('ユーザーが見つかりません');
      }
      const organizationId = users[0].organization_id;

      if (!organizationId) {
        throw new Error('ユーザーが組織に所属していません');
      }

      // 2. グループを作成 (SQLに organization_id を追加)
      const sql = `
        INSERT INTO \`groups\` 
        (organization_id, name, icon, description, created_by, is_active) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        organizationId,      // 追加
        data.name,
        data.icon || null,
        data.description || null,
        creatorId,
        true
      ];

      const result = await query(sql, params);

      logger.info('グループ作成成功', { groupId: result.insertId, creatorId });

      return {
        success: true,
        message: 'グループを作成しました',
        data: {
          id: result.insertId,
          organization_id: organizationId,
          name: data.name
        }
      };
    } catch (error) {
      logger.error(`グループ作成エラー: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * グループ一覧の取得
   */
  static async getGroups(options = {}) {
    try {
      const {
        search, // [修正] 'search' パラメータも受け取る
        is_active,
        created_by,
        student_id,
        include_members,
        limit,
        offset = 0
      } = options;

      let sql = `
        SELECT 
          g.id, g.name, g.icon, g.is_active, g.created_at, g.created_by,
          u.name as creator_name,
          (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as member_count
        FROM \`groups\` g
        LEFT JOIN users u ON g.created_by = u.id
      `;
      const params = [];

      if (student_id) {
        sql += ` JOIN group_members gm_filter ON g.id = gm_filter.group_id WHERE gm_filter.student_id = ?`;
        params.push(student_id);
      } else if (options.teacher_id) { // [追加] 担当教員でフィルタリング
        sql += ` JOIN group_teachers gt_filter ON g.id = gt_filter.group_id WHERE gt_filter.user_id = ?`;
        params.push(options.teacher_id);
      } else {
        sql += ` WHERE 1=1`;
      }

      if (search) {
        sql += ' AND g.name LIKE ?';
        params.push(`%${search}%`);
      }
      if (is_active !== undefined) {
        sql += ' AND g.is_active = ?';
        params.push(Boolean(is_active));
      }
      if (created_by) {
        sql += ' AND g.created_by = ?';
        params.push(created_by);
      }

      sql += ' ORDER BY g.created_at DESC';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }
      if (offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(offset));
      }

      // デバッグログ
      logger.debug('グループ取得SQL:', { sql, params, options });

      let groups = await query(sql, params);

      if (include_members && groups.length > 0) {
        const groupIds = groups.map(g => g.id);

        // プレースホルダーの生成 (?,?,...)
        const placeholders = groupIds.map(() => '?').join(',');

        // studentsテーブルとusersテーブルの両方からメンバー情報を取得
        const allMembers = await query(
          `SELECT 
            gm.id, 
            gm.group_id, 
            gm.student_id, 
            COALESCE(s.name, u.name, gm.student_id) as name, 
            gm.status, 
            gm.joined_at 
          FROM group_members gm
          LEFT JOIN students s ON gm.student_id = s.student_id
          LEFT JOIN users u ON gm.student_id = u.student_id
          WHERE gm.group_id IN (${placeholders})`,
          groupIds
        );

        // グループIDごとにメンバーをマッピング
        const membersMap = {};
        allMembers.forEach(member => {
          if (!membersMap[member.group_id]) {
            membersMap[member.group_id] = [];
          }
          membersMap[member.group_id].push(member);
        });

        // 各グループにメンバーを割り当て
        for (const group of groups) {
          group.members = membersMap[group.id] || [];
        }
      }

      return {
        success: true,
        data: {
          groups,
          total: groups.length
        }
      };
    } catch (error) {
      logger.error('グループ一覧取得エラー:', error.message);
      return {
        success: false,
        message: 'グループ一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 特定グループの取得
   */
  static async getGroup(id) {
    try {
      const groups = await query(
        `SELECT 
          g.id, g.name, g.icon, g.description, g.is_active, g.created_at, g.created_by,
          u.name as creator_name,
          (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as member_count
         FROM \`groups\` g
         LEFT JOIN users u ON g.created_by = u.id
         WHERE g.id = ?`,
        [id]
      );

      if (groups.length === 0) {
        return {
          success: false,
          message: 'グループが見つかりません'
        };
      }

      const group = groups[0];

      // studentsテーブルとusersテーブルの両方からメンバー情報を取得
      const members = await query(
        `SELECT 
          gm.student_id, 
          COALESCE(s.name, u.name, gm.student_id) as name, 
          gm.status, 
          gm.joined_at 
        FROM group_members gm
        LEFT JOIN students s ON gm.student_id = s.student_id
        LEFT JOIN users u ON gm.student_id = u.student_id
        WHERE gm.group_id = ?`,
        [id]
      );
      group.members = members;

      return {
        success: true,
        data: { group }
      };
    } catch (error) {
      logger.error('グループ取得エラー:', error.message);
      return {
        success: false,
        message: 'グループ情報の取得に失敗しました'
      };
    }
  }

  /**
   * グループ情報の更新
   */
  static async updateGroup(id, updateData) {
    try {
      const allowedFields = ['name', 'icon', 'description', 'is_active'];
      const updateFields = [];
      const updateValues = [];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
        }
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: '更新するデータがありません'
        };
      }

      updateValues.push(id);

      await query(
        `UPDATE \`groups\` SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      logger.info('グループ情報更新成功', { groupId: id });

      return {
        success: true,
        message: 'グループ情報が更新されました'
      };
    } catch (error) {
      logger.error('グループ情報更新エラー:', error.message);
      return {
        success: false,
        message: 'グループ情報の更新に失敗しました'
      };
    }
  }

  /**
   * グループメンバーの追加（招待）
   * [修正] 'role' ではなく 'status' を使う
   */
  static async addMember(id, studentId, inviterId) {
    try {
      const result = await transaction(async (conn) => {
        const groups = await query('SELECT id FROM `groups` WHERE id = ?', [id], conn);
        if (groups.length === 0) throw new Error('グループが見つかりません');

        // studentsテーブルとusersテーブルの両方を確認
        const students = await query('SELECT student_id FROM students WHERE student_id = ?', [studentId], conn);
        const usersWithStudentId = await query('SELECT name, email FROM users WHERE student_id = ?', [studentId], conn);

        if (students.length === 0) {
          if (usersWithStudentId.length === 0) {
            throw new Error(`学生が見つかりません (student_id: ${studentId})`);
          }

          // usersテーブルには存在するがstudentsテーブルにない場合、自動登録して外部キー制約を満たす
          await query(
            'INSERT INTO students (student_id, name, status, created_at) VALUES (?, ?, ?, NOW())',
            [studentId, usersWithStudentId[0].name, 'active'],
            conn
          );
        }

        const existingMember = await query(
          'SELECT group_id FROM group_members WHERE group_id = ? AND student_id = ?',
          [id, studentId],
          conn
        );

        if (existingMember.length > 0) {
          throw new Error('この学生は既にメンバー（または招待済み）です');
        }

        // [修正] 'status' を 'pending' で挿入
        await query(
          'INSERT INTO group_members (group_id, student_id, invited_by, status) VALUES (?, ?, ?, ?)',
          [id, studentId, inviterId, 'pending'],
          conn
        );

        return {
          success: true,
          message: '学生をグループに招待しました'
        };
      });

      logger.info('グループメンバー追加成功', { groupId: id, studentId, inviterId });
      return result;
    } catch (error) {
      logger.error('グループメンバー追加エラー:', {
        groupId: id,
        studentId,
        inviterId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return {
        success: false,
        message: error.message || 'メンバーの追加に失敗しました'
      };
    }
  }

  /**
   * メンバーの招待ステータス更新 (学生本人による操作)
   */
  static async updateMemberStatus(id, studentId, status) {
    try {
      if (status !== 'accepted' && status !== 'declined') {
        return { success: false, message: '無効なステータスです' };
      }

      const result = await query(
        'UPDATE group_members SET status = ?, joined_at = ? WHERE group_id = ? AND student_id = ? AND status = ?',
        [
          status,
          (status === 'accepted') ? new Date() : null,
          id,
          studentId,
          'pending'
        ]
      );

      if (result.affectedRows === 0) {
        return { success: false, message: '招待が見つからないか、既に応答済みです' };
      }

      return { success: true, message: `招待を${status === 'accepted' ? '承諾' : '辞退'}しました` };

    } catch (error) {
      logger.error('グループ招待応答エラー:', error.message);
      return { success: false, message: '招待への応答に失敗しました' };
    }
  }

  /**
   * グループメンバーの一覧取得
   */
  static async getMembers(id, options = {}) {
    try {
      const { status, limit, offset = 0 } = options;

      // studentsテーブルとusersテーブルの両方からメンバー情報を取得
      let sql = `
        SELECT 
          gm.student_id, 
          COALESCE(s.name, u.name, gm.student_id) as name, 
          COALESCE(s.email, u.email, '') as email, 
          gm.status, 
          gm.joined_at, 
          gm.invited_by
        FROM group_members gm
        LEFT JOIN students s ON gm.student_id = s.student_id
        LEFT JOIN users u ON gm.student_id = u.student_id
        WHERE gm.group_id = ?
      `;
      const params = [id];

      if (status) {
        sql += ' AND gm.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY name ASC';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }
      if (offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(offset));
      }

      const members = await query(sql, params);

      return {
        success: true,
        data: { members }
      };
    } catch (error) {
      logger.error('グループメンバー取得エラー:', error.message);
      return {
        success: false,
        message: 'メンバー一覧の取得に失敗しました'
      };
    }
  }

  /**
   * グループメンバーの削除
   */
  static async removeMember(id, studentId) {
    try {
      const result = await transaction(async (conn) => {
        const existingMember = await query(
          'SELECT group_id FROM group_members WHERE group_id = ? AND student_id = ?',
          [id, studentId],
          conn
        );

        if (existingMember.length === 0) {
          throw new Error('メンバーが見つかりません');
        }

        await query(
          'DELETE FROM group_members WHERE group_id = ? AND student_id = ?',
          [id, studentId],
          conn
        );

        return {
          success: true,
          message: 'メンバーが削除されました'
        };
      });

      logger.info('グループメンバー削除成功', { groupId: id, studentId });
      return result;
    } catch (error) {
      logger.error('グループメンバー削除エラー:', error.message);
      return {
        success: false,
        message: error.message || 'メンバーの削除に失敗しました'
      };
    }
  }

  /**
   * グループの削除
   */
  static async deleteGroup(id) {
    try {
      const result = await transaction(async (conn) => {
        const groups = await query(
          'SELECT id FROM `groups` WHERE id = ?',
          [id],
          conn
        );

        if (groups.length === 0) {
          throw new Error('グループが見つかりません');
        }

        await query(
          'DELETE FROM group_members WHERE group_id = ?',
          [id],
          conn
        );

        await query(
          'DELETE FROM `groups` WHERE id = ?',
          [id],
          conn
        );

        return {
          success: true,
          message: 'グループが削除されました'
        };
      });

      logger.info('グループ削除成功', { groupId: id });
      return result;
    } catch (error) {
      logger.error('グループ削除エラー:', error.message);
      return {
        success: false,
        message: error.message || 'グループの削除に失敗しました'
      };
    }
  }
  /**
   * 担当教員の追加
   */
  static async addTeacher(groupId, userId, role = 'main') {
    try {
      const result = await transaction(async (conn) => {
        const groups = await query('SELECT id FROM `groups` WHERE id = ?', [groupId], conn);
        if (groups.length === 0) throw new Error('グループが見つかりません');

        const users = await query('SELECT id, role FROM users WHERE id = ?', [userId], conn);
        if (users.length === 0) throw new Error('ユーザーが見つかりません');
        if (users[0].role !== 'teacher' && users[0].role !== 'admin') {
          throw new Error('教員または管理者のみ担当になれます');
        }

        const existingTeacher = await query(
          'SELECT id FROM group_teachers WHERE group_id = ? AND user_id = ?',
          [groupId, userId],
          conn
        );

        if (existingTeacher.length > 0) {
          throw new Error('このユーザーは既に担当教員です');
        }

        await query(
          'INSERT INTO group_teachers (group_id, user_id, role, assigned_at) VALUES (?, ?, ?, CURDATE())',
          [groupId, userId, role],
          conn
        );

        return {
          success: true,
          message: '担当教員を追加しました'
        };
      });

      logger.info('担当教員追加成功', { groupId, userId, role });
      return result;
    } catch (error) {
      logger.error('担当教員追加エラー:', error.message);
      return {
        success: false,
        message: error.message || '担当教員の追加に失敗しました'
      };
    }
  }

  /**
   * 担当教員の削除
   */
  static async removeTeacher(groupId, userId) {
    try {
      const result = await transaction(async (conn) => {
        const existingTeacher = await query(
          'SELECT id FROM group_teachers WHERE group_id = ? AND user_id = ?',
          [groupId, userId],
          conn
        );

        if (existingTeacher.length === 0) {
          throw new Error('担当教員が見つかりません');
        }

        await query(
          'DELETE FROM group_teachers WHERE group_id = ? AND user_id = ?',
          [groupId, userId],
          conn
        );

        return {
          success: true,
          message: '担当教員を削除しました'
        };
      });

      logger.info('担当教員削除成功', { groupId, userId });
      return result;
    } catch (error) {
      logger.error('担当教員削除エラー:', error.message);
      return {
        success: false,
        message: error.message || '担当教員の削除に失敗しました'
      };
    }
  }

  /**
   * 担当教員一覧の取得
   */
  static async getTeachers(groupId) {
    try {
      const teachers = await query(
        `SELECT u.id, u.name, u.email, gt.role, gt.assigned_at
         FROM group_teachers gt
         JOIN users u ON gt.user_id = u.id
         WHERE gt.group_id = ?
         ORDER BY gt.role DESC, u.name ASC`, // main role first
        [groupId]
      );

      return {
        success: true,
        data: { teachers }
      };
    } catch (error) {
      logger.error('担当教員一覧取得エラー:', error.message);
      return {
        success: false,
        message: '担当教員一覧の取得に失敗しました'
      };
    }
  }
}

module.exports = GroupService;