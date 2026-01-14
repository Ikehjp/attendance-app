# データベース接続エラー分析レポート

## 🔍 エラー詳細

### エラーコード
- **エラーコード**: `ECONNREFUSED`
- **エラーメッセージ**: "MySQLサーバーが起動していないか、ポートが閉じています"

### 現在の接続設定
```
DB_HOST: localhost
DB_PORT: 3306
DB_USER: server
DB_NAME: sotsuken
DB_PASS: 設定済み（.envファイルに記載）
```

## ❌ 問題の原因

1. **MySQLサーバーが起動していない**
   - WindowsサービスとしてMySQLが登録されていない、または停止している
   - ポート3306がリッスンしていない

2. **接続設定の不一致**
   - データベース `sotsuken` が存在しない可能性
   - ユーザー `server` が存在しない、または権限がない可能性
   - パスワードが間違っている可能性

## ✅ 解決方法

### 方法1: MySQLサーバーの起動

#### WindowsでMySQLを起動する方法

**XAMPPを使用している場合:**
```powershell
# XAMPPコントロールパネルからMySQLを起動
# または、コマンドラインから：
cd C:\xampp
.\mysql\bin\mysqld.exe --console
```

**MySQLをサービスとしてインストールしている場合:**
```powershell
# サービス一覧を確認
Get-Service -Name "*mysql*"

# MySQLサービスを起動
Start-Service -Name MySQL80
# または
net start MySQL80
```

**MySQLを手動でインストールしている場合:**
```powershell
# MySQLのインストールディレクトリに移動
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# MySQLサーバーを起動
.\mysqld.exe --console
```

### 方法2: データベースとユーザーの作成

MySQLサーバーが起動したら、以下のコマンドでデータベースとユーザーを作成：

```sql
-- データベースの作成
CREATE DATABASE IF NOT EXISTS sotsuken CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ユーザーの作成（存在しない場合）
CREATE USER IF NOT EXISTS 'server'@'localhost' IDENTIFIED BY 'pass';

-- 権限の付与
GRANT ALL PRIVILEGES ON sotsuken.* TO 'server'@'localhost';
FLUSH PRIVILEGES;
```

### 方法3: データベーススキーマのインポート

プロジェクトルートにある `database_complete.sql` をインポート：

```bash
# MySQLコマンドラインから
mysql -u root -p sotsuken < database_complete.sql

# または、MySQLにログインしてから
mysql -u root -p
USE sotsuken;
SOURCE C:/Users/yasud/attendance-app/database_complete.sql;
```

### 方法4: 接続設定の確認

`.env`ファイルの設定を確認：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=server
DB_PASS=pass
DB_NAME=sotsuken
```

実際のMySQL環境に合わせて調整してください。

## 🔧 トラブルシューティング

### ポート3306が使用されているか確認
```powershell
netstat -ano | findstr :3306
```

### MySQLの接続テスト
```powershell
# MySQLコマンドラインクライアントで接続テスト
mysql -u server -p -h localhost
```

### 接続テストスクリプトの実行
```powershell
cd backend-nodejs
node -e "require('dotenv').config(); const mysql = require('mysql2/promise'); (async () => { try { const pool = mysql.createPool({ host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'server', password: process.env.DB_PASS || 'pass', database: process.env.DB_NAME || 'sotsuken', port: process.env.DB_PORT || 3306, connectTimeout: 5000 }); const conn = await pool.getConnection(); console.log('✅ データベース接続成功'); conn.release(); await pool.end(); } catch(e) { console.error('❌ エラー:', e.code, e.message); } })();"
```

## 📝 次のステップ

1. MySQLサーバーを起動
2. データベース `sotsuken` を作成
3. ユーザー `server` を作成して権限を付与
4. `database_complete.sql` をインポート
5. バックエンドサーバーを再起動して接続を確認

## ⚠️ 注意事項

- データベース接続に失敗しても、サーバーは起動を継続します（`server.js`の設定）
- ただし、API機能（認証、出欠記録など）は正常に動作しません
- 本番環境では、データベース接続エラー時は適切なエラーハンドリングが必要です

