const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * AttendanceService 拡張メソッド
 * 時刻ベース出欠判定と QR連携の機能を提供
 */
class AttendanceServiceExtension {
    /**
     * 時刻ベースの出欠ステータス判定
     * @param {Date} scanTime - スキャン時刻
     * @param {string} classStartTime - 授業開始時刻 (HH:MM:SS形式)
     * @param {string} classDate - 授業日 (YYYY-MM-DD形式)
     * @returns {Promise<string>} 出欠ステータス (present/late/absent)
     */
    static async determineAttendanceStatus(scanTime, classStartTime, classDate) {
        try {
            // 系統設定から遅刻閉切分数を取得（デフォルト15分）
            let lateThresholdMinutes = 15;

            try {
                const settingsSql = `
          SELECT setting_value 
          FROM system_settings 
          WHERE setting_key = 'late_threshold_minutes'
        `;
                const settings = await query(settingsSql);
                if (settings.length > 0) {
                    lateThresholdMinutes = parseInt(settings[0].setting_value) || 15;
                }
            } catch (error) {
                logger.warn('遅刻設定の取得に失敗、デフォルト値を使用:', error.message);
            }

            // 授業開始時刻をDateオブジェクトに変換
            const [hours, minutes, seconds] = classStartTime.split(':').map(Number);
            const classStart = new Date(classDate);
            classStart.setHours(hours, minutes, seconds || 0, 0);

            // スキャン時刻と開始時刻の差分を計算（分単位）
            const diffMs = scanTime - classStart;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            // ステータス判定
            if (diffMinutes < 0) {
                // 授業開始前のスキャン = 出席
                return 'present';
            } else if (diffMinutes <= lateThresholdMinutes) {
                // 開始後、遅刻閉切分数以内 = 出席
                return 'present';
            } else {
                // 遅刻閉切分数を超えている = 遅刻
                return 'late';
            }
        } catch (error) {
            logger.error('出欠ステータス判定エラー:', error);
            // エラー時は安全側に倒して遅刻とする
            return 'late';
        }
    }

    /**
     * 時間割との照合で現在の授業を取得
     * @param {string} studentId - 学生ID
     * @param {Date} scanTime - スキャン時刻
     * @returns {Promise<Object|null>} 該当する授業セッション
     */
    static async findCurrentClass(studentId, scanTime = new Date()) {
        try {
            const currentDate = scanTime.toISOString().split('T')[0];
            const currentTime = scanTime.toTimeString().split(' ')[0];

            const sql = `
        SELECT 
          cs.id, cs.subject_id, cs class_date, cs.start_time, cs.end_time,
          s.subject_name, cs.teacher_name, cs.room,
          t.group_id, g.name as group_name
        FROM class_sessions cs
        JOIN subjects s ON cs.subject_id = s.id
        JOIN timetables t ON cs.timetable_id = t.id
        JOIN groups g ON t.group_id = g.id
        JOIN group_members gm ON t.group_id = gm.group_id
        WHERE gm.student_id = ?
          AND cs.class_date = ?
          AND cs.start_time <= ?
          AND cs.end_time >= ?
          AND cs.is_cancelled = FALSE
          AND gm.status = 'active'
        ORDER BY cs.start_time ASC
        LIMIT 1
      `;

            const results = await query(sql, [studentId, currentDate, currentTime, currentTime]);

            if (results.length > 0) {
                return results[0];
            }

            return null;
        } catch (error) {
            logger.error('現在の授業検索エラー:', error);
            return null;
        }
    }

    /**
     * QRスキャンによる自動出席記録（統合型システム用）
     * @param {string} studentId - 学生ID
     * @param {string} qrCode - QRコード
     * @param {string} ipAddress - IPアドレス
     * @param {string} userAgent - ユーザーエージェント
     * @returns {Promise<Object>} 記録結果
     */
    static async recordAttendanceByQR(studentId, qrCode, ipAddress, userAgent) {
        try {
            const QRService = require('./QRService');

            // QRServiceを使用してスキャン処理
            const result = await QRService.scanQRCodeWithIPValidation(
                { qrCode, studentId },
                ipAddress,
                userAgent
            );

            return result;
        } catch (error) {
            logger.error('QRスキャンによる出席記録エラー:', error);
            return {
                success: false,
                message: '出席記録に失敗しました',
                error: error.message
            };
        }
    }
}

module.exports = AttendanceServiceExtension;
