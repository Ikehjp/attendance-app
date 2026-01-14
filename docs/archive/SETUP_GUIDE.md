# 出欠管理システム セットアップガイド

## 概要
React + PHP + MySQL（phpMyAdmin）を使用した出欠管理システムのセットアップ手順です。

## 必要な環境
- Node.js 16以上
- PHP 7.4以上
- MySQL 5.7以上 または MariaDB 10.3以上
- Apache または Nginx
- phpMyAdmin（推奨）

## セットアップ手順

### 1. データベースの準備

#### MySQLデータベースの作成
phpMyAdminまたはMySQLコマンドラインで以下のデータベースを作成してください：

```sql
CREATE DATABASE sotsuken CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### データベースユーザーの作成（オプション）
```sql
CREATE USER 'server'@'localhost' IDENTIFIED BY 'pass';
GRANT ALL PRIVILEGES ON sotsuken.* TO 'server'@'localhost';
FLUSH PRIVILEGES;
```

### 2. PHPバックエンドの設定

#### データベース接続情報の設定
`backend-php/config/config.php`でデータベース接続情報を設定してください：

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sotsuken');
define('DB_USER', 'server');
define('DB_PASS', 'pass');
```

#### データベースの初期化
```bash
cd backend-php
php init.php
```

#### Webサーバーの設定
ApacheまたはNginxで`backend-php`ディレクトリを公開してください。

**Apacheの場合：**
```apache
<VirtualHost *:80>
    DocumentRoot /path/to/backend-php
    ServerName localhost
    <Directory /path/to/backend-php>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

**Nginxの場合：**
```nginx
server {
    listen 80;
    server_name localhost;
    root /path/to/backend-php;
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
    }
}
```

### 3. Reactフロントエンドの設定

#### 依存関係のインストール
```bash
npm install
```

#### 環境変数の設定
`.env`ファイルを作成し、APIのベースURLを設定してください：

```env
REACT_APP_API_URL=http://localhost/backend-php/api
```

#### アプリケーションの起動
```bash
npm start
```

### 4. 動作確認

#### サンプルユーザーでのログイン
初期化時に作成されるサンプルユーザーでログインできます：

- **管理者**: admin@example.com / password123
- **一般ユーザー**: tanaka@example.com / password123

#### APIエンドポイントの確認
以下のエンドポイントが利用可能です：

- `GET http://localhost/backend-php/api/auth.php?action=me` - 認証確認
- `GET http://localhost/backend-php/api/attendance.php` - 出欠記録取得
- `GET http://localhost/backend-php/api/users.php` - ユーザー一覧（管理者のみ）

## トラブルシューティング

### よくある問題

#### 1. CORSエラー
- `backend-php/config/config.php`でCORS設定を確認
- フロントエンドのURLが正しく設定されているか確認

#### 2. データベース接続エラー
- MySQLサービスが起動しているか確認
- データベース接続情報が正しいか確認
- ユーザーの権限が適切に設定されているか確認

#### 3. PHPエラー
- PHPのエラーログを確認
- `display_errors`が有効になっているか確認
- 必要なPHP拡張機能がインストールされているか確認

#### 4. ファイル権限エラー
- Webサーバーがファイルを読み書きできる権限があるか確認
- `backend-php`ディレクトリの権限を適切に設定

### ログの確認

#### PHPエラーログ
```bash
tail -f /var/log/apache2/error.log
# または
tail -f /var/log/nginx/error.log
```

#### MySQLエラーログ
```bash
tail -f /var/log/mysql/error.log
```

## 本番環境での注意点

### セキュリティ設定
1. JWTシークレットキーを強力なものに変更
2. データベースパスワードを強力なものに設定
3. HTTPSの使用を推奨
4. ファイルアップロード機能がある場合は適切な検証を実装

### パフォーマンス最適化
1. MySQLのインデックス設定を確認
2. PHPのOPcacheを有効化
3. 適切なキャッシュ戦略の実装

## 開発者向け情報

### データベーススキーマ
- `users`テーブル: ユーザー情報
- `attendance_records`テーブル: 出欠記録

### API仕様
- RESTful API設計
- JWT認証
- JSON形式のリクエスト/レスポンス

### 開発環境
- ホットリロード対応（React）
- エラーハンドリング
- ログ出力機能
