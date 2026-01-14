-- ============================================================
-- テーブル切り替えスクリプト
-- 新テーブル（_new）と旧テーブルの名前を入れ替え
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Step 1: 旧テーブルをバックアップ名に変更
-- ============================================================
RENAME TABLE organizations TO organizations_old;
RENAME TABLE users TO users_old;
RENAME TABLE students TO students_old;
RENAME TABLE subjects TO subjects_old;
RENAME TABLE `groups` TO groups_old;
RENAME TABLE group_members TO group_members_old;
RENAME TABLE group_teachers TO group_teachers_old;
RENAME TABLE classes TO classes_old;
RENAME TABLE enrollments TO enrollments_old;
RENAME TABLE events TO events_old;
RENAME TABLE event_participants TO event_participants_old;
RENAME TABLE absence_requests TO absence_requests_old;
RENAME TABLE request_approvals TO request_approvals_old;
RENAME TABLE qr_codes TO qr_codes_old;
RENAME TABLE notifications TO notifications_old;
RENAME TABLE audit_logs TO audit_logs_old;
RENAME TABLE system_settings TO system_settings_old;
RENAME TABLE allowed_ip_ranges TO allowed_ip_ranges_old;
RENAME TABLE detailed_attendance_records TO detailed_attendance_records_old;
RENAME TABLE student_attendance_records TO student_attendance_records_old;
RENAME TABLE user_attendance_records TO user_attendance_records_old;
RENAME TABLE scan_logs TO scan_logs_old;

-- ============================================================
-- Step 2: 新テーブルを本番名に変更
-- ============================================================
RENAME TABLE organizations_new TO organizations;
RENAME TABLE users_new TO users;
RENAME TABLE subjects_new TO subjects;
RENAME TABLE groups_new TO `groups`;
RENAME TABLE group_members_new TO group_members;
RENAME TABLE group_teachers_new TO group_teachers;
RENAME TABLE classes_new TO classes;
RENAME TABLE enrollments_new TO enrollments;
RENAME TABLE events_new TO events;
RENAME TABLE event_participants_new TO event_participants;
RENAME TABLE absence_requests_new TO absence_requests;
RENAME TABLE qr_codes_new TO qr_codes;
RENAME TABLE notifications_new TO notifications;
RENAME TABLE audit_logs_new TO audit_logs;
RENAME TABLE system_settings_new TO system_settings;
RENAME TABLE allowed_ip_ranges_new TO allowed_ip_ranges;
RENAME TABLE attendance_records_new TO attendance_records;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Step 3: 確認クエリ
-- ============================================================
SELECT 'Table rename completed!' as message;

SHOW TABLES;

-- ============================================================
-- ロールバック手順（問題発生時）
-- ============================================================
-- 以下のコメントを解除して実行することで元に戻せます
/*
SET FOREIGN_KEY_CHECKS = 0;

-- 新テーブルをバックアップ
RENAME TABLE organizations TO organizations_failed;
RENAME TABLE users TO users_failed;
-- ... 他のテーブルも同様

-- 旧テーブルを復元
RENAME TABLE organizations_old TO organizations;
RENAME TABLE users_old TO users;
-- ... 他のテーブルも同様

SET FOREIGN_KEY_CHECKS = 1;
*/
