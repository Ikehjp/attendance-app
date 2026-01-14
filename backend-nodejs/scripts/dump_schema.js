const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function dumpSchema() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'server',
            password: process.env.DB_PASS || 'pass',
            database: process.env.DB_NAME || 'sotsuken',
            multipleStatements: true
        });

        console.log('Connected. Fetching tables...');
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        let fullSchema = `-- Database Schema Dump\n-- Generated at: ${new Date().toISOString()}\n\n`;
        fullSchema += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        for (const tableName of tableNames) {
            console.log(`Fetching schema for table: ${tableName}`);
            const [rows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
            if (rows.length > 0) {
                fullSchema += `-- Table structure for table \`${tableName}\`\n`;
                fullSchema += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
                fullSchema += `${rows[0]['Create Table']};\n\n`;
            }
        }

        fullSchema += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        const outputPath = path.join(__dirname, 'full_schema_dump.sql');
        fs.writeFileSync(outputPath, fullSchema);
        console.log(`Schema dump successfully saved to: ${outputPath}`);

    } catch (error) {
        console.error('Error dumping schema:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Connection closed.');
        }
    }
}

dumpSchema();
