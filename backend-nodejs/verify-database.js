const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'server',
    password: 'pass',
    database: 'sotsuken',
};

async function verifyDatabase() {
    let conn;
    try {
        conn = await mysql.createConnection(DB_CONFIG);
        console.log('\n=== データベース検証レポート ===\n');

        // 全テーブルリスト
        const [tables] = await conn.query('SHOW TABLES');
        const tableList = tables.map((t) => Object.values(t)[0]);

        console.log(`📊 総テーブル数: ${tableList.length}\n`);

        // 必須テーブルチェック
        const requiredTables = {
            'コアテーブル': ['users', 'organizations'],
            'グループ管理': ['groups', 'group_members', 'group_teachers'],
            '時間割・授業': ['timetables', 'class_sessions', 'attendance_records', 'organization_time_slots'],
            'QR・セキュリティ': ['qr_codes', 'allowed_ip_ranges', 'scan_logs'],
            '欠席・通知': ['absence_requests', 'request_approvals', 'notifications'],
            'その他': ['invitations', 'organization_activity_logs'],
        };

        for (const [category, tables] of Object.entries(requiredTables)) {
            console.log(`\n【${category}】`);
            tables.forEach((tableName) => {
                const exists = tableList.includes(tableName);
                console.log(`  ${exists ? '✅' : '❌'} ${tableName.padEnd(35)} ${exists ? '存在' : '不足'}`);
            });
        }

        // 重要なカラムの確認
        console.log('\n\n【重要カラムの確認】\n');

        // organizationsテーブル
        const [orgCols] = await conn.query('DESCRIBE organizations');
        const orgColNames = orgCols.map((c) => c.Field);
        console.log('organizations テーブル:');
        ['id', 'name', 'join_code', 'late_limit_minutes', 'date_reset_time', 'owner_id'].forEach((col) => {
            console.log(`  ${orgColNames.includes(col) ? '✅' : '❌'} ${col}`);
        });

        // usersテーブル
        const [userCols] = await conn.query('DESCRIBE users');
        const userColNames = userCols.map((c) => c.Field);
        console.log('\nusers テーブル:');
        ['id', 'name', 'email', 'password', 'role', 'organization_id'].forEach((col) => {
            console.log(`  ${userColNames.includes(col) ? '✅' : '❌'} ${col}`);
        });

        // groupsテーブル
        if (tableList.includes('groups')) {
            const [groupCols] = await conn.query('DESCRIBE `groups`');
            const groupColNames = groupCols.map((c) => c.Field);
            console.log('\ngroups テーブル:');
            ['id', 'name', 'organization_id', 'icon', 'status', 'is_active'].forEach((col) => {
                console.log(`  ${groupColNames.includes(col) ? '✅' : '❌'} ${col}`);
            });
        }

        // データ件数の確認
        console.log('\n\n【データ件数】\n');

        const countTables = ['users', 'organizations', 'groups', 'timetables', 'class_sessions', 'attendance_records'];
        for (const tableName of countTables) {
            if (tableList.includes(tableName)) {
                const [result] = await conn.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                console.log(`  ${tableName.padEnd(25)} ${result[0].count} 件`);
            }
        }

        console.log('\n=== 検証完了 ===\n');
    } catch (error) {
        console.error('エラー:', error.message);
    } finally {
        if (conn) {
            await conn.end();
        }
    }
}

verifyDatabase().catch(console.error);
