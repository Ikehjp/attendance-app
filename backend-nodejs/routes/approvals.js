const express = require('express');
const router = express.Router();
const ApprovalService = require('../services/ApprovalService');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * 承認管理ルート
 */

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * POST /api/approvals/:requestId/approve
 * 申請を承認
 */
router.post('/:requestId/approve', async (req, res) => {
    try {
        // 教員、管理者、オーナーのみ
        if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                message: '教員または管理者のみ承認できます'
            });
        }

        const { requestId } = req.params;
        const { comment } = req.body;
        const approverId = req.user.id;

        const result = await ApprovalService.approveRequest(
            parseInt(requestId),
            approverId,
            comment
        );

        res.json({
            success: true,
            message: '申請を承認しました',
            data: result
        });
    } catch (error) {
        console.error('承認処理エラー:', error);
        res.status(400).json({
            success: false,
            message: '承認処理に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/approvals/:requestId/reject
 * 申請を却下
 */
router.post('/:requestId/reject', async (req, res) => {
    try {
        // 教員、管理者、オーナーのみ
        if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                message: '教員または管理者のみ却下できます'
            });
        }

        const { requestId } = req.params;
        const { comment } = req.body;
        const approverId = req.user.id;

        const result = await ApprovalService.rejectRequest(
            parseInt(requestId),
            approverId,
            comment
        );

        res.json({
            success: true,
            message: '申請を却下しました',
            data: result
        });
    } catch (error) {
        console.error('却下処理エラー:', error);
        res.status(400).json({
            success: false,
            message: '却下処理に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/approvals/:requestId/history
 * 申請の承認履歴を取得
 */
router.get('/:requestId/history', async (req, res) => {
    try {
        const { requestId } = req.params;
        const history = await ApprovalService.getApprovalHistory(parseInt(requestId));

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('承認履歴取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '承認履歴の取得に失敗しました',
            error: error.message
        });
    }
});

module.exports = router;
