-- ============================================
-- 出欠管理システム - 完全なデータベーススキーマ
-- データベース名: sotsuken
-- ============================================

-- データベースが存在しない場合に作成
CREATE DATABASE IF NOT EXISTS `sotsuken` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sotsuken`;

-- ============================================
-- 1. ユーザーテーブル (従業員・管理者)
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ユーザーID',
  `name` VARCHAR(255) NOT NULL COMMENT '氏名',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'メールアドレス',
  `password` VARCHAR(255) NOT NULL COMMENT 'ハッシュ化されたパスワード',
  `employee_id` VARCHAR(50) UNIQUE NOT NULL COMMENT '社員ID',
  `department` VARCHAR(100) COMMENT '部署',
  `role` ENUM('employee', 'admin') NOT NULL DEFAULT 'employee' COMMENT '役割 (employee or admin)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  INDEX `idx_email` (`email`),
  INDEX `idx_employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザー情報テーブル';

-- ============================================
-- 2. 学生テーブル（拡張版）
-- ============================================
CREATE TABLE IF NOT EXISTS `students` (
  `student_id` VARCHAR(255) NOT NULL COMMENT '学生ID (学籍番号など)',
  `name` VARCHAR(255) NOT NULL COMMENT '学生名',
  `card_id` VARCHAR(255) NULL UNIQUE COMMENT 'ICカードIDなど',
  `email` VARCHAR(255) NULL COMMENT 'メールアドレス',
  `phone` VARCHAR(20) NULL COMMENT '電話番号',
  `grade` VARCHAR(50) NULL COMMENT '学年',
  `class_name` VARCHAR(100) NULL COMMENT 'クラス名',
  `enrollment_date` DATE NULL COMMENT '入学日',
  `status` ENUM('active', 'inactive', 'graduated', 'suspended') DEFAULT 'active' COMMENT '学生の状態',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `card_id_UNIQUE` (`card_id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`),
  INDEX `idx_grade_class` (`grade`, `class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生情報テーブル（拡張版）';

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
-- 4. 学生の出欠記録テーブル（シンプル版）
-- ============================================
CREATE TABLE IF NOT EXISTS `student_attendance_records` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `student_id` VARCHAR(255) NOT NULL COMMENT '学生ID',
  `timestamp` DATETIME NOT NULL COMMENT '記録日時',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  INDEX `idx_student_timestamp` (`student_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生の出欠記録テーブル（シンプル版）';

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
  `student_id` VARCHAR(255) NOT NULL COMMENT '学生ID',
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
  `student_id` VARCHAR(255) NOT NULL COMMENT '学生ID',
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
  `student_id` VARCHAR(255) NULL COMMENT '通知対象の学生ID',
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
-- 11. 監査ログテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ログID',
  `user_id` INT NULL COMMENT '操作したユーザーのID (システムによる操作はNULL)',
  `action` VARCHAR(100) NOT NULL COMMENT '操作種別 (CREATE, UPDATE, DELETE, LOGINなど)',
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
-- サンプルデータの挿入（オプション）
-- ============================================

-- 管理者ユーザーの作成
INSERT INTO `users` (`name`, `email`, `password`, `employee_id`, `department`, `role`) 
VALUES ('管理者', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN001', '管理部', 'admin');

-- 一般ユーザーの作成
INSERT INTO `users` (`name`, `email`, `password`, `employee_id`, `department`, `role`) 
VALUES ('田中太郎', 'tanaka@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'EMP001', '開発部', 'employee');

-- サンプル学生の作成
INSERT INTO `students` (`student_id`, `name`, `card_id`, `email`, `phone`, `grade`, `class_name`, `enrollment_date`) VALUES
('STU001', '山田太郎', 'CARD001', 'yamada@example.com', '090-1234-5678', '1年', 'A組', '2024-04-01'),
('STU002', '佐藤花子', 'CARD002', 'sato@example.com', '090-2345-6789', '1年', 'A組', '2024-04-01'),
('STU003', '鈴木一郎', 'CARD003', 'suzuki@example.com', '090-3456-7890', '2年', 'B組', '2023-04-01'),
('STU004', '高橋美咲', NULL, 'takahashi@example.com', '090-4567-8901', '2年', 'B組', '2023-04-01'),
('STU005', '田中健太', 'CARD005', 'tanaka@example.com', '090-5678-9012', '3年', 'C組', '2022-04-01');

-- サンプル科目の作成
INSERT INTO `subjects` (`subject_code`, `subject_name`, `description`, `credits`) VALUES
('MATH101', '数学基礎', '基礎的な数学の概念を学ぶ', 3),
('ENG101', '英語基礎', '英語の基礎文法と語彙', 2),
('SCI101', '科学基礎', '物理・化学・生物の基礎', 3),
('HIST101', '歴史', '日本史と世界史', 2),
('PE101', '体育', '身体を動かす授業', 1);

-- サンプル授業の作成
INSERT INTO `classes` (`class_code`, `subject_id`, `teacher_name`, `room`, `schedule_day`, `start_time`, `end_time`, `semester`, `academic_year`) VALUES
('MATH101-A', 1, '田中先生', '101教室', 'monday', '09:00:00', '10:30:00', '前期', '2024'),
('ENG101-A', 2, '佐藤先生', '102教室', 'tuesday', '10:40:00', '12:10:00', '前期', '2024'),
('SCI101-A', 3, '鈴木先生', '実験室', 'wednesday', '13:00:00', '14:30:00', '前期', '2024'),
('HIST101-A', 4, '高橋先生', '103教室', 'thursday', '14:40:00', '16:10:00', '前期', '2024'),
('PE101-A', 5, '山田先生', '体育館', 'friday', '09:00:00', '10:30:00', '前期', '2024');

-- サンプル登録の作成
INSERT INTO `enrollments` (`student_id`, `class_id`, `enrollment_date`) VALUES
('STU001', 1, '2024-04-01'),
('STU001', 2, '2024-04-01'),
('STU002', 1, '2024-04-01'),
('STU002', 3, '2024-04-01'),
('STU003', 2, '2024-04-01'),
('STU003', 4, '2024-04-01'),
('STU004', 1, '2024-04-01'),
('STU004', 5, '2024-04-01'),
('STU005', 3, '2024-04-01'),
('STU005', 4, '2024-04-01');

-- デフォルトシステム設定の挿入
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `is_public`) VALUES
('school_name', 'サンプル学校', 'string', '学校名', TRUE),
('attendance_threshold', '80', 'number', '出欠率の閾値（%）', FALSE),
('late_threshold_minutes', '15', 'number', '遅刻とみなす時間（分）', FALSE),
('auto_attendance_reminder', 'true', 'boolean', '出欠記録の自動リマインダー', FALSE),
('notification_enabled', 'true', 'boolean', '通知機能の有効/無効', FALSE);

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'データベーススキーマとサンプルデータの作成が完了しました！' AS message;
SELECT '管理者ログイン: admin@example.com / password123' AS admin_login;
SELECT '一般ユーザーログイン: tanaka@example.com / password123' AS user_login;
