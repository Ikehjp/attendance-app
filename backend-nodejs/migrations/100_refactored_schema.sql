-- ============================================================
-- 出欠管理システム リファクタリング スキーマ
-- Version: 2.0
-- Date: 2026-01-07
-- 目的: マルチテナント対応、出欠テーブル統合、ユーザー基盤統一
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
-- 1. organizations (組織マスター)
-- ============================================================
DROP TABLE IF EXISTS `organizations_new`;
CREATE TABLE `organizations_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '組織ID',
  `code` VARCHAR(50) NOT NULL COMMENT '組織コード',
  `name` VARCHAR(255) NOT NULL COMMENT '組織名（学校名/会社名）',
  `type` ENUM('school', 'company') NOT NULL COMMENT '組織種別',
  `join_code` VARCHAR(20) DEFAULT NULL COMMENT '参加コード',
  `address` TEXT COMMENT '住所',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '電話番号',
  `email` VARCHAR(255) DEFAULT NULL COMMENT '代表メールアドレス',
  `settings` JSON DEFAULT NULL COMMENT '組織固有設定',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_code` (`code`),
  KEY `idx_type` (`type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_join_code` (`join_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織マスターテーブル';

-- ============================================================
-- 2. users (統合ユーザーテーブル)
-- ============================================================
DROP TABLE IF EXISTS `users_new`;
CREATE TABLE `users_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ユーザーID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '所属組織ID',
  `email` VARCHAR(255) NOT NULL COMMENT 'メールアドレス',
  `password` VARCHAR(255) NOT NULL COMMENT 'ハッシュ化パスワード',
  `name` VARCHAR(255) NOT NULL COMMENT '氏名',
  `role` ENUM('owner', 'admin', 'teacher', 'employee', 'student') NOT NULL DEFAULT 'student' COMMENT 'ロール',
  `identifier` VARCHAR(100) DEFAULT NULL COMMENT '識別子（学籍番号/社員番号）',
  `card_id` VARCHAR(255) DEFAULT NULL COMMENT 'ICカードID',
  `department` VARCHAR(100) DEFAULT NULL COMMENT '部署/学科',
  `grade` VARCHAR(50) DEFAULT NULL COMMENT '学年',
  `class_name` VARCHAR(100) DEFAULT NULL COMMENT 'クラス名',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '電話番号',
  `avatar_url` VARCHAR(500) DEFAULT NULL COMMENT 'アバターURL',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '有効フラグ',
  `status` ENUM('active', 'inactive', 'graduated', 'suspended') DEFAULT 'active' COMMENT 'ステータス',
  `enrollment_date` DATE DEFAULT NULL COMMENT '入学日/入社日',
  `last_login_at` TIMESTAMP NULL DEFAULT NULL COMMENT '最終ログイン日時',
  `last_role_update` DATE DEFAULT NULL COMMENT '最終ロール更新日',
  `reset_token` VARCHAR(255) DEFAULT NULL COMMENT 'パスワードリセットトークン',
  `reset_token_expires` DATETIME DEFAULT NULL COMMENT 'トークン有効期限',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_org_identifier` (`organization_id`, `identifier`),
  UNIQUE KEY `uk_card_id` (`card_id`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_role` (`role`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_status` (`status`),
  KEY `idx_identifier` (`identifier`),
  KEY `idx_grade_class` (`grade`, `class_name`),
  CONSTRAINT `fk_users_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザーマスターテーブル';

-- ============================================================
-- 3. subjects (科目マスター - 維持)
-- ============================================================
DROP TABLE IF EXISTS `subjects_new`;
CREATE TABLE `subjects_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '科目ID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `subject_code` VARCHAR(50) NOT NULL COMMENT '科目コード',
  `subject_name` VARCHAR(255) NOT NULL COMMENT '科目名',
  `description` TEXT COMMENT '科目概要',
  `credits` INT DEFAULT 1 COMMENT '単位数',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_subject_code` (`organization_id`, `subject_code`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_subjects_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目マスターテーブル';

-- ============================================================
-- 4. groups (グループテーブル)
-- ============================================================
DROP TABLE IF EXISTS `groups_new`;
CREATE TABLE `groups_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'グループID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `name` VARCHAR(255) NOT NULL COMMENT 'グループ名',
  `icon` VARCHAR(255) DEFAULT NULL COMMENT 'アイコン',
  `description` TEXT COMMENT '説明',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '有効フラグ',
  `created_by` INT UNSIGNED DEFAULT NULL COMMENT '作成者ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_name` (`organization_id`, `name`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_groups_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_groups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users_new`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループテーブル';

-- ============================================================
-- 5. group_members (グループメンバー)
-- ============================================================
DROP TABLE IF EXISTS `group_members_new`;
CREATE TABLE `group_members_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'メンバーID',
  `group_id` INT UNSIGNED NOT NULL COMMENT 'グループID',
  `user_id` INT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  `invited_by` INT UNSIGNED DEFAULT NULL COMMENT '招待者ID',
  `status` ENUM('pending', 'accepted', 'declined', 'active', 'inactive') NOT NULL DEFAULT 'pending' COMMENT 'ステータス',
  `joined_at` TIMESTAMP NULL DEFAULT NULL COMMENT '参加日時',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_user` (`group_id`, `user_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_gm_group` FOREIGN KEY (`group_id`) REFERENCES `groups_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gm_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gm_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users_new`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループメンバーテーブル';

-- ============================================================
-- 6. group_teachers (グループ担当教員)
-- ============================================================
DROP TABLE IF EXISTS `group_teachers_new`;
CREATE TABLE `group_teachers_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '担当ID',
  `group_id` INT UNSIGNED NOT NULL COMMENT 'グループID',
  `user_id` INT UNSIGNED NOT NULL COMMENT 'ユーザーID（教員）',
  `role` ENUM('main', 'assistant') DEFAULT 'main' COMMENT '教員区別',
  `assigned_at` DATE NOT NULL COMMENT '割り当て日',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_teacher` (`group_id`, `user_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role` (`role`),
  CONSTRAINT `fk_gt_group` FOREIGN KEY (`group_id`) REFERENCES `groups_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gt_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループ担当教員テーブル';

-- ============================================================
-- 7. classes (授業テーブル)
-- ============================================================
DROP TABLE IF EXISTS `classes_new`;
CREATE TABLE `classes_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '授業ID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `subject_id` INT UNSIGNED NOT NULL COMMENT '科目ID',
  `group_id` INT UNSIGNED DEFAULT NULL COMMENT 'グループID',
  `class_code` VARCHAR(50) NOT NULL COMMENT '授業コード',
  `teacher_id` INT UNSIGNED DEFAULT NULL COMMENT '担当教員ID',
  `room` VARCHAR(100) DEFAULT NULL COMMENT '教室',
  `schedule_day` ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') COMMENT '曜日',
  `period_number` INT DEFAULT NULL COMMENT '時限',
  `start_time` TIME DEFAULT NULL COMMENT '開始時間',
  `end_time` TIME DEFAULT NULL COMMENT '終了時間',
  `academic_year` VARCHAR(10) DEFAULT NULL COMMENT '年度',
  `semester` VARCHAR(20) DEFAULT NULL COMMENT '学期',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_code` (`organization_id`, `class_code`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_subject_id` (`subject_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_schedule` (`schedule_day`, `start_time`),
  KEY `idx_academic_year` (`academic_year`, `semester`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_classes_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_classes_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_classes_group` FOREIGN KEY (`group_id`) REFERENCES `groups_new`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_classes_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users_new`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授業テーブル';

-- ============================================================
-- 8. enrollments (履修登録 - 維持)
-- ============================================================
DROP TABLE IF EXISTS `enrollments_new`;
CREATE TABLE `enrollments_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '登録ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  `class_id` INT UNSIGNED NOT NULL COMMENT '授業ID',
  `enrollment_date` DATE NOT NULL COMMENT '登録日',
  `status` ENUM('enrolled', 'dropped', 'completed') DEFAULT 'enrolled' COMMENT '登録状態',
  `grade` VARCHAR(5) DEFAULT NULL COMMENT '成績',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_class` (`user_id`, `class_id`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_class_status` (`class_id`, `status`),
  CONSTRAINT `fk_enroll_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enroll_class` FOREIGN KEY (`class_id`) REFERENCES `classes_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='履修登録テーブル';

-- ============================================================
-- 9. attendance_records (統合出欠記録)
-- ============================================================
DROP TABLE IF EXISTS `attendance_records_new`;
CREATE TABLE `attendance_records_new` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  `record_type` ENUM('class', 'work', 'event', 'daily') NOT NULL COMMENT '記録種別',
  `reference_id` INT UNSIGNED DEFAULT NULL COMMENT '参照ID（授業ID/イベントIDなど）',
  `record_date` DATE NOT NULL COMMENT '対象日',
  `status` ENUM('present', 'absent', 'late', 'early_departure', 'excused') NOT NULL COMMENT '出欠状態',
  `check_in_time` DATETIME DEFAULT NULL COMMENT '出席/出勤時刻',
  `check_out_time` DATETIME DEFAULT NULL COMMENT '退席/退勤時刻',
  `reason` TEXT COMMENT '理由',
  `notes` TEXT COMMENT '備考',
  `source` ENUM('manual', 'qr_scan', 'auto', 'approval') DEFAULT 'manual' COMMENT '記録元',
  `source_id` INT UNSIGNED DEFAULT NULL COMMENT '記録元ID（QRコードID等）',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'IPアドレス',
  `created_by` INT UNSIGNED DEFAULT NULL COMMENT '記録者ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_type_ref_date` (`user_id`, `record_type`, `reference_id`, `record_date`),
  KEY `idx_org_date` (`organization_id`, `record_date`),
  KEY `idx_user_date` (`user_id`, `record_date`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_status` (`status`),
  KEY `idx_record_date` (`record_date`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_org_type_date` (`organization_id`, `record_type`, `record_date`),
  CONSTRAINT `fk_att_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_created_by` FOREIGN KEY (`created_by`) REFERENCES `users_new`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='統合出欠記録テーブル';

-- ============================================================
-- 10. events (イベントテーブル)
-- ============================================================
DROP TABLE IF EXISTS `events_new`;
CREATE TABLE `events_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'イベントID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `title` VARCHAR(255) NOT NULL COMMENT 'タイトル',
  `description` TEXT COMMENT '説明',
  `start_datetime` DATETIME NOT NULL COMMENT '開始日時',
  `end_datetime` DATETIME DEFAULT NULL COMMENT '終了日時',
  `location` VARCHAR(255) DEFAULT NULL COMMENT '場所',
  `is_public` TINYINT(1) DEFAULT 0 COMMENT '公開フラグ',
  `created_by` INT UNSIGNED NOT NULL COMMENT '作成者ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_start_datetime` (`start_datetime`),
  KEY `idx_date_range` (`start_datetime`, `end_datetime`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_org_date` (`organization_id`, `start_datetime`),
  CONSTRAINT `fk_events_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベントテーブル';

-- ============================================================
-- 11. event_participants (イベント参加者)
-- ============================================================
DROP TABLE IF EXISTS `event_participants_new`;
CREATE TABLE `event_participants_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '参加者ID',
  `event_id` INT UNSIGNED NOT NULL COMMENT 'イベントID',
  `user_id` INT UNSIGNED NOT NULL COMMENT 'ユーザーID',
  `status` ENUM('pending', 'accepted', 'declined') DEFAULT 'pending' COMMENT '参加ステータス',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_user` (`event_id`, `user_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ep_event` FOREIGN KEY (`event_id`) REFERENCES `events_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ep_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベント参加者テーブル';

-- ============================================================
-- 12. absence_requests (欠席申請)
-- ============================================================
DROP TABLE IF EXISTS `absence_requests_new`;
CREATE TABLE `absence_requests_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '申請ID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '申請者ID',
  `class_id` INT UNSIGNED DEFAULT NULL COMMENT '授業ID',
  `request_type` ENUM('absence', 'late', 'early_departure', 'official_absence', 'official_late') NOT NULL COMMENT '申請種別',
  `request_date` DATE NOT NULL COMMENT '対象日',
  `reason` TEXT NOT NULL COMMENT '理由',
  `attachment_url` VARCHAR(500) DEFAULT NULL COMMENT '添付ファイルURL',
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'ステータス',
  `approved_by` INT UNSIGNED DEFAULT NULL COMMENT '承認者ID',
  `approved_at` TIMESTAMP NULL DEFAULT NULL COMMENT '承認日時',
  `approval_comment` TEXT COMMENT '承認コメント',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  KEY `idx_request_type` (`request_type`),
  KEY `idx_org_date_status` (`organization_id`, `request_date`, `status`),
  CONSTRAINT `fk_abs_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_abs_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_abs_class` FOREIGN KEY (`class_id`) REFERENCES `classes_new`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_abs_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users_new`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='欠席申請テーブル';

-- ============================================================
-- 13. qr_codes (QRコード)
-- ============================================================
DROP TABLE IF EXISTS `qr_codes_new`;
CREATE TABLE `qr_codes_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'QRコードID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `code` VARCHAR(255) NOT NULL COMMENT 'QRコード文字列',
  `location_name` VARCHAR(255) NOT NULL COMMENT '場所名',
  `description` TEXT COMMENT '説明',
  `class_id` INT UNSIGNED DEFAULT NULL COMMENT '関連授業ID',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '有効フラグ',
  `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT '有効期限',
  `created_by` INT UNSIGNED NOT NULL COMMENT '作成者ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_location` (`location_name`),
  CONSTRAINT `fk_qr_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qr_class` FOREIGN KEY (`class_id`) REFERENCES `classes_new`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_qr_created_by` FOREIGN KEY (`created_by`) REFERENCES `users_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QRコードテーブル';

-- ============================================================
-- 14. allowed_ip_ranges (許可IPレンジ)
-- ============================================================
DROP TABLE IF EXISTS `allowed_ip_ranges_new`;
CREATE TABLE `allowed_ip_ranges_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'IP範囲ID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `name` VARCHAR(255) NOT NULL COMMENT 'IP範囲名',
  `ip_start` VARCHAR(45) NOT NULL COMMENT '開始IPアドレス',
  `ip_end` VARCHAR(45) NOT NULL COMMENT '終了IPアドレス',
  `description` TEXT COMMENT '説明',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `idx_organization_id` (`organization_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_ip_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='許可IPアドレス範囲テーブル';

-- ============================================================
-- 15. notifications (通知)
-- ============================================================
DROP TABLE IF EXISTS `notifications_new`;
CREATE TABLE `notifications_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `organization_id` INT UNSIGNED NOT NULL COMMENT '組織ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '通知対象ユーザーID',
  `title` VARCHAR(255) NOT NULL COMMENT 'タイトル',
  `message` TEXT NOT NULL COMMENT 'メッセージ',
  `type` ENUM('attendance', 'approval', 'system', 'alert', 'general') NOT NULL COMMENT '通知タイプ',
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '優先度',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '既読フラグ',
  `read_at` TIMESTAMP NULL DEFAULT NULL COMMENT '既読日時',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`, `is_read`),
  KEY `idx_org_created` (`organization_id`, `created_at`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_notif_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知テーブル';

-- ============================================================
-- 16. audit_logs (監査ログ)
-- ============================================================
DROP TABLE IF EXISTS `audit_logs_new`;
CREATE TABLE `audit_logs_new` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ログID',
  `organization_id` INT UNSIGNED DEFAULT NULL COMMENT '組織ID',
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT '操作ユーザーID',
  `action` VARCHAR(100) NOT NULL COMMENT '操作種別',
  `table_name` VARCHAR(100) NOT NULL COMMENT '対象テーブル',
  `record_id` VARCHAR(100) DEFAULT NULL COMMENT '対象レコードID',
  `old_values` JSON DEFAULT NULL COMMENT '変更前の値',
  `new_values` JSON DEFAULT NULL COMMENT '変更後の値',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'IPアドレス',
  `user_agent` TEXT COMMENT 'ユーザーエージェント',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作日時',
  PRIMARY KEY (`id`),
  KEY `idx_org_created` (`organization_id`, `created_at`),
  KEY `idx_user_action` (`user_id`, `action`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_audit_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users_new`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='監査ログテーブル';

-- ============================================================
-- 17. system_settings (システム設定)
-- ============================================================
DROP TABLE IF EXISTS `system_settings_new`;
CREATE TABLE `system_settings_new` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '設定ID',
  `organization_id` INT UNSIGNED DEFAULT NULL COMMENT '組織ID（NULLはグローバル設定）',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '設定キー',
  `setting_value` TEXT COMMENT '設定値',
  `setting_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '値の型',
  `description` TEXT COMMENT '設定の説明',
  `is_public` TINYINT(1) DEFAULT 0 COMMENT 'クライアント側に公開可能か',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_key` (`organization_id`, `setting_key`),
  KEY `idx_setting_key` (`setting_key`),
  KEY `idx_is_public` (`is_public`),
  CONSTRAINT `fk_settings_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations_new`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='システム設定テーブル';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- スキーマ作成完了
-- ============================================================
