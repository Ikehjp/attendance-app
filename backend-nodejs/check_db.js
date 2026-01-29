// データベース構造確認スクリプト
const mysql = require('mysql2/promise');
const dbConfig = require('./db_config');

async function checkDatabase() {
    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('===== qr_codes テーブルの構造 =====\n');

        const [columns] = await connection.query('DESCRIBE qr_codes');
        columns.forEach(col => {
            console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
        });

        // organization_idカラムの存在チェック
        const hasOrgId = columns.some(col => col.Field === 'organization_id');
        console.log(`\n★ organization_id カラム: ${hasOrgId ? '存在する ✓' : '存在しない ✗'}`);

        if (!hasOrgId) {
            console.log('\n【修正が必要】organization_id カラムを追加する必要があります。');
        }

    } catch (error) {
        console.error('エラー:', error.message);
    } finally {
        await connection.end();
    }
}

checkDatabase();
