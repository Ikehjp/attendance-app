const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 日次出欠統計サービス
 */
class DailyStatsService {
    /**
     * 月次の日別統計を取得
     * @param {number} year - 年
     * @param {number} month - 月
     * @returns {Object} - 日別の統計情報
     */
    /**
     * 月次の日別統計を取得
     * @param {number} year - 年
     * @param {number} month - 月
     * @returns {Object} - 日別の統計情報
     */
    static async getDailyStats(year, month) {
        try {
            // 月の開始日と終了日を計算
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

            // user_attendance_recordsとdetailed_attendance_recordsの両方から日別の出欠統計を取得
            const dailyStats = await query(
                `SELECT 
                  date,
                  SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                  SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                  SUM(CASE WHEN status = 'early_departure' THEN 1 ELSE 0 END) as early_departure
                FROM (
                  SELECT date, status FROM user_attendance_records
                  WHERE date >= ? AND date <= ?
                  UNION ALL
                  SELECT attendance_date as date, status FROM detailed_attendance_records
                  WHERE attendance_date >= ? AND attendance_date <= ?
                ) combined
                GROUP BY date
                ORDER BY date`,
                [startDate, endDate, startDate, endDate]
            );

            // 承認待ちの申請数を取得
            const pendingRequests = await query(
                `SELECT 
          request_date as date,
          COUNT(*) as count
        FROM absence_requests
        WHERE request_date >= ? AND request_date <= ? AND status = 'pending'
        GROUP BY request_date`,
                [startDate, endDate]
            );

            // 日付をキーとしたオブジェクトに変換
            const statsMap = {};
            dailyStats.forEach(stat => {
                // 日付形式を統一
                const dateStr = typeof stat.date === 'string'
                    ? stat.date.split('T')[0].split(' ')[0]
                    : stat.date.toISOString().split('T')[0];

                statsMap[dateStr] = {
                    absent: stat.absent || 0,
                    late: stat.late || 0,
                    early_departure: stat.early_departure || 0,
                    pending_requests: 0 // 初期化
                };
            });

            // 承認待ち申請数をマージ
            pendingRequests.forEach(req => {
                // 日付形式を合わせる (YYYY-MM-DD)
                const dateStr = typeof req.date === 'string'
                    ? req.date.split('T')[0].split(' ')[0]
                    : req.date.toISOString().split('T')[0];

                if (!statsMap[dateStr]) {
                    statsMap[dateStr] = {
                        absent: 0,
                        late: 0,
                        early_departure: 0,
                        pending_requests: 0
                    };
                }
                statsMap[dateStr].pending_requests = req.count;
            });

            return {
                success: true,
                data: statsMap
            };
        } catch (error) {
            logger.error('日次統計取得エラー:', error.message);
            return {
                success: false,
                message: '日次統計の取得に失敗しました'
            };
        }
    }

    /**
     * 特定日の詳細な出欠情報を取得（教員用）
     * @param {string} date - 日付 (YYYY-MM-DD)
     * @returns {Object} - 出欠詳細情報
     */
    static async getAbsenceDetails(date) {
        try {
            // user_attendance_recordsとdetailed_attendance_recordsの両方から取得
            const records = await query(
                `SELECT 
                  status,
                  reason,
                  user_id,
                  name,
                  student_id
                FROM (
                  SELECT 
                    uar.status,
                    uar.reason,
                    uar.user_id,
                    u.name,
                    s.student_id
                  FROM user_attendance_records uar
                  LEFT JOIN users u ON uar.user_id = u.id
                  LEFT JOIN students s ON u.student_id = s.student_id
                  WHERE uar.date = ? AND uar.status IN ('absent', 'late', 'early_departure')
                  UNION
                  SELECT 
                    dar.status,
                    dar.notes as reason,
                    u.id as user_id,
                    COALESCE(s.name, u.name, dar.student_id) as name,
                    dar.student_id
                  FROM detailed_attendance_records dar
                  LEFT JOIN users u ON dar.student_id = u.student_id
                  LEFT JOIN students s ON dar.student_id = s.student_id
                  WHERE dar.attendance_date = ? AND dar.status IN ('absent', 'late', 'early_departure', 'excused')
                ) combined
                ORDER BY status, name`,
                [date, date]
            );

            // ステータスごとに分類
            const details = {
                absent: [],
                late: [],
                early_departure: []
            };

            records.forEach(record => {
                const studentInfo = {
                    studentId: record.student_id,
                    name: record.name,
                    reason: record.reason,
                    status: record.status
                };

                // excused（公欠）もabsentとして分類
                if (record.status === 'absent' || record.status === 'excused') {
                    details.absent.push(studentInfo);
                } else if (record.status === 'late') {
                    details.late.push(studentInfo);
                } else if (record.status === 'early_departure') {
                    details.early_departure.push(studentInfo);
                }
            });

            return {
                success: true,
                data: details
            };
        } catch (error) {
            logger.error('欠席詳細取得エラー:', error.message);
            return {
                success: false,
                message: '欠席詳細の取得に失敗しました'
            };
        }
    }
}

module.exports = DailyStatsService;
