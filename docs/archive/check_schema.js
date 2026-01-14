const mysql = require('mysql2/promise');
require('dotenv').config();

const checkSchema = async () => {
    let connection;
    try {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'server',
            password: process.env.DB_PASS || 'pass',
            database: process.env.DB_NAME || 'sotsuken'
        };

        console.log('Attempting to connect with:', {
            host: config.host,
            user: config.user,
            database: config.database,
            password: '***'
        });

        connection = await mysql.createConnection(config);
        console.log('Connected successfully.');

        const [rows] = await connection.execute('DESCRIBE users');
        console.log('Users table schema:');
        rows.forEach(row => {
            console.log(`${row.Field}: ${row.Type}`);
        });

        const hasResetToken = rows.some(row => row.Field === 'reset_token');
        const hasResetTokenExpires = rows.some(row => row.Field === 'reset_token_expires');

        if (!hasResetToken || !hasResetTokenExpires) {
            console.log('\nMissing columns for password reset.');

            if (!hasResetToken) {
                console.log('Adding reset_token column...');
                await connection.execute('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL');
            }

            if (!hasResetTokenExpires) {
                console.log('Adding reset_token_expires column...');
                await connection.execute('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL');
            }

            console.log('Schema updated successfully.');
        } else {
            console.log('\nSchema is already up to date.');
        }

    } catch (error) {
        console.error('Error checking/updating schema:', error);
    } finally {
        if (connection) await connection.end();
    }
};

checkSchema();
