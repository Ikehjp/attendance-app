
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'attendance_db',
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Add school_start_time column if it doesn't exist
        try {
            await connection.query("ALTER TABLE organization_settings ADD COLUMN school_start_time TIME DEFAULT '09:00:00'");
            console.log('Added school_start_time column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('school_start_time column already exists.');
            } else {
                console.error('Error adding school_start_time:', e);
            }
        }

        // Add school_end_time column if it doesn't exist
        try {
            await connection.query("ALTER TABLE organization_settings ADD COLUMN school_end_time TIME DEFAULT '16:00:00'");
            console.log('Added school_end_time column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('school_end_time column already exists.');
            } else {
                console.error('Error adding school_end_time:', e);
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
