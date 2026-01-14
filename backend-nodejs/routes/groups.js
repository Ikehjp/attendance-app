const express = require('express');
const { body, query, validationResult } = require('express-validator');
const GroupService = require('../services/GroupService');
const RoleService = require('../services/RoleService');
const { authenticate, requireAdmin, requireRole, requireClassTeacher } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * [完全版] グループの作成 (管理者または教員)
 */
router.post('/', authenticate, requireRole(['admin', 'employee', 'teacher']), [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('グループ名は1文字以上255文字以下で入力してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('説明は1000文字以下で入力してください'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('アクティブフラグは真偽値で入力してください')
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

    const groupData = req.body;
    const result = await GroupService.createGroup(groupData, req.user.id);

    if (result.success) {
      // 作成者を担当教員として自動追加するロジックがあっても良いが、
      // ここではグループ作成のみ行う。
      // 必要であれば GroupService.createGroup 内で group_teachers に追加するか、
      // ここで GroupService.addTeacher を呼ぶ。
      if (req.user.role === 'teacher') {
        await GroupService.addTeacher(result.data.id, req.user.id, 'main');
      }
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * グループ一覧の取得
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

    const { search, is_active, limit, offset = 0 } = req.query;

    const options = { search, is_active, limit, offset };

    // データアクセスフィルタリング
    if (req.user.role === 'student') {
      options.student_id = req.user.studentId;
    } else if (req.user.role === 'teacher') {
      // 教員は担当しているグループのみ表示
      options.teacher_id = req.user.id;
    } else if (req.user.role === 'employee') {
      // 一般従業員（事務など）は自分が作成したもののみ
      options.created_by = req.user.id;
    }
    // admin は全件取得可能（フィルタなし）

    const result = await GroupService.getGroups(options);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 特定グループの取得
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 教員の場合は担当クラスかチェック
    if (req.user.role === 'teacher') {
      const isTeacher = await RoleService.isClassTeacher(req.user.id, id);
      if (!isTeacher) {
        return res.status(403).json({ success: false, message: 'このクラスへのアクセス権限がありません' });
      }
    }

    const result = await GroupService.getGroup(id);

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
 * グループ情報の更新
 */
router.put('/:id', authenticate, requireRole(['admin', 'teacher', 'employee']), async (req, res, next) => {
  // 教員の場合は担当クラスのみ編集可能にするため requireClassTeacher を使いたいが、
  // employee も許可されているため、個別にチェックする。
  if (req.user.role === 'teacher') {
    const isTeacher = await RoleService.isClassTeacher(req.user.id, req.params.id);
    if (!isTeacher) return res.status(403).json({ message: '権限がありません' });
  }

  // バリデーションなどは省略（本来は必要）
  try {
    const { id } = req.params;
    const updateData = req.body;
    const result = await GroupService.updateGroup(id, updateData);

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
 * グループメンバーの追加
 */
router.post('/:id/members', authenticate, requireRole(['admin', 'teacher', 'employee']), [
  body('studentId')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  body('status')
    .optional()
    .isIn(['pending'])
    .withMessage('有効なステータスを選択してください')
], async (req, res, next) => {
  // 教員の場合は担当チェック
  if (req.user.role === 'teacher') {
    const isTeacher = await RoleService.isClassTeacher(req.user.id, req.params.id);
    if (!isTeacher) return res.status(403).json({ message: '権限がありません' });
  }

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
    const { studentId } = req.body;

    const result = await GroupService.addMember(id, studentId, req.user.id);

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
 * グループメンバーの取得
 */
router.get('/:id/members', authenticate, [
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'declined'])
    .withMessage('有効なステータスを選択してください'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
  query('offset')
    .optional()
    .isInt({ min: 0 })
], async (req, res, next) => {
  // 教員の場合は担当チェック
  if (req.user.role === 'teacher') {
    const isTeacher = await RoleService.isClassTeacher(req.user.id, req.params.id);
    if (!isTeacher) return res.status(403).json({ message: '権限がありません' });
  }

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
    const { status, limit, offset = 0 } = req.query;

    const result = await GroupService.getMembers(id, { status, limit, offset });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * グループメンバーの削除
 */
router.delete('/:id/members/:studentId', authenticate, requireRole(['admin', 'teacher', 'employee']), async (req, res, next) => {
  // 教員の場合は担当チェック
  if (req.user.role === 'teacher') {
    const isTeacher = await RoleService.isClassTeacher(req.user.id, req.params.id);
    if (!isTeacher) return res.status(403).json({ message: '権限がありません' });
  }

  try {
    const { id, studentId } = req.params;
    const result = await GroupService.removeMember(id, studentId);

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
 * グループの削除
 */
router.delete('/:id', authenticate, requireRole(['admin', 'employee']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await GroupService.deleteGroup(id);

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
 * 担当教員一覧の取得
 */
router.get('/:id/teachers', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await GroupService.getTeachers(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 担当教員の追加
 */
router.post('/:id/teachers', authenticate, requireRole(['admin']), [
  body('userId')
    .isInt()
    .withMessage('有効なユーザーIDを入力してください'),
  body('role')
    .optional()
    .isIn(['main', 'assistant'])
    .withMessage('有効な役割を選択してください')
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

    const { id } = req.params;
    const { userId, role } = req.body;

    const result = await GroupService.addTeacher(id, userId, role);

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
 * 担当教員の削除
 */
router.delete('/:id/teachers/:userId', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const result = await GroupService.removeTeacher(id, userId);

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