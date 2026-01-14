-- ============================================
-- マイグレーション 003: 時間割とスケジュール管理
-- 作成日: 2025-11-27
-- 説明: 時間割、授業セッション、時間割テンプレートのテーブルを追加
-- ============================================

USE `sotsuken`;

-- ============================================
-- 1. 時間割テーブル（年間スケジュール）
-- ============================================
CREATE TABLE IF NOT EXISTS `timetables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '時間割ID',
  `group_id` INT NOT NULL COMMENT 'グループID',
  `academic_year` VARCHAR(10) NOT NULL COMMENT '年度（例: 2024）',
  `semester` VARCHAR(20) NULL COMMENT '学期（前期、後期など）',
  `start_date` DATE NOT NULL COMMENT '開始日',
  `end_date` DATE NOT NULL COMMENT '終了日',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  INDEX `idx_group` (`group_id`),
  INDEX `idx_academic_year` (`academic_year`),
  INDEX `idx_semester` (`semester`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='時間割テーブル（年間スケジュール）';

-- ============================================
-- 2. 授業セッションテーブル（個別の授業回）
-- ============================================
CREATE TABLE IF NOT EXISTS `class_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '授業セッションID',
  `timetable_id` INT NOT NULL COMMENT '時間割ID',
  `subject_id` INT NOT NULL COMMENT '科目ID',
  `class_date` DATE NOT NULL COMMENT '授業日',
  `period_number` INT NOT NULL COMMENT '時限（1限、2限など）',
  `start_time` TIME NOT NULL COMMENT '開始時刻',
  `end_time` TIME NOT NULL COMMENT '終了時刻',
  `room` VARCHAR(100) NULL COMMENT '教室',
  `teacher_name` VARCHAR(255) NULL COMMENT '担当教員名',
  `is_cancelled` BOOLEAN DEFAULT FALSE COMMENT '休講フラグ',
  `cancellation_reason` TEXT NULL COMMENT '休講理由',
  `notes` TEXT NULL COMMENT '備考',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`timetable_id`) REFERENCES `timetables`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  INDEX `idx_timetable` (`timetable_id`),
  INDEX `idx_class_date` (`class_date`),
  INDEX `idx_period` (`period_number`),
  INDEX `idx_is_cancelled` (`is_cancelled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授業セッションテーブル（個別の授業回）';

-- ============================================
-- 3. 時間割テンプレートテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `schedule_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'テンプレートID',
  `name` VARCHAR(255) NOT NULL COMMENT 'テンプレート名',
  `description` TEXT NULL COMMENT '説明',
  `template_data` JSON NOT NULL COMMENT 'テンプレートデータ（JSON形式）',
  `created_by` INT NOT NULL COMMENT '作成者ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='時間割テンプレートテーブル';

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'マイグレーション 003: 時間割とスケジュール管理のテーブル作成完了' AS message;
