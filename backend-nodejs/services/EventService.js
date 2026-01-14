const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * イベント管理サービス
 */
class EventService {
  /**
   * イベントの作成
   */
  static async createEvent(eventData) {
    try {
      const {
        title,
        description,
        start_date,
        end_date,
        location,
        created_by,
        is_public = false,
        participant_ids = []
      } = eventData;

      if (!title || !start_date || !created_by) {
        return {
          success: false,
          message: 'タイトル、開始日時、作成者IDが必要です'
        };
      }

      // ISO 8601形式の日時をMySQL形式に変換
      const formatDateForMySQL = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        // YYYY-MM-DD HH:MM:SS 形式に変換
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      const formattedStartDate = formatDateForMySQL(start_date);
      const formattedEndDate = end_date ? formatDateForMySQL(end_date) : null;

      const result = await transaction(async (connection) => {
        // イベントの作成
        const [eventResult] = await connection.execute(
          `INSERT INTO events (title, description, start_date, end_date, location, created_by, is_public)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            title,
            description || null,
            formattedStartDate,
            formattedEndDate,
            location || null,
            created_by,
            Boolean(is_public)
          ]
        );

        const eventId = eventResult.insertId;

        // 参加者の追加（指定されている場合）
        if (participant_ids && participant_ids.length > 0) {
          for (const userId of participant_ids) {
            await connection.execute(
              'INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, ?)',
              [eventId, userId, 'pending']
            );
          }
        }

        // 作成者も自動的に参加者として追加（承認済み）
        await connection.execute(
          'INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, ?)',
          [eventId, created_by, 'accepted']
        );

        return { eventId };
      });

      logger.info('イベントを作成しました', { eventId: result.eventId, createdBy: created_by });

      return {
        success: true,
        message: 'イベントが作成されました',
        data: {
          id: result.eventId
        }
      };
    } catch (error) {
      logger.error('イベント作成エラー:', {
        eventData: {
          title: eventData?.title,
          start_date: eventData?.start_date,
          end_date: eventData?.end_date,
          created_by: eventData?.created_by
        },
        errorMessage: error.message,
        errorStack: error.stack
      });
      return {
        success: false,
        message: error.message || 'イベントの作成に失敗しました'
      };
    }
  }

  /**
   * イベント一覧の取得
   */
  static async getEvents(options = {}) {
    try {
      const {
        userId,
        startDate,
        endDate,
        isPublic,
        limit,
        offset = 0
      } = options;

      let sql = `
        SELECT 
          e.id,
          e.title,
          e.description,
          e.start_date,
          e.end_date,
          e.location,
          e.created_by,
          e.is_public,
          e.created_at,
          e.updated_at,
          u.name as creator_name,
          ep.status as participation_status
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = ?
        WHERE 1=1
      `;
      const params = [userId || null];

      if (startDate) {
        sql += ' AND e.start_date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND e.end_date <= ?';
        params.push(endDate);
      }

      if (isPublic !== undefined) {
        sql += ' AND e.is_public = ?';
        params.push(Boolean(isPublic));
      }

      // ユーザーが参加しているイベント、または公開イベント、または作成したイベントのみ表示
      if (userId) {
        sql += ` AND (
          ep.user_id = ? OR 
          e.is_public = TRUE OR 
          e.created_by = ?
        )`;
        params.push(userId, userId);
      } else {
        // 未ログインの場合は公開イベントのみ
        sql += ' AND e.is_public = TRUE';
      }

      sql += ' ORDER BY e.start_date ASC';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      if (offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(offset));
      }

      const events = await query(sql, params);

      // 参加者数を取得
      for (const event of events) {
        const participants = await query(
          'SELECT COUNT(*) as count FROM event_participants WHERE event_id = ? AND status = ?',
          [event.id, 'accepted']
        );
        event.participant_count = participants[0]?.count || 0;
      }

      // 総数を取得
      let countSql = `
        SELECT COUNT(*) as total
        FROM events e
        LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = ?
        WHERE 1=1
      `;
      const countParams = [userId || null];

      if (startDate) {
        countSql += ' AND e.start_date >= ?';
        countParams.push(startDate);
      }

      if (endDate) {
        countSql += ' AND e.end_date <= ?';
        countParams.push(endDate);
      }

      if (isPublic !== undefined) {
        countSql += ' AND e.is_public = ?';
        countParams.push(Boolean(isPublic));
      }

      if (userId) {
        countSql += ` AND (
          ep.user_id = ? OR 
          e.is_public = TRUE OR 
          e.created_by = ?
        )`;
        countParams.push(userId, userId);
      } else {
        countSql += ' AND e.is_public = TRUE';
      }

      const countResult = await query(countSql, countParams);
      const total = countResult[0]?.total || 0;

      return {
        success: true,
        data: {
          events,
          total,
          limit: limit ? parseInt(limit) : null,
          offset: parseInt(offset)
        }
      };
    } catch (error) {
      logger.error('イベント一覧取得エラー:', error.message);
      return {
        success: false,
        message: 'イベント一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 特定イベントの取得
   */
  static async getEvent(eventId, userId = null) {
    try {
      const events = await query(
        `SELECT 
          e.*,
          u.name as creator_name
         FROM events e
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = ?`,
        [eventId]
      );

      if (events.length === 0) {
        return {
          success: false,
          message: 'イベントが見つかりません'
        };
      }

      const event = events[0];

      // 権限チェック
      if (!event.is_public && userId) {
        const participants = await query(
          'SELECT user_id FROM event_participants WHERE event_id = ? AND user_id = ?',
          [eventId, userId]
        );
        if (participants.length === 0 && event.created_by !== userId) {
          return {
            success: false,
            message: 'このイベントへのアクセス権限がありません'
          };
        }
      } else if (!event.is_public && !userId) {
        return {
          success: false,
          message: 'このイベントへのアクセス権限がありません'
        };
      }

      // 参加者一覧を取得
      const participants = await query(
        `SELECT 
          ep.*,
          u.name as user_name,
          u.email as user_email
         FROM event_participants ep
         LEFT JOIN users u ON ep.user_id = u.id
         WHERE ep.event_id = ?
         ORDER BY ep.status, u.name`,
        [eventId]
      );

      event.participants = participants;

      return {
        success: true,
        data: {
          event
        }
      };
    } catch (error) {
      logger.error('イベント取得エラー:', error.message);
      return {
        success: false,
        message: 'イベントの取得に失敗しました'
      };
    }
  }

  /**
   * イベントの更新
   */
  static async updateEvent(eventId, updateData, userId) {
    try {
      // イベントの存在確認と権限チェック
      const events = await query(
        'SELECT created_by FROM events WHERE id = ?',
        [eventId]
      );

      if (events.length === 0) {
        return {
          success: false,
          message: 'イベントが見つかりません'
        };
      }

      if (events[0].created_by !== userId) {
        return {
          success: false,
          message: 'このイベントを編集する権限がありません'
        };
      }

      const updateFields = [];
      const updateValues = [];

      if (updateData.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(updateData.title);
      }

      if (updateData.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updateData.description || null);
      }

      if (updateData.start_date !== undefined) {
        updateFields.push('start_date = ?');
        updateValues.push(updateData.start_date);
      }

      if (updateData.end_date !== undefined) {
        updateFields.push('end_date = ?');
        updateValues.push(updateData.end_date || null);
      }

      if (updateData.location !== undefined) {
        updateFields.push('location = ?');
        updateValues.push(updateData.location || null);
      }

      if (updateData.is_public !== undefined) {
        updateFields.push('is_public = ?');
        updateValues.push(Boolean(updateData.is_public));
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: '更新するデータがありません'
        };
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(eventId);

      await query(
        `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      logger.info('イベントを更新しました', { eventId, userId });

      return {
        success: true,
        message: 'イベントが更新されました'
      };
    } catch (error) {
      logger.error('イベント更新エラー:', error.message);
      return {
        success: false,
        message: 'イベントの更新に失敗しました'
      };
    }
  }

  /**
   * イベントの削除
   */
  static async deleteEvent(eventId, userId) {
    try {
      // イベントの存在確認と権限チェック
      const events = await query(
        'SELECT created_by FROM events WHERE id = ?',
        [eventId]
      );

      if (events.length === 0) {
        return {
          success: false,
          message: 'イベントが見つかりません'
        };
      }

      if (events[0].created_by !== userId) {
        return {
          success: false,
          message: 'このイベントを削除する権限がありません'
        };
      }

      await transaction(async (connection) => {
        // 参加者を削除
        await connection.execute(
          'DELETE FROM event_participants WHERE event_id = ?',
          [eventId]
        );

        // イベントを削除
        await connection.execute(
          'DELETE FROM events WHERE id = ?',
          [eventId]
        );
      });

      logger.info('イベントを削除しました', { eventId, userId });

      return {
        success: true,
        message: 'イベントが削除されました'
      };
    } catch (error) {
      logger.error('イベント削除エラー:', error.message);
      return {
        success: false,
        message: 'イベントの削除に失敗しました'
      };
    }
  }

  /**
   * イベントへの参加申請/承認
   */
  static async updateParticipation(eventId, userId, status) {
    try {
      if (!['pending', 'accepted', 'declined'].includes(status)) {
        return {
          success: false,
          message: '無効な参加ステータスです'
        };
      }

      // 既存の参加記録を確認
      const existing = await query(
        'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      if (existing.length > 0) {
        // 更新
        await query(
          'UPDATE event_participants SET status = ? WHERE event_id = ? AND user_id = ?',
          [status, eventId, userId]
        );
      } else {
        // 新規作成
        await query(
          'INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, ?)',
          [eventId, userId, status]
        );
      }

      logger.info('イベント参加ステータスを更新しました', { eventId, userId, status });

      return {
        success: true,
        message: '参加ステータスが更新されました'
      };
    } catch (error) {
      logger.error('イベント参加更新エラー:', error.message);
      return {
        success: false,
        message: '参加ステータスの更新に失敗しました'
      };
    }
  }

  /**
   * イベント参加者の削除
   */
  static async removeParticipant(eventId, participantId, userId) {
    try {
      // イベントの作成者か確認
      const events = await query(
        'SELECT created_by FROM events WHERE id = ?',
        [eventId]
      );

      if (events.length === 0) {
        return {
          success: false,
          message: 'イベントが見つかりません'
        };
      }

      // 作成者または参加者本人のみ削除可能
      if (events[0].created_by !== userId && participantId !== userId) {
        return {
          success: false,
          message: '参加者を削除する権限がありません'
        };
      }

      await query(
        'DELETE FROM event_participants WHERE event_id = ? AND user_id = ?',
        [eventId, participantId]
      );

      logger.info('イベント参加者を削除しました', { eventId, participantId });

      return {
        success: true,
        message: '参加者が削除されました'
      };
    } catch (error) {
      logger.error('イベント参加者削除エラー:', error.message);
      return {
        success: false,
        message: '参加者の削除に失敗しました'
      };
    }
  }
}

module.exports = EventService;

