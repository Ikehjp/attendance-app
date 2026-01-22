const express = require('express');
const router = express.Router();
const icService = require('../services/IcRegistrationService');
// ▼▼▼ 修正: auth ではなく authenticate を読み込む ▼▼▼
const { authenticate } = require('../middleware/auth');

// スマホ用
// ▼▼▼ 修正: ミドルウェア名を authenticate に変更 ▼▼▼
router.post('/register/start', authenticate, (req, res) => {
    const result = icService.startRegistration(req.user.id);
    result.success ? res.json({ message: "30秒以内にタッチしてください" }) : res.status(409).json(result);
});

router.get('/register/status', authenticate, (req, res) => {
    res.json(icService.getSessionStatus(req.user.id));
});

router.post('/register/confirm', authenticate, async (req, res) => {
    try {
        const result = await icService.confirmRegistration(req.user.id);
        res.json({ message: "登録完了", idm: result.idm });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// ラズパイ用 (こちらは認証なし、またはIP制限などをかけるのが一般的ですが今はそのままでOK)
router.post('/scan', async (req, res) => {
    const { idm } = req.body;
    if (!idm) return res.status(400).send("No IDm");
    try {
        const result = await icService.handleScannedCard(idm);
        res.json(result);
    } catch (e) {
        res.status(500).json({ message: "Error" });
    }
});

module.exports = router;