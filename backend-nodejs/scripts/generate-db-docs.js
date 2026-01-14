/**
 * データベース構造をMarkdownとMermaid ER図で出力
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function generateDbDocs() {
    const connection = await pool.getConnection();

    try {
        let markdown = '# Database Schema\n\n';
        markdown += `Generated: ${new Date().toLocaleString('ja-JP')}\n\n`;

        // データベース名
        const [[dbInfo]] = await connection.query('SELECT DATABASE() as db_name');
        markdown += `## Database: ${dbInfo.db_name}\n\n`;

        // テーブル一覧取得
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        markdown += `Total Tables: ${tableNames.length}\n\n`;

        // テーブルサマリー
        markdown += '## Table Summary\n\n';
        markdown += '| Table | Rows | Description |\n';
        markdown += '|-------|------|-------------|\n';

        const tableRowCounts = [];
        for (const tableName of tableNames) {
            const [[countResult]] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            tableRowCounts.push({ name: tableName, count: countResult.count });
            markdown += `| ${tableName} | ${countResult.count} | |\n`;
        }

        // Mermaid ER図
        markdown += '\n## ER Diagram\n\n';
        markdown += '```mermaid\nerDiagram\n';

        // 全外部キー取得
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

        // リレーション出力
        const addedRelations = new Set();
        for (const fk of allFks) {
            const relation = `${fk.TABLE_NAME}--${fk.REFERENCED_TABLE_NAME}`;
            if (!addedRelations.has(relation)) {
                addedRelations.add(relation);
                markdown += `    ${fk.REFERENCED_TABLE_NAME} ||--o{ ${fk.TABLE_NAME} : "has"\n`;
            }
        }

        markdown += '```\n\n';

        // 各テーブル詳細
        markdown += '## Table Details\n\n';

        for (const tableName of tableNames) {
            const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);

            const [fks] = await connection.query(`
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [tableName]);

            const tableInfo = tableRowCounts.find(t => t.name === tableName);

            markdown += `### ${tableName}\n\n`;
            markdown += `Rows: ${tableInfo.count}\n\n`;
            markdown += '| Column | Type | Key | Null | FK Reference |\n';
            markdown += '|--------|------|-----|------|-------------|\n';

            for (const col of columns) {
                const pk = col.Key === 'PRI' ? 'PK' : (col.Key === 'MUL' ? 'FK' : '');
                const fk = fks.find(f => f.COLUMN_NAME === col.Field);
                const fkRef = fk ? `${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}` : '';
                markdown += `| ${col.Field} | ${col.Type} | ${pk} | ${col.Null} | ${fkRef} |\n`;
            }

            markdown += '\n';
        }

        // ファイル出力
        const outputPath = path.join(__dirname, '..', 'DATABASE_SCHEMA.md');
        fs.writeFileSync(outputPath, markdown, 'utf8');

        console.log('Database schema documentation generated!');
        console.log(`Output: ${outputPath}`);
        console.log('');
        console.log(markdown);

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

generateDbDocs();
