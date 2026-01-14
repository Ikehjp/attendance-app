require('dotenv').config();
const express = require('express');

console.log('最小構成サーバーテスト');
console.log('========================================\n');

const app = express();
const PORT = 3001;

app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Test OK' });
});

app.listen(PORT, () => {
    console.log(`✅ サーバー起動成功: http://localhost:${PORT}`);
    console.log('テストURL: http://localhost:${PORT}/test\n');
});
