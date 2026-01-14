-- ============================================
-- マイグレーション 004: 欠席申請と承認フロー
-- 作成日: 2025-11-27
-- 説明: 欠席届・遅刻届の申請管理と承認フローのテーブルを追加
-- ============================================

USE `sotsuken`;

-- ============================================
-- 1. 欠席・遅刻届申請テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `absence_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '申請ID',
  `student_id` VARCHAR(255) NOT NULL COMMENT '学生ID',
  `class_session_id` INT NULL COMMENT '授業セッションID（特定授業の場合）',
  `request_type` ENUM('absence', 'official_absence', 'official_late', 'early_departure') NOT NULL COMMENT '申請種別',
  `request_date` DATE NOT NULL COMMENT '申請対象日',
  `reason` TEXT NOT NULL COMMENT '理由',
  `attachment_url` VARCHAR(500) NULL COMMENT '添付ファイルURL',
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'ステータス',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提出日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_session_id`) REFERENCES `class_sessions`(`id`) ON DELETE SET NULL,
  INDEX `idx_student` (`student_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_request_date` (`request_date`),
  INDEX `idx_request_type` (`request_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='欠席・遅刻届申請テーブル';

-- ============================================
-- 2. 承認管理テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `request_approvals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '承認ID',
  `request_id` INT NOT NULL COMMENT '申請ID',
  `approver_id` INT NOT NULL COMMENT '承認者ID（教員または管理者）',
  `action` ENUM('approve', 'reject') NOT NULL COMMENT '承認アクション',
  `comment` TEXT NULL COMMENT 'コメント',
  `approved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '承認日時',
  FOREIGN KEY (`request_id`) REFERENCES `absence_requests`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_request` (`request_id`),
  INDEX `idx_approver` (`approver_id`),
  INDEX `idx_approved_at` (`approved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='承認管理テーブル';

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'マイグレーション 004: 欠席申請と承認フローのテーブル作成完了' AS message;
