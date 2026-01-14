const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// データベース接続情報（ハードコード - 本番環境では環境変数を使用）
const DB_CONFIG = {
    host: 'localhost',
    user: 'server',
    database: 'sotsuken',
    multipleStatements: true,
};

async function getPassword() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        readline.question('データベースパスワードを入力してください: ', (password) => {
            readline.close();
            resolve(password);
        });
    });
}

async function checkAndMigrate() {
    let conn;
    try {
        // パスワードを取得
        const password = await getPassword();
        const config = { ...DB_CONFIG, password };

        console.log('\n=== データベース接続中... ===');
        conn = await mysql.createConnection(config);
        console.log('✓ データベース接続成功\n');

        // 既存テーブルの確認
        console.log('=== 現在のテーブル確認 ===');
        const [tables] = await conn.query('SHOW TABLES');
        const existingTables = tables.map((t) => Object.values(t)[0]);
        console.log(`現在のテーブル数: ${existingTables.length}`);
        existingTables.forEach((t) => console.log(`  - ${t}`));

        // 必要なマイグレーションを実行
        console.log('\n=== マイグレーション実行 ===\n');

        const migrations = [
            '001_multi_tenant_architecture.sql',
            '002_add_join_code.sql',
            '002_timetable_settings.sql',
            '003_fix_user_table.sql',
            '004_fix_role_column.sql',
            '005_fix_request_type.sql',
            'add_group_icon_and_status.sql',
        ];

        for (const migrationFile of migrations) {
            const filePath = path.join(__dirname, 'migrations', migrationFile);

            try {
                console.log(`[${migrationFile}] 実行中...`);
                const sql = await fs.readFile(filePath, 'utf8');

                // SQLコメントと空行を除去
                const cleanSql = sql
                    .split('\n')
                    .filter((line) => !line.trim().startsWith('--') && line.trim())
                    .join('\n');

                if (cleanSql.trim()) {
                    await conn.query(cleanSql);
                    console.log(`✓ [${migrationFile}] 完了`);
                }
            } catch (error) {
                // エラーが発生しても続行（既に適用済みの可能性）
                if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERR') {
                    console.log(`⊙ [${migrationFile}] スキップ（既に適用済み）`);
                } else {
                    console.log(`⚠ [${migrationFile}] エラー: ${error.message}`);
                }
            }
        }

        // 最終的なテーブル状態を確認
        console.log('\n=== 最終的なテーブル状態 ===');
        const [finalTables] = await conn.query('SHOW TABLES');
        const finalTableList = finalTables.map((t) => Object.values(t)[0]);
        console.log(`最終テーブル数: ${finalTableList.length}`);

        // 重要なテーブルの存在確認
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
            'invitations',
        ];

        console.log('\n=== 必須テーブルチェック ===');
        const missingTables = requiredTables.filter((t) => !finalTableList.includes(t));

        if (missingTables.length === 0) {
            console.log('✓ すべての必須テーブルが存在します');
        } else {
            console.log('⚠ 不足しているテーブル:');
            missingTables.forEach((t) => console.log(`  - ${t}`));
        }

        // organizationsテーブルのカラム確認
        if (finalTableList.includes('organizations')) {
            console.log('\n=== organizationsテーブル構造確認 ===');
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
                console.log('✓ organizationsテーブルのすべての必須カラムが存在します');
            } else {
                console.log('⚠ organizationsテーブルの不足カラム:');
                missingOrgColumns.forEach((c) => console.log(`  - ${c}`));

                // 不足カラムを追加
                console.log('\n=== 不足カラムの追加 ===');
                for (const col of missingOrgColumns) {
                    try {
                        if (col === 'join_code') {
                            await conn.query(
                                'ALTER TABLE organizations ADD COLUMN join_code VARCHAR(10) UNIQUE',
                            );
                            console.log('✓ join_codeカラムを追加');
                        } else if (col === 'late_limit_minutes') {
                            await conn.query(
                                'ALTER TABLE organizations ADD COLUMN late_limit_minutes INT DEFAULT 15',
                            );
                            console.log('✓ late_limit_minutesカラムを追加');
                        } else if (col === 'date_reset_time') {
                            await conn.query(
                                "ALTER TABLE organizations ADD COLUMN date_reset_time TIME DEFAULT '04:00:00'",
                            );
                            console.log('✓ date_reset_timeカラムを追加');
                        }
                    } catch (error) {
                        console.log(`⚠ ${col}の追加エラー: ${error.message}`);
                    }
                }
            }
        }

        console.log('\n=== マイグレーション完了 ===\n');
    } catch (error) {
        console.error('エラー:', error.message);
        process.exit(1);
    } finally {
        if (conn) {
            await conn.end();
        }
    }
}

checkAndMigrate().catch(console.error);
