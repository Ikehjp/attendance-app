-- ======================================
-- グループ機能強化: データベーススキーマ変更
-- ======================================

-- 1. グループアイコンカラムの追加
ALTER TABLE `groups` 
ADD COLUMN `icon` VARCHAR(255) NULL 
COMMENT 'グループアイコン（絵文字またはURL）' 
AFTER `name`;

-- 2. メンバーステータスの定義拡張
-- 既存のステータス（pending, accepted, declined）に加えて、
-- active, inactive, rejected を追加
ALTER TABLE `group_members` 
MODIFY COLUMN `status` ENUM('pending', 'accepted', 'declined', 'active', 'inactive', 'rejected') 
NOT NULL DEFAULT 'pending' 
COMMENT 'メンバーのステータス: pending=招待中, accepted/active=参加済, declined/rejected=辞退';

-- 変更確認用クエリ
-- DESCRIBE `groups`;
-- DESCRIBE `group_members`;
