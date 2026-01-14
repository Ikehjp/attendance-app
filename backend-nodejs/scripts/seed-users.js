/**
 * 組織とサンプルユーザーを作成
 */

require('dotenv').config();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function setupOrganizationAndUsers() {
    const connection = await pool.getConnection();

    try {
        console.log('Setting up organization and users...\n');

        //ユーザー数確認
        const [[userCount]] = await connection.query('SELECT COUNT(*) as count FROM users');

        if (userCount.count > 0) {
            console.log(`Users already exist (${userCount.count} users)`);
            const [users] = await connection.query('SELECT id, name, email, role FROM users LIMIT 5');
            users.forEach(u => console.log(`- ${u.email} (${u.role})`));
            return;
        }

        // 組織確認/作成
        let orgId;
        const [[orgCount]] = await connection.query('SELECT COUNT(*) as count FROM organizations');

        if (orgCount.count === 0) {
            const orgCode = 'ORG' + Date.now().toString().slice(-6);
            const [orgResult] = await connection.query(
                'INSERT INTO organizations (code, name, type, is_active) VALUES (?, ?, ?, ?)',
                [orgCode, 'テスト学校', 'school', 1]
            );
            orgId = orgResult.insertId;
            console.log(`Created organization: ${orgCode} (ID: ${orgId})`);
        } else {
            const [[org]] = await connection.query('SELECT id, name FROM organizations LIMIT 1');
            orgId = org.id;
            console.log(`Using existing organization: ${org.name} (ID: ${orgId})\n`);
        }

        // パスワードハッシュ
        const password = await bcrypt.hash('password123', 10);

        // 管理者ユーザー
        const [adminResult] = await connection.query(
            'INSERT INTO users (name, email, password, role, organization_id) VALUES (?, ?, ?, ?, ?)',
            ['管理者', 'admin@example.com', password, 'admin', orgId]
        );
        console.log(`Created admin user: admin@example.com (ID: ${adminResult.insertId})`);

        // 一般従業員ユーザー
        const [empResult] = await connection.query(
            'INSERT INTO users (name, email, password, role, organization_id) VALUES (?, ?, ?, ?, ?)',
            ['田中太郎', 'tanaka@example.com', password, 'employee', orgId]
        );
        console.log(`Created employee user: tanaka@example.com (ID: ${empResult.insertId})`);

        // 学生ユーザー  
        const [studentResult] = await connection.query(
            'INSERT INTO users (name, email, password, role, student_id, organization_id) VALUES (?, ?, ?, ?, ?, ?)',
            ['山田花子', 'student@example.com', password, 'student', 'STU001', orgId]
        );
        console.log(`Created student user: student@example.com (ID: ${studentResult.insertId})`);

        console.log('\n=== Setup Complete ===');
        console.log('All users password: password123');
        console.log('\nYou can now login with:');
        console.log('- admin@example.com / password123 (Admin)');
        console.log('- tanaka@example.com / password123 (Employee)');
        console.log('- student@example.com / password123 (Student)');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error);
    } finally {
        connection.release();
        await pool.end();
    }
}

setupOrganizationAndUsers();
