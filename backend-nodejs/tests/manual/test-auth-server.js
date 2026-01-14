require('dotenv').config();
const express = require('express');
const { testConnection } = require('./config/database');

console.log('段階的サーバーテスト - 認証のみ');
console.log('========================================\n');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use('/api/auth', authRoutes);

async function start() {
    try {
        await testConnection();
        console.log('✅ DB接続成功');

        app.listen(PORT, () => {
            console.log(`✅ サーバー起動成功: http://localhost:${PORT}`);
            console.log('認証テストURL: POST http://localhost:${PORT}/api/auth/login\n');
        });
    } catch (error) {
        console.error('❌ エラー:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

start();
