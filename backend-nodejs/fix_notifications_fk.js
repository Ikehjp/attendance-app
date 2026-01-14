/**
 * notificationsテーブルの外部キー制約を削除するマイグレーションスクリプト
 */
const { query } = require('./config/database');

async function migrate() {
    try {
        console.log('notificationsテーブルの外部キー制約を確認中...');

        // 外部キー制約を削除
        try {
            await query("ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_2");
            console.log('✅ 外部キー制約 notifications_ibfk_2 を削除しました');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('✅ 外部キー制約は既に存在しません');
            } else {
                console.log('外部キー制約の削除をスキップ:', e.message);
            }
        }

        // student_idの型をVARCHARに変更（制約なし）
        try {
            await query("ALTER TABLE notifications MODIFY COLUMN student_id VARCHAR(50) DEFAULT NULL");
            console.log('✅ student_idカラムを修正しました');
        } catch (e) {
            console.log('student_idカラム修正をスキップ:', e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ マイグレーションエラー:', error.message);
        process.exit(1);
    }
}

migrate();
