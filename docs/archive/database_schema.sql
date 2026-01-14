-- ============================================
-- 出欠管理システム - 統合データベーススキーマ
-- 作成日: 2025-11-20
-- ============================================

-- データベースが存在しない場合に作成
CREATE DATABASE IF NOT EXISTS `sotsuken` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sotsuken`;

-- ============================================
-- 1. ユーザーテーブル (従業員・管理者・学生)
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ユーザーID',
  `name` VARCHAR(255) NOT NULL COMMENT '氏名',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'メールアドレス',
  `password` VARCHAR(255) NOT NULL COMMENT 'ハッシュ化されたパスワード',
  `employee_id` VARCHAR(50) NULL UNIQUE COMMENT '社員ID (学生の場合はNULL)',
  `student_id` VARCHAR(50) NULL UNIQUE COMMENT '学生ID (従業員の場合はNULL)',
  `department` VARCHAR(100) NULL COMMENT '部署',
  `role` ENUM('employee', 'admin', 'student') NOT NULL DEFAULT 'employee' COMMENT '役割',
  `last_role_update` DATE NULL COMMENT '役割変更日',
  `reset_token` VARCHAR(255) NULL COMMENT 'パスワードリセットトークン',
  `reset_token_expires` DATETIME NULL COMMENT 'リセットトークン有効期限',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  INDEX `idx_email` (`email`),
  INDEX `idx_employee_id` (`employee_id`),
  INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザー情報テーブル';

-- ============================================
-- 2. 学生テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `students` (
  `student_id` VARCHAR(50) NOT NULL COMMENT '学生ID',
  `name` VARCHAR(255) NOT NULL COMMENT '学生名',
  `card_id` VARCHAR(255) NULL UNIQUE COMMENT 'ICカードID',
  `email` VARCHAR(255) NULL COMMENT 'メールアドレス',
  `phone` VARCHAR(20) NULL COMMENT '電話番号',
  `grade` VARCHAR(50) NULL COMMENT '学年',
  `class_name` VARCHAR(100) NULL COMMENT 'クラス名',
  `enrollment_date` DATE NULL COMMENT '入学日',
  `status` ENUM('active', 'inactive', 'graduated', 'suspended') DEFAULT 'active' COMMENT '学生の状態',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`student_id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生情報テーブル';

