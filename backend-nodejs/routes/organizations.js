const express = require('express');
const router = express.Router();
const OrganizationService = require('../services/OrganizationService');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * 組織管理ルート
 */

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * GET /api/organizations
 * 組織一覧を取得
 */
router.get('/', async (req, res) => {
    try {
        const organizations = await OrganizationService.getAllOrganizations();
        res.json({
            success: true,
            data: organizations
        });
    } catch (error) {
        console.error('組織一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '組織一覧の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/organizations/:id
 * 組織詳細を取得
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const organization = await OrganizationService.getOrganization(parseInt(id));

        res.json({
            success: true,
            data: organization
        });
    } catch (error) {
        console.error('組織詳細取得エラー:', error);
        res.status(404).json({
            success: false,
            message: '組織が見つかりません',
            error: error.message
        });
    }
});

/**
 * GET /api/organizations/:id/stats
 * 組織の統計情報を取得
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await OrganizationService.getOrganizationStats(parseInt(id));

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('組織統計取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '統計情報の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/organizations
 * 新しい組織を作成（管理者のみ）
 */
router.post('/', async (req, res) => {
    try {
        // 管理者権限チェック
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみ組織を作成できます'
            });
        }

        const organization = await OrganizationService.createOrganization(req.body);

        res.status(201).json({
            success: true,
            message: '組織を作成しました',
            data: organization
        });
    } catch (error) {
        console.error('組織作成エラー:', error);
        res.status(400).json({
            success: false,
            message: '組織の作成に失敗しました',
            error: error.message
        });
    }
});

/**
 * PUT /api/organizations/:id
 * 組織情報を更新（管理者のみ）
 */
router.put('/:id', async (req, res) => {
    try {
        // 管理者権限チェック
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみ組織を更新できます'
            });
        }

        const { id } = req.params;
        const organization = await OrganizationService.updateOrganization(parseInt(id), req.body);

        res.json({
            success: true,
            message: '組織情報を更新しました',
            data: organization
        });
    } catch (error) {
        console.error('組織更新エラー:', error);
        res.status(400).json({
            success: false,
            message: '組織の更新に失敗しました',
            error: error.message
        });
    }
});

/**
 * DELETE /api/organizations/:id
 * 組織を削除（管理者のみ）
 */
router.delete('/:id', async (req, res) => {
    try {
        // 管理者権限チェック
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみ組織を削除できます'
            });
        }

        const { id } = req.params;
        await OrganizationService.deleteOrganization(parseInt(id));

        res.json({
            success: true,
            message: '組織を削除しました'
        });
    } catch (error) {
        console.error('組織削除エラー:', error);
        res.status(500).json({
            success: false,
            message: '組織の削除に失敗しました',
            error: error.message
        });
    }
});

module.exports = router;
