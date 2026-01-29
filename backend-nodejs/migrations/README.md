# データベースマイグレーション

## 概要

このディレクトリには、データベーススキーマの変更を管理するマイグレーションファイルが含まれています。

## マイグレーション一覧

| # | ファイル名 | 説明 | 作成日 |
|---|-----------|------|--------|
| 001 | `001_multi_tenant_architecture.sql` | マルチテナントアーキテクチャ導入 | 2025-12-03 |
| 002 | `002_add_join_code.sql` | グループ参加コード追加 | - |
| 002 | `002_timetable_settings.sql` | タイムテーブル設定 | - |
| 003 | `003_fix_user_table.sql` | ユーザーテーブル修正 | - |
| 004 | `004_fix_role_column.sql` | ロールカラム修正 | - |
| 005 | `005_fix_request_type.sql` | リクエストタイプ修正 | - |
| 006 | `006_fix_notification_type.sql` | 通知タイプ修正 | - |
| 007 | `007_add_qr_codes_organization.sql` | QRコードに組織ID追加 | 2026-01-27 |
| 100 | `100_refactored_schema.sql` | リファクタリングされたスキーマ | - |
| 101 | `101_data_migration.sql` | データマイグレーション | - |
| 102 | `102_rename_tables.sql` | テーブル名変更 | - |

## マイグレーション実行方法

### 手動実行

```bash
# MySQL CLIを使用
mysql -u root -p attendance_system < migrations/007_add_qr_codes_organization.sql

# Node.jsスクリプトを使用
node migrations/run_migration.js 007
```

### ロールバック

```bash
# ロールバックスクリプトを実行
mysql -u root -p attendance_system < migrations/007_rollback_qr_codes_organization.sql
```

## 最新のマイグレーション

### 007_add_qr_codes_organization.sql

**目的**: QRコード生成時のエラー修正

**変更内容**:
- `qr_codes`テーブルに`organization_id`カラムを追加
- 外部キー制約を追加（`organizations`テーブル参照）
- インデックスを追加（`organization_id`, `is_active`）

**実行状態**: ✅ 実行済み（2026-01-27）

**問題解決**:
```
Error: Unknown column 'organization_id' in 'field list'
```

## 注意事項

1. **マイグレーションの順序**: ファイル番号順に実行する必要があります
2. **冪等性**: 各マイグレーションは複数回実行しても安全です（既存チェック付き）
3. **バックアップ**: 本番環境での実行前に必ずバックアップを取得してください
4. **ロールバック**: 各マイグレーションにはロールバックスクリプトがあります

## トラブルシューティング

### エラー: "table already exists"
→ 既に実行済みです。問題ありません。

### エラー: "Unknown database"
→ データベースを先に作成してください: `CREATE DATABASE attendance_system;`

### エラー: "Access denied"
→ データベースユーザーの権限を確認してください
