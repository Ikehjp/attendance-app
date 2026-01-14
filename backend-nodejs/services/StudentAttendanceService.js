const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 学生出欠管理サービス
 */
class StudentAttendanceService {
  /**
   * 学生出欠記録の作成
   */
  static async recordAttendance(studentId, timestamp) {
    try {
      const result = await query(
        'INSERT INTO student_attendance_records (student_id, timestamp) VALUES (?, ?)',
        [studentId, timestamp || new Date()]
      );

      logger.info('学生出欠記録作成成功', { studentId, timestamp });
      return {
        success: true,
        message: '学生出欠記録が保存されました',
        data: { recordId: result.insertId }
      };
    } catch (error) {
      logger.error('学生出欠記録作成エラー:', error.message);
      return {
        success: false,
        message: '学生出欠記録の保存に失敗しました'
      };
    }
  }

  /**
 * QRコード読み取りによる詳細出欠記録の作成
 * @param {string} studentId - 学生ID
 * @param {string|Date} timestamp - タイムスタンプ
 * @param {number} classId - 授業ID（オプション。指定された場合は検索をスキップ）
 */
  static async recordQRAttendance(studentId, timestamp, classId = null) {
    try {
      const result = await transaction(async (connection) => {
        const attendanceDate = new Date(timestamp).toISOString().split('T')[0];
        const checkInTime = new Date(timestamp).toTimeString().split(' ')[0];

        let targetClassId = classId;

        // 授業IDが指定されていない場合、履修状況から検索
        if (!targetClassId) {
          const dayOfWeek = new Date(timestamp).getDay(); // 0 (Sunday) - 6 (Saturday)
          const currentTime = checkInTime;

          const [classes] = await connection.execute(
            `SELECT c.id 
                 FROM classes c
                 JOIN enrollments e ON c.id = e.class_id
                 WHERE e.student_id = ? 
                 AND c.schedule_day = ? 
                 AND c.start_time <= ? 
                 AND c.end_time >= ?
                 AND c.is_active = TRUE
                 AND e.status = 'enrolled'`,
            [studentId, dayOfWeek, currentTime, currentTime]
          );

          if (classes.length === 0) {
            throw new Error('現在時刻に該当する履修授業が見つかりません');
          }
          if (classes.length > 1) {
            // 本来はQRService側で処理されるはずだが、フォールバック
            throw new Error('現在時刻に複数の授業が該当します。選択が必要です');
          }
          targetClassId = classes[0].id;
        }

        // 授業情報を取得（遅刻判定のため）
        const [classInfo] = await connection.execute(
          'SELECT start_time FROM classes WHERE id = ?',
          [targetClassId]
        );

        if (classInfo.length === 0) {
          throw new Error('指定された授業IDが見つかりません');
        }

        const classStartTime = classInfo[0].start_time;

        // 遅刻判定 (HH:MM:SS 形式の比較)
        const status = (checkInTime > classStartTime) ? 'late' : 'present';

        // 既存の記録を確認
        const [existing] = await connection.execute(
          'SELECT * FROM detailed_attendance_records WHERE student_id = ? AND class_id = ? AND attendance_date = ?',
          [studentId, targetClassId, attendanceDate]
        );

        let recordId;
        let action = 'checkin';
        let checkOutTime = null;

        if (existing.length > 0) {
          // 既存記録あり (上書きまたは退出処理)
          recordId = existing[0].id;

          if (existing[0].check_in_time && !existing[0].check_out_time) {
            // 退出処理
            action = 'checkout';
            checkOutTime = checkInTime; // 現在時刻を退出時刻とする
            await connection.execute(
              'UPDATE detailed_attendance_records SET check_out_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [checkOutTime, recordId]
            );
            logger.info('QR出席 - 退出処理', { recordId, studentId, classId: targetClassId });
          } else {
            // 再出席（上書き）
            await connection.execute(
              'UPDATE detailed_attendance_records SET status = ?, check_in_time = ?, check_out_time = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [status, checkInTime, recordId]
            );
            logger.info('QR出席 - 再出席（上書き）', { recordId, studentId, classId: targetClassId });
          }

        } else {
          // 新規記録
          const [insertResult] = await connection.execute(
            'INSERT INTO detailed_attendance_records (student_id, class_id, attendance_date, status, check_in_time) VALUES (?, ?, ?, ?, ?)',
            [studentId, targetClassId, attendanceDate, status, checkInTime]
          );
          recordId = insertResult.insertId;
          logger.info('QR出席 - 新規出席', { recordId, studentId, classId: targetClassId });
        }

        return {
          success: true,
          message: `出欠（${action}）を記録しました`,
          data: {
            recordId,
            action,
            status,
            checkInTime: (action === 'checkin') ? checkInTime : existing[0].check_in_time,
            checkOutTime
          }
        };
      });

      return result;
    } catch (error) {
      logger.error('QR出欠記録エラー:', error.message);
      return {
        success: false,
        message: error.message || 'QR出欠の記録に失敗しました'
      };
    }
  }