-- ============================================
-- 3. 従業員の出欠記録テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `user_attendance_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '記録ID',
  `user_id` INT NOT NULL COMMENT 'ユーザーID',
  `date` DATE NOT NULL COMMENT '出欠日',
  `status` ENUM('present', 'absent', 'late', 'early_departure') NOT NULL COMMENT '状態',
  `check_in_time` DATETIME NULL COMMENT '出勤時刻',
  `check_out_time` DATETIME NULL COMMENT '退勤時刻',
  `reason` TEXT NULL COMMENT '理由 (遅刻・早退・欠席など)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_date` (`user_id`, `date`),
  INDEX `idx_user_date` (`user_id`, `date`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='従業員の出欠記録テーブル';

-- ============================================
-- 4. 学生の出欠記録テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `student_attendance_records` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `student_id` VARCHAR(50) NOT NULL COMMENT '学生ID',
  `timestamp` DATETIME NOT NULL COMMENT '記録日時',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  INDEX `idx_student_timestamp` (`student_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生の出欠記録テーブル';

-- ============================================
-- 5. 科目テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '科目ID',
  `subject_code` VARCHAR(20) UNIQUE NOT NULL COMMENT '科目コード',
  `subject_name` VARCHAR(255) NOT NULL COMMENT '科目名',
  `description` TEXT NULL COMMENT '科目概要',
  `credits` INT DEFAULT 1 COMMENT '単位数',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  INDEX `idx_subject_code` (`subject_code`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目管理テーブル';

-- ============================================
-- 6. 授業テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '授業ID',
  `class_code` VARCHAR(50) UNIQUE NOT NULL COMMENT '授業コード',
  `subject_id` INT NOT NULL COMMENT '科目ID',
  `teacher_name` VARCHAR(255) NOT NULL COMMENT '担当教員名',
  `room` VARCHAR(100) NULL COMMENT '教室',
  `schedule_day` ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL COMMENT '曜日',
  `start_time` TIME NOT NULL COMMENT '開始時間',
  `end_time` TIME NOT NULL COMMENT '終了時間',
  `semester` VARCHAR(20) NULL COMMENT '学期',
  `academic_year` VARCHAR(10) NULL COMMENT '年度',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  INDEX `idx_class_code` (`class_code`),
  INDEX `idx_schedule` (`schedule_day`, `start_time`),
  INDEX `idx_semester_year` (`semester`, `academic_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授業管理テーブル';

-- ============================================
-- 7. 学生の科目登録テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '登録ID',
  `student_id` VARCHAR(50) NOT NULL COMMENT '学生ID',
  `class_id` INT NOT NULL COMMENT '授業ID',
  `enrollment_date` DATE NOT NULL COMMENT '登録日',
  `status` ENUM('enrolled', 'dropped', 'completed') DEFAULT 'enrolled' COMMENT '登録状態',
  `grade` VARCHAR(5) NULL COMMENT '成績',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_student_class` (`student_id`, `class_id`),
  INDEX `idx_student_enrollment` (`student_id`, `status`),
  INDEX `idx_class_enrollment` (`class_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生の科目登録テーブル';

-- ============================================
-- 8. 詳細な出欠記録テーブル（科目別）
-- ============================================
CREATE TABLE IF NOT EXISTS `detailed_attendance_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '記録ID',
  `student_id` VARCHAR(50) NOT NULL COMMENT '学生ID',
  `class_id` INT NOT NULL COMMENT '授業ID',
  `attendance_date` DATE NOT NULL COMMENT '出欠日',
  `status` ENUM('present', 'absent', 'late', 'excused') NOT NULL COMMENT '出欠状態',
  `check_in_time` DATETIME NULL COMMENT '出席時刻',
  `check_out_time` DATETIME NULL COMMENT '退席時刻',
  `notes` TEXT NULL COMMENT '備考',
  `created_by` INT NULL COMMENT '記録者ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_student_class_date` (`student_id`, `class_id`, `attendance_date`),
  INDEX `idx_student_attendance` (`student_id`, `attendance_date`),
  INDEX `idx_class_attendance` (`class_id`, `attendance_date`),
  INDEX `idx_attendance_date` (`attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='詳細な出欠記録テーブル（科目別）';

-- ============================================
-- 9. 通知テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '通知ID',
  `user_id` INT NULL COMMENT '通知対象のユーザーID',
  `student_id` VARCHAR(50) NULL COMMENT '通知対象の学生ID',
  `title` VARCHAR(255) NOT NULL COMMENT '通知タイトル',
  `message` TEXT NOT NULL COMMENT '通知メッセージ',
  `type` ENUM('attendance', 'grade', 'general', 'alert') NOT NULL COMMENT '通知タイプ',
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '優先度',
  `is_read` BOOLEAN DEFAULT FALSE COMMENT '既読フラグ',
  `read_at` TIMESTAMP NULL COMMENT '既読日時',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  INDEX `idx_user_notifications` (`user_id`, `is_read`),
  INDEX `idx_student_notifications` (`student_id`, `is_read`),
  INDEX `idx_type_priority` (`type`, `priority`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知テーブル';

-- ============================================
-- 10. システム設定テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '設定ID',
  `setting_key` VARCHAR(100) UNIQUE NOT NULL COMMENT '設定キー',
  `setting_value` TEXT NULL COMMENT '設定値',
  `setting_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '値の型',
  `description` TEXT NULL COMMENT '設定の説明',
  `is_public` BOOLEAN DEFAULT FALSE COMMENT 'クライアント側に公開可能か',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  INDEX `idx_setting_key` (`setting_key`),
  INDEX `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='システム設定テーブル';

-- ============================================
-- 11. イベントテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'イベントID',
  `title` VARCHAR(255) NOT NULL COMMENT 'イベント名',
  `description` TEXT NULL COMMENT '詳細',
  `start_date` DATETIME NOT NULL COMMENT '開始日時',
  `end_date` DATETIME NULL COMMENT '終了日時',
  `location` VARCHAR(255) NULL COMMENT '場所',
  `created_by` INT NOT NULL COMMENT '作成者ID',
  `is_public` BOOLEAN DEFAULT FALSE COMMENT '公開フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_start_date` (`start_date`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベント管理テーブル';

-- ============================================
-- 12. イベント参加者テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `event_participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '参加ID',
  `event_id` INT NOT NULL COMMENT 'イベントID',
  `user_id` INT NOT NULL COMMENT 'ユーザーID',
  `status` ENUM('pending', 'accepted', 'declined') DEFAULT 'pending' COMMENT '参加ステータス',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_event_participant` (`event_id`, `user_id`),
  INDEX `idx_event_status` (`event_id`, `status`),
  INDEX `idx_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベント参加者テーブル';

-- ============================================
-- 13. 監査ログテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ログID',
  `user_id` INT NULL COMMENT '操作したユーザーのID',
  `action` VARCHAR(100) NOT NULL COMMENT '操作種別',
  `table_name` VARCHAR(100) NOT NULL COMMENT '対象テーブル名',
  `record_id` VARCHAR(100) NULL COMMENT '対象レコードID',
  `old_values` JSON NULL COMMENT '変更前の値',
  `new_values` JSON NULL COMMENT '変更後の値',
  `ip_address` VARCHAR(45) NULL COMMENT 'IPアドレス',
  `user_agent` TEXT NULL COMMENT 'ユーザーエージェント',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作日時',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_user_action` (`user_id`, `action`),
  INDEX `idx_table_record` (`table_name`, `record_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='監査ログテーブル';

-- ============================================
-- サンプルデータ (初期管理者)
-- ============================================
INSERT INTO `users` (`name`, `email`, `password`, `employee_id`, `role`) 
VALUES ('管理者', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN001', 'admin')
ON DUPLICATE KEY UPDATE `email` = `email`;
