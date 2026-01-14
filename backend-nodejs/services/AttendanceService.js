const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 出欠管理サービス
 */
class AttendanceService {
  /**
   * 出欠記録の作成・更新
   */
  static async recordAttendance(userId, date, type, timestamp, reason, studentId) {
    try {
      const result = await transaction(async (conn) => {
        // 既存の記録をチェック
        const existingRecords = await query(
          'SELECT id FROM user_attendance_records WHERE user_id = ? AND date = ?',
          [userId, date]
        );

        let recordId;
        if (existingRecords.length > 0) {
          // 既存記録の更新
          recordId = existingRecords[0].id;
          await query(
            'UPDATE user_attendance_records SET status = ?, check_in_time = ?, check_out_time = ?, reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [type, timestamp, timestamp, reason, recordId]
          );
        } else {
          // 新規記録の作成
          const insertResult = await query(
            'INSERT INTO user_attendance_records (user_id, date, status, check_in_time, check_out_time, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, date, type, timestamp, timestamp, reason || null]
          );
          recordId = insertResult.insertId;
        }

        // 学生出欠記録も作成（studentIdが指定されている場合）
        if (studentId) {
          await query(
            'INSERT INTO student_attendance_records (student_id, timestamp) VALUES (?, ?)',
            [studentId, timestamp || new Date()]
          );
        }

        return {
          success: true,
          message: '出欠記録が保存されました',
          data: { recordId }
        };
      });

      logger.info('出欠記録作成成功', { userId, date, type });
      return result;
    } catch (error) {
      logger.error('出欠記録作成エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の保存に失敗しました'
      };
    }
  }

