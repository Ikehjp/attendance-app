/**
 * 統合出欠サービス (新スキーマ対応)
 * attendance_records テーブルを使用した統合出欠管理
 */
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

class UnifiedAttendanceService {
    /**
     * 出欠記録の作成
     * @param {Object} data - 出欠データ
     * @returns {Object} - 結果
     */
    static async createRecord(data) {
        try {
            const {
                organization_id,
                user_id,
                record_type = 'daily',
                reference_id = null,
                record_date,
                status,
                check_in_time = null,
                check_out_time = null,
                reason = null,
                notes = null,
                source = 'manual',
                source_id = null,
                ip_address = null,
                created_by = null
            } = data;

            if (!organization_id || !user_id || !record_date || !status) {
                return {
                    success: false,
                    message: '必須項目が不足しています: organization_id, user_id, record_date, status'
                };
            }

            const result = await query(
                `INSERT INTO attendance_records 
         (organization_id, user_id, record_type, reference_id, record_date, 
          status, check_in_time, check_out_time, reason, notes, 
          source, source_id, ip_address, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           check_in_time = COALESCE(VALUES(check_in_time), check_in_time),
           check_out_time = COALESCE(VALUES(check_out_time), check_out_time),
           reason = COALESCE(VALUES(reason), reason),
           notes = COALESCE(VALUES(notes), notes),
           updated_at = CURRENT_TIMESTAMP`,
                [
                    organization_id, user_id, record_type, reference_id, record_date,
                    status, check_in_time, check_out_time, reason, notes,
                    source, source_id, ip_address, created_by
                ]
            );

            logger.info('出欠記録を作成しました', {
                recordId: result.insertId,
                userId: user_id,
                date: record_date,
                type: record_type
            });

            return {
                success: true,
                message: '出欠記録を作成しました',
                data: { id: result.insertId }
            };
        } catch (error) {
            logger.error('出欠記録作成エラー:', {
                error: error.message,
                data
            });
            return {
                success: false,
                message: error.message || '出欠記録の作成に失敗しました'
            };
        }
    }

    /**
     * チェックイン処理
     */
    static async checkIn(organizationId, userId, options = {}) {
        try {
            const {
                record_type = 'work',
                reference_id = null,
                source = 'manual',
                source_id = null,
                ip_address = null
            } = options;

            const now = new Date();
            const record_date = now.toISOString().split('T')[0];
            const check_in_time = now.toISOString().slice(0, 19).replace('T', ' ');

            return await this.createRecord({
                organization_id: organizationId,
                user_id: userId,
                record_type,
                reference_id,
                record_date,
                status: 'present',
                check_in_time,
                source,
                source_id,
                ip_address
            });
        } catch (error) {
            logger.error('チェックインエラー:', error.message);
            return {
                success: false,
                message: 'チェックインに失敗しました'
            };
        }
    }

    /**
     * チェックアウト処理
     */
    static async checkOut(organizationId, userId, options = {}) {
        try {
            const {
                record_type = 'work',
                reference_id = null
            } = options;

            const now = new Date();
            const record_date = now.toISOString().split('T')[0];
            const check_out_time = now.toISOString().slice(0, 19).replace('T', ' ');

            // 既存のレコードを更新
            const result = await query(
                `UPDATE attendance_records 
         SET check_out_time = ?, updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ? AND user_id = ? AND record_date = ?
           AND record_type = ? AND (reference_id = ? OR (reference_id IS NULL AND ? IS NULL))`,
                [check_out_time, organizationId, userId, record_date, record_type, reference_id, reference_id]
            );

            if (result.affectedRows === 0) {
                // レコードがない場合は新規作成（退勤のみ）
                return await this.createRecord({
                    organization_id: organizationId,
                    user_id: userId,
                    record_type,
                    reference_id,
                    record_date,
                    status: 'present',
                    check_out_time
                });
            }

            logger.info('チェックアウトしました', { userId, date: record_date });

            return {
                success: true,
                message: 'チェックアウトしました'
            };
        } catch (error) {
            logger.error('チェックアウトエラー:', error.message);
            return {
                success: false,
                message: 'チェックアウトに失敗しました'
            };
        }
    }

