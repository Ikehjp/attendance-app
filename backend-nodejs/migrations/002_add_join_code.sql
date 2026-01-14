-- 生徒用参加コードの追加
ALTER TABLE organizations
ADD COLUMN student_join_code VARCHAR(20) UNIQUE DEFAULT NULL COMMENT '生徒用参加コード';

-- 既存の組織（デフォルト組織）にコードを割り当て
UPDATE organizations SET student_join_code = 'SCHOOL-001' WHERE id = 1;
