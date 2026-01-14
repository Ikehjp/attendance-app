const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { attachOrganizationContext, enforceOrganizationBoundary } = require('../middleware/orgContext');
const InvitationService = require('../services/InvitationService');
const logger = require('../utils/logger');

/**
 * GET /api/invitations/validate/:token
 * 招待トークンを検証（認証不要）
 */
router.get('/validate/:token',
    param('token')
        .isLength({ min: 64, max: 64 })
        .withMessage('無効なトークン形式です'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }

            const { token } = req.params;
            const result = await InvitationService.validateInvitation(token);

            return res.json(result);
        } catch (error) {
            logger.error('招待検証エラー:', error);
            return res.status(500).json({
                success: false,
                message: '招待の検証に失敗しました'
            });
        }
    }
);

/**
 * POST /api/invitations/accept/:token
 * 招待を受諾してアカウント作成（認証不要）
 */
router.post('/accept/:token',
    [
        param('token')
            .isLength({ min: 64, max: 64 })
            .withMessage('無効なトークン形式です'),
        body('name')
            .trim()
            .isLength({ min: 1, max: 255 })
            .withMessage('名前は1文字以上255文字以下で入力してください'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('パスワードは8文字以上で入力してください')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }

            const { token } = req.params;
            const { name, password } = req.body;

            const result = await InvitationService.acceptInvitation(token, {
                name,
                password
            });

            return res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            logger.error('招待受諾エラー:', error);
            return res.status(500).json({
                success: false,
                message: '招待の受諾に失敗しました'
            });
        }
    }
);

// 以下のルートは認証が必要
router.use(authenticate);
router.use(attachOrganizationContext);
router.use(enforceOrganizationBoundary);

/**
 * POST /api/invitations/invite
 * 招待を送信（ownerとteacherのみ）
 */
router.post('/invite',
    requireRole(['owner', 'teacher']),
    [
        body('email')
            .isEmail()
            .withMessage('有効なメールアドレスを入力してください')
            .normalizeEmail(),
        body('role')
            .isIn(['teacher', 'student'])
            .withMessage('ロールは teacher または student を指定してください')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }

            const { email, role } = req.body;
            const organizationId = req.organizationId;
            const inviterId = req.user.id;

            const result = await InvitationService.createInvitation(
                organizationId,
                email,
                role,
                inviterId
            );

            if (result.success) {
                // TODO: ここで実際のメール送信処理を実装
                // const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${result.data.token}`;
                // await sendInvitationEmail(email, inviteLink);

                logger.info('招待作成成功', {
                    organizationId,
                    email,
                    role,
                    inviterId
                });
            }

            return res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            logger.error('招待送信エラー:', error);
            return res.status(500).json({
                success: false,
                message: '招待の送信に失敗しました'
            });
        }
    }
);

/**
 * GET /api/invitations
 * 招待一覧を取得
 */
router.get('/',
    requireRole(['owner', 'teacher']),
    [
        query('status')
            .optional()
            .isIn(['all', 'pending', 'accepted', 'expired'])
            .withMessage('status は all, pending, accepted, expired のいずれかを指定してください'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('limit は 1〜100 の整数を指定してください'),
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('offset は 0 以上の整数を指定してください')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }

            const options = {
                status: req.query.status || 'all',
                limit: req.query.limit ? parseInt(req.query.limit) : 50,
                offset: req.query.offset ? parseInt(req.query.offset) : 0
            };

            const result = await InvitationService.getInvitations(req.organizationId, options);

            return res.json(result);
        } catch (error) {
            logger.error('招待一覧取得エラー:', error);
            return res.status(500).json({
                success: false,
                message: '招待一覧の取得に失敗しました'
            });
        }
    }
);

/**
 * DELETE /api/invitations/:id
 * 招待を取り消し
 */
router.delete('/:id',
    requireRole(['owner', 'teacher']),
    param('id')
        .isInt()
        .withMessage('招待IDは整数を指定してください'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }

            const invitationId = parseInt(req.params.id);
            const result = await InvitationService.cancelInvitation(invitationId, req.organizationId);

            return res.json(result);
        } catch (error) {
            logger.error('招待取り消しエラー:', error);
            return res.status(500).json({
                success: false,
                message: '招待の取り消しに失敗しました'
            });
        }
    }
);

module.exports = router;
