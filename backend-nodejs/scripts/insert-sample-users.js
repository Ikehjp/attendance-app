/**
 * シンプルなユーザー挿入スクリプト
 */

require('dotenv').config();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function insertUsers() {
    const connection = await pool.getConnection();

    try {
        console.log('Checking users table...\n');

        // テーブル構造を確認
        const [columns] = await connection.query('DESCRIBE users');
        const columnNames = columns.map(col => col.Field);

        console.log('Columns in users table:');
        console.log(columnNames.join(', '));
        console.log('');

        const hasOrgId = columnNames.includes('organization_id');
        const hasEmployeeId = columnNames.includes('employee_id');

        // ユーザー数を確認
        const [[{ count }]] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`Current users: ${count}\n`);

        if (count > 0) {
            console.log('Users already exist:');
            const [users] = await connection.query('SELECT id, name, email, role FROM users');
            users.forEach(u => {
                console.log(`- ${u.email} (${u.role})`);
            });
            connection.release();
            return;
        }

        console.log('Creating sample users...\n');

        // パスワードハッシュを作成
        const adminPwd = await bcrypt.hash('password123', 10);
        const userPwd = await bcrypt.hash('password123', 10);

        if (hasOrgId) {
            // 組織IDが必要な場合
            console.log('Schema requires organization_id');

            // 組織を確認/作成
            let [[orgResult]] = await connection.query('SELECT id FROM organizations LIMIT 1');
            let orgId;

            if (!orgResult) {
                const [result] = await connection.query(
                    'INSERT INTO organizations (code, name, type) VALUES (?, ?, ?)',
                    ['ORG001', 'Test Organization', 'school']
                );
                orgId = result.insertId;
                console.log(`Created organization ID: ${orgId}`);
            } else {
                orgId = orgResult.id;
                console.log(`Using organization ID: ${orgId}`);
            }

            // 管理者
            await connection.query(
                'INSERT INTO users (organization_id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
                [orgId, 'admin@example.com', adminPwd, 'Admin User', 'admin']
            );
            console.log('Created: admin@example.com');

            // 一般ユーザー
            await connection.query(
                'INSERT INTO users (organization_id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
                [orgId, 'tanaka@example.com', userPwd, 'Tanaka Taro', 'employee']
            );
            console.log('Created: tanaka@example.com');

        } else if (hasEmployeeId) {
            // employee_idがある場合
            console.log('Schema has employee_id column');

            await connection.query(
                'INSERT INTO users (name, email, password, employee_id, role) VALUES (?, ?, ?, ?, ?)',
                ['Admin User', 'admin@example.com', adminPwd, 'ADMIN001', 'admin']
            );
            console.log('Created: admin@example.com');

            await connection.query(
                'INSERT INTO users (name, email, password, employee_id, role) VALUES (?, ?, ?, ?, ?)',
                ['Tanaka Taro', 'tanaka@example.com', userPwd, 'EMP001', 'employee']
            );
            console.log('Created: tanaka@example.com');

        } else {
            // シンプルなスキーマ
            console.log('Using simple schema');

            await connection.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin User', 'admin@example.com', adminPwd, 'admin']
            );
            console.log('Created: admin@example.com');

            await connection.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Tanaka Taro', 'tanaka@example.com', userPwd, 'employee']
            );
            console.log('Created: tanaka@example.com');
        }

        console.log('\nPassword for all users: password123');
        console.log('Setup complete!');

    } catch (error) {
        console.error('ERROR:', error.message);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

insertUsers().catch(console.error);
