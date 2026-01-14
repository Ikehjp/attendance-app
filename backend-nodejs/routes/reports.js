const express = require('express');
const { query, validationResult } = require('express-validator');
const ReportService = require('../services/ReportService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 出欠レポートの取得
 */
router.get('/attendance', authenticate, [
  query('type')
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('有効なレポートタイプを選択してください'),
  query('start_date')
    .isISO8601()
    .withMessage('有効な開始日を入力してください'),
  query('end_date')
    .isISO8601()
    .withMessage('有効な終了日を入力してください'),
  query('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください'),
  query('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  query('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な授業IDを入力してください')
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

    const { type, start_date, end_date, user_id, student_id, class_id } = req.query;

    // 権限チェック
    if (user_id && user_id != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのレポートを取得する権限がありません'
      });
    }

    const result = await ReportService.getAttendanceReport({
      type,
      start_date,
      end_date,
      user_id: user_id || req.user.id,
      student_id,
      class_id
    });

    res.json(result);
  } catch (error) {
    logger.error('出欠レポート取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 統計レポートの取得
 */
router.get('/statistics', authenticate, [
  query('period')
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('有効な期間を選択してください'),
  query('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください'),
  query('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  query('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な授業IDを入力してください')
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

    const { period, user_id, student_id, class_id } = req.query;

    // 権限チェック
    if (user_id && user_id != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのレポートを取得する権限がありません'
      });
    }

    const result = await ReportService.getStatisticsReport({
      period,
      user_id: user_id || req.user.id,
      student_id,
      class_id
    });

    res.json(result);
  } catch (error) {
    logger.error('統計レポート取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * エクスポート用レポートの取得
 */
router.get('/export', authenticate, [
  query('format')
    .isIn(['csv', 'excel', 'pdf'])
    .withMessage('有効なエクスポート形式を選択してください'),
  query('type')
    .isIn(['attendance', 'statistics', 'detailed'])
    .withMessage('有効なレポートタイプを選択してください'),
  query('start_date')
    .isISO8601()
    .withMessage('有効な開始日を入力してください'),
  query('end_date')
    .isISO8601()
    .withMessage('有効な終了日を入力してください'),
  query('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください'),
  query('student_id')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  query('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な授業IDを入力してください')
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

    const { format, type, start_date, end_date, user_id, student_id, class_id } = req.query;

    // 権限チェック
    if (user_id && user_id != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのレポートを取得する権限がありません'
      });
    }

    const result = await ReportService.exportReport({
      format,
      type,
      start_date,
      end_date,
      user_id: user_id || req.user.id,
      student_id,
      class_id
    });

    if (result.success) {
      // ファイルダウンロードのレスポンス
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('レポートエクスポートAPIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ダッシュボード用サマリーレポートの取得
 */
router.get('/dashboard', authenticate, [
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('有効な期間を選択してください')
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

    const { period = 'month' } = req.query;

    const result = await ReportService.getDashboardSummary(req.user.id, period);

    res.json(result);
  } catch (error) {
    logger.error('ダッシュボードレポート取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
