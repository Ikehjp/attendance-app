require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'attendance_system',
        });

        console.log('=== データベース接続成功 ===\n');

        // 全テーブルを取得
        const [tables] = await conn.query('SHOW TABLES');
        console.log('=== 現在のテーブル一覧 ===');
        tables.forEach((table) => {
            console.log(`- ${Object.values(table)[0]}`);
        });
        console.log(`\n合計: ${tables.length} テーブル\n`);

        // 各テーブルの構造を確認
        console.log('=== テーブル構造の詳細 ===\n');
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            console.log(`\n【${tableName}】`);
            const [columns] = await conn.query(`DESCRIBE ${tableName}`);
            columns.forEach((col) => {
                console.log(
                    `  ${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`,
                );
            });
        }

        // 必要なテーブルのチェック
        console.log('\n\n=== 必要なテーブルのチェック ===');
        const requiredTables = [
            'users',
            'organizations',
            'groups',
            'group_members',
            'timetables',
            'class_sessions',
            'attendance_records',
            'qr_codes',
            'allowed_ip_ranges',
            'absence_requests',
            'notifications',
            'organization_time_slots',
        ];

        const existingTables = tables.map((t) => Object.values(t)[0]);
        const missingTables = requiredTables.filter(
            (t) => !existingTables.includes(t),
        );

        if (missingTables.length === 0) {
            console.log('✓ すべての必要なテーブルが存在します');
        } else {
            console.log('✗ 不足しているテーブル:');
            missingTables.forEach((t) => console.log(`  - ${t}`));
        }

        // 組織テーブルの特定カラムをチェック
        console.log('\n=== 組織テーブルの重要カラムチェック ===');
        const [orgColumns] = await conn.query('DESCRIBE organizations');
        const orgColumnNames = orgColumns.map((c) => c.Field);

        const requiredOrgColumns = [
            'id',
            'name',
            'join_code',
            'late_limit_minutes',
            'date_reset_time',
        ];
        const missingOrgColumns = requiredOrgColumns.filter(
            (c) => !orgColumnNames.includes(c),
        );

        if (missingOrgColumns.length === 0) {
            console.log('✓ organizationsテーブルのすべての必要なカラムが存在します');
        } else {
            console.log('✗ organizationsテーブルに不足しているカラム:');
            missingOrgColumns.forEach((c) => console.log(`  - ${c}`));
        }

        // グループテーブルの特定カラムをチェック
        if (existingTables.includes('groups')) {
            console.log('\n=== グループテーブルの重要カラムチェック ===');
            const [groupColumns] = await conn.query('DESCRIBE groups');
            const groupColumnNames = groupColumns.map((c) => c.Field);

            const requiredGroupColumns = ['id', 'name', 'organization_id', 'icon', 'status'];
            const missingGroupColumns = requiredGroupColumns.filter(
                (c) => !groupColumnNames.includes(c),
            );

            if (missingGroupColumns.length === 0) {
                console.log('✓ groupsテーブルのすべての必要なカラムが存在します');
            } else {
                console.log('✗ groupsテーブルに不足しているカラム:');
                missingGroupColumns.forEach((c) => console.log(`  - ${c}`));
            }
        }
    } catch (error) {
        console.error('エラー:', error.message);
    } finally {
        if (conn) {
            await conn.end();
        }
    }
}

checkDatabase().catch(console.error);
