-- ロールバック用スクリプト: qr_codesテーブルからorganization_id削除
-- 作成日: 2026-01-27
-- 説明: マイグレーション007のロールバック

SET FOREIGN_KEY_CHECKS = 0;

-- インデックスを削除
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'qr_codes' 
    AND INDEX_NAME = 'idx_organization_active'
);

SET @query = IF(
  @idx_exists > 0,
  'ALTER TABLE qr_codes DROP INDEX idx_organization_active',
  'SELECT "idx_organization_active does not exist" AS status'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 外部キー制約を削除
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'qr_codes' 
    AND CONSTRAINT_NAME = 'fk_qr_codes_organization'
);

SET @query = IF(
  @fk_exists > 0,
  'ALTER TABLE qr_codes DROP FOREIGN KEY fk_qr_codes_organization',
  'SELECT "fk_qr_codes_organization does not exist" AS status'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- カラムを削除
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'qr_codes' 
    AND COLUMN_NAME = 'organization_id'
);

SET @query = IF(
  @col_exists > 0,
  'ALTER TABLE qr_codes DROP COLUMN organization_id',
  'SELECT "organization_id column does not exist" AS status'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ロールバック完了
SELECT 'Rollback 007: qr_codes organization_id removed successfully' AS status;
