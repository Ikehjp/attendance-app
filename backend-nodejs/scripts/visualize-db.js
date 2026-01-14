/**
 * データベース構造の視覚化
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function visualizeDatabase() {
    const connection = await pool.getConnection();

    try {
        console.log('');
        console.log('='.repeat(80));
        console.log('DATABASE SCHEMA VISUALIZATION');
        console.log('='.repeat(80));
        console.log('');

        // データベース名を取得
        const [[dbInfo]] = await connection.query('SELECT DATABASE() as db_name');
        console.log(`Database: ${dbInfo.db_name}`);
        console.log('');

        // テーブル一覧を取得
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        console.log(`Total Tables: ${tableNames.length}`);
        console.log('-'.repeat(80));
        console.log('');

        // 各テーブルの情報を取得
        for (const tableName of tableNames) {
            // テーブルの行数
            const [[countResult]] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);

            // カラム情報
            const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);

            // 外部キー情報
            const [fks] = await connection.query(`
        SELECT 
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [tableName]);

            console.log(`+${'='.repeat(78)}+`);
            console.log(`| TABLE: ${tableName.padEnd(58)} Rows: ${String(countResult.count).padStart(6)} |`);
            console.log(`+${'-'.repeat(78)}+`);

            // カラム表示
            for (const col of columns) {
                const pk = col.Key === 'PRI' ? ' [PK]' : '';
                const fk = fks.find(f => f.COLUMN_NAME === col.Field);
                const fkRef = fk ? ` -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})` : '';
                const nullable = col.Null === 'YES' ? ' NULL' : '';

                console.log(`|   ${col.Field.padEnd(25)} ${col.Type.padEnd(25)}${pk}${fkRef}${nullable}`);
            }

            console.log(`+${'-'.repeat(78)}+`);
            console.log('');
        }

        // リレーション図（簡易版）
        console.log('');
        console.log('='.repeat(80));
        console.log('RELATIONSHIPS (Foreign Keys)');
        console.log('='.repeat(80));
        console.log('');

        const [allFks] = await connection.query(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME
    `);

        if (allFks.length > 0) {
            let currentTable = '';
            for (const fk of allFks) {
                if (fk.TABLE_NAME !== currentTable) {
                    if (currentTable) console.log('');
                    currentTable = fk.TABLE_NAME;
                    console.log(`[${currentTable}]`);
                }
                console.log(`    ${fk.COLUMN_NAME} ---> [${fk.REFERENCED_TABLE_NAME}].${fk.REFERENCED_COLUMN_NAME}`);
            }
        } else {
            console.log('No foreign key relationships found.');
        }

        console.log('');
        console.log('='.repeat(80));
        console.log('');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

visualizeDatabase();
