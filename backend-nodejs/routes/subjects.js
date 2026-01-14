const express = require('express');
const { body, query, validationResult } = require('express-validator');
const SubjectService = require('../services/SubjectService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 科目の作成
 */
router.post('/', authenticate, requireAdmin, [
  body('subject_code')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('科目コードは1文字以上20文字以下で入力してください'),
  body('subject_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('科目名は1文字以上255文字以下で入力してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以下で入力してください'),
  body('credits')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('単位数は1-10の範囲で入力してください'),
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

    const subjectData = req.body;
    const result = await SubjectService.createSubject(subjectData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('科目作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 科目一覧の取得
 */
router.get('/', authenticate, [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('検索キーワードは255文字以下で入力してください'),
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

    const { search, is_active, limit, offset = 0 } = req.query;
    const result = await SubjectService.getSubjects(search, is_active, limit, offset);

    res.json(result);
  } catch (error) {
    logger.error('科目一覧取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定科目の取得
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SubjectService.getSubject(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('科目取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 科目情報の更新
 */
router.put('/:id', authenticate, requireAdmin, [
  body('subject_code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('科目コードは1文字以上20文字以下で入力してください'),
  body('subject_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('科目名は1文字以上255文字以下で入力してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以下で入力してください'),
  body('credits')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('単位数は1-10の範囲で入力してください'),
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

    const result = await SubjectService.updateSubject(id, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('科目情報更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 科目の削除
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await SubjectService.deleteSubject(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('科目削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
