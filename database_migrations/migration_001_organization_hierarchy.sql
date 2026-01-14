-- ============================================
-- マイグレーション 001: 組織階層とグループ管理
-- 作成日: 2025-11-27
-- 説明: 組織情報、グループ（クラス）管理、メンバー紐付け、担当教員管理のテーブルを追加
-- ============================================

USE `sotsuken`;

-- ============================================
-- 1. 組織情報テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '組織ID',
  `name` VARCHAR(255) NOT NULL COMMENT '組織名（学校名/会社名）',
  `type` ENUM('school', 'company') NOT NULL COMMENT '組織種別',
  `address` TEXT NULL COMMENT '住所',
  `phone` VARCHAR(20) NULL COMMENT '電話番号',
  `email` VARCHAR(255) NULL COMMENT '代表メールアドレス',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織情報テーブル';

-- ============================================
-- 2. グループ（クラス）テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'グループID',
  `organization_id` INT NOT NULL COMMENT '組織ID',
  `name` VARCHAR(255) NOT NULL COMMENT 'グループ名（クラス名）',
  `grade` VARCHAR(50) NULL COMMENT '学年',
  `academic_year` VARCHAR(10) NULL COMMENT '年度',
  `description` TEXT NULL COMMENT '説明',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  INDEX `idx_organization` (`organization_id`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_academic_year` (`academic_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループ（クラス）管理テーブル';

-- ============================================
-- 3. グループメンバー（学生所属）テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `group_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'メンバーID',
  `group_id` INT NOT NULL COMMENT 'グループID',
  `student_id` VARCHAR(255) NOT NULL COMMENT '学生ID',
  `joined_at` DATE NOT NULL COMMENT '参加日',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT 'ステータス',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_group_student` (`group_id`, `student_id`),
  INDEX `idx_group` (`group_id`),
  INDEX `idx_student` (`student_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループメンバー（学生所属）テーブル';

-- ============================================
-- 4. グループ担当教員テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `group_teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '担当ID',
  `group_id` INT NOT NULL COMMENT 'グループID',
  `user_id` INT NOT NULL COMMENT 'ユーザーID（教員）',
  `role` ENUM('main', 'assistant') DEFAULT 'main' COMMENT '担当種別（主担当/副担当）',
  `assigned_at` DATE NOT NULL COMMENT '割り当て日',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_group_teacher` (`group_id`, `user_id`),
  INDEX `idx_group` (`group_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループ担当教員テーブル';

-- ============================================
-- 5. 既存 users テーブルの role カラムを拡張
-- ============================================
-- 'teacher' ロールを追加（employee, admin, teacher の3種類）
ALTER TABLE `users` 
  MODIFY COLUMN `role` ENUM('employee', 'admin', 'teacher') NOT NULL DEFAULT 'employee' COMMENT '役割 (employee, admin, teacher)';

-- ============================================
-- 6. デフォルト組織データの挿入
-- ============================================
INSERT INTO `organizations` (`name`, `type`, `address`) 
VALUES ('サンプル学校', 'school', '東京都渋谷区')
ON DUPLICATE KEY UPDATE `name` = `name`;

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'マイグレーション 001: 組織階層とグループ管理のテーブル作成完了' AS message;
