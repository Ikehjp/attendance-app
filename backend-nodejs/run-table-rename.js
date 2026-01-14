/**
 * テーブル名切り替えスクリプト
 * 新テーブル(_new)を本番テーブルに、旧テーブルを_oldにリネーム
 */
const { query } = require('./config/database');

async function renameTables() {
    console.log('========================================');
    console.log('テーブル名切り替え開始');
    console.log('========================================\n');

    const tablePairs = [
        { old: 'organizations', new: 'organizations_new' },
        { old: 'users', new: 'users_new' },
        { old: 'students', new: null }, // バックアップのみ
        { old: 'subjects', new: 'subjects_new' },
        { old: 'groups', new: 'groups_new' },
        { old: 'group_members', new: 'group_members_new' },
        { old: 'group_teachers', new: 'group_teachers_new' },
        { old: 'classes', new: 'classes_new' },
        { old: 'enrollments', new: 'enrollments_new' },
        { old: 'events', new: 'events_new' },
        { old: 'event_participants', new: 'event_participants_new' },
        { old: 'absence_requests', new: 'absence_requests_new' },
        { old: 'request_approvals', new: null }, // 廃止（absence_requestsに統合）
        { old: 'qr_codes', new: 'qr_codes_new' },
        { old: 'notifications', new: 'notifications_new' },
        { old: 'audit_logs', new: 'audit_logs_new' },
        { old: 'system_settings', new: 'system_settings_new' },
        { old: 'allowed_ip_ranges', new: 'allowed_ip_ranges_new' },
        { old: 'detailed_attendance_records', new: null }, // 廃止
        { old: 'student_attendance_records', new: null }, // 廃止
        { old: 'user_attendance_records', new: null }, // 廃止
        { old: 'scan_logs', new: null }, // 廃止
    ];

    // 新しいattendance_recordsも追加
    const newOnlyTables = ['attendance_records_new'];

    try {
        await query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('✓ 外部キーチェック無効化\n');

        // Step 1: 旧テーブルを _old にリネーム
        console.log('Step 1: 旧テーブルをバックアップ (_old)...');
        for (const pair of tablePairs) {
            try {
                // テーブル存在確認
                const exists = await query(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [pair.old]);

                if (exists.length > 0) {
                    await query(`RENAME TABLE \`${pair.old}\` TO \`${pair.old}_old\``);
                    console.log(`  ✓ ${pair.old} → ${pair.old}_old`);
                } else {
                    console.log(`  ⚠ ${pair.old} は存在しません（スキップ）`);
                }
            } catch (error) {
                console.log(`  ⚠ ${pair.old}: ${error.message}`);
            }
        }

        // Step 2: 新テーブルを本番名にリネーム
        console.log('\nStep 2: 新テーブルを本番名に...');
        for (const pair of tablePairs) {
            if (!pair.new) continue;

            try {
                const exists = await query(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [pair.new]);

                if (exists.length > 0) {
                    await query(`RENAME TABLE \`${pair.new}\` TO \`${pair.old}\``);
                    console.log(`  ✓ ${pair.new} → ${pair.old}`);
                } else {
                    console.log(`  ⚠ ${pair.new} は存在しません（スキップ）`);
                }
            } catch (error) {
                console.log(`  ⚠ ${pair.new}: ${error.message}`);
            }
        }

        // Step 3: 新規テーブル（attendance_records）
        console.log('\nStep 3: 新規テーブルの設定...');
        for (const table of newOnlyTables) {
            try {
                const exists = await query(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [table]);

                if (exists.length > 0) {
                    const newName = table.replace('_new', '');
                    await query(`RENAME TABLE \`${table}\` TO \`${newName}\``);
                    console.log(`  ✓ ${table} → ${newName}`);
                }
            } catch (error) {
                console.log(`  ⚠ ${table}: ${error.message}`);
            }
        }

        await query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('\n✓ 外部キーチェック有効化');

        console.log('\n========================================');
        console.log('✅ テーブル切り替え完了');
        console.log('========================================\n');

        // 確認
        console.log('📊 現在のテーブル一覧:');
        const tables = await query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      ORDER BY TABLE_NAME
    `);
        tables.forEach(t => {
            const suffix = t.TABLE_NAME.endsWith('_old') ? ' (バックアップ)' :
                t.TABLE_NAME.endsWith('_new') ? ' (未使用)' : ' ✓';
            console.log(`  ${t.TABLE_NAME}${suffix}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ エラー:', error.message);
        await query('SET FOREIGN_KEY_CHECKS = 1');
        process.exit(1);
    }
}

renameTables();
