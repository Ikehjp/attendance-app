const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const UserService = require('../services/UserService');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 管理者用: ユーザー一覧取得
 * ロール変更ステータス付き
 */
router.get('/users', authenticate, requireRole(['admin', 'owner']), async (req, res, next) => {
    try {
        const { role, search } = req.query;

        let sql = `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        student_id,
        organization_id,
        last_role_update,
        created_at
      FROM users
      WHERE 1=1
    `;
        const params = [];

        if (role && ['student', 'employee', 'teacher', 'admin', 'owner'].includes(role)) {
            sql += ' AND role = ?';
            params.push(role);
        }

        if (search) {
            sql += ' AND (name LIKE ? OR email LIKE ? OR student_id LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        sql += ' ORDER BY created_at DESC';

        const users = await query(sql, params);

        // 各ユーザーに降格可能かどうかのフラグを追加
        const usersWithStatus = users.map(user => {
            const canDemote = canDemoteUser(user.last_role_update);
            const nextDemoteDate = getNextDemoteDate(user.last_role_update);

            return {
                ...user,
                canPromote: true, // 昇格はいつでも可能
                canDemote,
                nextDemoteDate
            };
        });

        res.json({
            success: true,
            data: {
                users: usersWithStatus,
                total: usersWithStatus.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 管理者用: 特定ユーザーの詳細取得
 */
router.get('/users/:userId', authenticate, requireRole(['admin', 'owner']), [
    param('userId').isInt().withMessage('有効なユーザーIDを指定してください')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.params;

        const users = await query(
            `SELECT 
        id, name, email, role, student_id, organization_id,
        last_role_update, created_at, updated_at
       FROM users WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'ユーザーが見つかりません' });
        }

        const user = users[0];
        const canDemote = canDemoteUser(user.last_role_update);
        const nextDemoteDate = getNextDemoteDate(user.last_role_update);

        res.json({
            success: true,
            data: {
                user: {
                    ...user,
                    canPromote: true,
                    canDemote,
                    nextDemoteDate
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 管理者用: ユーザーのロール変更
 */
router.put('/users/:userId/role', authenticate, requireRole(['admin', 'owner']), [
    param('userId').isInt().withMessage('有効なユーザーIDを指定してください'),
    body('newRole')
        .isIn(['student', 'employee', 'teacher'])
        .withMessage('有効な役割を指定してください（student, employee, teacher）')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.params;
        const { newRole } = req.body;
        const adminId = req.user.id;

        // 自分自身のロールは変更不可
        if (parseInt(userId) === adminId) {
            return res.status(400).json({
                success: false,
                message: '自分自身のロールは変更できません'
            });
        }

        // 対象ユーザーを取得
        const users = await query(
            'SELECT id, name, role, last_role_update FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ユーザーが見つかりません'
            });
        }

        const targetUser = users[0];
        const previousRole = targetUser.role;

        // 同じロールへの変更は不可
        if (previousRole === newRole) {
            return res.status(400).json({
                success: false,
                message: `このユーザーは既に「${getRoleDisplayName(newRole)}」です`
            });
        }

        // 降格の場合は90日制限をチェック
        const isDemotion = isDemotionChange(previousRole, newRole);

        if (isDemotion) {
            if (!canDemoteUser(targetUser.last_role_update)) {
                const nextDate = getNextDemoteDate(targetUser.last_role_update);
                return res.status(400).json({
                    success: false,
                    message: `このユーザーの降格は ${nextDate} 以降に可能です（90日制限）`
                });
            }
        }

        // ロール変更を実行
        const result = await transaction(async (conn) => {
            const today = new Date().toISOString().split('T')[0];

            // 降格の場合のみ last_role_update を更新
            if (isDemotion) {
                await conn.execute(
                    'UPDATE users SET role = ?, last_role_update = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newRole, today, userId]
                );
            } else {
                // 昇格の場合は last_role_update を更新しない
                await conn.execute(
                    'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newRole, userId]
                );
            }

            // 生徒に降格する場合、student_id がなければ設定を促すメッセージを出す
            // （実際の設定はユーザー自身がプロフィールで行う）

            // 監査ログ
            await conn.execute(
                `INSERT INTO audit_logs (user_id, action, target_type, target_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    adminId,
                    isDemotion ? 'demote_user' : 'promote_user',
                    'user',
                    userId,
                    JSON.stringify({
                        previousRole,
                        newRole,
                        targetUserName: targetUser.name
                    }),
                    req.ip
                ]
            );

            return { success: true };
        });

        logger.info('管理者によるロール変更', {
            adminId,
            targetUserId: userId,
            previousRole,
            newRole,
            isDemotion
        });

        res.json({
            success: true,
            message: `${targetUser.name} さんの役割を「${getRoleDisplayName(newRole)}」に変更しました`,
            data: {
                userId: parseInt(userId),
                previousRole,
                newRole,
                nextDemoteDate: isDemotion ? getNextDemoteDate(new Date().toISOString()) : null
            }
        });

    } catch (error) {
        next(error);
    }
});

// --- ヘルパー関数 ---

/**
 * 降格可能かどうかをチェック（90日制限）
 */
function canDemoteUser(lastRoleUpdate) {
    if (!lastRoleUpdate) return true;

    const lastUpdate = new Date(lastRoleUpdate);
    const now = new Date();
    const daysDiff = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

    return daysDiff >= 90;
}

/**
 * 次回降格可能日を取得
 */
function getNextDemoteDate(lastRoleUpdate) {
    if (!lastRoleUpdate) return null;

    const lastUpdate = new Date(lastRoleUpdate);
    const nextDate = new Date(lastUpdate);
    nextDate.setDate(nextDate.getDate() + 90);

    return nextDate.toISOString().split('T')[0];
}

/**
 * 降格かどうかを判定
 * employee/teacher → student は降格
 */
function isDemotionChange(previousRole, newRole) {
    const higherRoles = ['employee', 'teacher', 'admin', 'owner'];
    const wasHigher = higherRoles.includes(previousRole);
    const isNowLower = newRole === 'student';

    return wasHigher && isNowLower;
}

/**
 * ロール名を日本語に変換
 */
function getRoleDisplayName(role) {
    const map = {
        student: '生徒',
        employee: '教員',
        teacher: '教員',
        admin: '管理者',
        owner: 'オーナー'
    };
    return map[role] || role;
}

module.exports = router;
