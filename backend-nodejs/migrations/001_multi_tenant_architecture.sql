-- マルチテナントアーキテクチャ移行スクリプト
-- 作成日: 2025-12-03
-- 説明: 組織ベースのデータアイソレーションと招待システムの実装

SET FOREIGN_KEY_CHECKS = 0;

-- ================================
-- 1. Organizations テーブルの拡張
-- ================================
ALTER TABLE organizations
ADD COLUMN owner_id INT DEFAULT NULL COMMENT '組織オーナーのユーザーID',
ADD COLUMN subdomain VARCHAR(100) UNIQUE DEFAULT NULL COMMENT 'サブドメイン（将来のマルチドメイン対応用）',
ADD COLUMN settings JSON DEFAULT NULL COMMENT '組織固有の設定（タイムゾーン、言語等）',
ADD COLUMN is_active TINYINT(1) DEFAULT 1 COMMENT '組織の有効/無効状態',
ADD COLUMN subscription_plan VARCHAR(50) DEFAULT 'free' COMMENT 'サブスクリプションプラン',
ADD COLUMN max_users INT DEFAULT 50 COMMENT '最大ユーザー数制限';

-- インデックス追加
ALTER TABLE organizations
ADD INDEX idx_subdomain (subdomain),
ADD INDEX idx_is_active (is_active);

-- ================================
-- 2. Users テーブルの再構築
-- ================================

-- 既存ユーザーと関連データを削除（既存データ不要のため）
DELETE FROM user_attendance_records;
DELETE FROM audit_logs;
DELETE FROM users;

-- users テーブルに organization_id を追加
ALTER TABLE users
ADD COLUMN organization_id INT NOT NULL COMMENT '所属組織ID',
DROP COLUMN employee_id,  -- 不要なカラムを削除
DROP COLUMN department,   -- 組織情報に統合
MODIFY COLUMN role ENUM('owner', 'teacher', 'student') NOT NULL DEFAULT 'student' COMMENT 'ユーザーロール',
ADD CONSTRAINT fk_users_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- owner_id の外部キー制約を追加（循環参照だが削除時の処理は SET NULL で安全）
ALTER TABLE organizations
ADD CONSTRAINT fk_organizations_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- インデックス追加
ALTER TABLE users
ADD INDEX idx_organization_role (organization_id, role),
ADD INDEX idx_organization_email (organization_id, email);

-- ================================
-- 3. Groups テーブルの拡張
-- ================================
ALTER TABLE `groups`
ADD COLUMN organization_id INT NOT NULL COMMENT '所属組織ID',
ADD CONSTRAINT fk_groups_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE `groups`
ADD INDEX idx_organization_active (organization_id, is_active);

-- ================================
-- 4. QR Codes テーブルの拡張
-- ================================
ALTER TABLE qr_codes
ADD COLUMN organization_id INT NOT NULL COMMENT '所属組織ID',
ADD CONSTRAINT fk_qr_codes_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE qr_codes
ADD INDEX idx_organization_active (organization_id, is_active);

-- ================================
-- 5. Class Sessions テーブルの拡張
-- ================================
ALTER TABLE class_sessions
ADD COLUMN organization_id INT NOT NULL COMMENT '所属組織ID',
ADD CONSTRAINT fk_class_sessions_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE class_sessions
ADD INDEX idx_organization_date (organization_id, class_date);

-- ================================
-- 6. Timetables テーブルの拡張
-- ================================
ALTER TABLE timetables
ADD COLUMN organization_id INT NOT NULL COMMENT '所属組織ID',
ADD CONSTRAINT fk_timetables_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE timetables
ADD INDEX idx_organization_year (organization_id, academic_year);

-- ================================
-- 7. 招待システム用テーブル作成
-- ================================
CREATE TABLE IF NOT EXISTS invitations (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '招待ID',
  organization_id INT NOT NULL COMMENT '招待先組織ID',
  email VARCHAR(255) NOT NULL COMMENT '招待対象のメールアドレス',
  role ENUM('teacher', 'student') NOT NULL COMMENT '招待ロール',
  token VARCHAR(255) UNIQUE NOT NULL COMMENT '招待トークン',
  invited_by INT NOT NULL COMMENT '招待者のユーザーID',
  expires_at TIMESTAMP NOT NULL COMMENT '有効期限',
  accepted_at TIMESTAMP NULL DEFAULT NULL COMMENT '受諾日時',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_token (token),
  INDEX idx_expires (expires_at),
  INDEX idx_email_org (email, organization_id),
  INDEX idx_organization_status (organization_id, accepted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招待管理テーブル';

-- ================================
-- 8. 組織アクティビティログテーブル作成
-- ================================
CREATE TABLE IF NOT EXISTS organization_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ログID',
  organization_id INT NOT NULL COMMENT '組織ID',
  user_id INT DEFAULT NULL COMMENT '実行ユーザーID',
  action VARCHAR(100) NOT NULL COMMENT 'アクション（invite_sent, user_added等）',
  details JSON DEFAULT NULL COMMENT '詳細情報',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IPアドレス',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '実行日時',
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_organization_action (organization_id, action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織アクティビティログ';

-- ================================
-- 9. 初期データの投入
-- ================================

-- デフォルト組織を作成（テスト用）
INSERT INTO organizations (id, name, type, is_active, subscription_plan, max_users, created_at) 
VALUES (1, 'デフォルト組織', 'school', 1, 'free', 50, NOW())
ON DUPLICATE KEY UPDATE name = name;

-- オーナーアカウントを作成
-- パスワード: admin123 (bcrypt hash)
INSERT INTO users (name, email, password, role, organization_id, created_at)
VALUES (
  '管理者',
  'admin@example.com',
  '$2b$10$rOzJd8JvXVZ5H0QhJ0YQCeZKZz1YqP8vQ4vR8wP5fJ3yQ2vX9qK.O',
  'owner',
  1,
  NOW()
);

-- 組織のオーナーIDを設定
UPDATE organizations SET owner_id = LAST_INSERT_ID() WHERE id = 1;

-- ================================
-- 10. 既存のデータ整合性チェック用ビュー
-- ================================
CREATE OR REPLACE VIEW v_organization_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.type,
  o.is_active,
  o.subscription_plan,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.role = 'owner' THEN u.id END) as owners,
  COUNT(DISTINCT CASE WHEN u.role = 'teacher' THEN u.id END) as teachers,
  COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as students,
  COUNT(DISTINCT g.id) as total_groups,
  o.created_at
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN `groups` g ON g.organization_id = o.id
GROUP BY o.id;

SET FOREIGN_KEY_CHECKS = 1;

-- マイグレーション完了
SELECT 'マルチテナントアーキテクチャへの移行が完了しました' as status;
