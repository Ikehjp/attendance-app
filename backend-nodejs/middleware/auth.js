const JWTUtil = require('../utils/jwt');
const AuthService = require('../services/AuthService');
const RoleService = require('../services/RoleService');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * [完全版] 認証ミドルウェア
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    //Header or Cookie check
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logger.warn('認証失敗 - トークンが提供されていません', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({
        success: false,
        message: 'アクセストークンが必要です'
      });
    }

    const decoded = JWTUtil.verifyToken(token);

    if (!decoded) {
      logger.warn('認証失敗 - 無効なトークン構造', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(403).json({
        success: false,
        message: '無効なトークンです'
      });
    }

    // DBから最新のユーザー情報を取得（organization_idを含む）
    const users = await query(
      'SELECT id, name, email, role, student_id, organization_id FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      logger.warn('認証失敗 - ユーザーが存在しません', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: decoded.id
      });
      return res.status(403).json({
        success: false,
        message: 'ユーザーが存在しません'
      });
    }

    const user = users[0];
    req.user = user;

    logger.debug('JWTトークンを検証しました', {
      userId: user.id
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * [完全版] 役割（ロール）ベースのアクセス制御ミドルウェア
 * 新ロール体系対応: owner, teacher, student
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!req.user || !req.user.role) {
      logger.warn('権限エラー - ユーザー情報がありません', { ip: req.ip });
      return res.status(403).json({
        success: false,
        message: 'アクセス権限がありません'
      });
    }

    // ロールチェック
    if (!requiredRoles.includes(req.user.role)) {
      // 後方互換性: 'admin' が要求された場合は 'owner' も許可
      const isAdminRequiredAndOwner = requiredRoles.includes('admin') && req.user.role === 'owner';
      // 後方互換性: 'teacher' が要求された場合は 'owner' も許可
      const isTeacherRequiredAndOwner = requiredRoles.includes('teacher') && req.user.role === 'owner';

      if (!isAdminRequiredAndOwner && !isTeacherRequiredAndOwner) {
        logger.warn('権限エラー - 役割が不十分です', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles
        });
        return res.status(403).json({
          success: false,
          message: 'この操作を実行する権限がありません'
        });
      }
    }

    logger.debug('認証成功', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    next();
  };
};

/**
 * 管理者権限チェック（後方互換性のため残す）
 * owner または teacher を許可
 */
const requireAdmin = (req, res, next) => {
  return requireRole(['owner', 'teacher'])(req, res, next);
};

/**
 * オーナー専用権限チェック
 */
const requireOwner = (req, res, next) => {
  return requireRole(['owner'])(req, res, next);
};

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireOwner
};