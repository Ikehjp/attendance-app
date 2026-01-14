/**
 * 現在のusersテーブルの構造を確認してサンプルユーザーを挿入
 */

require('dotenv').config();
const { query, pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function setupUsers() {
    try {
        console.log('='.repeat(60));
        console.log('USER SETUP SCRIPT');
        console.log('='.repeat(60));

        // まず、どのusersテーブルが存在するか確認
        const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name LIKE '%user%'
    `);

        console.log('\nTables found:');
        tables.forEach(t => console.log(`- ${t.table_name || t.TABLE_NAME}`));

        // usersテーブルの構造を確認
        let usersTableName = 'users';
        try {
            const columns = await query('DESCRIBE users');
            console.log('\n--- users table structure ---');
            columns.forEach(col => {
                console.log(`${col.Field}: ${col.Type}`);
            });

            const hasOrgId = columns.some(col => col.Field === 'organization_id');
            const hasEmployeeId = columns.some(col => col.Field === 'employee_id');
            const hasIdentifier = columns.some(col => col.Field === 'identifier');

            console.log('\nTable structure:');
            console.log(`- Has organization_id: ${hasOrgId}`);
            console.log(`- Has employee_id: ${hasEmployeeId}`);
            console.log(`- Has identifier: ${hasIdentifier}`);

            // 既存ユーザー数を確認
            const userCount = await query('SELECT COUNT(*) as count FROM users');
            console.log(`\nCurrent user count: ${userCount[0].count}`);

            if (userCount[0].count === 0) {
                console.log('\nNo users found. Creating sample users...\n');

                const adminPassword = await bcrypt.hash('password123', 10);
                const userPassword = await bcrypt.hash('password123', 10);

                if (hasOrgId) {
                    // organization_idが必要な新しいスキーマ
                    console.log('Using new schema (with organization_id)');

                    // まず組織を作成
                    let orgId;
                    try {
                        const orgResult = await query(`
              INSERT INTO organizations (code, name, type, is_active) 
              VALUES (?, ?, ?, ?)
            `, ['ORG001', 'テスト組織', 'school', 1]);
                        orgId = orgResult.insertId;
                        console.log(`Created organization with ID: ${orgId}`);
                    } catch (err) {
                        // 既存の組織を使用
                        const orgs = await query('SELECT id FROM organizations LIMIT 1');
                        if (orgs.length > 0) {
                            orgId = orgs[0].id;
                            console.log(`Using existing organization ID: ${orgId}`);
                        } else {
                            throw new Error('No organization found and could not create one');
                        }
                    }

                    // 管理者ユーザー
                    await query(`
            INSERT INTO users (organization_id, email, password, name, role, identifier, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [orgId, 'admin@example.com', adminPassword, '管理者', 'admin', 'ADMIN001', 1]);
                    console.log('Created: admin@example.com');

                    // 一般ユーザー
                    await query(`
            INSERT INTO users (organization_id, email, password, name, role, identifier, department, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [orgId, 'tanaka@example.com', userPassword, '田中太郎', 'employee', 'EMP001', '開発部', 1]);
                    console.log('Created: tanaka@example.com');

                } else if (hasEmployeeId) {
                    // employee_idがある古いスキーマ
                    console.log('Using old schema (with employee_id)');

                    await query(`
            INSERT INTO users (name, email, password, employee_id, department, role) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, ['管理者', 'admin@example.com', adminPassword, 'ADMIN001', '管理部', 'admin']);
                    console.log('Created: admin@example.com');

                    await query(`
            INSERT INTO users (name, email, password, employee_id, department, role) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, ['田中太郎', 'tanaka@example.com', userPassword, 'EMP001', '開発部', 'employee']);
                    console.log('Created: tanaka@example.com');

                } else {
                    // 最小限のスキーマ
                    console.log('Using minimal schema');

                    await query(`
            INSERT INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)
          `, ['管理者', 'admin@example.com', adminPassword, 'admin']);
                    console.log('Created: admin@example.com');

                    await query(`
            INSERT INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)
          `, ['田中太郎', 'tanaka@example.com', userPassword, 'employee']);
                    console.log('Created: tanaka@example.com');
                }

                console.log('\nDefault Password: password123');
                console.log('Sample users created successfully!');
            } else {
                console.log('\nUsers already exist. Listing current users:');
                const users = await query('SELECT id, name, email, role FROM users LIMIT 10');
                users.forEach(user => {
                    console.log(`- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
                });
            }

        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('\nERROR: users table does not exist!');
                console.log('Please run migrations first: npm run migrate');
            } else {
                throw err;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Setup completed');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\nERROR:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

setupUsers();
