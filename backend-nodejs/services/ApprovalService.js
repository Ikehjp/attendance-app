const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const NotificationService = require('./NotificationService');

/**
 * 承認フロー管理サービス
 */
class ApprovalService {
    /**
     * 申請を承認
     * @param {number} requestId - 申請ID
     * @param {number} approverId - 承認者ID
     * @param {string} comment - コメント（オプション）
     * @returns {Promise<Object>} 承認結果
     */
    static async approveRequest(requestId, approverId, comment = null) {
        try {
            return await transaction(async (conn) => {
                // 承認記録を追加
                const approvalSql = `
          INSERT INTO request_approvals (request_id, approver_id, action, comment)
          VALUES (?, ?, 'approve', ?)
        `;
                await conn.query(approvalSql, [requestId, approverId, comment]);

                // 申請のステータスを更新
                const updateSql = `
          UPDATE absence_requests
          SET status = 'approved'
          WHERE id = ?
        `;
                await conn.query(updateSql, [requestId]);

                // 申請情報を取得
                const requestSql = `
          SELECT ar.*, COALESCE(s.name, u.name, ar.student_id) as student_name
          FROM absence_requests ar
          LEFT JOIN students s ON ar.student_id = s.student_id
          LEFT JOIN users u ON ar.student_id = u.student_id
          WHERE ar.id = ?
        `;
                const [requestData] = await conn.query(requestSql, [requestId]);

                // 出欠ステータスを上書き（class_session_idの有無に関わらず）
                if (requestData && requestData.length > 0) {
                    await this._updateAttendanceStatus(conn, requestData[0]);
                }

                // 通知を送信（非同期）
                const studentId = requestData[0]?.student_id;
                const requestType = requestData[0]?.request_type;
                const requestDate = requestData[0]?.request_date;
                const formattedDate = requestDate ? new Date(requestDate).toLocaleDateString('ja-JP') : '';

                logger.info('承認通知送信準備', { studentId, requestType, requestDate });

                if (studentId) {
                    NotificationService.createNotification({
                        student_id: studentId,
                        type: 'approval',
                        title: '✅ 申請が承認されました',
                        message: `あなたの${formattedDate ? formattedDate + 'の' : ''}申請（${ApprovalService._getRequestTypeLabel(requestType)}）が承認されました。\nカレンダーで確認してください。`,
                        priority: 'medium'
                    }).then(() => {
                        logger.info('承認通知送信成功', { studentId });
                    }).catch(err => logger.error('通知送信エラー:', err));
                }

                return {
                    success: true,
                    requestId,
                    newStatus: 'approved'
                };
            });
        } catch (error) {
            logger.error('承認処理エラー:', error);
            throw error;
        }
    }

    /**
     * 申請を却下
     * @param {number} requestId - 申請ID
     * @param {number} approverId - 承認者ID
     * @param {string} comment - コメント（オプション）
     * @returns {Promise<Object>} 却下結果
     */
    static async rejectRequest(requestId, approverId, comment = null) {
        try {
            return await transaction(async (conn) => {
                // 却下記録を追加
                const approvalSql = `
          INSERT INTO request_approvals (request_id, approver_id, action, comment)
          VALUES (?, ?, 'reject', ?)
        `;
                await conn.query(approvalSql, [requestId, approverId, comment]);

                // 申請のステータスを更新
                const updateSql = `
          UPDATE absence_requests
          SET status = 'rejected'
          WHERE id = ?
        `;
                await conn.query(updateSql, [requestId]);

                // 申請情報を取得
                const requestSql = `
          SELECT ar.*, COALESCE(s.name, u.name, ar.student_id) as student_name
          FROM absence_requests ar
          LEFT JOIN students s ON ar.student_id = s.student_id
          LEFT JOIN users u ON ar.student_id = u.student_id
          WHERE ar.id = ?
        `;
                const [requestData] = await conn.query(requestSql, [requestId]);

                // 通知を送信（非同期）
                const studentId = requestData[0]?.student_id;
                const requestType = requestData[0]?.request_type;
                const requestDate = requestData[0]?.request_date;
                const formattedDate = requestDate ? new Date(requestDate).toLocaleDateString('ja-JP') : '';

                logger.info('却下通知送信準備', { studentId, requestType, requestDate });

                if (studentId) {
                    NotificationService.createNotification({
                        student_id: studentId,
                        type: 'rejection',
                        title: '❌ 申請が却下されました',
                        message: `あなたの${formattedDate ? formattedDate + 'の' : ''}申請（${ApprovalService._getRequestTypeLabel(requestType)}）が却下されました。${comment ? `\n理由: ${comment}` : ''}\nカレンダーで確認してください。`,
                        priority: 'high'
                    }).then(() => {
                        logger.info('却下通知送信成功', { studentId });
                    }).catch(err => logger.error('通知送信エラー:', err));
                }

                return {
                    success: true,
                    requestId,
                    newStatus: 'rejected'
                };
            });
        } catch (error) {
            logger.error('却下処理エラー:', error);
            throw error;
        }
    }

