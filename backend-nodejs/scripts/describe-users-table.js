/**
 * usersテーブルの構造を確認
 */

require('dotenv').config();
const { query, pool } = require('../config/database');

async function checkTableStructure() {
    try {
        console.log('='.repeat(60));
        console.log('USERS TABLE STRUCTURE');
        console.log('='.repeat(60));

        // テーブル構造を確認
        const columns = await query('DESCRIBE users');

        console.log('\nColumns in users table:');
        console.log('-'.repeat(60));
        columns.forEach(col => {
            console.log(`${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | Null: ${col.Null} | Key: ${col.Key || '-'} | Default: ${col.Default || '-'}`);
        });

        console.log('\n' + '='.repeat(60));

        // ユーザー数を確認
        const count = await query('SELECT COUNT(*) as total FROM users');
        console.log(`Total users: ${count[0].total}`);

        // 全カラム名を取得
        const columnNames = columns.map(col => col.Field).join(', ');
        console.log(`\nAll column names: ${columnNames}`);

        console.log('='.repeat(60));

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructure();
