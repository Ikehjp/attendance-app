const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 組織コンテキストミドルウェア
 * ログインユーザーの組織IDをリクエストに付与する
 */
const attachOrganizationContext = async (req, res, next) => {
    try {
        // 認証済みユーザーのみ処理
        if (!req.user || !req.user.id) {
            return next();
        }

        // ユーザーの組織情報を取得
        const users = await query(
            'SELECT organization_id, role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            logger.warn('組織コンテキスト取得失敗: ユーザーが見つかりません', { userId: req.user.id });
            return res.status(403).json({
                success: false,
                message: 'ユーザー情報が見つかりません'
            });
        }

        const user = users[0];

        if (!user.organization_id) {
            logger.warn('組織コンテキスト取得失敗: 組織に属していません', { userId: req.user.id });
            return res.status(403).json({
                success: false,
                message: '組織に属していないユーザーです。管理者にお問い合わせください。'
            });
        }

        // リクエストオブジェクトに組織情報を付与
        req.organizationId = user.organization_id;
        req.user.role = user.role; // 最新のロール情報で上書き

        logger.debug('組織コンテキスト取得成功', {
            userId: req.user.id,
            organizationId: req.organizationId,
            role: req.user.role
        });

        next();
    } catch (error) {
        logger.error('組織コンテキスト取得エラー:', error);
        return res.status(500).json({
            success: false,
            message: '組織情報の取得に失敗しました'
        });
    }
};

/**
 * 組織境界の強制
 * リクエストに organizationId が存在しない場合はエラー
 */
const enforceOrganizationBoundary = (req, res, next) => {
    if (!req.organizationId) {
        logger.warn('組織境界違反: organizationId が存在しません', {
            userId: req.user?.id,
            path: req.path
        });

        return res.status(403).json({
            success: false,
            message: '組織のコンテキストが必要です'
        });
    }

    next();
};

/**
 * リクエストパラメータの組織IDを検証
 * URLパラメータに含まれる組織IDがログインユーザーの組織と一致するか確認
 */
const validateOrganizationAccess = (paramName = 'organizationId') => {
    return (req, res, next) => {
        const requestedOrgId = parseInt(req.params[paramName] || req.query[paramName] || req.body[paramName]);

        if (requestedOrgId && requestedOrgId !== req.organizationId) {
            logger.warn('組織アクセス違反', {
                userId: req.user?.id,
                userOrgId: req.organizationId,
                requestedOrgId,
                path: req.path
            });

            return res.status(403).json({
                success: false,
                message: '他の組織のデータにはアクセスできません'
            });
        }

        next();
    };
};

module.exports = {
    attachOrganizationContext,
    enforceOrganizationBoundary,
    validateOrganizationAccess
};
