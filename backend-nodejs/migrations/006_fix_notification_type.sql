-- 通知テーブルのtype列をVARCHARに変更（ENUM制限を解除）
ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) DEFAULT 'general';
