-- qr_codesテーブルにorganization_idカラムを追加する修正スクリプト
-- 実行日: 2026-01-27

-- すでにカラムが存在するかチェック（エラー回避）
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'qr_codes' 
    AND COLUMN_NAME = 'organization_id'
);

-- カラムが存在しない場合のみ追加
SET @query = IF(
  @col_exists = 0,
  'ALTER TABLE qr_codes ADD COLUMN organization_id INT NOT NULL DEFAULT 1 COMMENT \'所属組織ID\' AFTER is_active',
  'SELECT "organization_id column already exists" AS status'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 外部キー制約を追加（まだ存在しない場合）
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'qr_codes' 
    AND CONSTRAINT_NAME = 'fk_qr_codes_organization'
);

SET @query = IF(
  @fk_exists = 0,
  'ALTER TABLE qr_codes ADD CONSTRAINT fk_qr_codes_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE',
  'SELECT "fk_qr_codes_organization already exists" AS status'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- インデックスを追加
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'qr_codes' 
    AND INDEX_NAME = 'idx_organization_active'
);

SET @query = IF(
  @idx_exists = 0,
  'ALTER TABLE qr_codes ADD INDEX idx_organization_active (organization_id, is_active)',
  'SELECT "idx_organization_active already exists" AS status'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'qr_codes table migration completed successfully' AS status;
