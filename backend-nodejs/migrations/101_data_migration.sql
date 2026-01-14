-- ============================================================
-- データマイグレーションスクリプト
-- 旧スキーマ → 新スキーマへのデータ移行
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================================
-- Step 1: organizationsのマイグレーション
-- ============================================================
INSERT INTO organizations_new (id, code, name, type, join_code, address, phone, email, is_active, created_at, updated_at)
SELECT 
  id,
  CONCAT('ORG', LPAD(id, 4, '0')) as code,
  name,
  type,
  NULL as join_code,
  address,
  phone,
  email,
  1 as is_active,
  created_at,
  updated_at
FROM organizations
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- デフォルト組織がない場合は作成
INSERT INTO organizations_new (code, name, type, is_active)
SELECT 'ORG0001', 'デフォルト組織', 'school', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM organizations_new LIMIT 1);

-- ============================================================
-- Step 2: usersのマイグレーション（studentsを統合）
-- ============================================================

-- 2a. 既存usersを移行
INSERT INTO users_new (
  id, organization_id, email, password, name, role, identifier, 
  department, phone, is_active, status, last_role_update, 
  reset_token, reset_token_expires, created_at, updated_at
)
SELECT 
  u.id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
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
  NULL as phone,
  1 as is_active,
  'active' as status,
  u.last_role_update,
  u.reset_token,
  u.reset_token_expires,
  u.created_at,
  u.updated_at
FROM users u
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2b. studentsテーブルからusersテーブルに存在しない学生を追加
INSERT INTO users_new (
  organization_id, email, password, name, role, identifier, 
  card_id, grade, class_name, phone, is_active, status,
  enrollment_date, created_at, updated_at
)
SELECT 
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  COALESCE(s.email, CONCAT(s.student_id, '@student.local')) as email,
  '$2b$10$defaulthashedpassword' as password,
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
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- Step 3: subjectsのマイグレーション
-- ============================================================
INSERT INTO subjects_new (
  id, organization_id, subject_code, subject_name, description, 
  credits, is_active, created_at, updated_at
)
SELECT 
  id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
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
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name);

-- ============================================================
-- Step 4: groupsのマイグレーション
-- ============================================================
INSERT INTO groups_new (
  id, organization_id, name, icon, description, 
  is_active, created_by, created_at, updated_at
)
SELECT 
  id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  name,
  icon,
  description,
  COALESCE(is_active, 1),
  created_by,
  created_at,
  updated_at
FROM `groups`
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- Step 5: classesのマイグレーション
-- ============================================================
INSERT INTO classes_new (
  id, organization_id, subject_id, class_code, room,
  schedule_day, start_time, end_time, academic_year, semester,
  is_active, created_at, updated_at
)
SELECT 
  c.id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  c.subject_id,
  c.class_code,
  c.room,
  c.schedule_day,
  c.start_time,
  c.end_time,
  c.academic_year,
  c.semester,
  COALESCE(c.is_active, 1),
  c.created_at,
  c.updated_at
FROM classes c
ON DUPLICATE KEY UPDATE class_code = VALUES(class_code);

-- ============================================================
-- Step 6: group_membersのマイグレーション
-- ============================================================
INSERT INTO group_members_new (
  id, group_id, user_id, invited_by, status, joined_at, created_at, updated_at
)
SELECT 
  gm.id,
  gm.group_id,
  COALESCE(
    (SELECT un.id FROM users_new un WHERE un.identifier = gm.student_id LIMIT 1),
    (SELECT un.id FROM users_new un WHERE un.email LIKE CONCAT(gm.student_id, '%') LIMIT 1)
  ) as user_id,
  gm.invited_by,
  gm.status,
  gm.joined_at,
  gm.created_at,
  gm.updated_at
