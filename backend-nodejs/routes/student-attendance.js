const express = require('express');
const { body, query, validationResult } = require('express-validator');
const StudentAttendanceService = require('../services/StudentAttendanceService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 学生出欠記録の作成
 */
router.post('/', authenticate, [
  body('studentId')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('有効なタイムスタンプを入力してください'),
  body('qrScan')
    .optional()
    .isBoolean()
    .withMessage('QRスキャンフラグは真偽値で入力してください')
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

    const { studentId, timestamp, qrScan } = req.body;

    let result;
    if (qrScan === true) {
      // QRコード読み取りによる詳細記録
      result = await StudentAttendanceService.recordQRAttendance(
        studentId,
        timestamp
      );
    } else {
      // 通常の記録
      result = await StudentAttendanceService.recordAttendance(
        studentId,
        timestamp
      );
    }

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('学生出欠記録作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 学生出欠記録の取得
 */
router.get('/', authenticate, [
  query('studentId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
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

    const { studentId, startDate, endDate } = req.query;

    const result = await StudentAttendanceService.getAttendanceRecords(
      studentId,
      startDate,
      endDate
    );

    res.json(result);
  } catch (error) {
    logger.error('学生出欠記録取得APIエラー:', error.message);
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
  query('studentId')
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

    const { year, month, studentId } = req.query;

    const result = await StudentAttendanceService.getMonthlyReport(
      studentId,
      year,
      month
    );

    res.json(result);
  } catch (error) {
    logger.error('学生月次レポート取得APIエラー:', error.message);
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
  query('studentId')
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

    const { period = 'month', studentId } = req.query;

    const result = await StudentAttendanceService.getAttendanceStats(
      studentId,
      period
    );

    res.json(result);
  } catch (error) {
    logger.error('学生統計情報取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 詳細出欠記録の取得
 */
router.get('/detailed', authenticate, [
  query('studentId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  query('classId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な授業IDを入力してください'),
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

    const { studentId, classId, startDate, endDate } = req.query;

    const result = await StudentAttendanceService.getDetailedAttendanceRecords(
      studentId,
      classId,
      startDate,
      endDate
    );

    res.json(result);
  } catch (error) {
    logger.error('詳細出欠記録取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 欠課学生の記録
 */
router.get('/mark-absent', authenticate, [
  query('classId')
    .isInt({ min: 1 })
    .withMessage('有効な授業IDを入力してください'),
  query('attendanceDate')
    .isISO8601()
    .withMessage('有効な出席日を入力してください')
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

    const { classId, attendanceDate } = req.query;

    const result = await StudentAttendanceService.markAbsentStudents(
      classId,
      attendanceDate
    );

    res.json(result);
  } catch (error) {
    logger.error('欠課学生記録APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 学生出欠記録の削除
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await StudentAttendanceService.deleteAttendance(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('学生出欠記録削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
