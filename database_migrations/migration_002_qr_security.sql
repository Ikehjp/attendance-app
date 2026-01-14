-- ============================================
-- マイグレーション 002: QRコードとセキュリティ
-- 作成日: 2025-11-27
-- 説明: QRコード発行管理、許可IPアドレス範囲、スキャンログのテーブルを追加
-- ============================================

USE `sotsuken`;

-- ============================================
-- 1. QRコード発行管理テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `qr_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'QRコードID',
  `code` VARCHAR(255) UNIQUE NOT NULL COMMENT 'QRコード文字列',
  `location_name` VARCHAR(255) NOT NULL COMMENT '場所名（教室名、入口など）',
  `location_description` TEXT NULL COMMENT '場所の説明',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  `created_by` INT NOT NULL COMMENT '作成者ID（管理者）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  `expires_at` TIMESTAMP NULL COMMENT '有効期限',
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_code` (`code`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_location` (`location_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QRコード発行管理テーブル';

-- ============================================
-- 2. 許可IPアドレス範囲テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `allowed_ip_ranges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'IP範囲ID',
  `name` VARCHAR(255) NOT NULL COMMENT 'IP範囲名（学校Wi-Fi、本社ネットワークなど）',
  `ip_start` VARCHAR(45) NOT NULL COMMENT '開始IPアドレス（IPv4/IPv6対応）',
  `ip_end` VARCHAR(45) NOT NULL COMMENT '終了IPアドレス（IPv4/IPv6対応）',
  `description` TEXT NULL COMMENT '説明',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='許可IPアドレス範囲テーブル';

-- ============================================
-- 3. QRスキャンログテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS `scan_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'スキャンログID',
  `qr_code_id` INT NOT NULL COMMENT 'QRコードID',
  `student_id` VARCHAR(255) NOT NULL COMMENT '学生ID',
  `scanned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'スキャン日時',
  `ip_address` VARCHAR(45) NOT NULL COMMENT 'スキャン元IPアドレス',
  `is_allowed` BOOLEAN NOT NULL COMMENT 'IP許可フラグ',
  `user_agent` TEXT NULL COMMENT 'ユーザーエージェント',
  `result` ENUM('success', 'ip_denied', 'invalid_qr', 'error') NOT NULL COMMENT 'スキャン結果',
  `error_message` TEXT NULL COMMENT 'エラーメッセージ',
  FOREIGN KEY (`qr_code_id`) REFERENCES `qr_codes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE,
  INDEX `idx_qr_code` (`qr_code_id`),
  INDEX `idx_student` (`student_id`),
  INDEX `idx_scanned_at` (`scanned_at`),
  INDEX `idx_result` (`result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QRスキャンログテーブル';

-- ============================================
-- 4. デフォルトIP範囲の挿入（テスト用）
-- ============================================
-- 注意: 本番環境では実際の学校/会社のIPアドレス範囲に変更してください
INSERT INTO `allowed_ip_ranges` (`name`, `ip_start`, `ip_end`, `description`) 
VALUES 
  ('ローカルホスト（開発用）', '127.0.0.1', '127.0.0.1', '開発環境用のローカルホスト'),
  ('プライベートネットワーク（開発用）', '192.168.0.0', '192.168.255.255', '開発環境用のプライベートネットワーク')
ON DUPLICATE KEY UPDATE `name` = `name`;

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'マイグレーション 002: QRコードとセキュリティのテーブル作成完了' AS message;
