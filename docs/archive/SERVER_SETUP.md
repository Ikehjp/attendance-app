# サーバー設定手順

## 問題の概要

現在、以下のエラーが発生しています：

1. **403エラー**: `/var/www/html/api/` へのアクセスが失敗
2. **404エラー**: `/var/www/html/api/404.php` が見つからない
3. **401エラー**: トークンの有効期限切れ（再ログイン必要）

## 解決方法

### 1. APIディレクトリのシンボリックリンクを作成

実際のAPIは `/var/www/html/backend-php/api/` にありますが、アプリは `/api` にアクセスしようとします。
シンボリックリンクを作成してリダイレクトします：

```bash
# サーバー上で実行
sudo ln -sf /var/www/html/backend-php/api /var/www/html/api
sudo chown -R www-data:www-data /var/www/html/api
```

### 2. buildファイルをアップロード

```bash
# ローカルPCから
scp -r build/* user@192.168.12.200:/var/www/html/link-up/
```

または、SSHでサーバーに接続して：

```bash
# サーバー上で実行
sudo rm -rf /var/www/html/link-up/*
sudo cp -r /path/to/build/* /var/www/html/link-up/
sudo chown -R www-data:www-data /var/www/html/link-up
sudo chmod -R 755 /var/www/html/link-up
```

### 3. トップページを配置

```bash
# サーバー上で実行
sudo cp index.html /var/www/html/
sudo chown www-data:www-data /var/www/html/index.html
sudo chmod 644 /var/www/html/index.html
```

### 4. Apache権限の確認

```bash
# サーバー上で実行
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### 5. Apacheモジュールの確認

```bash
# サーバー上で実行
sudo a2enmod rewrite
sudo a2enmod headers
sudo systemctl restart apache2
```

### 6. PHPバックエンドのCORS設定を確認

`/var/www/html/backend-php/.htaccess` を確認して、正しいオリジンに設定されているか確認：

```apache
# CORS設定（必要に応じて）
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "http://192.168.12.200"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    Header always set Access-Control-Allow-Credentials "true"
</IfModule>
```

### 7. 動作確認

ブラウザで以下にアクセス：

1. **トップページ**: `http://192.168.12.200/`
2. **アプリ**: `http://192.168.12.200/link-up/`
3. **ログイン**: `http://192.168.12.200/link-up/login`

## 重要なポイント

### APIパスの設定

現在、アプリは `/api` にアクセスしようとしますが、実際のAPIは `/backend-php/api/` にあります。

シンボリックリンクを作成することで、この問題を解決できます：

```bash
sudo ln -sf /var/www/html/backend-php/api /var/www/html/api
```

### 認証トークンの有効期限

ユーザーが再ログインする必要があります。401エラーが発生する場合は、ブラウザのコンソールからローカルストレージをクリアするか、直接ログインページにアクセスしてください：

```javascript
// ブラウザのコンソールで実行
localStorage.clear();
window.location.href = '/link-up/login';
```

## ファイル構造の確認

デプロイ後のファイル構造は以下の通りです：

```
/var/www/html/
├── index.html                          # トップページ
├── api -> /var/www/html/backend-php/api  # シンボリックリンク
└── link-up/
    ├── index.html                      # Reactアプリ
    ├── .htaccess                       # Apache設定
    ├── manifest.json                   # PWA設定
    ├── sw.js                           # Service Worker
    └── static/
        ├── js/
        │   ├── main.beb89dba.js        # 更新済み（APIパス修正）
        │   └── 206.*.js
        └── css/
            └── main.*.css

/var/www/html/backend-php/
└── api/                                # 実際のPHP API
    ├── auth.php
    ├── student-attendance.php
    ├── ... (その他のAPIファイル)
```

## トラブルシューティング

### 問題1: シンボリックリンクが機能しない

```bash
# シンボリックリンクを削除して再作成
sudo rm /var/www/html/api
sudo ln -sf /var/www/html/backend-php/api /var/www/html/api
ls -la /var/www/html/api  # 確認
```

### 問題2: 403エラー

```bash
# 権限を確認
ls -la /var/www/html/api
sudo chown -R www-data:www-data /var/www/html/api
sudo chmod -R 755 /var/www/html/api
```

### 問題3: CORSエラー

サーバーのCORS設定を確認：

```bash
sudo cat /var/www/html/backend-php/.htaccess
```

### 問題4: トークンエラーが続く

ブラウザのキャッシュとローカルストレージをクリア：

```javascript
// ブラウザのコンソールで実行
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## まとめ

1. ✅ APIパスを `/backend-php/api` に修正済み
2. ✅ ビルド完了（APIパス修正版）
3. ⏳ サーバー側でシンボリックリンクを作成
4. ⏳ buildファイルをアップロード
5. ⏳ 動作確認と再ログイン

ユーザーは一度ログアウトして再ログインする必要があります。

