const express = require('express');
const { query, validationResult } = require('express-validator');
const DailyStatsService = require('../services/DailyStatsService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 月次の日別統計を取得
 * GET /api/attendance/daily-stats?year=2025&month=12
 */
router.get('/daily-stats', authenticate, [
    query('year')
        .isInt({ min: 2000, max: 2100 })
        .withMessage('有効な年を指定してください'),
    query('month')
        .isInt({ min: 1, max: 12 })
        .withMessage('有効な月を指定してください')
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

        const { year, month } = req.query;

        const result = await DailyStatsService.getDailyStats(
            parseInt(year),
            parseInt(month)
        );

        res.json(result);
    } catch (error) {
        logger.error('日次統計取得APIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: 'サーバーエラーが発生しました'
        });
    }
});

/**
 * 特定日の詳細な出欠情報を取得（教員のみ）
 * GET /api/attendance/absence-details/:date
 */
router.get('/absence-details/:date', authenticate, async (req, res) => {
    try {
        // owner, admin, teacher, employee のみアクセス可能
        const allowedRoles = ['owner', 'admin', 'teacher', 'employee'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'この操作は教職員のみ実行できます'
            });
        }

        const { date } = req.params;

        // 日付バリデーション (YYYY-MM-DD形式)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: '有効な日付形式(YYYY-MM-DD)を指定してください'
            });
        }

        const result = await DailyStatsService.getAbsenceDetails(date);

        res.json(result);
    } catch (error) {
        logger.error('欠席詳細取得APIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: 'サーバーエラーが発生しました'
        });
    }
});

module.exports = router;
