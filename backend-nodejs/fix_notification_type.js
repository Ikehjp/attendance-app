/**
 * 通知テーブルのtype列をVARCHARに変更するマイグレーションスクリプト
 */
const { query } = require('./config/database');

async function migrate() {
    try {
        console.log('通知テーブルのtype列を修正中...');

        await query(`ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) DEFAULT 'general'`);

        console.log('✅ 通知テーブルのtype列を修正しました');
        process.exit(0);
    } catch (error) {
        console.error('❌ マイグレーションエラー:', error.message);
        process.exit(1);
    }
}

migrate();
