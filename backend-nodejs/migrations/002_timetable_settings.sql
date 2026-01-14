-- 時間割設定機能のためのマイグレーション
-- 実行日: 2025-12-11

-- 1. organizations テーブルへのカラム追加
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS late_limit_minutes INT DEFAULT 15 COMMENT '遅刻許容時間(分)',
ADD COLUMN IF NOT EXISTS date_reset_time TIME DEFAULT '04:00:00' COMMENT '日付変更基準時間';

-- 2. organization_time_slots テーブルの作成（組織ごとの時限マスタ）
CREATE TABLE IF NOT EXISTS organization_time_slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  period_number INT NOT NULL COMMENT '時限番号 (1, 2...)',
  period_name VARCHAR(50) NULL COMMENT '時限名称（1限、2限など）',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_org_period (organization_id, period_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織ごとの時限マスタ';

-- 3. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_time_slots_org ON organization_time_slots(organization_id);