FROM group_members gm
WHERE EXISTS (
  SELECT 1 FROM users_new un WHERE un.identifier = gm.student_id
  OR un.email LIKE CONCAT(gm.student_id, '%')
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- Step 7: enrollmentsのマイグレーション
-- ============================================================
INSERT INTO enrollments_new (
  id, user_id, class_id, enrollment_date, status, grade, created_at, updated_at
)
SELECT 
  e.id,
  COALESCE(
    (SELECT un.id FROM users_new un WHERE un.identifier = e.student_id LIMIT 1),
    (SELECT un.id FROM users_new un WHERE un.email LIKE CONCAT(e.student_id, '%') LIMIT 1)
  ) as user_id,
  e.class_id,
  e.enrollment_date,
  e.status,
  e.grade,
  e.created_at,
  e.updated_at
FROM enrollments e
WHERE EXISTS (
  SELECT 1 FROM users_new un WHERE un.identifier = e.student_id
  OR un.email LIKE CONCAT(e.student_id, '%')
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- Step 8: attendance_recordsのマイグレーション（4テーブル統合）
-- ============================================================

-- 8a. detailed_attendance_recordsから移行
INSERT INTO attendance_records_new (
  organization_id, user_id, record_type, reference_id, record_date,
  status, check_in_time, check_out_time, notes, source, created_by, created_at, updated_at
)
SELECT 
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  COALESCE(
    (SELECT un.id FROM users_new un WHERE un.identifier = dar.student_id LIMIT 1),
    (SELECT un.id FROM users_new un WHERE un.email LIKE CONCAT(dar.student_id, '%') LIMIT 1)
  ) as user_id,
  'class' as record_type,
  dar.class_id as reference_id,
  dar.attendance_date as record_date,
  dar.status,
  dar.check_in_time,
  dar.check_out_time,
  dar.notes,
  'manual' as source,
  dar.created_by,
  dar.created_at,
  dar.updated_at
FROM detailed_attendance_records dar
WHERE EXISTS (
  SELECT 1 FROM users_new un WHERE un.identifier = dar.student_id
  OR un.email LIKE CONCAT(dar.student_id, '%')
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 8b. user_attendance_recordsから移行
INSERT INTO attendance_records_new (
  organization_id, user_id, record_type, record_date,
  status, check_in_time, check_out_time, reason, source, created_at, updated_at
)
SELECT 
  COALESCE(
    (SELECT organization_id FROM users_new WHERE id = uar.user_id LIMIT 1),
    (SELECT id FROM organizations_new LIMIT 1),
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
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 8c. student_attendance_recordsから移行
INSERT INTO attendance_records_new (
  organization_id, user_id, record_type, record_date,
  status, check_in_time, source, created_at
)
SELECT 
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  COALESCE(
    (SELECT un.id FROM users_new un WHERE un.identifier = sar.student_id LIMIT 1),
    (SELECT un.id FROM users_new un WHERE un.email LIKE CONCAT(sar.student_id, '%') LIMIT 1)
  ) as user_id,
  'daily' as record_type,
  DATE(sar.timestamp) as record_date,
  'present' as status,
  sar.timestamp as check_in_time,
  'manual' as source,
  sar.created_at
FROM student_attendance_records sar
WHERE EXISTS (
  SELECT 1 FROM users_new un WHERE un.identifier = sar.student_id
  OR un.email LIKE CONCAT(sar.student_id, '%')
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- Step 9: eventsのマイグレーション
-- ============================================================
INSERT INTO events_new (
  id, organization_id, title, description, start_datetime, end_datetime,
  location, is_public, created_by, created_at, updated_at
)
SELECT 
  e.id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
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
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ============================================================
-- Step 10: absence_requestsのマイグレーション
-- ============================================================
INSERT INTO absence_requests_new (
  id, organization_id, user_id, class_id, request_type, request_date,
  reason, attachment_url, status, created_at, updated_at
)
SELECT 
  ar.id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  COALESCE(
    (SELECT un.id FROM users_new un WHERE un.identifier = ar.student_id LIMIT 1),
    (SELECT un.id FROM users_new un WHERE un.email LIKE CONCAT(ar.student_id, '%') LIMIT 1)
  ) as user_id,
  ar.class_session_id as class_id,
  ar.request_type,
  ar.request_date,
  ar.reason,
  ar.attachment_url,
  ar.status,
  ar.submitted_at as created_at,
  ar.updated_at
FROM absence_requests ar
WHERE EXISTS (
  SELECT 1 FROM users_new un WHERE un.identifier = ar.student_id
  OR un.email LIKE CONCAT(ar.student_id, '%')
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 承認情報を更新
UPDATE absence_requests_new arn
JOIN request_approvals ra ON arn.id = ra.request_id
SET 
  arn.approved_by = ra.approver_id,
  arn.approved_at = ra.approved_at,
  arn.approval_comment = ra.comment;

-- ============================================================
-- Step 11: qr_codesのマイグレーション
-- ============================================================
INSERT INTO qr_codes_new (
  id, organization_id, code, location_name, description,
  is_active, expires_at, created_by, created_at, updated_at
)
SELECT 
  qr.id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  qr.code,
  qr.location_name,
  qr.location_description as description,
  COALESCE(qr.is_active, 1),
  qr.expires_at,
  qr.created_by,
  qr.created_at,
  qr.updated_at
FROM qr_codes qr
ON DUPLICATE KEY UPDATE code = VALUES(code);

-- ============================================================
-- Step 12: notificationsのマイグレーション
-- ============================================================
INSERT INTO notifications_new (
  id, organization_id, user_id, title, message, type, priority,
  is_read, read_at, created_at
)
SELECT 
  n.id,
  COALESCE(
    (SELECT id FROM organizations_new LIMIT 1),
    1
  ) as organization_id,
  COALESCE(n.user_id, (SELECT id FROM users_new LIMIT 1)) as user_id,
  n.title,
  n.message,
  CASE n.type
    WHEN 'attendance' THEN 'attendance'
    WHEN 'grade' THEN 'system'
    WHEN 'general' THEN 'general'
    WHEN 'alert' THEN 'alert'
    ELSE 'system'
  END as type,
  COALESCE(n.priority, 'medium'),
  COALESCE(n.is_read, 0),
  n.read_at,
  n.created_at
FROM notifications n
WHERE n.user_id IS NOT NULL
ON DUPLICATE KEY UPDATE title = VALUES(title);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- マイグレーション完了
-- ============================================================
SELECT 'Migration completed successfully!' as message;
