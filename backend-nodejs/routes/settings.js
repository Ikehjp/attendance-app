const express = require('express');
const { body, query, validationResult } = require('express-validator');
const SettingsService = require('../services/SettingService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * システム設定の取得
 */
router.get('/', authenticate, [
  query('is_public')
    .optional()
    .isBoolean()
    .withMessage('公開フラグは真偽値で入力してください'),
  query('setting_key')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('設定キーは1文字以上100文字以下で入力してください')
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

    const { is_public, setting_key } = req.query;
    
    // 一般ユーザーは公開設定のみ取得可能
    const isPublicOnly = req.user.role !== 'admin' ? true : is_public;
    
    const result = await SettingsService.getSettings({
      is_public: isPublicOnly,
      setting_key
    });

    res.json(result);
  } catch (error) {
    logger.error('設定取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 特定設定の取得
 */
router.get('/:key', authenticate, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await SettingsService.getSetting(key, req.user.role);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error('設定取得APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * システム設定の作成・更新（管理者のみ）
 */
router.post('/', authenticate, requireAdmin, [
  body('setting_key')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('設定キーは1文字以上100文字以下で入力してください'),
  body('setting_value')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('設定値は1000文字以下で入力してください'),
  body('setting_type')
    .optional()
    .isIn(['string', 'number', 'boolean', 'json'])
    .withMessage('有効な設定タイプを選択してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('説明は500文字以下で入力してください'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('公開フラグは真偽値で入力してください')
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

    const settingData = req.body;
    const result = await SettingsService.createOrUpdateSetting(settingData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('設定作成・更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * システム設定の更新（管理者のみ）
 */
router.put('/:key', authenticate, requireAdmin, [
  body('setting_value')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('設定値は1000文字以下で入力してください'),
  body('setting_type')
    .optional()
    .isIn(['string', 'number', 'boolean', 'json'])
    .withMessage('有効な設定タイプを選択してください'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('説明は500文字以下で入力してください'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('公開フラグは真偽値で入力してください')
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

    const { key } = req.params;
    const updateData = req.body;

    const result = await SettingsService.updateSetting(key, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('設定更新APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * システム設定の削除（管理者のみ）
 */
router.delete('/:key', authenticate, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;

    const result = await SettingsService.deleteSetting(key);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('設定削除APIエラー:', error.message);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
