-- ============================================================
-- MariaDB用 修正版インストーラー
-- 変更点: データベース作成処理の追加、MariaDB互換設定
-- ============================================================

-- 1. データベースの作成（MariaDB推奨のutf8mb4_unicode_ciを使用）
CREATE DATABASE IF NOT EXISTS `sotsuken` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. データベースを選択
USE `sotsuken`;

-- 3. 外部キーチェックを無効化（テーブル作成順序によるエラーを防止）
SET FOREIGN_KEY_CHECKS = 0;

-- 4. 文字コード設定
SET NAMES utf8mb4;

-- ============================================================
-- ここから下は元の 000_initial_schema.sql の内容です
-- ============================================================

-- テーブル削除（クリーンアップ）
DROP TABLE IF EXISTS `scan_logs`;
DROP TABLE IF EXISTS `request_approvals`;
DROP TABLE IF EXISTS `absence_requests`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `event_participants`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `student_attendance_records`;
DROP TABLE IF EXISTS `user_attendance_records`;
DROP TABLE IF EXISTS `detailed_attendance_records`;
DROP TABLE IF EXISTS `enrollments`;
DROP TABLE IF EXISTS `group_teachers`;
DROP TABLE IF EXISTS `group_members`;
DROP TABLE IF EXISTS `class_sessions`;
DROP TABLE IF EXISTS `classes`;
DROP TABLE IF EXISTS `timetables`;
DROP TABLE IF EXISTS `schedule_templates`;
DROP TABLE IF EXISTS `qr_codes`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `groups`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `allowed_ip_ranges`;
DROP TABLE IF EXISTS `organizations`;
DROP TABLE IF EXISTS `schema_migrations`;
DROP TABLE IF EXISTS `workspaces`;
DROP TABLE IF EXISTS `channels`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `channel_members`;
DROP TABLE IF EXISTS `workspace_users`;
DROP TABLE IF EXISTS `channel_categories`;

-- ============================================================
-- 1. Organizations（組織管理）
-- ============================================================

CREATE TABLE `organizations` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '組織ID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '組織名（学校名/会社名）',
  `type` enum('school','company') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '組織種別',
  `address` text COLLATE utf8mb4_unicode_ci COMMENT '住所',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '電話番号',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '代表メールアドレス',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織情報テーブル';

