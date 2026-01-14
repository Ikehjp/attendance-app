# 出欠管理システム Node.js バックエンド

## 環境変数設定

`.env` ファイルを作成し、以下の設定を行ってください：

```env
# サーバー設定
NODE_ENV=development
PORT=3001
HOST=localhost

# データベース設定
DB_HOST=localhost
DB_NAME=sotsuken
DB_USER=server
DB_PASS=pass
DB_PORT=3306

# JWT設定
JWT_SECRET=i24103_attendance_system_jwt_secret_key_2024_secure_production
JWT_EXPIRES_IN=86400

# CORS設定
CORS_ORIGIN=http://192.168.12.200:3000

# レート制限設定
RATE_LIMIT_WINDOW=900
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# アプリケーション設定
APP_NAME=出欠管理システム
APP_VERSION=1.0.0
```

## インストールと起動

```bash
# 依存関係のインストール
npm install

# 開発環境での起動
npm run dev

# 本番環境での起動
npm start
```

## データベースマイグレーション

このプロジェクトでは、データベーススキーマの変更を安全に管理するためのマイグレーションシステムを使用しています。

### クイックスタート

```bash
# マイグレーションのステータス確認
npm run migrate:status

# 未実行のマイグレーションをすべて実行
npm run migrate

# 新しいマイグレーションファイルを作成
npm run migrate:create テーブル名_変更内容

# 最後のマイグレーションをロールバック
npm run migrate:rollback
```

### 詳細ドキュメント

- **クイックスタート**: [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)
- **完全なガイド**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

### その他のデータベースコマンド

```bash
# サンプルデータの挿入
npm run seed
```


## API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/register` - 新規登録
- `GET /api/auth/me` - ユーザー情報取得

### 出欠管理
- `GET /api/attendance` - 出欠記録一覧
- `POST /api/attendance` - 出欠記録作成
- `PUT /api/attendance/:id` - 出欠記録更新
- `DELETE /api/attendance/:id` - 出欠記録削除

### 学生管理
- `GET /api/students` - 学生一覧
- `POST /api/students` - 学生登録
- `PUT /api/students/:id` - 学生情報更新
- `DELETE /api/students/:id` - 学生削除

### その他
- `GET /api/subjects` - 科目一覧
- `GET /api/classes` - 授業一覧
- `GET /api/users` - ユーザー一覧
- `GET /api/notifications` - 通知一覧
