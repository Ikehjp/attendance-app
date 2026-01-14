/**
 * roleカラムのENUM値を確認して、適切なユーザーを作成
 */

require('dotenv').config();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function fixAndSeedUsers() {
    const connection = await pool.getConnection();

    try {
        // usersテーブルの構造を確認
        const [columns] = await connection.query('SHOW COLUMNS FROM users WHERE Field = "role"');
        console.log('Role column definition:');
        console.log(JSON.stringify(columns[0], null, 2));
        console.log('');

        // ENUMの値を抽出
        const roleType = columns[0].Type;
        const enumMatch = roleType.match(/enum\((.*)\)/i);
        let allowedRoles = [];
        if (enumMatch) {
            allowedRoles = enumMatch[1].split(',').map(r => r.replace(/'/g, '').trim());
            console.log('Allowed roles:', allowedRoles.join(', '));
            console.log('');
        }

        // ユーザー数確認
        const [[{ count }]] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`Current users: ${count}\n`);

        if (count > 0) {
            console.log('Users already exist.');
            const [users] = await connection.query('SELECT id, name, email, role FROM users LIMIT 10');
            users.forEach(u => console.log(`- ${u.email} (${u.role})`));
            return;
        }

        // 組織確認/作成
        let orgId;
        try {
            const [[org]] = await connection.query('SELECT id FROM organizations LIMIT 1');
            orgId = org.id;
            console.log(`Using organization ID: ${orgId}\n`);
        } catch (err) {
            const [orgResult] = await connection.query(
                "INSERT INTO organizations (code, name, type, is_active) VALUES ('ORG001', 'Test School', 'school', 1)"
            );
            orgId = orgResult.insertId;
            console.log(`Created organization ID: ${orgId}\n`);
        }

        // パスワード
        const password = await bcrypt.hash('password123', 10);

        // 管理者ロールを決定
        const adminRole = allowedRoles.includes('admin') ? 'admin' :
            allowedRoles.includes('owner') ? 'owner' :
                allowedRoles.includes('teacher') ? 'teacher' : allowedRoles[0];

        // 従業員ロールを決定
        const employeeRole = allowedRoles.includes('employee') ? 'employee' :
            allowedRoles.includes('teacher') ? 'teacher' :
                allowedRoles.includes('admin') ? 'admin' : allowedRoles[0];

        // 学生ロールを決定
        const studentRole = allowedRoles.includes('student') ? 'student' : allowedRoles[0];

        console.log(`Creating users with roles: admin=${adminRole}, employee=${employeeRole}, student=${studentRole}\n`);

        // 管理者
        const [admin] = await connection.query(
            'INSERT INTO users (name, email, password, role, organization_id) VALUES (?, ?, ?, ?, ?)',
            ['Admin User', 'admin@example.com', password, adminRole, orgId]
        );
        console.log(`✓ Created: admin@example.com (${adminRole}) - ID: ${admin.insertId}`);

        // 従業員/教師
        const [emp] = await connection.query(
            'INSERT INTO users (name, email, password, role, organization_id) VALUES (?, ?, ?, ?, ?)',
            ['Tanaka Taro', 'tanaka@example.com', password, employeeRole, orgId]
        );
        console.log(`✓ Created: tanaka@example.com (${employeeRole}) - ID: ${emp.insertId}`);

        // 学生
        const [student] = await connection.query(
            'INSERT INTO users (name,  email, password, role, student_id, organization_id) VALUES (?, ?, ?, ?, ?, ?)',
            ['Yamada Hanako', 'student@example.com', password, studentRole, 'STU001', orgId]
        );
        console.log(`✓ Created: student@example.com (${studentRole}) - ID: ${student.insertId}`);

        console.log('\n=== Setup Complete ===');
        console.log('Default password: password123\n');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

fixAndSeedUsers();
