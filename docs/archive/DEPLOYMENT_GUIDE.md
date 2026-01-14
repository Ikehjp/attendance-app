# 出欠管理システム - デプロイメントガイド

## 📋 目次
1. [プロジェクト概要](#プロジェクト概要)
2. [技術スタック](#技術スタック)
3. [環境設定](#環境設定)
4. [データベース設定](#データベース設定)
5. [デプロイメント手順](#デプロイメント手順)
6. [ファイル構成](#ファイル構成)
7. [トラブルシューティング](#トラブルシューティング)

---

## プロジェクト概要

出欠管理システムは、従業員と学生の出欠を管理するWebアプリケーションです。

### 主な機能
- ユーザー認証（ログイン/新規登録）
- 従業員の出欠記録管理
- 学生の出欠記録管理
- 科目・授業管理
- カレンダー表示
- 通知機能
- 監査ログ

---

## 技術スタック

### フロントエンド
- **React 18.x** - UIフレームワーク
- **React Router** - ルーティング
- **Axios** - HTTP通信
- **CSS3** - スタイリング

### バックエンド
- **PHP 7.4+** - サーバーサイド言語
- **MySQL 5.7+** - データベース
- **JWT (JSON Web Token)** - 認証

### サーバー環境
- **Webサーバー**: Apache 2.4+ または Nginx
- **PHP**: 7.4以上（PDO, JSON, mbstring拡張が必要）
- **MySQL**: 5.7以上

---

## 環境設定

### 1. フロントエンド設定

#### API URL設定
`src/api/attendanceApi.js`で設定されています：

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'http://192.168.12.200/api'
    : 'http://192.168.12.200/api');
```

**本番環境での変更方法**:
```bash
REACT_APP_API_URL=https://yourdomain.com/api npm run build
```

### 2. バックエンド設定

#### データベース接続設定
`backend-php/config/config.php`:

```php
// データベース設定
define('DB_HOST', 'localhost');
define('DB_NAME', 'sotsuken');
define('DB_USER', 'server');
define('DB_PASS', 'pass');
```

#### JWT設定
```php
// JWT設定
define('JWT_SECRET', 'i24103_attendance_system_jwt_secret_key_2024_secure_production');
define('JWT_EXPIRES_IN', 86400); // 24時間
```

#### CORS設定
```php
// CORS設定
header('Access-Control-Allow-Origin: http://192.168.12.200:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
```

#### エラーレポート設定（本番環境）
```php
// エラーレポート設定
error_reporting(E_ALL);
ini_set('display_errors', 0); // 本番環境ではエラー表示を無効にする
ini_set('log_errors', 1); // エラーログは有効にする
```

---

## データベース設定

### データベース作成

`database_complete.sql`ファイルを実行してデータベースを作成します：

```bash
mysql -u root -p < database_complete.sql
```

または、phpMyAdminなどのツールでインポートしてください。

### データベース構造

#### テーブル一覧

1. **users** - ユーザー（従業員・管理者）情報
2. **students** - 学生情報（拡張版）
3. **user_attendance_records** - 従業員の出欠記録
4. **student_attendance_records** - 学生の出欠記録
5. **subjects** - 科目管理
6. **classes** - 授業管理
7. **enrollments** - 学生の科目登録
8. **detailed_attendance_records** - 詳細な出欠記録（科目別）
9. **notifications** - 通知
10. **system_settings** - システム設定
11. **audit_logs** - 監査ログ

### サンプルユーザー

データベースには以下のサンプルユーザーが含まれています：

| 役割 | メールアドレス | パスワード | 社員ID |
|------|---------------|-----------|--------|
| 管理者 | admin@example.com | password123 | ADMIN001 |
| 一般ユーザー | tanaka@example.com | password123 | EMP001 |

---

## デプロイメント手順

### 前提条件
- サーバーにPHP 7.4以上がインストールされている
- MySQL 5.7以上がインストールされている
- ApacheまたはNginxが稼働している
- SSHアクセスまたはFTP/SFTPアクセスが可能

### Step 1: データベースの作成

```bash
# サーバーに接続
ssh user@your-server.com

# データベースを作成
mysql -u root -p < database_complete.sql
```

### Step 2: フロントエンドのデプロイ

```bash
# ローカルでビルド（既に完了している場合はスキップ）
npm run build

# サーバーにアップロード
scp -r build/* user@your-server.com:/var/www/your-domain.com/
```

または、FTP/SFTPクライアントを使用して`build/`フォルダの中身をアップロードしてください。

### Step 3: バックエンドのデプロイ

```bash
# サーバーにアップロード
scp -r backend-php/* user@your-server.com:/var/www/your-domain.com/api/
```

または、FTP/SFTPクライアントを使用して`backend-php/`フォルダの中身を`api/`ディレクトリにアップロードしてください。

### Step 4: ファイル権限の設定

```bash
# サーバーに接続
ssh user@your-server.com

# 適切なファイル権限を設定
chmod 644 /var/www/your-domain.com/api/*.php
chmod 755 /var/www/your-domain.com/api/classes/
chmod 644 /var/www/your-domain.com/api/.htaccess
chmod 644 /var/www/your-domain.com/api/config/*.php
```

### Step 5: Webサーバーの設定

#### Apacheの場合

`.htaccess`ファイルが既に`backend-php/`フォルダに含まれています。Apacheの`mod_rewrite`と`mod_headers`が有効になっていることを確認してください：

```bash
# Apacheモジュールを有効化
sudo a2enmod rewrite
sudo a2enmod headers
sudo systemctl restart apache2
```

#### Nginxの場合

Nginxを使用している場合は、以下のような設定が必要です：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/your-domain.com;

    # フロントエンドのルーティング
    location / {
        try_files $uri $uri/ /index.html;
    }

    # バックエンドAPI
    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### Step 6: 動作確認

1. ブラウザで`http://your-domain.com`にアクセス
2. ログイン画面が表示されることを確認
3. サンプルユーザーでログインできることを確認

---

## ファイル構成

### サーバー上の最終的なディレクトリ構造

```
/var/www/your-domain.com/
├── index.html                     # フロントエンドのメインファイル
├── favicon.ico
├── logo192.png
├── logo512.png
├── manifest.json
├── robots.txt
├── sw.js
├── static/                        # フロントエンドの静的ファイル
│   ├── css/
│   │   └── main.7d0866c9.css
│   └── js/
│       ├── 206.c43e53ec.chunk.js
│       └── main.dc675a18.js
└── api/                           # バックエンドAPI
    ├── .htaccess                  # URLリライトとセキュリティ設定
    ├── auth.php                   # 認証API
    ├── attendance.php             # 出欠記録API
    ├── audit-logs.php             # 監査ログAPI
    ├── classes.php                # 授業管理API
    ├── notifications.php          # 通知API
    ├── settings.php               # システム設定API
    ├── student-attendance.php     # 学生出欠API
    ├── students.php               # 学生管理API
    ├── subjects.php               # 科目管理API
    ├── users.php                  # ユーザー管理API
    ├── classes/                   # PHPクラスファイル
    │   ├── Attendance.php
    │   ├── AuditLog.php
    │   ├── Auth.php
    │   ├── Class.php
    │   ├── JWT.php
    │   ├── Notification.php
    │   ├── Student.php
    │   ├── StudentAttendance.php
    │   ├── Subject.php
    │   └── SystemSettings.php
    ├── config/                    # 設定ファイル
    │   ├── config.php             # アプリケーション設定
    │   └── database.php           # データベース接続クラス
    ├── init.php                   # データベース初期化スクリプト
    └── migrations/                # データベースマイグレーション
        ├── add_student_fields.sql
        ├── create_audit_logs_table.sql
        ├── create_detailed_attendance_table.sql
        ├── create_enrollments_table.sql
        ├── create_notifications_table.sql
        ├── create_subjects_table.sql
        └── create_system_settings_table.sql
```

### ローカル開発環境のディレクトリ構造

```
attendance-app/
├── build/                         # ビルド済みフロントエンド（サーバーにアップロード）
├── backend/                       # Node.jsバックエンド（使用しない）
├── backend-php/                   # PHPバックエンド（サーバーにアップロード）
├── src/                           # フロントエンドソースコード
│   ├── api/
│   │   └── attendanceApi.js       # API通信管理
│   ├── components/
│   │   ├── common/
│   │   └── layout/
│   ├── contexts/
│   │   └── AuthContext.jsx        # 認証コンテキスト
│   ├── hooks/
│   │   └── useAuth.js             # 認証フック
│   ├── pages/
│   │   ├── LoginPage.jsx          # ログインページ
│   │   ├── RegisterPage.jsx       # 新規登録ページ
│   │   ├── DashboardPage.jsx      # ダッシュボード
│   │   ├── CalendarPage.jsx       # カレンダーページ
│   │   ├── StudentPage.jsx        # 学生管理ページ
│   │   └── StudentAttendancePage.jsx # 学生出欠ページ
│   ├── styles/
│   │   └── global.css             # グローバルスタイル
│   ├── App.jsx                    # メインアプリケーション
│   └── index.jsx                  # エントリーポイント
├── database_complete.sql          # 完全なデータベーススキーマ
├── package.json                   # Node.js依存関係
└── README.md                      # プロジェクトの説明
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. CORSエラーが発生する

**症状**: ブラウザのコンソールにCORSエラーが表示される

**解決方法**:
- `backend-php/config/config.php`のCORS設定を確認
- フロントエンドのオリジンが正しく設定されているか確認
- Apacheの`mod_headers`が有効になっているか確認

#### 2. データベース接続エラー

**症状**: "データベース接続に失敗しました"というエラーが表示される

**解決方法**:
- `backend-php/config/config.php`のデータベース接続情報を確認
- MySQLが稼働しているか確認: `sudo systemctl status mysql`
- データベースが作成されているか確認: `mysql -u root -p -e "SHOW DATABASES;"`
- ユーザーに適切な権限があるか確認

#### 3. 404エラー（APIエンドポイントが見つからない）

**症状**: APIリクエストが404エラーを返す

**解決方法**:
- `.htaccess`ファイルが`api/`ディレクトリに存在するか確認
- Apacheの`mod_rewrite`が有効になっているか確認
- Webサーバーのエラーログを確認: `tail -f /var/log/apache2/error.log`

#### 4. JWT認証エラー

**症状**: ログイン後、すぐにログアウトされる

**解決方法**:
- `backend-php/config/config.php`の`JWT_SECRET`が設定されているか確認
- ブラウザのローカルストレージにトークンが保存されているか確認
- PHPの`openssl`拡張が有効になっているか確認

#### 5. フロントエンドが空白のページを表示する

**症状**: ページが真っ白で何も表示されない

**解決方法**:
- ブラウザのコンソールでエラーを確認
- JavaScriptファイルが正しく読み込まれているか確認
- `build/`フォルダの内容が正しくアップロードされているか確認

#### 6. ファイル権限エラー

**症状**: "Permission denied"エラーが表示される

**解決方法**:
```bash
# ファイル権限を再設定
chmod 644 /var/www/your-domain.com/api/*.php
chmod 755 /var/www/your-domain.com/api/classes/
chmod 644 /var/www/your-domain.com/api/.htaccess
```

---

## セキュリティチェックリスト

デプロイ前に以下の項目を確認してください：

- [ ] `JWT_SECRET`が強力な値に変更されている
- [ ] データベースのパスワードが適切に設定されている
- [ ] `display_errors`が本番環境で無効になっている
- [ ] `.htaccess`ファイルが設定ファイルへのアクセスをブロックしている
- [ ] CORS設定が適切に制限されている
- [ ] ファイル権限が適切に設定されている（644 for files, 755 for directories）
- [ ] HTTPSが有効になっている（本番環境推奨）
- [ ] 定期的なバックアップが設定されている

---

## 更新履歴

### 2024年
- 初回リリース
- フロントエンドとバックエンドの統合
- データベーススキーマの最適化
- セキュリティ設定の強化

---

## サポート

問題が発生した場合は、以下の情報を含めてお問い合わせください：

1. エラーメッセージの全文
2. ブラウザのコンソールログ
3. サーバーのエラーログ
4. 実行した手順

---

## ライセンス

このプロジェクトは内部使用のみを目的としています。