  /**
   * 学生出欠記録一覧の取得
   * (注意: この関数は古い student_attendance_records を参照しています)
   */
  static async getAttendanceRecords(options = {}) {
    try {
      const { student_id, date, class_id, limit, offset = 0 } = options;

      let sql = `
        SELECT r.id, r.student_id, s.name as student_name, r.timestamp 
        FROM student_attendance_records r
        JOIN students s ON r.student_id = s.student_id
        WHERE 1=1
      `;
      const params = [];

      if (student_id) {
        sql += ' AND r.student_id = ?';
        params.push(student_id);
      }

      if (date) {
        sql += ' AND DATE(r.timestamp) = ?';
        params.push(date);
      }

      // class_id は student_attendance_records にはないため、
      // もし必要なら detailed_attendance_records を参照するロジックに変更が必要

      sql += ' ORDER BY r.timestamp DESC';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }
      if (offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(offset));
      }

      const records = await query(sql, params);

      // カウントクエリ
      let countSql = 'SELECT COUNT(*) as total FROM student_attendance_records WHERE 1=1';
      const countParams = [];
      if (student_id) {
        countSql += ' AND student_id = ?';
        countParams.push(student_id);
      }
      if (date) {
        countSql += ' AND DATE(timestamp) = ?';
        countParams.push(date);
      }

      const countResult = await query(countSql, countParams);
      const total = countResult[0].total;

