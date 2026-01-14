const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixRequestTypeColumn() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'attendance_db'
        });

        console.log('Connected. Modifying absence_requests table...');

        // request_typeカラムをVARCHAR(50)に変更して、制約を緩和する
        await connection.query(`
      ALTER TABLE absence_requests 
      MODIFY COLUMN request_type VARCHAR(50) NOT NULL
    `);

        console.log('Successfully modified request_type column to VARCHAR(50).');

    } catch (error) {
        console.error('Error fixing table:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Connection closed.');
        }
    }
}

fixRequestTypeColumn();
