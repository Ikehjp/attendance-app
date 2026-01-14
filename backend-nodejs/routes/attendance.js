const express = require('express');
const { body, query, validationResult } = require('express-validator');
const AttendanceService = require('../services/AttendanceService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 出欠記録の作成・更新
 */
router.post('/', authenticate, [
  body('date')
    .isISO8601()
    .withMessage('有効な日付を入力してください'),
  body('type')
    .isIn(['checkin', 'checkout', 'late', 'absent', 'early_departure'])
    .withMessage('有効な出欠タイプを選択してください'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('有効なタイムスタンプを入力してください'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('理由は500文字以下で入力してください'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください')
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

    const { date, type, timestamp, reason, studentId } = req.body;

    const result = await AttendanceService.recordAttendance(
      req.user.id,
      date,
      type,
      timestamp,
      reason,
      studentId
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('出欠記録作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 出欠記録の取得
 */
router.get('/', authenticate, [
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('有効な開始日を入力してください'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('有効な終了日を入力してください')
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

    const { userId, startDate, endDate } = req.query;
    let targetUserId = userId;
    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
      targetUserId = req.user.id;
    }

    // 自分の記録のみ取得可能（管理者は全員の記録を取得可能）
    if (targetUserId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーの記録を取得する権限がありません'
      });
    }

    const result = await AttendanceService.getAttendanceRecords(
      targetUserId,
      startDate,
      endDate
    );

    res.json(result);
  } catch (error) {
    logger.error('出欠記録取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 月次レポートの取得
 */
router.get('/report', authenticate, [
  query('year')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('有効な年を入力してください'),
  query('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('有効な月を入力してください'),
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください')
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

    const { year, month, userId } = req.query;

    // 学生ロールの場合はStudentAttendanceServiceを使用
    if (req.user.role === 'student') {
      const StudentAttendanceService = require('../services/StudentAttendanceService');
      const studentId = req.user.student_id;

      console.log('[Debug] getMonthlyReport (student):', { studentId, year, month });

      const result = await StudentAttendanceService.getStudentMonthlyReport(
        studentId,
        parseInt(year),
        parseInt(month)
      );
      return res.json(result);
    }

    // 管理者・教師・従業員の場合は従来通り
    let targetUserId = userId;
    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
      targetUserId = req.user.id;
    }

    console.log('[Debug] getMonthlyReport:', { targetUserId, reqUserId: req.user.id, role: req.user.role });

    // 自分の記録のみ取得可能（管理者は全員の記録を取得可能）
    if (targetUserId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーの記録を取得する権限がありません'
      });
    }

    const result = await AttendanceService.getMonthlyReport(
      targetUserId,
      year,
      month
    );

    res.json(result);
  } catch (error) {
    logger.error('月次レポート取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 統計情報の取得
 */
router.get('/stats', authenticate, [
  query('period')
    .optional()
    .isIn(['week', 'month', 'year'])
    .withMessage('有効な期間を選択してください'),
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効なユーザーIDを入力してください')
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

    const { period = 'month', userId } = req.query;
    const targetUserId = userId || req.user.id;

    // 自分の記録のみ取得可能（管理者は全員の記録を取得可能）
    if (targetUserId != req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '他のユーザーの記録を取得する権限がありません'
      });
    }

    const result = await AttendanceService.getAttendanceStats(
      targetUserId,
      period
    );

    res.json(result);
  } catch (error) {
    logger.error('統計情報取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 出欠記録の更新
 */
router.put('/:id', authenticate, [
  body('type')
    .optional()
    .isIn(['checkin', 'checkout', 'late', 'absent', 'early_departure'])
    .withMessage('有効な出欠タイプを選択してください'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('有効なタイムスタンプを入力してください'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('理由は500文字以下で入力してください')
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

    const { id } = req.params;
    const updateData = req.body;

    const result = await AttendanceService.updateAttendance(
      id,
      req.user.id,
      updateData
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('出欠記録更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 出欠記録の削除
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await AttendanceService.deleteAttendance(id, req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('出欠記録削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