  /**
   * 出欠記録の取得
   */
  static async getAttendanceRecords(userId, startDate, endDate) {
    try {
      let sql = `
        SELECT id, user_id, date, status, check_in_time, check_out_time, reason, created_at, updated_at
        FROM user_attendance_records
        WHERE user_id = ?
      `;
      const params = [userId];

      if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
      }

      sql += ' ORDER BY date DESC';

      const records = await query(sql, params);

      return {
        success: true,
        data: { records }
      };
    } catch (error) {
      logger.error('出欠記録取得エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の取得に失敗しました'
      };
    }
  }

  /**
   * 月次レポートの取得
   */
  static async getMonthlyReport(userId, year, month) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const records = await query(
        `SELECT date, status, check_in_time, check_out_time, reason
         FROM user_attendance_records
         WHERE user_id = ? AND date >= ? AND date <= ?
         ORDER BY date`,
        [userId, startDate, endDate]
      );

      // 統計計算
      const totalDays = new Date(year, month, 0).getDate();
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const earlyDepartureDays = records.filter(r => r.status === 'early_departure').length;

      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        success: true,
        data: {
          year,
          month,
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          earlyDepartureDays,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          records
        }
      };
    } catch (error) {
      logger.error('月次レポート取得エラー:', error.message);
      return {
        success: false,
        message: '月次レポートの取得に失敗しました'
      };
    }
  }

  /**
   * 統計情報の取得
   */
  static async getAttendanceStats(userId, period) {
    try {
      let dateCondition = '';
      const params = [userId];

      const now = new Date();
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateCondition = 'AND date >= ?';
          params.push(weekAgo.toISOString().split('T')[0]);
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateCondition = 'AND date >= ?';
          params.push(monthAgo.toISOString().split('T')[0]);
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          dateCondition = 'AND date >= ?';
          params.push(yearAgo.toISOString().split('T')[0]);
          break;
      }

      const stats = await query(
        `SELECT 
           COUNT(*) as total_records,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
           SUM(CASE WHEN status = 'early_departure' THEN 1 ELSE 0 END) as early_departure_count
         FROM user_attendance_records
         WHERE user_id = ? ${dateCondition}`,
        params
      );

      const result = stats[0];
      const attendanceRate = result.total_records > 0
        ? (result.present_count / result.total_records) * 100
        : 0;

      return {
        success: true,
        data: {
          period,
          totalRecords: result.total_records,
          presentCount: result.present_count,
          absentCount: result.absent_count,
          lateCount: result.late_count,
          earlyDepartureCount: result.early_departure_count,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        }
      };
    } catch (error) {
      logger.error('統計情報取得エラー:', error.message);
      return {
        success: false,
        message: '統計情報の取得に失敗しました'
      };
    }
  }

  /**
   * 出欠記録の更新
   */
  static async updateAttendance(recordId, userId, updateData) {
    try {
      // 権限チェック
      const existingRecord = await query(
        'SELECT id FROM user_attendance_records WHERE id = ? AND user_id = ?',
        [recordId, userId]
      );

      if (existingRecord.length === 0) {
        return {
          success: false,
          message: '記録が見つからないか、更新権限がありません'
        };
      }

      const updateFields = [];
      const updateParams = [];

      if (updateData.type) {
        updateFields.push('status = ?');
        updateParams.push(updateData.type);
      }

      if (updateData.timestamp) {
        updateFields.push('check_in_time = ?');
        updateFields.push('check_out_time = ?');
        updateParams.push(updateData.timestamp);
        updateParams.push(updateData.timestamp);
      }

      if (updateData.reason !== undefined) {
        updateFields.push('reason = ?');
        updateParams.push(updateData.reason);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: '更新するデータがありません'
        };
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateParams.push(recordId);

      await query(
        `UPDATE user_attendance_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );

      logger.info('出欠記録更新成功', { recordId, userId });
      return {
        success: true,
        message: '出欠記録が更新されました'
      };
    } catch (error) {
      logger.error('出欠記録更新エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の更新に失敗しました'
      };
    }
  }

  /**
   * 出欠記録の削除
   */
  static async deleteAttendance(recordId, userId) {
    try {
      // 権限チェック
      const existingRecord = await query(
        'SELECT id FROM user_attendance_records WHERE id = ? AND user_id = ?',
        [recordId, userId]
      );

      if (existingRecord.length === 0) {
        return {
          success: false,
          message: '記録が見つからないか、削除権限がありません'
        };
      }

      await query(
        'DELETE FROM user_attendance_records WHERE id = ?',
        [recordId]
      );

      logger.info('出欠記録削除成功', { recordId, userId });
      return {
        success: true,
        message: '出欠記録が削除されました'
      };
    } catch (error) {
      logger.error('出欠記録削除エラー:', error.message);
      return {
        success: false,
        message: '出欠記録の削除に失敗しました'
      };
    }
  }

  // ========================================
  // 時間ベースの出欠判定ロジック（新規追加）
  // ========================================

  /**
   * QRスキャン時の出欠判定
   * @param {number} organizationId - 組織ID
   * @param {number} userId - ユーザーID
   * @param {string} studentId - 学生ID
   * @param {number} classSessionId - 授業セッションID（オプション）
   * @returns {Promise<Object>} 判定結果
   */
  static async processAttendanceWithTimeCheck(organizationId, userId, studentId, classSessionId = null) {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

      // 1. 組織設定を取得
      const orgSettings = await query(
        'SELECT late_limit_minutes, date_reset_time FROM organizations WHERE id = ?',
        [organizationId]
      );

      if (orgSettings.length === 0) {
        return { success: false, message: '組織設定が見つかりません' };
      }

      const { late_limit_minutes, date_reset_time } = orgSettings[0];
      const lateLimitMinutes = late_limit_minutes || 15;
      const resetTime = date_reset_time || '04:00:00';

      // 2. 論理日付を計算（リセット時間前なら前日扱い）
      let logicalDate = new Date(now);
      if (currentTime < resetTime) {
        logicalDate.setDate(logicalDate.getDate() - 1);
      }
      const logicalDateStr = logicalDate.toISOString().split('T')[0];

      // 3. 該当する時限を取得
      const timeSlot = await query(
        `SELECT id, period_number, period_name, start_time, end_time
         FROM organization_time_slots
         WHERE organization_id = ?
           AND start_time <= ? AND end_time >= ?
         LIMIT 1`,
        [organizationId, currentTime, currentTime]
      );

      let status = 'present';
      let message = '出席が記録されました';
      let action = 'none';
      let classId = classSessionId;

      if (timeSlot.length > 0) {
        const slot = timeSlot[0];
        const startTime = slot.start_time;

        // 開始時間 + 遅刻許容時間を計算
        const [hours, minutes, seconds] = startTime.split(':').map(Number);
        const startDate = new Date(logicalDate);
        startDate.setHours(hours, minutes + lateLimitMinutes, seconds || 0);
        const lateLimitTime = startDate.toTimeString().slice(0, 8);

        // 4. 判定
        if (currentTime <= startTime) {
          status = 'present';
          message = `出席が記録されました（${slot.period_name || slot.period_number + '限'}）`;
        } else if (currentTime <= lateLimitTime) {
          status = 'present';
          message = `出席が記録されました（${slot.period_name || slot.period_number + '限'}）`;
        } else {
          status = 'late';
          message = `遅刻です。開始時間から${lateLimitMinutes}分以上経過しています。`;
          action = 'redirect_to_form';
        }
      } else {
        // 該当する時限がない場合
        status = 'present';
        message = '出席が記録されました';
      }

      // 5. 出欠記録を作成
      await this.recordAttendance(
        userId,
        logicalDateStr,
        status,
        now.toISOString(),
        null,
        studentId
      );

      logger.info('時間ベース出欠判定完了', {
        userId, studentId, status, logicalDate: logicalDateStr
      });

      return {
        success: true,
        status,
        logicalDate: logicalDateStr,
        action,
        message,
        classId
      };
    } catch (error) {
      logger.error('時間ベース出欠判定エラー:', error.message);
      return {
        success: false,
        message: '出欠判定処理に失敗しました',
        error: error.message
      };
    }
  }
}

module.exports = AttendanceService;

