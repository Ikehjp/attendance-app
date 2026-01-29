const express = require('express');
const router = express.Router();
const TimetableService = require('../services/TimetableService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Excelファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/timetables/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'timetable-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /xlsx|xls|csv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('Excel または CSV ファイルのみアップロード可能です'));
        }
    }
});

/**
 * 時間割管理ルート
 */

// すべてのルートで認証が必要
router.use(authenticate);

// ========================================
// 組織設定関連エンドポイント（/:idより前に定義する必要がある）
// ========================================

/**
 * GET /api/timetables/settings
 * 組織の時間割設定を取得
 */
router.get('/settings', async (req, res) => {
    try {
        const organizationId = req.user.organization_id || 1;
        const result = await TimetableService.getOrganizationSettings(organizationId);
        res.json(result);
    } catch (error) {
        console.error('組織設定取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '設定の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/timetables/settings
 * 組織の時間割設定を保存
 */
router.post('/settings', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                message: '管理者のみ設定を変更できます'
            });
        }

        const organizationId = req.user.organization_id || 1;
        const result = await TimetableService.saveOrganizationSettings(organizationId, req.body);
        res.json(result);
    } catch (error) {
        console.error('組織設定保存エラー:', error);
        res.status(500).json({
            success: false,
            message: '設定の保存に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/timetables
 * 新しい時間割を作成
 */
router.post('/', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみ時間割を作成できます'
            });
        }

        const timetable = await TimetableService.createTimetable(req.body);

        res.status(201).json({
            success: true,
            message: '時間割を作成しました',
            data: timetable
        });
    } catch (error) {
        console.error('時間割作成エラー:', error);
        res.status(400).json({
            success: false,
            message: '時間割の作成に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/timetables/:id
 * 時間割詳細を取得
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const timetable = await TimetableService.getTimetable(parseInt(id));

        res.json({
            success: true,
            data: timetable
        });
    } catch (error) {
        console.error('時間割詳細取得エラー:', error);
        res.status(404).json({
            success: false,
            message: '時間割が見つかりません',
            error: error.message
        });
    }
});

/**
 * GET /api/timetables/group/:groupId
 * グループの時間割一覧を取得
 */
router.get('/group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const timetables = await TimetableService.getTimetablesByGroup(parseInt(groupId));

        res.json({
            success: true,
            data: timetables
        });
    } catch (error) {
        console.error('グループ時間割一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '時間割一覧の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/timetables/:id/sessions
 * 授業セッションを追加
 */
router.post('/:id/sessions', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみ授業を追加できます'
            });
        }

        const sessionData = {
            timetableId: parseInt(req.params.id),
            ...req.body
        };

        const session = await TimetableService.addClassSession(sessionData);

        res.status(201).json({
            success: true,
            message: '授業セッションを追加しました',
            data: session
        });
    } catch (error) {
        console.error('授業セッション追加エラー:', error);
        res.status(400).json({
            success: false,
            message: '授業セッションの追加に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/timetables/:id/sessions
 * 時間割の授業セッション一覧を取得
 */
router.get('/:id/sessions', async (req, res) => {
    try {
        const { id } = req.params;
        const options = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const sessions = await TimetableService.getClassSessions(parseInt(id), options);

        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('授業セッション一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '授業セッション一覧の取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * GET /api/timetables/calendar/:groupId
 * カレンダー表示用の時間割データを取得
 */
router.get('/calendar/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { periodType, startDate, endDate } = req.query;

        if (!periodType || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'periodType, startDate, endDate は必須です'
            });
        }

        const sessions = await TimetableService.getTimetableByPeriod(
            parseInt(groupId),
            periodType,
            startDate,
            endDate
        );

        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('カレンダーデータ取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'カレンダーデータの取得に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/timetables/import
 * Excelファイルから時間割をインポート
 */
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        // 管理者のみ
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '管理者のみインポートできます'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'ファイルがアップロードされていません'
            });
        }

        const { groupId, timetableId } = req.body;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: 'groupId は必須です'
            });
        }

        const result = await TimetableService.importFromExcel(
            req.file.path,
            parseInt(groupId),
            timetableId ? parseInt(timetableId) : null
        );

        res.json({
            success: true,
            message: `${result.importedCount}件の授業をインポートしました`,
            data: result
        });
    } catch (error) {
        console.error('Excelインポートエラー:', error);
        res.status(400).json({
            success: false,
            message: 'Excelインポートに失敗しました',
            error: error.message
        });
    }
});

