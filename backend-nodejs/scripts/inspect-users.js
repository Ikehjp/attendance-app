/**
 * usersテーブルの完全な情報を表示
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function inspectUsersTable() {
    const connection = await pool.getConnection();

    try {
        // テーブル構造
        const [columns] = await connection.query('DESCRIBE users');

        console.log('='.repeat(80));
        console.log('USERS TABLE STRUCTURE');
        console.log('='.repeat(80));
        console.log('');

        columns.forEach(col => {
            console.log(`Field: ${col.Field}`);
            console.log(`  Type: ${col.Type}`);
            console.log(`  Null: ${col.Null}`);
            console.log(`  Key: ${col.Key || 'none'}`);
            console.log(`  Default: ${col.Default || 'none'}`);
            console.log(`  Extra: ${col.Extra || 'none'}`);
            console.log('');
        });

        // ユーザー数
        const [[{ count }]] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`Total users: ${count}`);
        console.log('');

        if (count > 0) {
            console.log('Existing users:');
            const [users] = await connection.query('SELECT * FROM users LIMIT 5');
            console.log(JSON.stringify(users, null, 2));
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

inspectUsersTable();
