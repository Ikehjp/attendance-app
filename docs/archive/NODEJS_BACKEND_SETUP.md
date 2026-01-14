# Node.jsバックエンドセットアップガイド

## 📋 概要

PHPバックエンドからNode.jsバックエンドへの移行手順

### 現状
- **フロントエンド**: React (localhost:3000)
- **現在のバックエンド**: PHP (192.168.12.200/api)
- **新しいバックエンド**: Node.js (localhost:3001)

---

## 🚀 セットアップ手順

### ステップ1: ローカル環境でのテスト

#### 1.1 依存関係のインストール

```bash
cd backend-nodejs
npm install
```

#### 1.2 環境変数の設定

```bash
# .envファイルを作成
cp env.example .env
```

`.env` ファイルを編集:
```env
# サーバー設定
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# データベース設定
DB_HOST=192.168.12.200
DB_NAME=sotsuken
DB_USER=server
DB_PASS=pass
DB_PORT=3306

# JWT設定
JWT_SECRET=i24103_attendance_system_jwt_secret_key_2024_secure_production
JWT_EXPIRES_IN=86400

# CORS設定
CORS_ORIGIN=http://192.168.12.200

# レート制限設定
RATE_LIMIT_WINDOW=900
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# アプリケーション設定
APP_NAME=出欠管理システム
APP_VERSION=1.0.0
```

#### 1.3 ローカルでテスト起動

```bash
# 開発モード（ホットリロード対応）
npm run dev

# 本番モード
npm start
```

ブラウザで `http://localhost:3001/health` にアクセスして確認

---

### ステップ2: ReactアプリのAPI接続を変更

#### 2.1 APIのベースURLを更新

`src/api/attendanceApi.js` を確認:

```javascript
// 現在（PHPバックエンド）:
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'http://192.168.12.200/backend-php/api'
    : 'http://192.168.12.200/backend-php/api');

// 変更後（Node.jsバックエンド）:
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'http://192.168.12.200:3001/api'
    : 'http://localhost:3001/api');
```

#### 2.2 APIパスの確認

Node.jsバックエンドは `/api` プレフィックスを使用:

- `/api/auth`
- `/api/students`
- `/api/attendance`
- など

---

### ステップ3: サーバーへのデプロイ

#### 3.1 サーバー側でNode.jsとnpmをインストール

