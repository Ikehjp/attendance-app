# バックエンド配置手順

## 📁 サーバー側の最終的なディレクトリ構造

```
/var/www/html/
├── index.html                      # トップページ（React以外）
├── link-up/                        # Reactアプリケーション
│   ├── index.html
│   ├── static/
│   │   ├── js/
│   │   └── css/
│   └── ... (Reactビルドファイル)
│
├── api -> /var/www/html/backend-php/api/  # シンボリックリンク
│
└── backend-php/                    # PHPバックエンド（実際のフォルダ）
    ├── .htaccess                  # URLリライトとCORS設定
    ├── api/                       # APIエンドポイント
    │   ├── auth.php
    │   ├── attendance.php
    │   ├── student-attendance.php
    │   └── ... (その他のAPIファイル)
    │
    ├── classes/                   # PHPクラス
    │   ├── Auth.php
    │   ├── JWT.php
    │   └── ... (その他のクラス)
    │
    ├── config/                    # 設定ファイル
    │   ├── config.php
    │   └── database.php
    │
    └── migrations/                # データベースマイグレーション
        └── ... (SQLファイル)
```

---

## 🚀 配置手順

### ステップ1: サーバーに接続

```bash
ssh user@192.168.12.200
```

### ステップ2: ディレクトリ構造の確認

```bash
# 現在の構造を確認
ls -la /var/www/html/
```

### ステップ3: バックエンドフォルダをアップロード

#### オプションA: SCPを使用（Windowsから）

```powershell
# PowerShellで実行
# backend-phpフォルダ全体をアップロード
scp -r backend-php/* user@192.168.12.200:/var/www/html/backend-php/
```

#### オプションB: Gitを使用（推奨）

```bash
# サーバー側で実行
cd /var/www/html
git clone <your-repository-url> temp-clone
cp -r temp-clone/backend-php/* ./backend-php/
rm -rf temp-clone
```

### ステップ4: APIシンボリックリンクの作成

```bash
# /var/www/html/api が存在する場合は削除
sudo rm -rf /var/www/html/api

# シンボリックリンクを作成
sudo ln -s /var/www/html/backend-php/api /var/www/html/api

# 確認
ls -la /var/www/html/ | grep api
```

期待される出力：
```
lrwxrwxrwx 1 root root     35 Oct 28 14:00 api -> /var/www/html/backend-php/api
```

### ステップ5: ファイル権限の設定

```bash
# バックエンドの権限を設定
sudo chown -R www-data:www-data /var/www/html/backend-php
sudo chmod -R 755 /var/www/html/backend-php

# APIディレクトリの権限
sudo chown -R www-data:www-data /var/www/html/api
sudo chmod -R 755 /var/www/html/api
```

### ステップ6: .htaccessファイルの配置

```bash
# 既に .htaccess が backend-php/.htaccess に配置されていることを確認
# 必要に応じて、修正された .htaccess をアップロード
```

### ステップ7: Apacheの設定確認

```bash
# Rewriteモジュールが有効か確認
sudo a2enmod rewrite
sudo a2enmod headers

# 設定をテスト
sudo apache2ctl configtest

# Apacheを再起動
sudo systemctl restart apache2

# ステータス確認
sudo systemctl status apache2
```

### ステップ8: 動作確認

```bash
# APIエンドポイントにアクセスして確認
curl http://192.168.12.200/api/auth.php

# またはブラウザで
# http://192.168.12.200/api/auth.php にアクセス
```

---

## 🔧 代替配置方法

### オプション1: シンボリックリンクなし（直接配置）

APIを直接 `/var/www/html/api/` に配置する方法：

```bash
# backend-php/api の中身を /var/www/html/api にコピー
sudo cp -r /var/www/html/backend-php/api/* /var/www/html/api/

# .htaccess もコピー
sudo cp /var/www/html/backend-php/.htaccess /var/www/html/api/
```

**注意**: この場合、ReactアプリのAPIパス設定を変更する必要があります。

### オプション2: バーチャルホスト設定

Apacheの設定ファイルでバーチャルホストを設定：

```bash
# /etc/apache2/sites-available/attendance.conf を作成
sudo nano /etc/apache2/sites-available/attendance.conf
```

```apache
<VirtualHost *:80>
    ServerName 192.168.12.200
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # APIのエイリアス
    Alias /api /var/www/html/backend-php/api
    <Directory /var/www/html/backend-php/api>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/attendance_error.log
    CustomLog ${APACHE_LOG_DIR}/attendance_access.log combined
</VirtualHost>
```

```bash
# 設定を有効化
sudo a2ensite attendance.conf
sudo systemctl reload apache2
```

---

## ⚙️ 重要な設定ファイル

### 1. backend-php/config/config.php

```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sotsuken');
define('DB_USER', 'server');
define('DB_PASS', 'pass');

define('JWT_SECRET', 'your-secret-key-here');
define('JWT_EXPIRATION', 3600 * 24 * 7); // 7 days
?>
```

### 2. backend-php/.htaccess

```apache
# リライトエンジンを有効にする
RewriteEngine On

# APIエンドポイントのリライトルール
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^/]+)/?$ $1.php [L,QSA]

# CORS設定
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    Header always set Access-Control-Allow-Credentials "true"
</IfModule>

# セキュリティ設定
<Files "config.php">
    Require all denied
</Files>

<Files "database.php">
    Require all denied
</Files>
```

---

## ✅ 確認チェックリスト

以下のコマンドで設定を確認：

```bash
# 1. ディレクトリ構造
ls -la /var/www/html/
ls -la /var/www/html/api

# 2. シンボリックリンク
ls -l /var/www/html/api

# 3. ファイル権限
ls -la /var/www/html/backend-php/api/

# 4. Apacheモジュール
apache2ctl -M | grep rewrite
apache2ctl -M | grep headers

# 5. Apacheのエラーログ
sudo tail -f /var/log/apache2/error.log

# 6. APIの動作確認
curl http://192.168.12.200/api/auth.php
```

---

## 🐛 トラブルシューティング

### 問題1: シンボリックリンクが機能しない

```bash
# シンボリックリンクを削除して再作成
sudo rm /var/www/html/api
sudo ln -s /var/www/html/backend-php/api /var/www/html/api
ls -la /var/www/html/api
```

### 問題2: 403 Forbidden エラー

```bash
# ファイル権限を確認
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### 問題3: .htaccessが機能しない

```bash
# AllowOverrideの設定を確認
sudo grep -r "AllowOverride" /etc/apache2/

# /etc/apache2/sites-available/000-default.conf を編集
sudo nano /etc/apache2/sites-available/000-default.conf
```

```apache
<Directory /var/www/html>
    Options Indexes FollowSymLinks
    AllowOverride All  # これを追加
    Require all granted
</Directory>
```

```bash
sudo systemctl restart apache2
```

### 問題4: CORS エラー

`.htaccess` のCORS設定を確認：

```bash
cat /var/www/html/backend-php/.htaccess
```

---

## 📝 まとめ

**推奨される配置方法**:

1. ✅ **backend-php** を `/var/www/html/backend-php/` にアップロード
2. ✅ **シンボリックリンク** `/var/www/html/api` → `/var/www/html/backend-php/api` を作成
3. ✅ **権限設定** `www-data:www-data` に設定
4. ✅ **Apache設定** `rewrite` と `headers` モジュールを有効化

これで、Reactアプリは `/api/*` にアクセスでき、実際には `/backend-php/api/*` にアクセスされます。

