-- Migration: 003_fix_user_table.sql
-- Description: usersテーブルのemployee_idとstudent_idをNULL許可に変更
-- Original: fix-user-table.js

ALTER TABLE users MODIFY COLUMN employee_id VARCHAR(50) NULL;
ALTER TABLE users MODIFY COLUMN student_id VARCHAR(255) NULL;
