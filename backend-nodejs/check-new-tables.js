/**
 * 新テーブル確認スクリプト
 */
const { query } = require('./config/database');

async function checkTables() {
    try {
        const tables = await query(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME LIKE '%_new'
      ORDER BY TABLE_NAME
    `);

        console.log('新テーブル一覧:');
        console.log('-'.repeat(40));
        tables.forEach(t => {
            console.log(`${t.TABLE_NAME}: ${t.TABLE_ROWS || 0} rows`);
        });

        // ユーザー数確認
        const userCount = await query('SELECT COUNT(*) as cnt FROM users_new');
        console.log(`\nusers_new のレコード数: ${userCount[0].cnt}`);

        // 出欠記録数確認
        const attCount = await query('SELECT COUNT(*) as cnt FROM attendance_records_new');
        console.log(`attendance_records_new のレコード数: ${attCount[0].cnt}`);

        process.exit(0);
    } catch (error) {
        console.error('エラー:', error.message);
        process.exit(1);
    }
}

checkTables();
