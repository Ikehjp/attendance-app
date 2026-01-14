const express = require('express');
const { body, query, validationResult } = require('express-validator');
const UserService = require('../services/UserService');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 全ユーザー一覧取得（管理者のみ）
 */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await UserService.getAllUsers();
    res.json(result.data); 
  } catch (error) {
    next(error); 
  }
});

/**
 * 特定ユーザーの情報取得
 */
router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      logger.warn('不正なユーザー情報アクセス試行', { authUserId: req.user.id, targetUserId: userId });
      return res.status(403).json({ success: false, message: 'アクセス権限がありません' });
    }
    
    const result = await UserService.getUser(userId);
    
    if (result.success) {
      res.json(result.data); 
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    next(error); 
  }
});

/**
 * ユーザー情報の更新
 */
router.put('/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (userId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'このユーザーの情報を更新する権限がありません'
      });
    }

    const result = await UserService.updateUser(userId, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error); 
  }
});

/**
 * ユーザーの削除（管理者のみ）
 */
router.delete('/:userId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId == req.user.id) {
      return res.status(400).json({
        success: false,
        message: '自分自身のアカウントは削除できません'
      });
    }

    const result = await UserService.deleteUser(userId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    next(error); 
  }
});


// --- [完全版] ロール変更機能のエンドポイント ---

/**
 * [完全版] ロール変更ステータスの取得 (本人)
 */
router.get('/me/role-status', authenticate, async (req, res, next) => {
  try {
    const result = await UserService.getRoleUpdateStatus(req.user.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * [完全版] ロールの更新 (本人)
 */
router.post('/me/role', authenticate, [
  body('newRole')
    .isIn(['student', 'employee', 'admin'])
    .withMessage('無効な役割です'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('パスワードは必須です')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '入力エラー', errors: errors.array() });
    }

    const { newRole, password } = req.body;
    
    if (newRole === 'admin') {
       return res.status(403).json({ success: false, message: 'この方法では管理者に変更できません' });
    }

    const result = await UserService.updateRole(req.user.id, newRole, password);
    
    if (result.success) {
      res.json(result);
    } else {
      const statusCode = result.message.includes('パスワード') ? 400 : 403;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;