-- ============================================================
-- 2. Users（ユーザー管理）
-- ============================================================

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ユーザーID',
  `organization_id` int NOT NULL DEFAULT 1 COMMENT '組織ID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '氏名',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'メールアドレス',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ハッシュ化されたパスワード',
  `employee_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '従業員ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学生ID（学籍番号）',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部署',
  `role` enum('admin','employee','teacher','student') COLLATE utf8mb4_unicode_ci DEFAULT 'employee' COMMENT 'ユーザーロール',
  `last_role_update` date DEFAULT NULL COMMENT '最終ロール更新日',
  `last_login` datetime DEFAULT NULL COMMENT '最終ログイン日時',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'パスワードリセットトークン',
  `reset_token_expires` datetime DEFAULT NULL COMMENT 'リセットトークン有効期限',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `employee_id` (`employee_id`),
  KEY `idx_email` (`email`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_role` (`role`),
  KEY `idx_organization_id` (`organization_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザー情報テーブル';

-- ============================================================
-- 3. Students（学生情報）
-- ============================================================

CREATE TABLE `students` (
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID (学籍番号など)',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生名',
  `card_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ICカードIDなど',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'メールアドレス',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '電話番号',
  `grade` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学年',
  `class_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'クラス名',
  `enrollment_date` date DEFAULT NULL COMMENT '入学日',
  `status` enum('active','inactive','graduated','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '学生の状態',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `card_id` (`card_id`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_grade_class` (`grade`,`class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生情報テーブル';

-- ============================================================
-- 4. Groups（グループ/クラス管理）
-- ============================================================

CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'グループID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'グループ名',
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'グループアイコン（絵文字またはURL）',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `created_by` int DEFAULT NULL COMMENT '作成者ID',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_groups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループ管理テーブル';

-- ============================================================
-- 5. Group Members（グループメンバー）
-- ============================================================

CREATE TABLE `group_members` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'メンバーID',
  `group_id` int NOT NULL COMMENT 'グループID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `invited_by` int DEFAULT NULL COMMENT '招待者ID',
  `status` enum('pending','accepted','declined','active','inactive','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'メンバーステータス',
  `joined_at` timestamp NULL DEFAULT NULL COMMENT '参加日時',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_student` (`group_id`,`student_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `fk_group_members_invited_by` (`invited_by`),
  CONSTRAINT `fk_group_members_group_id` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_members_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_group_members_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループメンバーテーブル';

-- ============================================================
-- 6. Group Teachers（グループ担当教員）
-- ============================================================

CREATE TABLE `group_teachers` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '担当ID',
  `group_id` int NOT NULL COMMENT 'グループID',
  `user_id` int NOT NULL COMMENT 'ユーザーID（教員）',
  `role` enum('main','assistant') COLLATE utf8mb4_unicode_ci DEFAULT 'main' COMMENT '担当種別（主担当/副担当）',
  `assigned_at` date NOT NULL COMMENT '割り当て日',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_teacher` (`group_id`,`user_id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_role` (`role`),
  CONSTRAINT `group_teachers_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_teachers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループ担当教員テーブル';

-- ============================================================
-- 7. Subjects（科目管理）
-- ============================================================

CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '科目ID',
  `subject_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '科目コード',
  `subject_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '科目名',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '科目概要',
  `credits` int DEFAULT '1' COMMENT '単位数',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_code` (`subject_code`),
  KEY `idx_subject_code` (`subject_code`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目管理テーブル';

-- ============================================================
-- 8. Classes（授業管理）
-- ============================================================

CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '授業ID',
  `class_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '授業コード',
  `subject_id` int NOT NULL COMMENT '科目ID',
  `teacher_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '担当教員名',
  `room` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '教室',
  `schedule_day` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '曜日',
  `start_time` time NOT NULL COMMENT '開始時間',
  `end_time` time NOT NULL COMMENT '終了時間',
  `semester` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学期',
  `academic_year` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '年度',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_code` (`class_code`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_schedule` (`schedule_day`,`start_time`),
  KEY `idx_semester_year` (`semester`,`academic_year`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授業管理テーブル';

-- ============================================================
-- 9. Timetables（時間割）
-- ============================================================

CREATE TABLE `timetables` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '時間割ID',
  `group_id` int NOT NULL COMMENT 'グループID',
  `academic_year` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '年度（例: 2024）',
  `semester` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学期（前期/後期など）',
  `start_date` date NOT NULL COMMENT '開始日',
  `end_date` date NOT NULL COMMENT '終了日',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_academic_year` (`academic_year`),
  KEY `idx_semester` (`semester`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `timetables_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='時間割テーブル';

-- ============================================================
-- 10. Class Sessions（授業セッション）
-- ============================================================

CREATE TABLE `class_sessions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '授業セッションID',
  `timetable_id` int NOT NULL COMMENT '時間割ID',
  `subject_id` int NOT NULL COMMENT '科目ID',
  `class_date` date NOT NULL COMMENT '授業日',
  `period_number` int NOT NULL COMMENT '時限（1限、2限など）',
  `start_time` time NOT NULL COMMENT '開始時刻',
  `end_time` time NOT NULL COMMENT '終了時刻',
  `room` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '教室',
  `teacher_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '担当教員名',
  `is_cancelled` tinyint(1) DEFAULT '0' COMMENT '休講フラグ',
  `cancellation_reason` text COLLATE utf8mb4_unicode_ci COMMENT '休講理由',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '備考',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_timetable` (`timetable_id`),
  KEY `idx_class_date` (`class_date`),
  KEY `idx_period` (`period_number`),
  KEY `idx_is_cancelled` (`is_cancelled`),
  CONSTRAINT `class_sessions_ibfk_1` FOREIGN KEY (`timetable_id`) REFERENCES `timetables` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_sessions_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授業セッションテーブル';

-- ============================================================
-- 11. Enrollments（履修登録）
-- ============================================================

CREATE TABLE `enrollments` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '登録ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `class_id` int NOT NULL COMMENT '授業ID',
  `enrollment_date` date NOT NULL COMMENT '登録日',
  `status` enum('enrolled','dropped','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'enrolled' COMMENT '登録状態',
  `grade` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '成績',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_class` (`student_id`,`class_id`),
  KEY `class_id` (`class_id`),
  KEY `idx_student_enrollment` (`student_id`,`status`),
  KEY `idx_class_enrollment` (`class_id`,`status`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生の科目登録テーブル';

-- ============================================================
-- 12. Detailed Attendance Records（詳細出欠記録）
-- ============================================================

CREATE TABLE `detailed_attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `class_id` int NOT NULL COMMENT '授業ID',
  `attendance_date` date NOT NULL COMMENT '出欠日',
  `status` enum('present','absent','late','excused') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出欠状態',
  `check_in_time` datetime DEFAULT NULL COMMENT '出席時刻',
  `check_out_time` datetime DEFAULT NULL COMMENT '退席時刻',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '備考',
  `created_by` int DEFAULT NULL COMMENT '記録者ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_class_date` (`student_id`,`class_id`,`attendance_date`),
  KEY `class_id` (`class_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_student_attendance` (`student_id`,`attendance_date`),
  KEY `idx_class_attendance` (`class_id`,`attendance_date`),
  KEY `idx_attendance_date` (`attendance_date`),
  CONSTRAINT `detailed_attendance_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `detailed_attendance_records_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detailed_attendance_records_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='詳細な出欠記録テーブル（科目別）';

-- ============================================================
-- 13. User Attendance Records（従業員出欠記録）
-- ============================================================

CREATE TABLE `user_attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `user_id` int NOT NULL COMMENT 'ユーザーID',
  `date` date NOT NULL COMMENT '出欠日',
  `status` enum('present','absent','late','early_departure') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状態',
  `check_in_time` datetime DEFAULT NULL COMMENT '出勤時刻',
  `check_out_time` datetime DEFAULT NULL COMMENT '退勤時刻',
  `reason` text COLLATE utf8mb4_unicode_ci COMMENT '理由 (遅刻・早退・欠席など)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`date`),
  KEY `idx_user_date` (`user_id`,`date`),
  KEY `idx_date` (`date`),
  CONSTRAINT `user_attendance_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='従業員の出欠記録テーブル';

-- ============================================================
-- 14. Student Attendance Records（学生出欠記録シンプル版）
-- ============================================================

CREATE TABLE `student_attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `timestamp` datetime NOT NULL COMMENT '記録日時',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`id`),
  KEY `idx_student_timestamp` (`student_id`,`timestamp`),
  CONSTRAINT `student_attendance_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生の出欠記録テーブル（シンプル版）';

-- ============================================================
-- 15. Absence Requests（欠席申請）
-- ============================================================

CREATE TABLE `absence_requests` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '申請ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `class_session_id` int DEFAULT NULL COMMENT '授業セッションID（特定授業の場合）',
  `request_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申請種別',
  `request_date` date NOT NULL COMMENT '申請対象日',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '理由',
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '添付ファイルURL',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'ステータス',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提出日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `class_session_id` (`class_session_id`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  KEY `idx_request_type` (`request_type`),
  CONSTRAINT `absence_requests_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `absence_requests_ibfk_2` FOREIGN KEY (`class_session_id`) REFERENCES `class_sessions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='欠席・遅刻・早退申請テーブル';

-- ============================================================
-- 16. Request Approvals（承認管理）
-- ============================================================

CREATE TABLE `request_approvals` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '承認ID',
  `request_id` int NOT NULL COMMENT '申請ID',
  `approver_id` int NOT NULL COMMENT '承認者ID（教員または管理者）',
  `action` enum('approve','reject') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '承認アクション',
  `comment` text COLLATE utf8mb4_unicode_ci COMMENT 'コメント',
  `approved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '承認日時',
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  KEY `approver_id` (`approver_id`),
  KEY `idx_approved_at` (`approved_at`),
  CONSTRAINT `request_approvals_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `absence_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `request_approvals_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='承認管理テーブル';

-- ============================================================
-- 17. QR Codes（QRコード管理）
-- ============================================================

CREATE TABLE `qr_codes` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'QRコードID',
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'QRコード文字列',
  `location_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '場所名（教室名、玄関など）',
  `location_description` text COLLATE utf8mb4_unicode_ci COMMENT '場所の説明',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_by` int NOT NULL COMMENT '作成者ID（管理者）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT '有効期限',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `created_by` (`created_by`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_location` (`location_name`),
  CONSTRAINT `qr_codes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QRコード生成管理テーブル';

-- ============================================================
-- 18. Scan Logs（QRスキャンログ）
-- ============================================================

CREATE TABLE `scan_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'スキャンログID',
  `qr_code_id` int NOT NULL COMMENT 'QRコードID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `scanned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'スキャン日時',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'スキャン元IPアドレス',
  `is_allowed` tinyint(1) NOT NULL COMMENT 'IP許可フラグ',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT 'ユーザーエージェント',
  `result` enum('success','ip_denied','invalid_qr','error') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'スキャン結果',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT 'エラーメッセージ',
  PRIMARY KEY (`id`),
  KEY `qr_code_id` (`qr_code_id`),
  KEY `student_id` (`student_id`),
  KEY `idx_scanned_at` (`scanned_at`),
  KEY `idx_result` (`result`),
  CONSTRAINT `scan_logs_ibfk_1` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_codes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scan_logs_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QRスキャンログテーブル';

-- ============================================================
-- 19. Events（イベント管理）
-- ============================================================

CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'イベントID',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'イベントタイトル',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'イベント説明',
  `start_date` datetime NOT NULL COMMENT '開始日時',
  `end_date` datetime DEFAULT NULL COMMENT '終了日時',
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '場所',
  `created_by` int NOT NULL COMMENT '作成者ID',
  `is_public` tinyint(1) DEFAULT '0' COMMENT '公開フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_end_date` (`end_date`),
  KEY `idx_is_public` (`is_public`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベントテーブル';

-- ============================================================
-- 20. Event Participants（イベント参加者）
-- ============================================================

CREATE TABLE `event_participants` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '参加者ID',
  `event_id` int NOT NULL COMMENT 'イベントID',
  `user_id` int NOT NULL COMMENT 'ユーザーID',
  `status` enum('pending','accepted','declined') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '参加ステータス',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_user` (`event_id`,`user_id`),
  KEY `event_id` (`event_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `event_participants_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベント参加者テーブル';

-- ============================================================
-- 21. Notifications（通知管理）
-- ============================================================

CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `user_id` int DEFAULT NULL COMMENT '通知対象のユーザーID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '通知対象の学生ID',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知タイトル',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知メッセージ',
  `type` enum('attendance','grade','general','alert','system') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知タイプ',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium' COMMENT '優先度',
  `is_read` tinyint(1) DEFAULT '0' COMMENT '既読フラグ',
  `read_at` timestamp NULL DEFAULT NULL COMMENT '既読日時',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `student_id` (`student_id`),
  KEY `idx_user_notifications` (`user_id`,`is_read`),
  KEY `idx_student_notifications` (`student_id`,`is_read`),
  KEY `idx_type_priority` (`type`,`priority`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知テーブル';

-- ============================================================
-- 22. Allowed IP Ranges（許可IPアドレス範囲）
-- ============================================================

CREATE TABLE `allowed_ip_ranges` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'IP範囲ID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IP範囲名（学校Wi-Fi、会社ネットワークなど）',
  `ip_start` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '開始IPアドレス（IPv4/IPv6対応）',
  `ip_end` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '終了IPアドレス（IPv4/IPv6対応）',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='許可IPアドレス範囲テーブル';

-- ============================================================
-- 23. System Settings（システム設定）
-- ============================================================

CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '設定ID',
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '設定キー',
  `setting_value` text COLLATE utf8mb4_unicode_ci COMMENT '設定値',
  `setting_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string' COMMENT '値の型',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '設定の説明',
  `is_public` tinyint(1) DEFAULT '0' COMMENT 'クライアント側に公開可能か',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='システム設定テーブル';

-- ============================================================
-- 24. Schedule Templates（時間割テンプレート）
-- ============================================================

CREATE TABLE `schedule_templates` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'テンプレートID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'テンプレート名',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '説明',
  `template_data` json NOT NULL COMMENT 'テンプレートデータ（JSON形式）',
  `created_by` int NOT NULL COMMENT '作成者ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `schedule_templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='時間割テンプレートテーブル';

-- ============================================================
-- 25. Audit Logs（監査ログ）
-- ============================================================

CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ログID',
  `user_id` int DEFAULT NULL COMMENT '操作したユーザーのID (システムによる操作はNULL)',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作種別 (CREATE, UPDATE, DELETE, LOGINなど)',
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '対象テーブル名',
  `record_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '対象レコードID',
  `old_values` json DEFAULT NULL COMMENT '変更前の値',
  `new_values` json DEFAULT NULL COMMENT '変更後の値',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IPアドレス',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT 'ユーザーエージェント',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作日時',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_user_action` (`user_id`,`action`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='監査ログテーブル';

-- ============================================================
-- サンプルデータ挿入
-- ============================================================

-- 1. サンプル組織
INSERT INTO `organizations` (`id`, `name`, `type`, `address`, `phone`, `email`) VALUES
(1, 'サンプル学校', 'school', '東京都渋谷区1-2-3', '03-1234-5678', 'info@sample-school.jp');

-- 2. サンプルユーザー（管理者、教員、学生）
INSERT INTO `users` (`id`, `organization_id`, `name`, `email`, `password`, `employee_id`, `student_id`, `role`, `last_role_update`) VALUES
(1, 1, '管理者太郎', 'admin@example.com', '$2b$10$rJ8L7z8z8z8z8z8z8z8z8OqD5qF5qF5qF5qF5qF5qF5qF5qF5qF5q', 'EMP001', NULL, 'admin', '2024-01-01'),
(2, 1, '教員花子', 'teacher@example.com', '$2b$10$rJ8L7z8z8z8z8z8z8z8z8OqD5qF5qF5qF5qF5qF5qF5qF5qF5qF5q', 'EMP002', NULL, 'teacher', '2024-01-01'),
(3, 1, '学生一郎', 'student1@example.com', '$2b$10$rJ8L7z8z8z8z8z8z8z8z8OqD5qF5qF5qF5qF5qF5qF5qF5qF5qF5q', NULL, 'S001', 'student', '2024-04-01'),
(4, 1, '学生二郎', 'student2@example.com', '$2b$10$rJ8L7z8z8z8z8z8z8z8z8OqD5qF5qF5qF5qF5qF5qF5qF5qF5qF5q', NULL, 'S002', 'student', '2024-04-01'),
(5, 1, '従業員三郎', 'employee@example.com', '$2b$10$rJ8L7z8z8z8z8z8z8z8z8OqD5qF5qF5qF5qF5qF5qF5qF5qF5qF5q', 'EMP003', NULL, 'employee', '2024-01-01');

-- 3. サンプル学生情報
INSERT INTO `students` (`student_id`, `name`, `card_id`, `email`, `phone`, `grade`, `class_name`, `enrollment_date`, `status`) VALUES
('S001', '学生一郎', 'CARD001', 'student1@example.com', '090-1111-1111', '1年', 'A組', '2024-04-01', 'active'),
('S002', '学生二郎', 'CARD002', 'student2@example.com', '090-2222-2222', '1年', 'A組', '2024-04-01', 'active'),
('S003', '学生三郎', 'CARD003', 'student3@example.com', '090-3333-3333', '2年', 'B組', '2023-04-01', 'active');

-- 4. サンプルグループ
INSERT INTO `groups` (`id`, `name`, `icon`, `description`, `created_by`, `is_active`) VALUES
(1, 'プログラミング基礎クラス', '💻', 'プログラミングの基礎を学ぶクラス', 1, 1),
(2, 'データベース応用クラス', '🗄️', 'データベース設計と運用を学ぶクラス', 1, 1);

-- 5. サンプルグループメンバー
INSERT INTO `group_members` (`group_id`, `student_id`, `invited_by`, `status`, `joined_at`) VALUES
(1, 'S001', 1, 'active', '2024-04-01 09:00:00'),
(1, 'S002', 1, 'active', '2024-04-01 09:00:00'),
(2, 'S003', 1, 'active', '2024-04-01 09:00:00');

-- 6. サンプル科目
INSERT INTO `subjects` (`id`, `subject_code`, `subject_name`, `description`, `credits`, `is_active`) VALUES
(1, 'CS101', 'プログラミング基礎', 'プログラミングの基本概念とPythonの基礎', 2, 1),
(2, 'CS201', 'データ構造とアルゴリズム', 'データ構造とアルゴリズムの基礎', 3, 1),
(3, 'CS301', 'データベース設計', 'リレーショナルデータベースの設計と実装', 2, 1),
(4, 'MA101', '数学基礎', '微分積分と線形代数の基礎', 3, 1),
(5, 'EN101', '英語コミュニケーション', 'ビジネス英語とコミュニケーション', 2, 1);

-- 7. サンプル授業
INSERT INTO `classes` (`id`, `class_code`, `subject_id`, `teacher_name`, `room`, `schedule_day`, `start_time`, `end_time`, `semester`, `academic_year`, `is_active`) VALUES
(1, 'CS101-A', 1, '教員花子', '101教室', 'monday', '09:00:00', '10:30:00', '前期', '2024', 1),
(2, 'CS201-A', 2, '教員花子', '102教室', 'tuesday', '10:40:00', '12:10:00', '前期', '2024', 1),
(3, 'CS301-A', 3, '教員花子', '103教室', 'wednesday', '13:00:00', '14:30:00', '後期', '2024', 1),
(4, 'MA101-A', 4, '数学先生', '201教室', 'thursday', '09:00:00', '10:30:00', '前期', '2024', 1),
(5, 'EN101-A', 5, '英語先生', '301教室', 'friday', '14:40:00', '16:10:00', '前期', '2024', 1);

-- 8. サンプル履修登録
INSERT INTO `enrollments` (`student_id`, `class_id`, `enrollment_date`, `status`) VALUES
('S001', 1, '2024-04-01', 'enrolled'),
('S001', 2, '2024-04-01', 'enrolled'),
('S002', 1, '2024-04-01', 'enrolled'),
('S002', 3, '2024-04-01', 'enrolled'),
('S003', 2, '2024-04-01', 'enrolled'),
('S003', 3, '2024-04-01', 'enrolled');

-- 9. システム設定のサンプル
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `is_public`) VALUES
('site_name', '出欠管理システム Yururia', 'string', 'サイト名', 1),
('timezone', 'Asia/Tokyo', 'string', 'タイムゾーン', 1),
('academic_year', '2024', 'string', '現在の学年度', 1),
('current_semester', '前期', 'string', '現在の学期', 1),
('max_absence_days', '30', 'number', '最大欠席日数', 0);

-- 10. 許可IPアドレス範囲のサンプル
INSERT INTO `allowed_ip_ranges` (`name`, `ip_start`, `ip_end`, `description`, `is_active`) VALUES
('学校Wi-Fi', '192.168.1.0', '192.168.1.255', '学校内Wi-Fiネットワーク', 1),
('本社オフィス', '10.0.0.0', '10.0.0.255', '本社オフィスネットワーク', 1),
('localhost', '127.0.0.1', '127.0.0.1', 'ローカル開発環境', 1);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- マイグレーション完了
-- ============================================================
SELECT 'Initial schema migration completed successfully!' as message;
SELECT 'Sample data inserted successfully!' as message;

CREATE DATABASE IF NOT EXISTS `sotsuken` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sotsuken`;
SET FOREIGN_KEY_CHECKS = 0;