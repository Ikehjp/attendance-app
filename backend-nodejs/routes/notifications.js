const express = require('express');
const { body, query, validationResult } = require('express-validator');
const NotificationService = require('../services/NotificationService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 通知の作成
 */
router.post('/', authenticate, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('タイトルは1文字以上255文字以下で入力してください'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('メッセージは1文字以上1000文字以下で入力してください'),
  body('type')
    .isIn(['attendance', 'grade', 'general', 'alert'])
    .withMessage('有効な通知タイプを選択してください'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('有効な優先度を選択してください'),
  body('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください'),
  body('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const result = await NotificationService.createNotification(req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 通知一覧の取得
 */
router.get('/', authenticate, [
  query('type')
    .optional()
    .isIn(['attendance', 'grade', 'general', 'alert', 'approval', 'rejection', 'info', 'warning', 'setting'])
    .withMessage('有効な通知タイプを選択してください'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('有効な優先度を選択してください'),
  query('is_read')
    .optional()
    .isBoolean()
    .withMessage('既読フラグは真偽値で入力してください'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limitは1以上100以下で入力してください'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offsetは0以上で入力してください')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    // 自分の通知のみを取得
    const options = { ...req.query };
    if (req.user.role === 'student') {
      options.student_id = req.user.student_id;
    } else {
      options.user_id = req.user.id;
    }

    logger.info('通知取得リクエスト', { options, user: req.user.id, role: req.user.role });
    const result = await NotificationService.getNotifications(options);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 特定通知の取得
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.getNotification(
      id,
      req.user.id,
      req.user.student_id,
      req.user.role
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 通知を既読にする
 */
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.markAsRead(
      id,
      req.user.id,
      req.user.student_id,
      req.user.role
    );

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
 * 全通知を既読にする
 */
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const result = await NotificationService.markAllAsRead(
      req.user.id,
      req.user.student_id
    );

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
 * 通知の削除
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.deleteNotification(
      id,
      req.user.id,
      req.user.student_id,
      req.user.role
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;