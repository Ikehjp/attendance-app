const express = require('express');
const { body, query, validationResult } = require('express-validator');
const ClassService = require('../services/ClassService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 授業の作成
 */
router.post('/', authenticate, requireAdmin, [
  body('class_code')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('授業コードは1文字以上50文字以下で入力してください'),
  body('subject_id')
    .isInt({ min: 1 })
    .withMessage('有効な科目IDを入力してください'),
  body('teacher_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('教師名は1文字以上255文字以下で入力してください'),
  body('room')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('教室名は100文字以下で入力してください'),
  body('schedule_day')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('有効な曜日を選択してください'),
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('有効な開始時間を入力してください（HH:MM:SS形式）'),
  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('有効な終了時間を入力してください（HH:MM:SS形式）'),
  body('semester')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('学期は20文字以下で入力してください'),
  body('academic_year')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('年度は10文字以下で入力してください'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('アクティブフラグは真偽値で入力してください')
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

    const classData = req.body;
    const result = await ClassService.createClass(classData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('授業作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 授業一覧の取得
 */
router.get('/', authenticate, [
  query('subject_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な科目IDを入力してください'),
  query('teacher_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('教師名は255文字以下で入力してください'),
  query('schedule_day')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('有効な曜日を選択してください'),
  query('semester')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('学期は20文字以下で入力してください'),
  query('academic_year')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('年度は10文字以下で入力してください'),
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('アクティブフラグは真偽値で入力してください'),
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

    const { subject_id, teacher_name, schedule_day, semester, academic_year, is_active, limit, offset = 0 } = req.query;
    const result = await ClassService.getClasses({
      subject_id,
      teacher_name,
      schedule_day,
      semester,
      academic_year,
      is_active,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    logger.error('授業一覧取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定授業の取得
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ClassService.getClass(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('授業取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 授業情報の更新
 */
router.put('/:id', authenticate, requireAdmin, [
  body('class_code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('授業コードは1文字以上50文字以下で入力してください'),
  body('subject_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('有効な科目IDを入力してください'),
  body('teacher_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('教師名は1文字以上255文字以下で入力してください'),
  body('room')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('教室名は100文字以下で入力してください'),
  body('schedule_day')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('有効な曜日を選択してください'),
  body('start_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('有効な開始時間を入力してください（HH:MM:SS形式）'),
  body('end_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('有効な終了時間を入力してください（HH:MM:SS形式）'),
  body('semester')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('学期は20文字以下で入力してください'),
  body('academic_year')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('年度は10文字以下で入力してください'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('アクティブフラグは真偽値で入力してください')
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

    const result = await ClassService.updateClass(id, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('授業情報更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 授業の削除
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ClassService.deleteClass(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('授業削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