    /**
     * ユーザーの出欠記録を取得
     */
    static async getUserRecords(userId, options = {}) {
        try {
            const {
                organization_id,
                start_date,
                end_date,
                record_type,
                status,
                limit,
                offset = 0
            } = options;

            let sql = `
        SELECT 
          ar.*,
          u.name as user_name,
          u.identifier as user_identifier
        FROM attendance_records ar
        LEFT JOIN users u ON ar.user_id = u.id
        WHERE ar.user_id = ?
      `;
            const params = [userId];

            if (organization_id) {
                sql += ' AND ar.organization_id = ?';
                params.push(organization_id);
            }

            if (start_date) {
                sql += ' AND ar.record_date >= ?';
                params.push(start_date);
            }

            if (end_date) {
                sql += ' AND ar.record_date <= ?';
                params.push(end_date);
            }

            if (record_type) {
                sql += ' AND ar.record_type = ?';
                params.push(record_type);
            }

            if (status) {
                sql += ' AND ar.status = ?';
                params.push(status);
            }

            sql += ' ORDER BY ar.record_date DESC, ar.created_at DESC';

            if (limit) {
                sql += ' LIMIT ?';
                params.push(parseInt(limit));
            }

            if (offset) {
                sql += ' OFFSET ?';
                params.push(parseInt(offset));
            }

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
     * 日次統計を取得（組織全体）
     */
    static async getDailyStats(organizationId, year, month) {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            const stats = await query(
                `SELECT 
          record_date,
          record_type,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN status = 'early_departure' THEN 1 ELSE 0 END) as early_departure_count,
          SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count,
          COUNT(*) as total_count
        FROM attendance_records
        WHERE organization_id = ?
          AND record_date >= ? AND record_date <= ?
        GROUP BY record_date, record_type
        ORDER BY record_date`,
                [organizationId, startDate, endDate]
            );

            // 日付ごとにまとめる
            const statsMap = {};
            stats.forEach(stat => {
                const dateStr = typeof stat.record_date === 'string'
                    ? stat.record_date.split('T')[0]
                    : stat.record_date.toISOString().split('T')[0];

                if (!statsMap[dateStr]) {
                    statsMap[dateStr] = {
                        present: 0,
                        absent: 0,
                        late: 0,
                        early_departure: 0,
                        excused: 0,
                        total: 0
                    };
                }

                statsMap[dateStr].present += stat.present_count || 0;
                statsMap[dateStr].absent += stat.absent_count || 0;
                statsMap[dateStr].late += stat.late_count || 0;
                statsMap[dateStr].early_departure += stat.early_departure_count || 0;
                statsMap[dateStr].excused += stat.excused_count || 0;
                statsMap[dateStr].total += stat.total_count || 0;
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
     * 月次レポートを取得
     */
    static async getMonthlyReport(userId, year, month, organizationId = null) {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            let sql = `
        SELECT 
          ar.*,
          c.class_code,
          s.subject_name
        FROM attendance_records ar
        LEFT JOIN classes c ON ar.record_type = 'class' AND ar.reference_id = c.id
        LEFT JOIN subjects s ON c.subject_id = s.id
        WHERE ar.user_id = ?
          AND ar.record_date >= ? AND ar.record_date <= ?
      `;
            const params = [userId, startDate, endDate];

            if (organizationId) {
                sql += ' AND ar.organization_id = ?';
                params.push(organizationId);
            }

            sql += ' ORDER BY ar.record_date, ar.record_type';

            const records = await query(sql, params);

            // 統計を計算
            const summary = {
                total_days: lastDay,
                present_count: 0,
                absent_count: 0,
                late_count: 0,
                early_departure_count: 0,
                excused_count: 0,
                attendance_rate: 0
            };

            records.forEach(record => {
                switch (record.status) {
                    case 'present': summary.present_count++; break;
                    case 'absent': summary.absent_count++; break;
                    case 'late': summary.late_count++; break;
                    case 'early_departure': summary.early_departure_count++; break;
                    case 'excused': summary.excused_count++; break;
                }
            });

            const total = summary.present_count + summary.absent_count + summary.late_count +
                summary.early_departure_count + summary.excused_count;
            if (total > 0) {
                summary.attendance_rate = ((summary.present_count + summary.late_count + summary.excused_count) / total * 100).toFixed(1);
            }

            return {
                success: true,
                data: {
                    records,
                    summary
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
     * 今日の出欠状況を取得
     */
    static async getTodayStatus(userId, organizationId = null) {
        try {
            const today = new Date().toISOString().split('T')[0];

            let sql = `
        SELECT * FROM attendance_records
        WHERE user_id = ? AND record_date = ?
      `;
            const params = [userId, today];

            if (organizationId) {
                sql += ' AND organization_id = ?';
                params.push(organizationId);
            }

            sql += ' ORDER BY created_at DESC LIMIT 1';

            const records = await query(sql, params);

            return {
                success: true,
                data: records.length > 0 ? records[0] : null
            };
        } catch (error) {
            logger.error('今日の出欠状況取得エラー:', error.message);
            return {
                success: false,
                message: '今日の出欠状況の取得に失敗しました'
            };
        }
    }

    /**
     * 特定日の欠席詳細を取得
     */
    static async getAbsenceDetails(organizationId, date) {
        try {
            const records = await query(
                `SELECT 
          ar.status,
          ar.reason,
          ar.notes,
          ar.user_id,
          u.name,
          u.identifier as student_id
        FROM attendance_records ar
        LEFT JOIN users u ON ar.user_id = u.id
        WHERE ar.organization_id = ?
          AND ar.record_date = ?
          AND ar.status IN ('absent', 'late', 'early_departure', 'excused')
        ORDER BY ar.status, u.name`,
                [organizationId, date]
            );

            const details = {
                absent: [],
                late: [],
                early_departure: []
            };

            records.forEach(record => {
                const info = {
                    studentId: record.student_id,
                    name: record.name,
                    reason: record.reason || record.notes,
                    status: record.status
                };

                if (record.status === 'absent' || record.status === 'excused') {
                    details.absent.push(info);
                } else if (record.status === 'late') {
                    details.late.push(info);
                } else if (record.status === 'early_departure') {
                    details.early_departure.push(info);
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

    /**
     * QRスキャンによる出欠記録
     */
    static async recordByQRScan(data) {
        try {
            const {
                organization_id,
                user_id,
                qr_code_id,
                class_id = null,
                ip_address,
                is_allowed
            } = data;

            if (!is_allowed) {
                logger.warn('IPアドレスが許可されていません', { ip_address, userId: user_id });
                return {
                    success: false,
                    message: 'このIPアドレスからの打刻は許可されていません'
                };
            }

            const now = new Date();
            const record_date = now.toISOString().split('T')[0];
            const check_in_time = now.toISOString().slice(0, 19).replace('T', ' ');

            return await this.createRecord({
                organization_id,
                user_id,
                record_type: class_id ? 'class' : 'daily',
                reference_id: class_id,
                record_date,
                status: 'present',
                check_in_time,
                source: 'qr_scan',
                source_id: qr_code_id,
                ip_address
            });
        } catch (error) {
            logger.error('QRスキャン記録エラー:', error.message);
            return {
                success: false,
                message: 'QRスキャンによる記録に失敗しました'
            };
        }
    }
}

module.exports = UnifiedAttendanceService;
