const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * 招待システムサービス
 */
class InvitationService {
    /**
     * 招待を作成
     * @param {number} organizationId - 組織ID
     * @param {string} email - 招待対象のメールアドレス
     * @param {string} role - 招待ロール（teacher | student）
     * @param {number} inviterId - 招待者のユーザーID
     * @returns {Promise<Object>} 招待情報（トークン含む）
     */
    static async createInvitation(organizationId, email, role, inviterId) {
        try {
            // メールアドレスの重複チェック（同じ組織内）
            const existingUsers = await query(
                'SELECT id FROM users WHERE email = ? AND organization_id = ?',
                [email, organizationId]
            );

            if (existingUsers.length > 0) {
                return {
                    success: false,
                    message: 'このメールアドレスは既に登録されています'
                };
            }

            // 未受諾の招待があるかチェック
            const existingInvitations = await query(
                'SELECT id FROM invitations WHERE email = ? AND organization_id = ? AND accepted_at IS NULL AND expires_at > NOW()',
                [email, organizationId]
            );

            if (existingInvitations.length > 0) {
                return {
                    success: false,
                    message: 'このメールアドレスには既に招待が送信されています'
                };
            }

            // トークン生成
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日間

            // 招待レコード作成
            const result = await query(
                'INSERT INTO invitations (organization_id, email, role, token, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
                [organizationId, email, role, token, inviterId, expiresAt]
            );

            logger.info('招待を作成しました', {
                invitationId: result.insertId,
                organizationId,
                email,
                role,
                inviterId
            });

            return {
                success: true,
                message: '招待を送信しました',
                data: {
                    invitationId: result.insertId,
                    token,
                    expiresAt: expiresAt.toISOString()
                }
            };
        } catch (error) {
            logger.error('招待作成エラー:', error);
            return {
                success: false,
                message: '招待の作成に失敗しました',
                error: error.message
            };
        }
    }

    /**
     * 招待トークンを検証
     * @param {string} token - 招待トークン
     * @returns {Promise<Object>} 招待情報
     */
    static async validateInvitation(token) {
        try {
            const invitations = await query(
                `SELECT 
          i.id, i.organization_id, i.email, i.role, i.expires_at,
          o.name as organization_name
        FROM invitations i
        JOIN organizations o ON i.organization_id = o.id
        WHERE i.token = ? AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
                [token]
            );

            if (invitations.length === 0) {
                return {
                    success: false,
                    message: '無効または期限切れの招待リンクです'
                };
            }

            const invitation = invitations[0];

            return {
                success: true,
                data: {
                    invitationId: invitation.id,
                    organizationId: invitation.organization_id,
                    organizationName: invitation.organization_name,
                    email: invitation.email,
                    role: invitation.role,
                    expiresAt: invitation.expires_at
                }
            };
        } catch (error) {
            logger.error('招待検証エラー:', error);
            return {
                success: false,
                message: '招待の検証に失敗しました',
                error: error.message
            };
        }
    }

    /**
     * 招待を受諾してアカウント作成
     * @param {string} token - 招待トークン
     * @param {Object} userData - ユーザー登録データ
     * @returns {Promise<Object>} 作成されたユーザー情報
     */
    static async acceptInvitation(token, userData) {
        try {
            const result = await transaction(async (conn) => {
                // 招待情報を取得
                const invitations = await query(
                    `SELECT id, organization_id, email, role 
          FROM invitations 
          WHERE token = ? AND accepted_at IS NULL AND expires_at > NOW()`,
                    [token],
                    conn
                );

                if (invitations.length === 0) {
                    throw new Error('無効または期限切れの招待リンクです');
                }

                const invitation = invitations[0];

                // メールアドレスの整合性チェック
                if (userData.email && userData.email !== invitation.email) {
                    throw new Error('招待されたメールアドレスと異なります');
                }

                // パスワードのハッシュ化
                const hashedPassword = await bcrypt.hash(userData.password, 10);

                // ユーザー作成
                const userResult = await query(
                    'INSERT INTO users (name, email, password, role, organization_id) VALUES (?, ?, ?, ?, ?)',
                    [userData.name, invitation.email, hashedPassword, invitation.role, invitation.organization_id],
                    conn
                );

                // 招待を受諾済みにマーク
                await query(
                    'UPDATE invitations SET accepted_at = NOW() WHERE id = ?',
                    [invitation.id],
                    conn
                );

                logger.info('招待を受諾し、ユーザーを作成しました', {
                    userId: userResult.insertId,
                    organizationId: invitation.organization_id,
                    email: invitation.email,
                    role: invitation.role
                });

                return {
                    success: true,
                    message: 'アカウントが作成されました',
                    data: {
                        userId: userResult.insertId,
                        email: invitation.email,
                        role: invitation.role,
                        organizationId: invitation.organization_id
                    }
                };
            });

            return result;
        } catch (error) {
            logger.error('招待受諾エラー:', error);
            return {
                success: false,
                message: error.message || '招待の受諾に失敗しました',
                error: error.message
            };
        }
    }

    /**
     * 招待一覧を取得
     * @param {number} organizationId - 組織ID
     * @param {Object} options - フィルタオプション
     * @returns {Promise<Object>} 招待一覧
     */
    static async getInvitations(organizationId, options = {}) {
        try {
            const { status = 'all', limit = 50, offset = 0 } = options;

            let sql = `
        SELECT 
          i.id, i.email, i.role, i.expires_at, i.accepted_at, i.created_at,
          u.name as invited_by_name
        FROM invitations i
        LEFT JOIN users u ON i.invited_by = u.id
        WHERE i.organization_id = ?
      `;
            const params = [organizationId];

            if (status === 'pending') {
                sql += ' AND i.accepted_at IS NULL AND i.expires_at > NOW()';
            } else if (status === 'accepted') {
                sql += ' AND i.accepted_at IS NOT NULL';
            } else if (status === 'expired') {
                sql += ' AND i.accepted_at IS NULL AND i.expires_at <= NOW()';
            }

            sql += ' ORDER BY i.created_at DESC';

            if (limit) {
                sql += ' LIMIT ?';
                params.push(Number(limit));
            }
            if (offset) {
                sql += ' OFFSET ?';
                params.push(Number(offset));
            }

            const invitations = await query(sql, params);

            return {
                success: true,
                data: invitations
            };
        } catch (error) {
            logger.error('招待一覧取得エラー:', error);
            return {
                success: false,
                message: '招待一覧の取得に失敗しました',
                error: error.message
            };
        }
    }

    /**
     * 招待を取り消し（削除）
     * @param {number} invitationId - 招待ID
     * @param {number} organizationId - 組織ID（権限チェック用）
     * @returns {Promise<Object>} 削除結果
     */
    static async cancelInvitation(invitationId, organizationId) {
        try {
            const result = await query(
                'DELETE FROM invitations WHERE id = ? AND organization_id = ? AND accepted_at IS NULL',
                [invitationId, organizationId]
            );

            if (result.affectedRows === 0) {
                return {
                    success: false,
                    message: '招待が見つからないか、既に受諾済みです'
                };
            }

            logger.info('招待を取り消しました', { invitationId, organizationId });

            return {
                success: true,
                message: '招待を取り消しました'
            };
        } catch (error) {
            logger.error('招待取り消しエラー:', error);
            return {
                success: false,
                message: '招待の取り消しに失敗しました',
                error: error.message
            };
        }
    }
}

module.exports = InvitationService;
