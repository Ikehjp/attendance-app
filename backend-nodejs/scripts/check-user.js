const { query, closePool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function checkUser() {
    try {
        console.log('ユーザー確認中...');
        const users = await query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);

        if (users.length === 0) {
            console.log('❌ ユーザーが見つかりません');
        } else {
            const user = users[0];
            console.log('✅ ユーザー発見:', {
                id: user.id,
                email: user.email,
                role: user.role,
                organization_id: user.organization_id,
                password_hash: user.password.substring(0, 20) + '...'
            });

            // パスワード検証
            const isMatch = await bcrypt.compare('admin123', user.password);
            console.log('パスワード検証 (admin123):', isMatch ? '✅ 一致' : '❌ 不一致');

            if (!isMatch) {
                // パスワードを再設定
                const newHash = await bcrypt.hash('admin123', 10);
                await query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
                console.log('🔧 パスワードを "admin123" に再設定しました');
            }
        }
    } catch (error) {
        console.error('エラー:', error);
    } finally {
        await closePool();
    }
}

checkUser();
