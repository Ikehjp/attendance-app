const express = require('express');
const { query } = require('express-validator');
const { validationResult } = require('express-validator');
const ExportService = require('../services/ExportService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 出席記録エクスポート
 */
router.get('/attendance', authenticate, [
    query('startDate')
        .isDate()
        .withMessage('有効な開始日を指定してください (YYYY-MM-DD)'),
    query('endDate')
        .isDate()
        .withMessage('有効な終了日を指定してください (YYYY-MM-DD)'),
    query('userId')
        .optional()
        .isInt()
        .withMessage('ユーザーIDは整数である必要があります')
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

        const { startDate, endDate, userId: targetUserId } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;

        const csvData = await ExportService.exportAttendanceRecords(
            userId,
            userRole,
            startDate,
            endDate,
            targetUserId ? parseInt(targetUserId) : null
        );

        // ファイル名を生成
        const filename = `attendance_${startDate}_to_${endDate}.csv`;

        // レスポンスヘッダーを設定
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(csvData);
    } catch (error) {
        logger.error('出席記録エクスポートAPIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'サーバーエラーが発生しました'
        });
    }
});

/**
 * 全出席記録エクスポート（管理者のみ）
 */
router.get('/attendance/all', authenticate, [
    query('startDate')
        .isDate()
        .withMessage('有効な開始日を指定してください (YYYY-MM-DD)'),
    query('endDate')
        .isDate()
        .withMessage('有効な終了日を指定してください (YYYY-MM-DD)')
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

        const { startDate, endDate } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;

        const csvData = await ExportService.exportAllAttendanceRecords(
            userId,
            userRole,
            startDate,
            endDate
        );

        // ファイル名を生成
        const filename = `all_attendance_${startDate}_to_${endDate}.csv`;

        // レスポンスヘッダーを設定
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(csvData);
    } catch (error) {
        logger.error('全出席記録エクスポートAPIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'サーバーエラーが発生しました'
        });
    }
});

/**
 * イベント参加者エクスポート
 */
router.get('/event/:eventId/participants', authenticate, async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const csvData = await ExportService.exportEventParticipants(
            userId,
            userRole,
            parseInt(eventId)
        );

        // ファイル名を生成
        const filename = `event_${eventId}_participants.csv`;

        // レスポンスヘッダーを設定
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(csvData);
    } catch (error) {
        logger.error('イベント参加者エクスポートAPIエラー:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'サーバーエラーが発生しました'
        });
    }
});

module.exports = router;
