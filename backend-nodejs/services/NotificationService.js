const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * [完全版] 通知サービス
 */
class NotificationService {
  /**
   * 通知の作成
   */
  static async createNotification(data) {
    try {
      const {
        user_id,
        student_id,
        title,
        message,
        type,
        priority = 'medium'
      } = data;

      if (!user_id && !student_id) {
        return {
          success: false,
          message: '通知対象（user_idまたはstudent_id）が必要です'
        };
      }

      const result = await query(
        `INSERT INTO notifications (user_id, student_id, title, message, type, priority) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user_id || null,
          student_id || null,
          title,
          message,
          type,
          priority
        ]
      );

      logger.info('通知作成成功', { notificationId: result.insertId, type, userId: user_id, studentId: student_id });
      return {
        success: true,
        message: '通知が作成されました',
        data: { id: result.insertId }
      };
    } catch (error) {
      logger.error('通知作成エラー:', error.message);
      return {
        success: false,
        message: '通知の作成に失敗しました'
      };
    }
  }

  /**
   * 通知一覧の取得
   */
  static async getNotifications(options = {}) {
    try {
      const {
        user_id,
        student_id,
        type,
        priority,
        is_read,
        limit = 50,
        offset = 0
      } = options;

      // 数値に変換
      const limitNum = parseInt(limit) || 50;
      const offsetNum = parseInt(offset) || 0;

      let sql = `
        SELECT id, title, message, type, priority, is_read, read_at, created_at
        FROM notifications
        WHERE 1=1
      `;
      const params = [];

      if (user_id) {
        sql += ' AND user_id = ?';
        params.push(user_id);
      }
      if (student_id) {
        sql += ' AND student_id = ?';
        params.push(student_id);
      }

      if (type) {
        sql += ' AND type = ?';
        params.push(type);
      }
      if (priority) {
        sql += ' AND priority = ?';
        params.push(priority);
      }
      if (is_read !== undefined) {
        sql += ' AND is_read = ?';
        params.push(Boolean(is_read));
      }

      const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;
      const countParams = [...params];

      sql += ' ORDER BY created_at DESC';
      sql += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const notifications = await query(sql, params);
      const countResult = await query(countSql, countParams);
      const total = countResult[0]?.total || 0;

      return {
        success: true,
        data: {
          notifications,
          total,
          limit: limitNum,
          offset: offsetNum
        }
      };
    } catch (error) {
      logger.error('通知一覧取得エラー:', error.message);
      return {
        success: false,
        message: '通知一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 特定通知の取得
   */
  static async getNotification(id, authUserId, authStudentId = null, authRole = 'employee') {
    try {
      const notifications = await query(
        'SELECT * FROM notifications WHERE id = ?',
        [id]
      );

      if (notifications.length === 0) {
        return {
          success: false,
          message: '通知が見つかりません'
        };
      }

      const notification = notifications[0];

      if (
        authRole !== 'admin' &&
        notification.user_id !== authUserId &&
        notification.student_id !== authStudentId
      ) {
        logger.warn('通知へのアクセス権限がありません', { notificationId: id, userId: authUserId });
        return {
          success: false,
          message: 'この通知へのアクセス権限がありません'
        };
      }

      return {
        success: true,
        data: { notification }
      };
    } catch (error) {
      logger.error('通知取得エラー:', error.message);
      return {
        success: false,
        message: '通知の取得に失敗しました'
      };
    }
  }

  /**
   * 通知を既読にする
   */
  static async markAsRead(id, authUserId, authStudentId = null, authRole = 'employee') {
    try {
      const result = await query(
        `UPDATE notifications 
         SET is_read = 1, read_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND (user_id = ? OR student_id = ?)`,
        [id, authUserId, authStudentId || null]
      );

      if (result.affectedRows === 0) {
        if (authRole === 'admin') {
          const adminResult = await query(
            'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
          );
          if (adminResult.affectedRows > 0) {
            logger.info('管理者が通知を既読にしました', { notificationId: id, adminId: authUserId });
            return { success: true, message: '通知を既読にしました' };
          }
        }
        return {
          success: false,
          message: '通知が見つからないか、権限がありません'
        };
      }

      logger.info('通知を既読にしました', { notificationId: id, userId: authUserId });
      return {
        success: true,
        message: '通知を既読にしました'
      };
    } catch (error) {
      logger.error('通知既読エラー:', error.message);
      return {
        success: false,
        message: '通知の既読処理に失敗しました'
      };
    }
  }

  /**
   * 全通知を既読にする
   */
  static async markAllAsRead(authUserId, authStudentId = null) {
    try {
      const result = await query(
        `UPDATE notifications 
         SET is_read = 1, read_at = CURRENT_TIMESTAMP 
         WHERE is_read = 0 AND (user_id = ? OR student_id = ?)`,
        [authUserId, authStudentId || null]
      );

      logger.info('全通知を既読にしました', { userId: authUserId, studentId: authStudentId, count: result.affectedRows });
      return {
        success: true,
        message: `${result.affectedRows}件の通知を既読にしました`
      };
    } catch (error) {
      logger.error('全通知既読エラー:', error.message);
      return {
        success: false,
        message: '全通知の既読処理に失敗しました'
      };
    }
  }

  /**
   * 通知の削除
   */
  static async deleteNotification(id, authUserId, authStudentId = null, authRole = 'employee') {
    try {
      const result = await query(
        `DELETE FROM notifications 
         WHERE id = ? AND (user_id = ? OR student_id = ?)`,
        [id, authUserId, authStudentId || null]
      );

      if (result.affectedRows === 0) {
        if (authRole === 'admin') {
          const adminResult = await query(
            'DELETE FROM notifications WHERE id = ?',
            [id]
          );
          if (adminResult.affectedRows > 0) {
            logger.info('管理者が通知を削除しました', { notificationId: id, adminId: authUserId });
            return { success: true, message: '通知が削除されました' };
          }
        }
        return {
          success: false,
          message: '通知が見つからないか、削除権限がありません'
        };
      }

      logger.info('通知を削除しました', { notificationId: id, userId: authUserId });
      return {
        success: true,
        message: '通知が削除されました'
      };
    } catch (error) {
      logger.error('通知削除エラー:', error.message);
      return {
        success: false,
        message: '通知の削除に失敗しました'
      };
    }
  }
}

module.exports = NotificationService;