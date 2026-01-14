const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * IPアドレスを整数に変換（IPv4のみ）
 * @param {string} ip - IPアドレス
 * @returns {number} 整数表現のIP
 */
function ipToInt(ip) {
    const parts = ip.split('.');
    return (parseInt(parts[0]) * 16777216) +
        (parseInt(parts[1]) * 65536) +
        (parseInt(parts[2]) * 256) +
        parseInt(parts[3]);
}

/**
 * セキュリティ管理サービス
 */
class SecurityService {
    /**
     * IPアドレスが許可範囲内かチェック
     * @param {string} ipAddress - チェック対象のIPアドレス
     * @returns {Promise<Object>} { allowed: boolean, matchedRange: Object|null }
     */
    static async isIPAllowed(ipAddress) {
        try {
            // 許可されているIP範囲を取得
            const sql = `
        SELECT id, name, ip_start, ip_end, description
        FROM allowed_ip_ranges
        WHERE is_active = TRUE
      `;

            const ipRanges = await query(sql);

            // IPv4チェック（簡易版）
            const ipInt = ipToInt(ipAddress);

            for (const range of ipRanges) {
                const startInt = ipToInt(range.ip_start);
                const endInt = ipToInt(range.ip_end);

                if (ipInt >= startInt && ipInt <= endInt) {
                    return {
                        allowed: true,
                        matchedRange: {
                            id: range.id,
                            name: range.name,
                            description: range.description
                        }
                    };
                }
            }

            // どのIP範囲にも一致しない場合
            return {
                allowed: false,
                matchedRange: null
            };
        } catch (error) {
            logger.error('IP許可チェックエラー:', error);
            // エラーの場合は安全側に倒す（許可しない）
            return {
                allowed: false,
                matchedRange: null,
                error: error.message
            };
        }
    }

    /**
     * スキャンログを記録
     * @param {Object} logData - ログデータ
     * @returns {Promise<Object>} 記録結果
     */
    static async logScan(logData) {
        try {
            const { qrCodeId, studentId, ipAddress, isAllowed, userAgent, result, errorMessage } = logData;

            const sql = `
        INSERT INTO scan_logs 
        (qr_code_id, student_id, ip_address, is_allowed, user_agent, result, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

            const insertResult = await query(sql, [
                qrCodeId,
                studentId,
                ipAddress,
                isAllowed,
                userAgent || null,
                result,
                errorMessage || null
            ]);

            return {
                success: true,
                logId: insertResult.insertId
            };
        } catch (error) {
            logger.error('スキャンログ記録エラー:', error);
            throw error;
        }
    }

    /**
     * スキャンログ一覧を取得
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} スキャンログ一覧
     */
    static async getScanLogs(options = {}) {
        try {
            const { studentId, qrCodeId, startDate, endDate, result, limit = 100, offset = 0 } = options;

            let sql = `
        SELECT 
          sl.id, sl.qr_code_id, sl.student_id, sl.scanned_at,
          sl.ip_address, sl.is_allowed, sl.user_agent, sl.result, sl.error_message,
          qr.location_name,
          s.name as student_name
        FROM scan_logs sl
        LEFT JOIN qr_codes qr ON sl.qr_code_id = qr.id
        LEFT JOIN students s ON sl.student_id = s.student_id
        WHERE 1=1
      `;

            const params = [];

            if (studentId) {
                sql += ' AND sl.student_id = ?';
                params.push(studentId);
            }

            if (qrCodeId) {
                sql += ' AND sl.qr_code_id = ?';
                params.push(qrCodeId);
            }

            if (startDate) {
                sql += ' AND sl.scanned_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                sql += ' AND sl.scanned_at <= ?';
                params.push(endDate);
            }

            if (result) {
                sql += ' AND sl.result = ?';
                params.push(result);
            }

            sql += ' ORDER BY sl.scanned_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            return await query(sql, params);
        } catch (error) {
            logger.error('スキャンログ取得エラー:', error);
            throw error;
        }
    }

    /**
     * 許可IP範囲を追加
     * @param {Object} rangeData - IP範囲データ
     * @returns {Promise<Object>} 追加結果
     */
    static async addAllowedIPRange(rangeData) {
        try {
            const { name, ipStart, ipEnd, description } = rangeData;

            if (!name || !ipStart || !ipEnd) {
                throw new Error('名前、開始IP、終了IPは必須です');
            }

            const sql = `
        INSERT INTO allowed_ip_ranges (name, ip_start, ip_end, description, is_active)
        VALUES (?, ?, ?, ?, TRUE)
      `;

            const result = await query(sql, [name, ipStart, ipEnd, description || null]);

            return {
                success: true,
                id: result.insertId
            };
        } catch (error) {
            logger.error('IP範囲追加エラー:', error);
            throw error;
        }
    }

    /**
     * 許可IP範囲一覧を取得
     * @param {boolean} activeOnly - 有効なもののみ取得するか
     * @returns {Promise<Array>} IP範囲一覧
     */
    static async getIPRanges(activeOnly = true) {
        try {
            let sql = `
        SELECT id, name, ip_start, ip_end, description, is_active, created_at, updated_at
        FROM allowed_ip_ranges
      `;

            if (activeOnly) {
                sql += ' WHERE is_active = TRUE';
            }

            sql += ' ORDER BY created_at DESC';

            return await query(sql);
        } catch (error) {
            logger.error('IP範囲取得エラー:', error);
            throw error;
        }
    }

    /**
     * 許可IP範囲を更新
     * @param {number} id - IP範囲ID
     * @param {Object} updateData - 更新データ
     * @returns {Promise<Object>} 更新結果
     */
    static async updateIPRange(id, updateData) {
        try {
            const { name, ipStart, ipEnd, description, isActive } = updateData;

            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }
            if (ipStart !== undefined) {
                updateFields.push('ip_start = ?');
                updateValues.push(ipStart);
            }
            if (ipEnd !== undefined) {
                updateFields.push('ip_end = ?');
                updateValues.push(ipEnd);
            }
            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description);
            }
            if (isActive !== undefined) {
                updateFields.push('is_active = ?');
                updateValues.push(isActive);
            }

            if (updateFields.length === 0) {
                throw new Error('更新するフィールドがありません');
            }

            updateValues.push(id);

            const sql = `
        UPDATE allowed_ip_ranges
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

            await query(sql, updateValues);

            return { success: true, id };
        } catch (error) {
            logger.error('IP範囲更新エラー:', error);
            throw error;
        }
    }

