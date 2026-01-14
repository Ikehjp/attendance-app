const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspectTable() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'attendance_db'
        });

        console.log('Connected. Inspecting absence_requests table...');

        const [rows] = await connection.query(`DESCRIBE absence_requests`);
        console.log('Table Structure:');
        rows.forEach(row => {
            if (row.Field === 'request_type') {
                console.log('---------------------------------------------------');
                console.log(`Field: ${row.Field}`);
                console.log(`Type: ${row.Type}`);
                console.log(`Null: ${row.Null}`);
                console.log('---------------------------------------------------');
            } else {
                console.log(`${row.Field}: ${row.Type}`);
            }
        });

    } catch (error) {
        console.error('Error inspecting table:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

inspectTable();
