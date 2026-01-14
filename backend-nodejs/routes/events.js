const express = require('express');
const { body, query, validationResult } = require('express-validator');
const EventService = require('../services/EventService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * イベント一覧の取得
 */
router.get('/', authenticate, [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('開始日は有効な日付形式で入力してください'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('終了日は有効な日付形式で入力してください'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('開始日は有効な日付形式で入力してください'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('終了日は有効な日付形式で入力してください'),
  query('isPublic')
    .optional()
    .isBoolean()
    .withMessage('公開フラグは真偽値で入力してください'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limitは1以上100以下で入力してください'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offsetは0以上で入力してください')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { startDate, endDate, isPublic, limit, offset, start_date, end_date } = req.query;

    logger.debug('イベント取得リクエスト:', {
      query: req.query,
      userId: req.user.id,
      resolvedStartDate: startDate || start_date,
      resolvedEndDate: endDate || end_date
    });

    const result = await EventService.getEvents({
      userId: req.user.id,
      startDate: startDate || start_date,
      endDate: endDate || end_date,
      isPublic: isPublic === 'true' ? true : (isPublic === 'false' ? false : undefined),
      limit: limit ? parseInt(limit) : null,
      offset: offset ? parseInt(offset) : 0
    });

    logger.debug('イベント取得結果:', {
      success: result.success,
      eventCount: result.data?.events?.length || 0
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('イベント一覧取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定イベントの取得
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await EventService.getEvent(parseInt(id), req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.message.includes('権限') ? 403 : 404).json(result);
    }
  } catch (error) {
    logger.error('イベント取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * イベントの作成
 */
router.post('/', authenticate, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('タイトルは1文字以上255文字以下で入力してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('説明は2000文字以下で入力してください'),
  body('start_date')
    .isISO8601()
    .withMessage('開始日時は有効な日付形式で入力してください'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('終了日時は有効な日付形式で入力してください'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('場所は255文字以下で入力してください'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('公開フラグは真偽値で入力してください'),
  body('participant_ids')
    .optional()
    .isArray()
    .withMessage('参加者IDは配列で入力してください')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const eventData = {
      ...req.body,
      created_by: req.user.id
    };

    const result = await EventService.createEvent(eventData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('イベント作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * イベントの更新
 */
router.put('/:id', authenticate, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('タイトルは1文字以上255文字以下で入力してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('説明は2000文字以下で入力してください'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('開始日時は有効な日付形式で入力してください'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('終了日時は有効な日付形式で入力してください'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('場所は255文字以下で入力してください'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('公開フラグは真偽値で入力してください')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const result = await EventService.updateEvent(parseInt(id), req.body, req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.message.includes('権限') ? 403 : 400).json(result);
    }
  } catch (error) {
    logger.error('イベント更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * イベントの削除
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await EventService.deleteEvent(parseInt(id), req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.message.includes('権限') ? 403 : 400).json(result);
    }
  } catch (error) {
    logger.error('イベント削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * イベントへの参加申請/承認
 */
router.post('/:id/participate', authenticate, [
  body('status')
    .isIn(['pending', 'accepted', 'declined'])
    .withMessage('有効な参加ステータスを選択してください')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await EventService.updateParticipation(
      parseInt(id),
      req.user.id,
      status
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('イベント参加APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * イベント参加者の削除
 */
router.delete('/:id/participants/:participantId', authenticate, async (req, res) => {
  try {
    const { id, participantId } = req.params;
    const result = await EventService.removeParticipant(
      parseInt(id),
      parseInt(participantId),
      req.user.id
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.message.includes('権限') ? 403 : 400).json(result);
    }
  } catch (error) {
    logger.error('イベント参加者削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;