```bash
# サーバーにSSH接続
ssh user@192.168.12.200

# Node.jsのバージョン確認
node --version
npm --version

# インストールされていない場合
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3.2 backend-nodejsをサーバーにアップロード

```bash
# Windowsから
scp -r backend-nodejs/* user@192.168.12.200:~/
# または
scp -r backend-nodejs/* user@192.168.12.200:/opt/attendance-backend/
```

```bash
# サーバー側で
sudo mkdir -p /opt/attendance-backend
sudo chown -R $USER:$USER /opt/attendance-backend
```

#### 3.3 サーバー側で設定

```bash
# サーバー側に移動
cd /opt/attendance-backend

# 依存関係をインストール
npm install --production

# .envファイルを作成
cp env.example .env
nano .env
```

`.env` の設定:
```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

DB_HOST=localhost
DB_NAME=sotsuken
DB_USER=server
DB_PASS=pass
DB_PORT=3306

JWT_SECRET=i24103_attendance_system_jwt_secret_key_2024_secure_production
JWT_EXPIRES_IN=86400

CORS_ORIGIN=http://192.168.12.200
```

#### 3.4 PM2を使ってデーモン化

```bash
# PM2をインストール
sudo npm install -g pm2

# アプリケーションを起動
pm2 start server.js --name attendance-backend

# システム起動時に自動起動
pm2 startup
pm2 save

# ステータス確認
pm2 status

# ログ確認
pm2 logs attendance-backend
```

---

## ⚙️ サーバー設定の選択肢

### オプション1: Node.jsを直接使用（シンプル）

#### ポート番号でアクセス
```
React App: http://192.168.12.200/link-up/
Node.js API: http://192.168.12.200:3001/api
```

**メリット**: 設定が簡単  
**デメリット**: ポート番号が必要

#### Reactアプリの設定
`src/api/attendanceApi.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'http://192.168.12.200:3001/api';
```

ビルド後:
```bash
npm run build
```

---

### オプション2: Apacheでリバースプロキシ（推奨）

#### Apache設定ファイルの作成

```bash
sudo nano /etc/apache2/sites-available/attendance-node.conf
```

```apache
<VirtualHost *:80>
    ServerName 192.168.12.200

    # Reactアプリケーション
    DocumentRoot /var/www/html/link-up
    <Directory /var/www/html/link-up>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Node.js APIへのプロキシ
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    # CORS設定
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    Header always set Access-Control-Allow-Credentials "true"
</VirtualHost>
```

#### Apacheモジュールの有効化

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod rewrite
sudo a2ensite attendance-node
sudo systemctl restart apache2
```

#### Reactアプリの設定
`src/api/attendanceApi.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'http://192.168.12.200/api';
```

**メリット**: ポート番号なしでアクセス  
**デメリット**: Apache設定が必要

---

## 🔄 APIエンドポイントのマッピング

| 機能 | PHPバックエンド | Node.jsバックエンド |
|------|----------------|---------------------|
| 認証 | `/api/auth.php` | `/api/auth` |
| 出欠記録 | `/api/attendance.php` | `/api/attendance` |
| 学生管理 | `/api/students.php` | `/api/students` |
| ユーザー管理 | `/api/users.php` | `/api/users` |
| 科目管理 | `/api/subjects.php` | `/api/subjects` |
| 授業管理 | `/api/classes.php` | `/api/classes` |
| 通知 | `/api/notifications.php` | `/api/notifications` |
| グループ | `/api/groups.php` | `/api/groups` |
| QR | `/api/qr.php` | `/api/qr` |

---

## 🧪 動作確認

### 1. ローカル環境でのテスト

```bash
# ターミナル1: Node.jsバックエンド起動
cd backend-nodejs
npm run dev

# ターミナル2: Reactアプリ起動
npm start
```

### 2. APIエンドポイントのテスト

```bash
# ヘルスチェック
curl http://localhost:3001/health

# ログインテスト
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### 3. ブラウザでの確認

1. `http://localhost:3000` にアクセス
2. 開発者ツールのNetworkタブでAPI呼び出しを確認
3. エラーがないか確認

---

## 🐛 トラブルシューティング

### 問題1: CORSエラー

```javascript
// backend-nodejs/server.js のCORS設定を確認
CORS_ORIGIN=http://192.168.12.200
```

### 問題2: データベース接続エラー

```bash
# .envファイルのデータベース設定を確認
DB_HOST=localhost
DB_NAME=sotsuken
DB_USER=server
DB_PASS=pass

# 接続テスト
mysql -u server -p sotsuken
```

### 問題3: PM2が起動しない

```bash
# ログを確認
pm2 logs attendance-backend

# 設定を確認
pm2 info attendance-backend

# 再起動
pm2 restart attendance-backend
```

---

## 📊 移行チェックリスト

### ローカル環境
- [ ] backend-nodejsで `npm install`
- [ ] `.env` ファイルを作成
- [ ] `npm run dev` で起動確認
- [ ] `src/api/attendanceApi.js` のAPI URLを更新
- [ ] Reactアプリで動作確認

### サーバー環境
- [ ] Node.jsとnpmをインストール
- [ ] backend-nodejsをアップロード
- [ ] `.env` ファイルを設定
- [ ] `npm install --production`
- [ ] PM2で起動
- [ ] Apacheでリバースプロキシ設定（オプション）
- [ ] Reactアプリをビルド＆アップロード
- [ ] 全体動作確認

---

## 💡 次のステップ

移行が完了したら:
1. ✅ ログイン機能のテスト
2. ✅ 出欠記録機能のテスト
3. ✅ QRスキャン機能のテスト
4. ✅ パフォーマンスの比較
5. ✅ PHPバックエンドの削除（オプション）

