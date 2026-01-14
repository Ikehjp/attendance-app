const express = require('express');
const { body, query, validationResult } = require('express-validator');
const StudentService = require('../services/StudentService');
const GroupService = require('../services/GroupService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 学生の作成
 */
router.post('/', authenticate, requireAdmin, [
  body('student_id')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('名前は1文字以上255文字以下で入力してください'),
  body('card_id')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('カードIDは255文字以下で入力してください'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('電話番号は20文字以下で入力してください'),
  body('grade')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('学年は50文字以下で入力してください'),
  body('class_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('クラス名は100文字以下で入力してください'),
  body('enrollment_date')
    .optional()
    .isISO8601()
    .withMessage('有効な入学日を入力してください'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated', 'suspended'])
    .withMessage('有効なステータスを選択してください')
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

    const studentData = req.body;
    const result = await StudentService.createStudent(studentData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('学生作成APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 学生一覧の取得
 */
router.get('/', authenticate, [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('検索キーワードは255文字以下で入力してください'),
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

    const { search, limit, offset = 0 } = req.query;
    const result = await StudentService.getStudents({ search, limit, offset });

    res.json(result);
  } catch (error) {
    logger.error('学生一覧取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定学生の取得
 */
router.get('/:studentId', authenticate, [
  query('studentId')
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

    const { studentId } = req.params;
    const result = await StudentService.getStudent(studentId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('学生取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * カードIDで学生を検索
 */
router.get('/search/card/:cardId', authenticate, [
  query('cardId')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('カードIDは1文字以上255文字以下で入力してください')
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

    const { cardId } = req.params;
    const result = await StudentService.getStudentByCardId(cardId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('カードID検索APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 学生情報の更新
 */
router.put('/:studentId', authenticate, requireAdmin, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('名前は1文字以上255文字以下で入力してください'),
  body('card_id')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('カードIDは255文字以下で入力してください'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('電話番号は20文字以下で入力してください'),
  body('grade')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('学年は50文字以下で入力してください'),
  body('class_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('クラス名は100文字以下で入力してください'),
  body('enrollment_date')
    .optional()
    .isISO8601()
    .withMessage('有効な入学日を入力してください'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated', 'suspended'])
    .withMessage('有効なステータスを選択してください')
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

    const { studentId } = req.params;
    const updateData = req.body;

    const result = await StudentService.updateStudent(studentId, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('学生情報更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 学生の削除
 */
router.delete('/:studentId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await StudentService.deleteStudent(studentId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('学生削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 学生の参加グループ取得
 */
router.get('/:studentId/groups', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // 権限チェック: 本人、教員、管理者のみ
    if (req.user.role === 'student' && req.user.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        message: '他の学生のグループ情報は閲覧できません'
      });
    }

    // GroupService.getGroups を再利用
    const result = await GroupService.getGroups({
      student_id: studentId,
      include_members: true // メンバー情報も含める（必要に応じて）
    });

    res.json(result);
  } catch (error) {
    logger.error('学生グループ取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * グループ招待への応答
 */
router.post('/:studentId/groups/:groupId/respond', authenticate, [
  body('action')
    .isIn(['accept', 'decline'])
    .withMessage('有効なアクションを指定してください')
], async (req, res) => {
  try {
    const { studentId, groupId } = req.params;
    const { action } = req.body;

    // 権限チェック: 本人のみ
    if (req.user.role === 'student' && req.user.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        message: '他の学生の招待には応答できません'
      });
    }

    const status = action === 'accept' ? 'accepted' : 'declined';
    const result = await GroupService.updateMemberStatus(groupId, studentId, status);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('グループ招待応答APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
