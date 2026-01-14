/**
 * usersテーブルの詳細確認とサンプルデータ挿入
 */

require('dotenv').config();
const { query, pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function checkAndInsertUsers() {
    try {
        console.log('='.repeat(50));
        console.log('Users Table Check');
        console.log('='.repeat(50));

        // usersテーブルの存在確認
        const tableCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'users'
    `);

        if (tableCheck[0].count === 0) {
            console.log('ERROR: users table does not exist');
            await pool.end();
            return;
        }

        console.log('OK: users table exists');

        // 現在のユーザー数を確認
        const userCount = await query('SELECT COUNT(*) as count FROM users');
        console.log(`Current user count: ${userCount[0].count}`);

        // 全ユーザーを表示
        const users = await query('SELECT id, name, email, employee_id, role FROM users');

        if (users.length > 0) {
            console.log('\n--- Existing Users ---');
            users.forEach(user => {
                console.log(`ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Employee ID: ${user.employee_id} | Role: ${user.role}`);
            });
        } else {
            console.log('\nWARNING: No users found in database');
            console.log('Inserting sample users...\n');

            // 管理者ユーザーの作成
            const adminPassword = await bcrypt.hash('password123', 10);
            await query(`
        INSERT INTO users (name, email, password, employee_id, department, role) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['管理者', 'admin@example.com', adminPassword, 'ADMIN001', '管理部', 'admin']);
            console.log('Created: admin@example.com (password: password123)');

            // 一般ユーザーの作成
            const userPassword = await bcrypt.hash('password123', 10);
            await query(`
        INSERT INTO users (name, email, password, employee_id, department, role) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['田中太郎', 'tanaka@example.com', userPassword, 'EMP001', '開発部', 'employee']);
            console.log('Created: tanaka@example.com (password: password123)');

            console.log('\nSample users created successfully!');

            // 確認
            const newUsers = await query('SELECT id, name, email, employee_id, role FROM users');
            console.log('\n--- Updated User List ---');
            newUsers.forEach(user => {
                console.log(`ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Employee ID: ${user.employee_id} | Role: ${user.role}`);
            });
        }

        console.log('\n' + '='.repeat(50));
        console.log('Check completed');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkAndInsertUsers();
