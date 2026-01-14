const express = require('express');
const router = express.Router();
const SecurityService = require('../services/SecurityService');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * セキュリティ管理ルート
 */

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * GET /api/security/ip-ranges
 * 許可IP範囲一覧を取得
 */
router.get('/ip-ranges', async (req, res) => {
    try {
        // 管理者のみ閲覧可能
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみアクセスできます'
            });
        }

        const { activeOnly = 'true' } = req.query;
        const ipRanges = await SecurityService.getIPRanges(activeOnly === 'true');

        res.json({
            success: true,
            data: ipRanges
        });
    } catch (error) {
        console.error('IP範囲一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'IP範囲一覧の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/security/ip-ranges
 * 新しいIP範囲を追加（管理者のみ）
 */
router.post('/ip-ranges', async (req, res) => {
    try {
        // 管理者のみ
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみIP範囲を追加できます'
            });
        }

        const result = await SecurityService.addAllowedIPRange(req.body);

        res.status(201).json({
            success: true,
            message: 'IP範囲を追加しました',
            data: result
        });
    } catch (error) {
        console.error('IP範囲追加エラー:', error);
        res.status(400).json({
            success: false,
            message: 'IP範囲の追加に失敗しました',
            error: error.message
        });
    }
});

/**
 * PUT /api/security/ip-ranges/:id
 * IP範囲を更新（管理者のみ）
 */
router.put('/ip-ranges/:id', async (req, res) => {
    try {
        // 管理者のみ
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみIP範囲を更新できます'
            });
        }

        const { id } = req.params;
        const result = await SecurityService.updateIPRange(parseInt(id), req.body);

        res.json({
            success: true,
            message: 'IP範囲を更新しました',
            data: result
        });
    } catch (error) {
        console.error('IP範囲更新エラー:', error);
        res.status(400).json({
            success: false,
            message: 'IP範囲の更新に失敗しました',
            error: error.message
        });
    }
});

/**
 * DELETE /api/security/ip-ranges/:id
 * IP範囲を削除（管理者のみ）
 */
router.delete('/ip-ranges/:id', async (req, res) => {
    try {
        // 管理者のみ
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみIP範囲を削除できます'
            });
        }

        const { id } = req.params;
        await SecurityService.deleteIPRange(parseInt(id));

        res.json({
            success: true,
            message: 'IP範囲を削除しました'
        });
    } catch (error) {
        console.error('IP範囲削除エラー:', error);
        res.status(500).json({
            success: false,
            message: 'IP範囲の削除に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/security/scan-logs
 * スキャンログを取得（管理者のみ）
 */
router.get('/scan-logs', async (req, res) => {
    try {
        // 管理者のみ
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみアクセスできます'
            });
        }

        const options = {
            studentId: req.query.studentId,
            qrCodeId: req.query.qrCodeId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            result: req.query.result,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const logs = await SecurityService.getScanLogs(options);

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('スキャンログ取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'スキャンログの取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/security/stats
 * セキュリティ統計を取得（管理者のみ）
 */
router.get('/stats', async (req, res) => {
    try {
        // 管理者のみ
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみアクセスできます'
            });
        }

        const options = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const stats = await SecurityService.getSecurityStats(options);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('セキュリティ統計取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'セキュリティ統計の取得に失敗しました',
            error: error.message
        });
    }
});

module.exports = router;