      return {
        success: true,
        data: {
          records,
          total,
          limit: limit ? parseInt(limit) : null,
          offset: parseInt(offset)
        }
      };
    } catch (error) {
      logger.error('学生出欠記録一覧取得エラー:', error.message);
      return {
        success: false,
        message: '学生出欠記録一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 学生の月次出欠レポートを取得
   * @param {string} studentId - 学生ID
   * @param {number} year - 年
   * @param {number} month - 月
   */
  static async getStudentMonthlyReport(studentId, year, month) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      logger.info('学生月次レポート取得', { studentId, year, month, startDate, endDate });

      // student_attendance_records から取得
      const records = await query(
        `SELECT 
           DATE(timestamp) as date,
           timestamp as check_in_time,
           'present' as status
         FROM student_attendance_records
         WHERE student_id = ? AND DATE(timestamp) >= ? AND DATE(timestamp) <= ?
         ORDER BY timestamp`,
        [studentId, startDate, endDate]
      );

      // detailed_attendance_records からも取得（授業ごとの出欠）
      const detailedRecords = await query(
        `SELECT 
           attendance_date as date,
           check_in_time,
           status,
           class_id
         FROM detailed_attendance_records
         WHERE student_id = ? AND attendance_date >= ? AND attendance_date <= ?
         ORDER BY attendance_date, check_in_time`,
        [studentId, startDate, endDate]
      );

      // レコードをマージして日付ごとにまとめる
      const dayRecords = {};

      // student_attendance_recordsのデータ
      records.forEach(r => {
        const dateKey = r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date).split('T')[0];
        if (!dayRecords[dateKey]) {
          dayRecords[dateKey] = { date: dateKey, status: 'present', check_in_time: r.check_in_time };
        }
      });

      // detailed_attendance_recordsのデータ（ステータスを優先）
      detailedRecords.forEach(r => {
        const dateKey = r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date).split('T')[0];
        if (!dayRecords[dateKey]) {
          dayRecords[dateKey] = { date: dateKey, status: r.status, check_in_time: r.check_in_time };
        } else if (r.status === 'late' || r.status === 'absent') {
          // 遅刻・欠席は優先
          dayRecords[dateKey].status = r.status;
        }
      });

      const mergedRecords = Object.values(dayRecords);

      // 統計計算
      const totalDays = lastDay;
      const presentDays = mergedRecords.filter(r => r.status === 'present').length;
      const absentDays = mergedRecords.filter(r => r.status === 'absent').length;
      const lateDays = mergedRecords.filter(r => r.status === 'late').length;
      const earlyDepartureDays = mergedRecords.filter(r => r.status === 'early_departure').length;

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
          records: mergedRecords
        }
      };
    } catch (error) {
      logger.error('学生月次レポート取得エラー:', error.message);
      return {
        success: false,
        message: '学生月次レポートの取得に失敗しました'
      };
    }
  }

  /**
   * 学生の出欠統計を取得 (getStudentAttendanceSummaryから改修)
   * student_id または class_id でフィルタリング可能
   */
  static async getAttendanceStats(options = {}) {
    try {
      const { student_id, class_id, period = 'month' } = options;

      if (!student_id && !class_id) {
        logger.warn('getAttendanceStats: student_id と class_id が両方とも指定されていません。');
        return { success: false, message: '学生IDまたは授業IDのいずれかが必要です' };
      }

      let start_date, end_date;
      const today = new Date();

      if (period === 'week') {
        const firstDayOfWeek = today.getDate() - today.getDay();
        start_date = new Date(new Date(today).setDate(firstDayOfWeek)).toISOString().split('T')[0];
        end_date = new Date(new Date(today).setDate(firstDayOfWeek + 6)).toISOString().split('T')[0];
      } else if (period === 'year') {
        start_date = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end_date = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
      } else { // 'month' (default)
        start_date = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end_date = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      }

      let baseQuery = `FROM detailed_attendance_records WHERE attendance_date BETWEEN ? AND ?`;
      const params = [start_date, end_date];

      if (student_id) {
        baseQuery += ` AND student_id = ?`;
        params.push(student_id);
      }
      if (class_id) {
        baseQuery += ` AND class_id = ?`;
        params.push(class_id);
      }

      // 統計クエリ
      const statsQuery = `
        SELECT 
           COUNT(CASE WHEN status = 'present' THEN 1 END) as presentDays,
           COUNT(CASE WHEN status = 'absent' THEN 1 END) as absentDays,
           COUNT(CASE WHEN status = 'late' THEN 1 END) as lateDays,
           COUNT(CASE WHEN status = 'early_departure' THEN 1 END) as earlyDepartureDays
         ${baseQuery}`;

      const [stats] = await query(statsQuery, params);

      // 合計時間クエリ
      const totalHoursQuery = `
         SELECT SUM(TIME_TO_SEC(TIMEDIFF(check_out_time, check_in_time))) as totalSeconds
         ${baseQuery} AND status = 'present' AND check_in_time IS NOT NULL AND check_out_time IS NOT NULL`;

      const [totalHoursResult] = await query(totalHoursQuery, params);
      const totalHours = (totalHoursResult?.totalSeconds || 0) / 3600;

      return {
        success: true,
        data: {
          presentDays: stats?.presentDays || 0,
          absentDays: stats?.absentDays || 0,
          lateDays: stats?.lateDays || 0,
          earlyDepartureDays: stats?.earlyDepartureDays || 0,
          totalHours: parseFloat(totalHours.toFixed(2))
        }
      };
    } catch (error) {
      logger.error('学生出欠統計取得エラー:', error.message);
      return {
        success: false,
        message: '出欠統計の取得に失敗しました'
      };
    }
  }

  /**
   * 欠課学生の記録（トランザクション）
   */
  static async recordAbsentStudents(classId, attendanceDate) {
    try {
      const result = await transaction(async (connection) => {
        // 1. その授業(classId)を履修している学生一覧を取得
        const [enrolledStudents] = await connection.execute(
          'SELECT student_id FROM enrollments WHERE class_id = ? AND status = ?',
          [classId, 'enrolled']
        );

        if (enrolledStudents.length === 0) {
          throw new Error('この授業を履修している学生がいません');
        }

        // 2. その日に既に出席記録がある学生IDのリストを取得
        const [presentStudents] = await connection.execute(
          'SELECT DISTINCT student_id FROM detailed_attendance_records WHERE class_id = ? AND attendance_date = ? AND (status = ? OR status = ?)',
          [classId, attendanceDate, 'present', 'late']
        );

        const presentStudentIds = new Set(presentStudents.map(s => s.student_id));

        // 3. 履修しているが、出席記録がない学生を欠課として記録
        const absentRecords = [];
        for (const student of enrolledStudents) {
          if (presentStudentIds.has(student.student_id)) {
            continue; // 既に出席/遅刻しているのでスキップ
          }

          // 欠課記録を挿入（または更新）
          await connection.execute(
            `INSERT INTO detailed_attendance_records (student_id, class_id, attendance_date, status) 
             VALUES (?, ?, ?, 'absent')
             ON DUPLICATE KEY UPDATE status = 'absent', updated_at = CURRENT_TIMESTAMP`,
            [student.student_id, classId, attendanceDate]
          );
          absentRecords.push(student);
        }

        return {
          success: true,
          message: `${absentRecords.length}名の学生を欠課として記録しました`,
          data: {
            absentCount: absentRecords.length,
            absentStudents: absentRecords
          }
        };
      });

      return result;
    } catch (error) {
      logger.error('欠課学生記録エラー:', error.message);
      return {
        success: false,
        message: error.message || '欠課学生の記録に失敗しました'
      };
    }
  }

  /**
   * 学生出欠記録の削除
   */
  static async deleteAttendance(recordId) {
    try {
      const result = await query(
        'DELETE FROM student_attendance_records WHERE id = ?',
        [recordId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: '記録が見つかりません'
        };
      }

      logger.info('学生出欠記録削除成功', { recordId });
      return {
        success: true,
        message: '学生出欠記録が削除されました'
      };
    } catch (error) {
      logger.error('学生出欠記録削除エラー:', error.message);
      return {
        success: false,
        message: '学生出欠記録の削除に失敗しました'
      };
    }
  }
}

module.exports = StudentAttendanceService;