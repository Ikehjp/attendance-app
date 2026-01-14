/**
 * ユーザーロールを確認するスクリプト
 */
const { query } = require('./config/database');
const fs = require('fs');

async function checkUsers() {
    try {
        const users = await query(`
            SELECT id, name, email, role, student_id, organization_id 
            FROM users 
            ORDER BY id
        `);

        let output = '=== ユーザー一覧 ===\n';
        users.forEach(user => {
            output += `ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Role: ${user.role} | StudentID: ${user.student_id || 'N/A'} | OrgID: ${user.organization_id}\n`;
        });

        fs.writeFileSync('users_list.txt', output);
        console.log('ユーザー一覧を users_list.txt に出力しました');
        console.log(output);

        process.exit(0);
    } catch (error) {
        console.error('エラー:', error.message);
        process.exit(1);
    }
}

checkUsers();
