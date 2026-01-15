const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const NotificationService = require('../services/NotificationService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
module.exports = router;

// ヘルスチェック用エンドポイント
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: ユーザーログイン
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: ユーザーのメールアドレス
 *               password:
 *                 type: string
 *                 format: password
 *                 description: ユーザーのパスワード
 *     responses:
 *       200:
 *         description: ログイン成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       400:
 *         description: 入力データエラー
 *       401:
 *         description: 認証失敗
 *       500:
 *         description: サーバーエラー
 */
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('パスワードは6文字以上で入力してください')
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

    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    if (result.success) {
      // [修正] トークンをCookieに設定
      res.cookie('token', result.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24時間
      });

      // レスポンスボディからトークンを除外（または必要に応じて残す）
      // ここではセキュリティのため除外しますが、互換性のため残すことも検討
      // レスポンスボディからトークンを除外せず、含めるように変更
      // const { token, ...userData } = result.data;
      res.json({
        success: true,
        message: 'ログインしました',
        data: result.data
      });
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    logger.error('ログインAPIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 新規登録
 */
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('名前は1文字以上255文字以下で入力してください'),
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('パスワードは6文字以上で入力してください'),
  body('role')
    .isIn(['owner', 'student'])
    .withMessage('役割は管理者(owner)または生徒(student)である必要があります'),
  body('organizationName')
    .if(body('role').equals('owner'))
    .notEmpty()
    .withMessage('組織名は必須です')
    .trim()
    .isLength({ max: 100 })
    .withMessage('組織名は100文字以下で入力してください'),
  body('joinCode')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('参加コードは必須です')
    .trim(),
  body('studentId')
    .optional({ checkFalsy: true }) // 空文字列もスキップ
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('学生IDは1文字以上255文字以下で入力してください'),
  // departmentは削除（組織情報に統合されたため）
], async (req, res) => {
  try {
    logger.info('=== 新規登録APIリクエスト受信 ===', {
      body: {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        organizationName: req.body.organizationName,
        joinCode: req.body.joinCode ? `${req.body.joinCode.substring(0, 10)}...` : undefined,
        hasPassword: !!req.body.password
      },
      ip: req.ip
    });

    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('新規登録バリデーションエラー', {
        errors: errors.array(),
        email: req.body.email
      });
      return res.status(400).json({
        success: false,
        message: '入力データにエラーがあります',
        errors: errors.array()
      });
    }

    logger.info('バリデーション通過、AuthServiceを呼び出し中...');
    const userData = req.body;
    const result = await AuthService.register(userData);

    logger.info('AuthService.register処理完了', {
      success: result.success,
      message: result.message
    });

    if (result.success) {
      // 学生ID未登録時の通知作成
      const registeredUser = result.data.user;
      if (registeredUser.role === 'student' && !registeredUser.studentId) {
        try {
          await NotificationService.createNotification({
            user_id: registeredUser.id,
            title: '学生ID未登録のお知らせ',
            message: '現在、学生IDが登録されていません。各種機能を利用するために、プロフィール画面から学生IDの登録を行ってください。',
            type: 'system',
            priority: 'high'
          });
        } catch (err) {
          logger.warn('登録時通知作成失敗', { error: err.message });
        }
      }

      // トークンをCookieに設定（loginと同じパターン）
      res.cookie('token', result.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24時間
      });

      // レスポンスボディからトークンを除外
      const { token, ...userData } = result.data;
      res.status(201).json({
        success: true,
        message: 'アカウントが作成されました',
        data: userData
      });
    } else {
      logger.warn('新規登録失敗', {
        message: result.message,
        email: req.body.email
      });
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('=== 新規登録APIエラー ===', {
      errorMessage: error.message,
      errorStack: error.stack,
      email: req.body.email
    });
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ユーザー情報取得
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('ユーザー情報取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * パスワード変更
 */
router.put('/change-password', authenticate, [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('現在のパスワードは6文字以上で入力してください'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新しいパスワードは6文字以上で入力してください')
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

    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('パスワード変更APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * プロフィール更新
 */
router.put('/profile', authenticate, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('名前は1文字以上255文字以下で入力してください'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('部署名は100文字以下で入力してください'),
  body('student_id')
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

    const updateData = req.body;
    const result = await AuthService.updateProfile(req.user.id, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('プロフィール更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ログアウト（クライアント側でトークンを削除）
 */
router.post('/logout', authenticate, (req, res) => {
  logger.info('ログアウト', { userId: req.user.id });
  res.clearCookie('token'); // [追加] Cookie削除
  res.json({
    success: true,
    message: 'ログアウトしました'
  });
});

/**
 * パスワードリセット要求
 */
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail()
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

    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);

    res.json(result);
  } catch (error) {
    logger.error('パスワードリセット要求APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * パスワードリセット実行
 */
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('トークンが必要です'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新しいパスワードは6文字以上で入力してください')
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

    const { token, newPassword } = req.body;
    const result = await AuthService.resetPassword(token, newPassword);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('パスワードリセット実行APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router; // Moved to top to prevent circular dependency issues