/**
 * PUT /api/timetables/sessions/:sessionId/cancel
 * 授業のキャンセル/復活
 */
router.put('/sessions/:sessionId/cancel', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみ授業をキャンセルできます'
            });
        }

        const { sessionId } = req.params;
        const { isCancelled, reason } = req.body;

        const session = await TimetableService.toggleSessionCancellation(
            parseInt(sessionId),
            isCancelled,
            reason
        );

        res.json({
            success: true,
            message: isCancelled ? '授業をキャンセルしました' : '授業を復活しました',
            data: session
        });
    } catch (error) {
        console.error('授業キャンセル更新エラー:', error);
        res.status(400).json({
            success: false,
            message: '授業キャンセル更新に失敗しました',
            error: error.message
        });
    }
});


/**
 * POST /api/timetables/:id/expand
 * 週パターンを指定期間に展開
 */
router.post('/:id/expand', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみ週パターンを展開できます'
            });
        }

        const { id } = req.params;
        const { pattern, startDate, endDate, skipWeekends } = req.body;
        const organizationId = req.user.organization_id || 1;

        const result = await TimetableService.expandWeeklyPattern(
            pattern,
            startDate,
            endDate,
            parseInt(id),
            { skipWeekends, organizationId }
        );

        res.json({
            success: true,
            message: '週パターンを展開しました',
            data: result
        });
    } catch (error) {
        console.error('週パターン展開エラー:', error);
        res.status(400).json({
            success: false,
            message: '週パターンの展開に失敗しました',
            error: error.message
        });
    }
});

/**
 * PUT /api/timetables/sessions/:sessionId
 * 授業セッションを更新（個別変更）
 */
router.put('/sessions/:sessionId', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみ授業を更新できます'
            });
        }

        const { sessionId } = req.params;
        const updateData = req.body;
        const userId = req.user.id;

        const session = await TimetableService.updateClassSession(
            parseInt(sessionId),
            updateData,
            userId
        );

        res.json({
            success: true,
            message: '授業セッションを更新しました',
            data: session
        });
    } catch (error) {
        console.error('授業セッション更新エラー:', error);
        res.status(400).json({
            success: false,
            message: '授業セッションの更新に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/timetables/bulk-cancel
 * 指定日の全授業を一括休講
 */
router.post('/bulk-cancel', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみ一括休講を実行できます'
            });
        }

        const { date, reason, groupId, timetableId } = req.body;
        const organizationId = req.user.organization_id || 1;
        const userId = req.user.id;

        const result = await TimetableService.bulkCancelSessions(
            date,
            organizationId,
            reason,
            userId,
            { groupId, timetableId }
        );

        res.json({
            success: true,
            message: '一括休講を実行しました',
            data: result
        });
    } catch (error) {
        console.error('一括休講エラー:', error);
        res.status(400).json({
            success: false,
            message: '一括休講の実行に失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/timetables/bulk-restore
 * 指定日の一括休講を取り消し
 */
router.post('/bulk-restore', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみ一括休講を取り消しできます'
            });
        }

        const { date, groupId, timetableId } = req.body;
        const organizationId = req.user.organization_id || 1;

        const result = await TimetableService.bulkRestoreSessions(
            date,
            organizationId,
            { groupId, timetableId }
        );

        res.json({
            success: true,
            message: '一括休講を取り消しました',
            data: result
        });
    } catch (error) {
        console.error('一括休講取り消しエラー:', error);
        res.status(400).json({
            success: false,
            message: '一括休講の取り消しに失敗しました',
            error: error.message
        });
    }
});

/**
 * POST /api/timetables/:id/reapply-template
 * テンプレートを再適用
 */
router.post('/:id/reapply-template', async (req, res) => {
    try {
        // 管理者または教員のみ
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: '管理者または教員のみテンプレートを再適用できます'
            });
        }

        const { id } = req.params;
        const { pattern, preserveManualChanges, startDate, endDate } = req.body;

        const result = await TimetableService.reapplyTemplate(
            parseInt(id),
            pattern,
            { preserveManualChanges, startDate, endDate }
        );

        res.json({
            success: true,
            message: 'テンプレートを再適用しました',
            data: result
        });
    } catch (error) {
        console.error('テンプレート再適用エラー:', error);
        res.status(400).json({
            success: false,
            message: 'テンプレートの再適用に失敗しました',
            error: error.message
        });
    }
});

module.exports = router;

