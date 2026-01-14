-- Migration: 005_fix_request_type.sql
-- Description: absence_requestsテーブルのrequest_typeカラムをVARCHAR(50)に変更
-- Original: fix_request_type_v2.js

ALTER TABLE absence_requests 
MODIFY COLUMN request_type VARCHAR(50) NOT NULL COMMENT '申請種別';
