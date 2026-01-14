const { query } = require('../config/database');
const logger = require('../utils/logger');
const { attendanceToCSV, eventParticipantsToCSV } = require('../utils/csvGenerator');

/**
 * エクスポートサービス
 */
class ExportService {
    /**
     * 出席記録をエクスポート
     * @param {number} userId - ユーザーID
     * @param {string} userRole - ユーザーロール
     * @param {string} startDate - 開始日 (YYYY-MM-DD)
     * @param {string} endDate - 終了日 (YYYY-MM-DD)
     * @param {number} targetUserId - 対象ユーザーID（オプション、管理者のみ）
     * @returns {Promise<string>} CSV文字列
     */
    static async exportAttendanceRecords(userId, userRole, startDate, endDate, targetUserId = null) {
        try {
            // 権限チェック
            let queryUserId = userId;
            if (targetUserId) {
                if (userRole !== 'admin' && userRole !== 'owner' && userRole !== 'teacher') {
                    throw new Error('管理者のみが他のユーザーのデータをエクスポートできます');
                }
                queryUserId = targetUserId;
            }

            // 出席記録を取得
            const records = await query(
                `SELECT 
          DATE_FORMAT(date, '%Y-%m-%d') as date,
          TIME_FORMAT(check_in_time, '%H:%i') as start_time,
          TIME_FORMAT(check_out_time, '%H:%i') as end_time,
          status,
          reason as notes
        FROM user_attendance_records
        WHERE user_id = ? AND date BETWEEN ? AND ?
        ORDER BY date ASC, check_in_time ASC`,
                [queryUserId, startDate, endDate]
            );

            logger.info('出席記録エクスポート', {
                userId,
                targetUserId: queryUserId,
                startDate,
                endDate,
                recordCount: records.length
            });

            return attendanceToCSV(records);
        } catch (error) {
            logger.error('出席記録エクスポートエラー:', error.message);
            throw error;
        }
    }

    /**
     * イベント参加者をエクスポート
     * @param {number} userId - ユーザーID
     * @param {string} userRole - ユーザーロール
     * @param {number} eventId - イベントID
     * @returns {Promise<string>} CSV文字列
     */
    static async exportEventParticipants(userId, userRole, eventId) {
        try {
            // イベント情報を取得
            const events = await query(
                'SELECT id, title, event_date, created_by FROM events WHERE id = ?',
                [eventId]
            );

            if (events.length === 0) {
                throw new Error('イベントが見つかりません');
            }

            const event = events[0];

            // 権限チェック（管理者またはイベント作成者のみ）
            if (userRole !== 'admin' && userRole !== 'owner' && userRole !== 'teacher' && event.created_by !== userId) {
                throw new Error('このイベントの参加者リストをエクスポートする権限がありません');
            }

            // 参加者を取得
            const participants = await query(
                `SELECT 
          s.student_id,
          s.name,
          s.email,
          ep.response_status,
          ep.responded_at
        FROM event_participants ep
        JOIN students s ON ep.student_id = s.student_id
        WHERE ep.event_id = ?
        ORDER BY s.student_id ASC`,
                [eventId]
            );

            logger.info('イベント参加者エクスポート', {
                userId,
                eventId,
                participantCount: participants.length
            });

            return eventParticipantsToCSV(event, participants);
        } catch (error) {
            logger.error('イベント参加者エクスポートエラー:', error.message);
            throw error;
        }
    }

    /**
     * 全学生の出席記録を一括エクスポート（管理者のみ）
     * @param {number} userId - ユーザーID
     * @param {string} userRole - ユーザーロール
     * @param {string} startDate - 開始日 (YYYY-MM-DD)
     * @param {string} endDate - 終了日 (YYYY-MM-DD)
     * @returns {Promise<string>} CSV文字列
     */
    static async exportAllAttendanceRecords(userId, userRole, startDate, endDate) {
        try {
            // 管理者チェック
            if (userRole !== 'admin' && userRole !== 'owner' && userRole !== 'teacher') {
                throw new Error('管理者のみが全データをエクスポートできます');
            }

            // 全出席記録を取得
            const records = await query(
                `SELECT 
          u.name as user_name,
          u.student_id,
          DATE_FORMAT(a.date, '%Y-%m-%d') as date,
          TIME_FORMAT(a.check_in_time, '%H:%i') as start_time,
          TIME_FORMAT(a.check_out_time, '%H:%i') as end_time,
          a.status,
          a.reason as notes
        FROM user_attendance_records a
        JOIN users u ON a.user_id = u.id
        WHERE a.date BETWEEN ? AND ?
        ORDER BY u.student_id ASC, a.date ASC, a.check_in_time ASC`,
                [startDate, endDate]
            );

            logger.info('全出席記録エクスポート', {
                userId,
                startDate,
                endDate,
                recordCount: records.length
            });

            // ヘッダーに「氏名」「学生ID」を追加
            const headers = ['氏名', '学生ID', '日付', '曜日', '開始時刻', '終了時刻', 'ステータス', '備考'];
            const fields = ['user_name', 'student_id', 'date', 'day_of_week', 'start_time', 'end_time', 'status', 'notes'];

            const { arrayToCSV } = require('../utils/csvGenerator');

            // データを整形
            const formattedData = records.map(record => ({
                user_name: record.user_name,
                student_id: record.student_id || '-',
                date: record.date,
                day_of_week: getDayOfWeek(record.date),
                start_time: record.start_time || '-',
                end_time: record.end_time || '-',
                status: getStatusLabel(record.status),
                notes: record.notes || ''
            }));

            return arrayToCSV(formattedData, headers, fields);
        } catch (error) {
            logger.error('全出席記録エクスポートエラー:', error.message);
            throw error;
        }
    }
}

/**
 * 日付から曜日を取得（ヘルパー関数）
 */
const getDayOfWeek = (dateStr) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const date = new Date(dateStr);
    return days[date.getDay()];
};

/**
 * ステータスラベル取得（ヘルパー関数）
 */
const getStatusLabel = (status) => {
    const statusMap = {
        'present': '出席',
        'absent': '欠席',
        'late': '遅刻',
        'excused': '公欠'
    };
    return statusMap[status] || status;
};

module.exports = ExportService;
