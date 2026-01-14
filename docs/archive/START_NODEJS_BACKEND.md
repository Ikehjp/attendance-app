# Node.jsバックエンドの起動手順

## ローカル開発環境での起動

### 手動で起動する手順

#### 1. backend-nodejsディレクトリで

```bash
cd backend-nodejs
npm start
```

または開発モード（ホットリロード）:

```bash
npm run dev
```

#### 2. 別のターミナルでReactアプリを起動

```bash
# プロジェクトルートで
npm start
```

### 起動確認

ブラウザで以下にアクセス:
- Node.js API: `http://localhost:3001/health`
- Reactアプリ: `http://localhost:3000`

---

## ⚠️ トラブルシューティング

### ポート3001が使用中

```powershell
# ポート3001を使用しているプロセスを確認
netstat -ano | findstr :3001

# プロセスを終了
taskkill /PID <PID番号> /F
```

### データベース接続エラー

MySQLが起動していない可能性があります：

```bash
# MySQLの起動確認（サーバー側の場合）
sudo systemctl status mysql

# または
mysql -u server -p sotsuken
```

### 開発環境のデータベース

ローカルでMySQLが起動していない場合、**サーバーのデータベース**に接続する設定にしてください:

`.env` ファイル:
```env
DB_HOST=192.168.12.200  # サーバーのIP
DB_NAME=sotsuken
DB_USER=server
DB_PASS=pass
```

---

## 🌐 サーバー環境での起動（本番）

### PM2を使用（推奨）

```bash
# サーバーにSSH接続
ssh user@192.168.12.200

# アプリディレクトリに移動
cd /opt/attendance-backend

# PM2で起動
pm2 start server.js --name attendance-backend

# ステータス確認
pm2 status

# ログ確認
pm2 logs attendance-backend
```

### システムサービスとして起動

```bash
# systemdサービスの作成
sudo nano /etc/systemd/system/attendance-backend.service
```

```ini
[Unit]
Description=Attendance App Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/attendance-backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable attendance-backend
sudo systemctl start attendance-backend
sudo systemctl status attendance-backend
```

---

## 📝 まとめ

1. ✅ backend-nodejsで `npm install` 完了
2. ✅ .env ファイル作成
3. ✅ API接続設定更新（src/api/attendanceApi.js）
4. ⏳ Node.jsバックエンド起動（localhost:3001）
5. ⏳ Reactアプリ起動（localhost:3000）
6. ⏳ 動作確認

**次のステップ**: 
- 新しいターミナルで `npm start` を実行してNode.jsバックエンドを起動
- 別のターミナルでReactアプリを起動（`npm start`）
- ブラウザで `http://localhost:3000` にアクセス

