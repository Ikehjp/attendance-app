# データベースマイグレーション ガイド

## 概要

このプロジェクトでは、データベーススキーマの変更を安全に管理するためのマイグレーションシステムを使用しています。

## マイグレーションコマンド

### 1. マイグレーションのステータス確認

```powershell
npm run migrate:status
```

すべてのマイグレーションファイルと実行状態を表示します。

### 2. 未実行のマイグレーションを実行

```powershell
npm run migrate
```

未実行のマイグレーションを順番にすべて実行します。

### 3. 新しいマイグレーションファイルの作成

```powershell
npm run migrate:create テーブル名_カラム追加
```

例:
```powershell
npm run migrate:create users_add_phone_number
npm run migrate:create add_indexes_to_attendance
```

これにより、`migrations/`ディレクトリに新しいマイグレーションファイルが作成されます。

### 4. 最後のマイグレーションをロールバック

```powershell
npm run migrate:rollback
```

最後に実行されたマイグレーションを取り消します（JSマイグレーションのみ）。

## マイグレーションファイルの作成

### SQLマイグレーション（シンプル）

SQLファイルを直接 `migrations/` ディレクトリに作成します：

```sql
-- migrations/001_add_column.sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;
CREATE INDEX idx_phone ON users(phone);
```

### JSマイグレーション（推奨）

`npm run migrate:create` で作成されたファイルを編集します：

```javascript
/**
 * マイグレーション: ユーザーテーブルに電話番号カラムを追加
 */

async function up({ query, transaction }) {
  // マイグレーション適用処理
  await query(`
    ALTER TABLE users 
    ADD COLUMN phone VARCHAR(20) NULL,
    ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE
  `);
  
  await query(`
    CREATE INDEX idx_users_phone ON users(phone)
  `);
}

async function down({ query, transaction }) {
  // ロールバック処理
  await query(`DROP INDEX idx_users_phone ON users`);
  await query(`ALTER TABLE users DROP COLUMN phone, DROP COLUMN phone_verified`);
}

module.exports = { up, down };
```

### トランザクションを使用したマイグレーション

```javascript
async function up({ query, transaction }) {
  await transaction(async (conn) => {
    // すべての処理が成功するか、すべて失敗する
    await query(`
      CREATE TABLE new_table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);
    
    await query(`
      INSERT INTO new_table (name) 
      SELECT DISTINCT name FROM old_table
    `);
  });
}
```

## マイグレーションのベストプラクティス

### ✅ 推奨

1. **小さな変更に分割**
   - 1つのマイグレーションには1つの目的を持たせる
   - 複数のテーブル変更は別々のマイグレーションに分ける

2. **命名規則を守る**
   ```
   YYYYMMDD_HHMMSS_わかりやすい説明.js
   ```

3. **必ずdown()関数を実装**
   - ロールバック可能にする
   - テスト環境で確認する

4. **データを失わないようにする**
   - カラム削除前にデータをバックアップ
   - `DROP COLUMN` の前に `ALTER COLUMN ... NULL` で確認

5. **インデックスを忘れずに**
   - 外部キーにはインデックスを追加
   - よく検索されるカラムにもインデックスを追加

### ❌ 避けるべきこと

1. **実行済みマイグレーションの編集**
   - 既に実行されたファイルは編集しない
   - 新しいマイグレーションを作成する

2. **本番環境で直接SQL実行**
   - 必ずマイグレーションスクリプトを通す

3. **トランザクションなしでの重要な変更**
   - データ移行時は必ずトランザクションを使用

## マイグレーションの実行順序

マイグレーションファイルはファイル名の昇順で実行されます：

```
001_multi_tenant_architecture.sql
002_add_join_code.sql
002_timetable_settings.sql
003_fix_user_table.sql
...
```

## トラブルシューティング

### マイグレーションが失敗した場合

1. エラーメッセージを確認
2. データベースの状態を確認
3. 必要に応じて手動でロールバック
4. マイグレーション記録を削除:
   ```sql
   DELETE FROM schema_migrations WHERE version = '失敗したバージョン';
   ```

### マイグレーション記録をリセット

⚠️ **開発環境のみ**

```sql
TRUNCATE TABLE schema_migrations;
```

その後、再度マイグレーション実行：
```powershell
npm run migrate
```

## マイグレーション例

### 例1: 新しいテーブルの作成

```javascript
// migrations/20260113_120000_create_events_table.js
async function up({ query }) {
  await query(`
    CREATE TABLE events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_start_date (start_date),
      INDEX idx_end_date (end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function down({ query }) {
  await query(`DROP TABLE IF EXISTS events`);
}

module.exports = { up, down };
```

### 例2: カラムの追加とデータ移行

```javascript
// migrations/20260113_130000_add_status_to_students.js
async function up({ query, transaction }) {
  await transaction(async () => {
    // カラムを追加
    await query(`
      ALTER TABLE students 
      ADD COLUMN status ENUM('active', 'inactive', 'graduated') DEFAULT 'active'
    `);
    
    // 既存データを更新
    await query(`
      UPDATE students 
      SET status = 'active' 
      WHERE status IS NULL
    `);
    
    // NOT NULL制約を追加
    await query(`
      ALTER TABLE students 
      MODIFY status ENUM('active', 'inactive', 'graduated') NOT NULL
    `);
  });
}

async function down({ query }) {
  await query(`ALTER TABLE students DROP COLUMN status`);
}

module.exports = { up, down };
```

### 例3: インデックスの追加

```javascript
// migrations/20260113_140000_add_indexes_for_performance.js
async function up({ query }) {
  await query(`CREATE INDEX idx_attendance_student_date ON student_attendance_records(student_id, timestamp)`);
  await query(`CREATE INDEX idx_users_email ON users(email)`);
  await query(`CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at)`);
}

async function down({ query }) {
  await query(`DROP INDEX idx_attendance_student_date ON student_attendance_records`);
  await query(`DROP INDEX idx_users_email ON users`);
  await query(`DROP INDEX idx_notifications_unread ON notifications`);
}

module.exports = { up, down };
```

## 参考資料

- [MySQL ALTER TABLE](https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- [MySQL CREATE INDEX](https://dev.mysql.com/doc/refman/8.0/en/create-index.html)
- [MySQL FOREIGN KEY](https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html)

## サポート

問題がある場合は、開発チームに連絡してください。
