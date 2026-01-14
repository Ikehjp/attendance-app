# Node.jsバックエンド クイックスタート

## 🚀 ローカル環境でテスト

### 1. 環境変数の設定

```bash
cd backend-nodejs
copy env.example .env
```

または

```powershell
Copy-Item env.example .env
```

### 2. .envファイルを編集

ローカル開発用の設定:
```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

DB_HOST=localhost
DB_NAME=sotsuken
DB_USER=server
DB_PASS=pass
DB_PORT=3306

JWT_SECRET=local_dev_secret_key
JWT_EXPIRES_IN=86400

CORS_ORIGIN=http://localhost:3000

RATE_LIMIT_WINDOW=900
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

APP_NAME=出欠管理システム
APP_VERSION=1.0.0
```

### 3. 開発サーバーを起動

```bash
# ホットリロード付き
npm run dev

# または通常起動
npm start
```

ブラウザで `http://localhost:3001/health` にアクセス

### 4. Reactアプリも起動

新しいターミナルで:
```bash
npm start
```

ブラウザで `http://localhost:3000` にアクセス

---

## 🌐 サーバー環境での設定

### サーバー側での操作

```bash
# 1. backend-nodejsをアップロード
# (Windowsから)
scp -r backend-nodejs/* user@192.168.12.200:/opt/attendance-backend/

# 2. サーバーにSSH接続
ssh user@192.168.12.200

# 3. ディレクトリに移動
cd /opt/attendance-backend

# 4. 依存関係をインストール
npm install --production

# 5. .envファイルを作成
cp env.example .env
nano .env
```

**.envの設定:**
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

RATE_LIMIT_WINDOW=900
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

APP_NAME=出欠管理システム
APP_VERSION=1.0.0
```

### PM2でデーモン化

```bash
# PM2をインストール
sudo npm install -g pm2

# アプリを起動
pm2 start server.js --name attendance-backend

# 自動起動設定
pm2 startup
pm2 save

# ステータス確認
pm2 status
pm2 logs attendance-backend
```

---

## 📝 チェックリスト

### ローカル環境
- [ ] `backend-nodejs/node_modules` が存在
- [ ] `.env` ファイルを作成
- [ ] `npm run dev` で起動
- [ ] `http://localhost:3001/health` が応答する
- [ ] Reactアプリ（`npm start`）でログインが動作する

### サーバー環境
- [ ] backend-nodejsをアップロード
- [ ] `.env` ファイルを設定
- [ ] `npm install --production` 実行
- [ ] PM2で起動
- [ ] `http://192.168.12.200:3001/health` が応答する
- [ ] Reactアプリをビルド＆アップロード

---

## 🔧 APIエンドポイント

### 認証
- POST `/api/auth/login` - ログイン
- POST `/api/auth/register` - 新規登録
- GET `/api/auth/me` - 現在のユーザー情報
- POST `/api/auth/logout` - ログアウト

### 出欠記録
- POST `/api/attendance` - 出欠記録
- GET `/api/attendance` - 出欠履歴取得

### 学生管理
- GET `/api/students` - 学生一覧
- POST `/api/students` - 学生作成
- PUT `/api/students/:id` - 学生更新
- DELETE `/api/students/:id` - 学生削除

詳細は `backend-nodejs/routes/` フォルダを参照

---

## 🐛 よくある問題

### ポート3001が使用中
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID番号> /F

# Linux
lsof -i :3001
kill -9 <PID番号>
```

### データベース接続エラー
- MySQLが起動しているか確認
- .envファイルのデータベース設定を確認
- 接続テスト: `mysql -u server -p sotsuken`

### CORSエラー
- .envファイルの `CORS_ORIGIN` を確認
- ReactアプリのURLと一致させる