    /**
     * 許可IP範囲を削除
     * @param {number} id - IP範囲ID
     * @returns {Promise<Object>} 削除結果
     */
    static async deleteIPRange(id) {
        try {
            const sql = 'DELETE FROM allowed_ip_ranges WHERE id = ?';
            await query(sql, [id]);

            return { success: true, id };
        } catch (error) {
            logger.error('IP範囲削除エラー:', error);
            throw error;
        }
    }

    /**
     * 不正アクセス試行の統計を取得
     * @param {Object} options - オプション
     * @returns {Promise<Object>} 統計情報
     */
    static async getSecurityStats(options = {}) {
        try {
            const { startDate, endDate } = options;

            let dateCondition = '';
            const params = [];

            if (startDate) {
                dateCondition += ' AND scanned_at >= ?';
                params.push(startDate);
            }
            if (endDate) {
                dateCondition += ' AND scanned_at <= ?';
                params.push(endDate);
            }

            // 総スキャン数
            const totalSql = `
        SELECT COUNT(*) as total
        FROM scan_logs
        WHERE 1=1 ${dateCondition}
      `;
            const totalResult = await query(totalSql, params);

            // 成功/失敗の内訳
            const resultsSql = `
        SELECT result, COUNT(*) as count
        FROM scan_logs
        WHERE 1=1 ${dateCondition}
        GROUP BY result
      `;
            const resultsBreakdown = await query(resultsSql, params);

            // IP拒否の回数
            const deniedSql = `
        SELECT COUNT(*) as count
        FROM scan_logs
        WHERE is_allowed = FALSE ${dateCondition}
      `;
            const deniedResult = await query(deniedSql, params);

            return {
                totalScans: totalResult[0].total,
                resultsBreakdown,
                deniedByIP: deniedResult[0].count
            };
        } catch (error) {
            logger.error('セキュリティ統計取得エラー:', error);
            throw error;
        }
    }
}

module.exports = SecurityService;
