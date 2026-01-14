/**
 * request_approvalsテーブルにcommentカラムを追加するマイグレーションスクリプト
 */
const { query } = require('./config/database');

async function migrate() {
    try {
        console.log('request_approvalsテーブルにcommentカラムを追加中...');

        try {
            await query("ALTER TABLE request_approvals ADD COLUMN comment TEXT AFTER action");
            console.log('✅ commentカラムを追加しました');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✅ commentカラムは既に存在します');
            } else {
                throw e;
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ マイグレーションエラー:', error.message);
        process.exit(1);
    }
}

migrate();
