/**
 * データ移行スクリプト（修正版）
 * 外部キー制約を考慮した順序で実行
 */
const { query } = require('./config/database');

async function migrateData() {
    console.log('========================================');
    console.log('データ移行開始');
    console.log('========================================\n');

    try {
        // 外部キーチェック無効化
        await query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('✓ 外部キーチェック無効化');

        // Step 1: organizations
        console.log('\n1. organizations の移行...');
        await query(`
      INSERT INTO organizations_new (id, code, name, type, is_active, created_at, updated_at)
      SELECT 
        id,
        CONCAT('ORG', LPAD(id, 4, '0')) as code,
        name,
        type,
        1 as is_active,
        created_at,
        updated_at
      FROM organizations
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
        const orgCount = await query('SELECT COUNT(*) as cnt FROM organizations_new');
        console.log(`   ✓ ${orgCount[0].cnt} 件移行完了`);

        // Step 2: users
        console.log('\n2. users の移行...');
        await query(`
      INSERT INTO users_new (
        id, organization_id, email, password, name, role, identifier, 
        department, is_active, status, last_role_update, 
        reset_token, reset_token_expires, created_at, updated_at
      )
      SELECT 
        u.id,
        COALESCE(
          (SELECT id FROM organizations_new ORDER BY id LIMIT 1),
          1
        ) as organization_id,
        u.email,
        u.password,
        u.name,
        CASE u.role
          WHEN 'admin' THEN 'admin'
          WHEN 'employee' THEN 'employee'
          WHEN 'teacher' THEN 'teacher'
          WHEN 'student' THEN 'student'
          ELSE 'employee'
        END as role,
        COALESCE(u.student_id, u.employee_id) as identifier,
        u.department,
        1 as is_active,
        'active' as status,
        u.last_role_update,
        u.reset_token,
        u.reset_token_expires,
        u.created_at,
        u.updated_at
      FROM users u
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
        const userCount = await query('SELECT COUNT(*) as cnt FROM users_new');
        console.log(`   ✓ ${userCount[0].cnt} 件移行完了`);

        // Step 3: students → users_new (存在しない学生を追加)
        console.log('\n3. students → users_new の移行...');
        await query(`
      INSERT INTO users_new (
        organization_id, email, password, name, role, identifier, 
        card_id, grade, class_name, phone, is_active, status,
        enrollment_date, created_at, updated_at
      )
      SELECT 
        COALESCE(
          (SELECT id FROM organizations_new ORDER BY id LIMIT 1),
          1
        ) as organization_id,
        COALESCE(s.email, CONCAT(s.student_id, '@student.local')) as email,
        '$2b$10$X3j0bK8YwAX5vKhQz7J0F.MrNpP2wO2xVi3e8mTfH5gN1jR7KwS4C' as password,
        s.name,
        'student' as role,
        s.student_id as identifier,
        s.card_id,
        s.grade,
        s.class_name,
        s.phone,
        CASE s.status WHEN 'active' THEN 1 ELSE 0 END as is_active,
        COALESCE(s.status, 'active') as status,
        s.enrollment_date,
        s.created_at,
        s.updated_at
      FROM students s
      LEFT JOIN users u ON s.student_id = u.student_id
      WHERE u.id IS NULL
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
        const studentUserCount = await query('SELECT COUNT(*) as cnt FROM users_new WHERE role = "student"');
        console.log(`   ✓ 学生ユーザー ${studentUserCount[0].cnt} 件`);

        // Step 4: subjects
        console.log('\n4. subjects の移行...');
        await query(`
      INSERT INTO subjects_new (
        id, organization_id, subject_code, subject_name, description, 
        credits, is_active, created_at, updated_at
      )
      SELECT 
        id,
        COALESCE(
          (SELECT id FROM organizations_new ORDER BY id LIMIT 1),
          1
        ) as organization_id,
        subject_code,
        subject_name,
        description,
        COALESCE(credits, 1),
        COALESCE(is_active, 1),
        created_at,
        updated_at
      FROM subjects
      ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name)
    `);
        const subjectCount = await query('SELECT COUNT(*) as cnt FROM subjects_new');
        console.log(`   ✓ ${subjectCount[0].cnt} 件移行完了`);

        // Step 5: groups
        console.log('\n5. groups の移行...');
        await query(`
      INSERT INTO groups_new (
        id, organization_id, name, icon, description, 
        is_active, created_by, created_at, updated_at
      )
      SELECT 
        id,
        COALESCE(
          (SELECT id FROM organizations_new ORDER BY id LIMIT 1),
          1
        ) as organization_id,
        name,
        icon,
        description,
        COALESCE(is_active, 1),
        created_by,
        created_at,
        updated_at
      FROM \`groups\`
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
        const groupCount = await query('SELECT COUNT(*) as cnt FROM groups_new');
        console.log(`   ✓ ${groupCount[0].cnt} 件移行完了`);

        // Step 6: events
        console.log('\n6. events の移行...');
        await query(`
      INSERT INTO events_new (
        id, organization_id, title, description, start_datetime, end_datetime,
        location, is_public, created_by, created_at, updated_at
      )
      SELECT 
        e.id,
        COALESCE(
          (SELECT id FROM organizations_new ORDER BY id LIMIT 1),
          1
        ) as organization_id,
        e.title,
        e.description,
        e.start_date as start_datetime,
        e.end_date as end_datetime,
        e.location,
        COALESCE(e.is_public, 0),
        e.created_by,
        e.created_at,
        e.updated_at
      FROM events e
      ON DUPLICATE KEY UPDATE title = VALUES(title)
    `);
        const eventCount = await query('SELECT COUNT(*) as cnt FROM events_new');
        console.log(`   ✓ ${eventCount[0].cnt} 件移行完了`);

        // Step 7: user_attendance_records → attendance_records_new
        console.log('\n7. user_attendance_records → attendance_records_new の移行...');
        await query(`
      INSERT INTO attendance_records_new (
        organization_id, user_id, record_type, record_date,
        status, check_in_time, check_out_time, reason, source, created_at, updated_at
      )
      SELECT 
        COALESCE(
          (SELECT organization_id FROM users_new WHERE id = uar.user_id LIMIT 1),
          (SELECT id FROM organizations_new ORDER BY id LIMIT 1),
          1
        ) as organization_id,
        uar.user_id,
        'work' as record_type,
        uar.date as record_date,
        uar.status,
        uar.check_in_time,
        uar.check_out_time,
        uar.reason,
        'manual' as source,
        uar.created_at,
        uar.updated_at
      FROM user_attendance_records uar
      WHERE EXISTS (SELECT 1 FROM users_new un WHERE un.id = uar.user_id)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `);
        const attCount = await query('SELECT COUNT(*) as cnt FROM attendance_records_new');
        console.log(`   ✓ ${attCount[0].cnt} 件移行完了`);

        // 外部キーチェック有効化
        await query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('\n✓ 外部キーチェック有効化');

        console.log('\n========================================');
        console.log('✅ データ移行完了');
        console.log('========================================\n');

        // 最終確認
        console.log('📊 移行結果:');
        const tables = [
            'organizations_new',
            'users_new',
            'subjects_new',
            'groups_new',
            'events_new',
            'attendance_records_new'
        ];

        for (const table of tables) {
            const count = await query(`SELECT COUNT(*) as cnt FROM ${table}`);
            console.log(`  ${table}: ${count[0].cnt} 件`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ エラー:', error.message);
        await query('SET FOREIGN_KEY_CHECKS = 1');
        process.exit(1);
    }
}

migrateData();
