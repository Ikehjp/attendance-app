-- Migration: 004_fix_role_column.sql
-- Description: usersテーブルのroleカラムにstudentを追加
-- Original: fix-role-column.js

ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'employee', 'teacher', 'student', 'owner') 
DEFAULT 'employee';
