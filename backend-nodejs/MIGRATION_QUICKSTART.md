# データベースマイグレーション クイックスタート

このドキュメントでは、マイグレーションシステムの最も一般的な使い方を説明します。

詳細は [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) を参照してください。

## セットアップ

### 1. データベース接続設定

`.env` ファイルを作成してデータベース接続情報を設定：

```bash
cp env.example .env
```

`.env` を編集：

```env
DB_HOST=localhost
DB_NAME=sotsuken
DB_USER=server
DB_PASS=pass
DB_PORT=3306
```

### 2. マイグレーション管理テーブルの初期化

初回のみ実行（マイグレーション実行時に自動作成されます）：

```powershell
npm run migrate:status
```

## 基本的な使い方

### マイグレーションのステータス確認

```powershell
npm run migrate:status
```

出力例:
```
📋 マイグレーションステータス

ステータス | ファイル名 | 実行日時
---------|---------|----------
✅ 実行済み | 001_multi_tenant_architecture.sql | 2026/01/13 10:00:00
✅ 実行済み | 002_add_join_code.sql | 2026/01/13 10:00:01
⏳ 未実行   | 003_new_feature.sql | -

合計: 3個 (実行済み: 2, 未実行: 1)
```

### 未実行のマイグレーションを実行

```powershell
npm run migrate
```

すべての未実行マイグレーションが順番に実行されます。

### 新しいマイグレーションを作成

```powershell
npm run migrate:create ユーザーに電話番号追加
```

`migrations/` ディレクトリに新しいファイルが作成されます：
```
migrations/20260113_110000_ユーザーに電話番号追加.js
```

作成されたファイルを編集してマイグレーション内容を記述します。

### ロールバック（元に戻す）

```powershell
npm run migrate:rollback
```

最後に実行したマイグレーションを取り消します。

## マイグレーションファイルの編集

作成されたマイグレーションファイルを開いて、`up()` と `down()` 関数を実装します：

```javascript
/**
 * マイグレーション: ユーザーに電話番号追加
 */

async function up({ query, transaction }) {
  // 適用処理
  await query(`
    ALTER TABLE users 
    ADD COLUMN phone VARCHAR(20) NULL
  `);
}

async function down({ query, transaction }) {
  // ロールバック処理
  await query(`
    ALTER TABLE users 
    DROP COLUMN phone
  `);
}

module.exports = { up, down };
```

ファイルを保存したら、マイグレーションを実行：

```powershell
npm run migrate
```

## よくある操作

### テーブルを新規作成

```javascript
async function up({ query }) {
  await query(`
    CREATE TABLE events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function down({ query }) {
  await query(`DROP TABLE IF EXISTS events`);
}
```

### カラムを追加

```javascript
async function up({ query }) {
  await query(`
    ALTER TABLE students 
    ADD COLUMN grade VARCHAR(50) NULL
  `);
}

async function down({ query }) {
  await query(`ALTER TABLE students DROP COLUMN grade`);
}
```

### インデックスを追加

```javascript
async function up({ query }) {
  await query(`
    CREATE INDEX idx_students_email ON students(email)
  `);
}

async function down({ query }) {
  await query(`DROP INDEX idx_students_email ON students`);
}
```

### 外部キーを追加

```javascript
async function up({ query }) {
  await query(`
    ALTER TABLE enrollments
    ADD CONSTRAINT fk_enrollments_student 
    FOREIGN KEY (student_id) 
    REFERENCES students(student_id) 
    ON DELETE CASCADE
  `);
}

async function down({ query }) {
  await query(`
    ALTER TABLE enrollments 
    DROP FOREIGN KEY fk_enrollments_student
  `);
}
```

## トラブルシューティング

### マイグレーションが失敗した場合

1. エラーメッセージを確認
2. マイグレーションファイルのSQL文を修正
3. 失敗した記録を削除（開発環境のみ）:
   ```sql
   DELETE FROM schema_migrations WHERE version = '失敗したバージョン';
   ```
4. 再度実行: `npm run migrate`

### すべてのマイグレーションを再実行したい場合（開発環境のみ）

⚠️ **これは開発環境でのみ実行してください！データが失われます！**

```sql
-- データベースをリセット
DROP DATABASE sotsuken;
CREATE DATABASE sotsuken CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

その後、マイグレーションを実行：
```powershell
npm run migrate
```

## 次のステップ

- [完全なマイグレーションガイド](./MIGRATION_GUIDE.md)を読む
- [ベストプラクティス](./MIGRATION_GUIDE.md#マイグレーションのベストプラクティス)を確認
- [サンプルマイグレーション](./MIGRATION_GUIDE.md#マイグレーション例)を参考にする

## サポート

問題が発生した場合は、開発チームに連絡してください。
