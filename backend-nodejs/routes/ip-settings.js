const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * すべてのIP範囲設定を取得
 */
router.get('/', authenticate, requireRole(['admin', 'owner']), async (req, res, next) => {
    try {
        const ipRanges = await query(
            'SELECT * FROM allowed_ip_ranges ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: ipRanges
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 新しいIP範囲を追加
 */
router.post('/', authenticate, requireRole(['admin', 'owner']), [
    body('name').notEmpty().withMessage('名前は必須です'),
    body('ip_start').notEmpty().withMessage('開始IPアドレスは必須です').isIP(),
    body('ip_end').notEmpty().withMessage('終了IPアドレスは必須です').isIP(),
    body('description').optional(),
    body('is_active').optional().isBoolean()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, ip_start, ip_end, description, is_active } = req.body;

        const result = await query(
            'INSERT INTO allowed_ip_ranges (name, ip_start, ip_end, description, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, ip_start, ip_end, description || '', is_active !== undefined ? is_active : 1]
        );

        res.status(201).json({
            success: true,
            message: 'IP範囲を追加しました',
            data: {
                id: result.insertId,
                name,
                ip_start,
                ip_end,
                description,
                is_active
            }
        });

        logger.info('IP範囲追加', { adminId: req.user.id, name, ip_start, ip_end });
    } catch (error) {
        next(error);
    }
});

/**
 * IP範囲の更新
 */
router.put('/:id', authenticate, requireRole(['admin', 'owner']), [
    param('id').isInt(),
    body('name').optional().notEmpty(),
    body('ip_start').optional().isIP(),
    body('ip_end').optional().isIP(),
    body('is_active').optional().isBoolean()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { name, ip_start, ip_end, description, is_active } = req.body;

        // 存在チェック
        const existing = await query('SELECT id FROM allowed_ip_ranges WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: '指定されたIP範囲が見つかりません' });
        }

        const updates = [];
        const params = [];

        if (name) { updates.push('name = ?'); params.push(name); }
        if (ip_start) { updates.push('ip_start = ?'); params.push(ip_start); }
        if (ip_end) { updates.push('ip_end = ?'); params.push(ip_end); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

        if (updates.length > 0) {
            params.push(id);
            await query(
                `UPDATE allowed_ip_ranges SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                params
            );
        }

        res.json({ success: true, message: 'IP範囲を更新しました' });

        logger.info('IP範囲更新', { adminId: req.user.id, ipRangeId: id });
    } catch (error) {
        next(error);
    }
});

/**
 * IP範囲の削除
 */
router.delete('/:id', authenticate, requireRole(['admin', 'owner']), [
    param('id').isInt()
], async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM allowed_ip_ranges WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '指定されたIP範囲が見つかりません' });
        }

        res.json({ success: true, message: 'IP範囲を削除しました' });

        logger.info('IP範囲削除', { adminId: req.user.id, ipRangeId: id });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
