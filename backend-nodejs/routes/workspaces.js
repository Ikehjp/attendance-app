// backend-nodejs/routes/workspaces.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- 画像アップロード設定 (Multer) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 保存先フォルダ: uploads/workspaces
    const uploadDir = path.join(__dirname, '../uploads/workspaces');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // ファイル名: workspace-ID-タイムスタンプ.拡張子
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'workspace-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB制限
});

// --- ルート定義 ---

// 1. 自分が所属するワークスペース一覧を取得
router.get('/', authenticate, async (req, res) => {
    try {
        const sql = `
            SELECT w.* FROM workspaces w
            JOIN workspace_user wu ON w.id = wu.workspace_id
            WHERE wu.user_id = ?
        `;
        const workspaces = await query(sql, [req.user.id]);
        res.json(workspaces);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "サーバーエラー" });
    }
});

// 2. ワークスペースの作成
router.post('/', authenticate, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "名前は必須です" });

    try {
        const result = await query(
            'INSERT INTO workspaces (name, owner_id, created_at) VALUES (?, ?, NOW())',
            [name, req.user.id]
        );
        const workspaceId = result.insertId;

        await query(
            'INSERT INTO workspace_user (workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())',
            [workspaceId, req.user.id, 'admin']
        );

        res.json({ success: true, workspaceId, message: "ワークスペースを作成しました" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "作成に失敗しました" });
    }
});

// 3. アイコン画像のアップロード (単体)
router.post('/:id/icon', authenticate, upload.single('icon'), async (req, res) => {
    try {
        const workspaceId = req.params.id;
        if (!req.file) {
            return res.status(400).json({ message: "画像ファイルがありません" });
        }

        const iconUrl = `/uploads/workspaces/${req.file.filename}`;

        await query(
            'UPDATE workspaces SET icon_url = ? WHERE id = ?',
            [iconUrl, workspaceId]
        );

        res.json({ success: true, iconUrl, message: "アイコンを更新しました" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "アップロードに失敗しました" });
    }
});

// 4. ワークスペース情報の更新 (PATCH: 名前とアイコン同時更新対応)
router.patch('/:id', authenticate, upload.single('icon'), async (req, res) => {
    const workspaceId = req.params.id;
    const { name } = req.body;
    
    // 画像がアップロードされた場合はそのパスを使用
    const iconUrl = req.file ? `/uploads/workspaces/${req.file.filename}` : null;

    if (!name && !iconUrl) {
        return res.json({ success: true, message: "変更はありません" });
    }

    try {
        let updates = [];
        let params = [];
        
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (iconUrl) {
            updates.push('icon_url = ?');
            params.push(iconUrl);
        }

        params.push(workspaceId);

        const sql = `UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`;
        await query(sql, params);

        res.json({ success: true, message: "更新しました" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "更新に失敗しました" });
    }
});

module.exports = router;