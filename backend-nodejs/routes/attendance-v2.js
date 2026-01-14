/**
 * 統合出欠APIルート (新スキーマ対応)
 */
const express = require('express');
const router = express.Router();
const { body, query: queryValidator, param, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { AttendanceCompat, getOrganizationIdForUser } = require('../services/CompatibilityLayer');
const logger = require('../utils/logger');

/**
 * チェックイン
 * POST /api/v2/attendance/check-in
 */
router.post('/check-in', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const organizationId = req.user.organization_id || await getOrganizationIdForUser(userId);

        const result = await AttendanceCompat.checkIn(userId, {
            organization_id: organizationId,
            record_type: req.body.record_type || 'work',
            reference_id: req.body.reference_id || null,
            source: req.body.source || 'manual',
            ip_address: req.ip
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        logger.error('チェックインAPIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: 'チェックインに失敗しました'
        });
    }
});

/**
 * チェックアウト
 * POST /api/v2/attendance/check-out
 */
router.post('/check-out', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const organizationId = req.user.organization_id || await getOrganizationIdForUser(userId);

        const result = await AttendanceCompat.checkOut(userId, {
            organization_id: organizationId,
            record_type: req.body.record_type || 'work'
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        logger.error('チェックアウトAPIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: 'チェックアウトに失敗しました'
        });
    }
});

/**
 * 今日の出欠状況取得
 * GET /api/v2/attendance/today
 */
router.get('/today', authenticate, async (req, res) => {
    try {
        const userId = req.query.user_id || req.user.id;
        const organizationId = req.user.organization_id;

        const result = await AttendanceCompat.getTodayStatus(userId, organizationId);

        res.json(result);
    } catch (error) {
        logger.error('今日の出欠状況取得APIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: '今日の出欠状況の取得に失敗しました'
        });
    }
});

/**
 * 月次レポート取得
 * GET /api/v2/attendance/monthly/:year/:month
 */
router.get('/monthly/:year/:month', authenticate, [
    param('year').isInt({ min: 2000, max: 2100 }),
    param('month').isInt({ min: 1, max: 12 })
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

        const { year, month } = req.params;
        const userId = req.query.user_id || req.user.id;
        const organizationId = req.user.organization_id;

        const result = await AttendanceCompat.getMonthlyReport(
            parseInt(userId),
            parseInt(year),
            parseInt(month),
            organizationId
        );

        res.json(result);
    } catch (error) {
        logger.error('月次レポート取得APIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: '月次レポートの取得に失敗しました'
        });
    }
});

/**
 * 日次統計取得
 * GET /api/v2/attendance/stats/daily/:year/:month
 */
router.get('/stats/daily/:year/:month', authenticate, requireRole(['owner', 'admin', 'teacher']), [
    param('year').isInt({ min: 2000, max: 2100 }),
    param('month').isInt({ min: 1, max: 12 })
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

        const { year, month } = req.params;
        const organizationId = req.user.organization_id;

        const result = await AttendanceCompat.getDailyStats(
            parseInt(year),
            parseInt(month),
            organizationId
        );

        res.json(result);
    } catch (error) {
        logger.error('日次統計取得APIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: '日次統計の取得に失敗しました'
        });
    }
});

/**
 * 欠席詳細取得
 * GET /api/v2/attendance/absence/:date
 */
router.get('/absence/:date', authenticate, requireRole(['owner', 'admin', 'teacher']), [
    param('date').isISO8601()
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

        const { date } = req.params;
        const organizationId = req.user.organization_id;

        const result = await AttendanceCompat.getAbsenceDetails(date, organizationId);

        res.json(result);
    } catch (error) {
        logger.error('欠席詳細取得APIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: '欠席詳細の取得に失敗しました'
        });
    }
});

module.exports = router;