    /**
     * 出欠ステータスを上書き（内部メソッド）
     * @param {Object} conn - データベース接続
     * @param {Object} requestData - 申請データ
     * @returns {Promise<void>}
     */
    static async _updateAttendanceStatus(conn, requestData) {
        try {
            const { student_id, class_session_id, request_type, request_date } = requestData;

            if (!student_id || !request_date) {
                logger.warn('出欠ステータス更新スキップ: student_id または request_date がありません');
                return;
            }

            // request_typeに応じた出欠ステータスを決定
            let newStatus;
            switch (request_type) {
                case 'official_absence':
                    newStatus = 'excused'; // 公欠
                    break;
                case 'official_late':
                    newStatus = 'late'; // 公認遅刻
                    break;
                case 'early_departure':
                    newStatus = 'early_departure'; // 早退
                    break;
                case 'absence':
                case 'absent':
                    newStatus = 'absent'; // 欠席
                    break;
                case 'late':
                    newStatus = 'late'; // 遅刻
                    break;
                default:
                    newStatus = 'excused';
            }

            // 日付をフォーマット（タイムゾーン問題を回避）
            let formattedDate;
            if (typeof request_date === 'string') {
                // 文字列の場合、YYYY-MM-DD部分のみを抽出
                formattedDate = request_date.split('T')[0].split(' ')[0];
            } else if (request_date instanceof Date) {
                // Dateオブジェクトの場合、ローカルタイムを使用
                const year = request_date.getFullYear();
                const month = String(request_date.getMonth() + 1).padStart(2, '0');
                const day = String(request_date.getDate()).padStart(2, '0');
                formattedDate = `${year}-${month}-${day}`;
            } else {
                // その他の場合
                formattedDate = String(request_date).split('T')[0].split(' ')[0];
            }

            logger.info(`日付フォーマット: 入力=${request_date}, 出力=${formattedDate}`);

            // 既存の出欠記録を更新、なければ作成
            // class_idがnullの場合は0を使用
            const classId = class_session_id || 0;

            const upsertSql = `
        INSERT INTO detailed_attendance_records 
        (student_id, class_id, attendance_date, status, notes)
        VALUES (?, ?, ?, ?, '承認済み申請による自動更新')
        ON DUPLICATE KEY UPDATE 
          status = ?,
          notes = CONCAT(IFNULL(notes, ''), ' | 承認済み申請による更新')
      `;

            await conn.query(upsertSql, [
                student_id,
                classId,
                formattedDate,
                newStatus,
                newStatus
            ]);

            logger.info(`出欠ステータス更新: student=${student_id}, date=${formattedDate}, status=${newStatus}`);
        } catch (error) {
            logger.error('出欠ステータス更新エラー:', error);
            // エラーをスローせず、ログのみ記録（承認処理自体は成功とする）
        }
    }

    /**
     * 申請の承認履歴を取得
     * @param {number} requestId - 申請ID
     * @returns {Promise<Array>} 承認履歴
     */
    static async getApprovalHistory(requestId) {
        try {
            const sql = `
        SELECT 
          ra.id, ra.request_id, ra.approver_id, ra.action, ra.comment, ra.approved_at,
          u.name as approver_name, u.email as approver_email
        FROM request_approvals ra
        JOIN users u ON ra.approver_id = u.id
        WHERE ra.request_id = ?
        ORDER BY ra.approved_at DESC
      `;

            return await query(sql, [requestId]);
        } catch (error) {
            logger.error('承認履歴取得エラー:', error);
            throw error;
        }
    }

    /**
     * リクエストタイプのラベルを取得
     * @param {string} type - リクエストタイプ
     * @returns {string} ラベル
     */
    static _getRequestTypeLabel(type) {
        const labels = {
            'absence': '欠席届',
            'official_absence': '公欠届',
            'official_late': '公遅刻届',
            'early_departure': '早退届',
            'absent': '欠席届'
        };
        return labels[type] || type || '申請';
    }
}

module.exports = ApprovalService;
