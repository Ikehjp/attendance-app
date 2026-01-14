const express = require('express');
const { body, query, validationResult } = require('express-validator');
const QRService = require('../services/QRService');
const StudentAttendanceService = require('../services/StudentAttendanceService');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');
const { query: dbQuery } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 場所ベースQRコード生成（管理者のみ）- 新システム用
 */
router.post('/generate-location', authenticate, requireRole(['admin', 'teacher', 'employee']), [
  body('locationName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('場所名は1文字以上255文字以下で入力してください'),
  body('locationDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以下で入力してください'),
  body('expiresAt')
    .optional()
    .custom((value) => {
      // nullまたは空文字の場合はOK
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      // ISO8601形式の日付文字列かチェック
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('有効な日付形式ではありません');
      }
      return true;
    })
    .withMessage('有効な有効期限を入力してください')
], async (req, res) => {
  try {
    // デバッグログ
    logger.info('[QR Generate] リクエスト受信', {
      body: req.body,
      user: req.user?.id
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('[QR Generate] バリデーションエラー', {
        errors: errors.array(),
        body: req.body
      });
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { locationName, locationDescription, expiresAt } = req.body;

    logger.info('[QR Generate] サービス呼び出し', {
      locationName,
      locationDescription,
      expiresAt
    });

    const result = await QRService.generateLocationQRCode(
      { locationName, locationDescription, expiresAt },
      req.user.id
    );

    logger.info('[QR Generate] サービス結果', { success: result.success });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('場所ベースQRコード生成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * IP検証付きQRスキャン（新システム用）
 */
router.post('/scan-with-validation', authenticate, [
  body('qrCode')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('QRコードは1文字以上500文字以下で入力してください'),
  body('studentId')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください')
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

    const { qrCode, studentId } = req.body;

    // IPアドレスとユーザーエージェントを取得
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const result = await QRService.scanQRCodeWithIPValidation(
      { qrCode, studentId },
      ipAddress,
      userAgent
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('IP検証付きQRスキャンエラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコード一覧取得
 */
router.get('/codes', authenticate, async (req, res) => {
  try {
    const { activeOnly = 'true', limit = '50', offset = '0' } = req.query;

    const result = await QRService.getQRCodes({
      activeOnly: activeOnly === 'true',
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('QRコード一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコード無効化
 */
router.put('/:id/deactivate', authenticate, requireRole(['admin', 'teacher', 'employee']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await QRService.deactivateQRCode(parseInt(id));

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコード無効化エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});


/**
 * QRコードの生成
 */
router.post('/generate', authenticate, [
  body('student_id')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  body('type')
    .isIn(['attendance', 'student_info', 'class'])
    .withMessage('有効なQRタイプを選択してください'),
  body('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な授業IDを入力してください'),
  body('expires_in')
    .optional()
    .isInt({ min: 300, max: 86400 })
    .withMessage('有効期限は300秒-86400秒の範囲で入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { student_id, type, class_id, expires_in } = req.body;

    const result = await QRService.generateQRCode({
      student_id,
      type,
      class_id,
      expires_in,
      created_by: req.user.id
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコード生成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコードの検証
 */
router.post('/verify', authenticate, [
  body('qr_data')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('QRデータは1文字以上1000文字以下で入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { qr_data } = req.body;

    const result = await QRService.verifyQRCode(qr_data);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコード検証APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコードスキャンによる出欠記録
 */
router.post('/scan', authenticate, [
  body('qr_data')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('QRデータは1文字以上1000文字以下で入力してください'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('有効なタイムスタンプを入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { qr_data, timestamp } = req.body;

    const result = await QRService.scanQRCode({
      qr_data,
      timestamp,
      scanned_by: req.user.id
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコードスキャンAPIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 授業選択後の出席記録エンドポイント
 */
router.post('/scan/confirm', authenticate, [
  body('class_id').isInt().withMessage('授業IDが必要です'),
  body('timestamp').optional().isISO8601()
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

    const { class_id, timestamp } = req.body;
    const user = await dbQuery('SELECT student_id FROM users WHERE id = ?', [req.user.id]);

    if (!user[0] || !user[0].student_id) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーまたは学生IDが見つかりません'
      });
    }

    const result = await StudentAttendanceService.recordQRAttendance(
      user[0].student_id,
      timestamp,
      class_id
    );

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error('授業選択記録APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコード履歴の取得
 */
router.get('/history', authenticate, [
  query('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  query('type')
    .optional()
    .isIn(['attendance', 'student_info', 'class'])
    .withMessage('有効なQRタイプを選択してください'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('有効な開始日を入力してください'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('有効な終了日を入力してください'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('制限数は1-100の範囲で入力してください'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('オフセットは0以上の整数で入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    const { student_id, type, start_date, end_date, limit, offset = 0 } = req.query;

    const result = await QRService.getQRHistory({
      student_id,
      type,
      start_date,
      end_date,
      limit,
      offset,
      user_id: req.user.id,
      user_role: req.user.role
    });

    res.json(result);
  } catch (error) {
    logger.error('QRコード履歴取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * QRコードの削除
 */
router.delete('/:id', authenticate, requireRole(['admin', 'teacher', 'employee']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await QRService.deleteQRCode(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('QRコード削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
