# 統合型出欠管理システム

学校および企業向けの統合型出欠管理システムです。QRコードによる出席管理、申請・承認フロー、時間割管理などの機能を備えています。

## 主な機能

### 🏢 組織・グループ管理
- **組織階層管理**: 学校/企業情報の管理
- **グループ（クラス）管理**: クラスや部署の作成・編集
- **ロールベースアクセス制御**: 管理者、教員、学生/従業員の権限管理

### 📱 QRコード出席管理
- **場所ベースQR発行**: 教室や会議室ごとのQRコード生成（管理者用）
- **セキュアなスキャン**: IPアドレス制限と位置情報検証による不正防止
- **即時反映**: スキャンと同時に出席状況をリアルタイム更新

### 📝 申請・承認フロー
- **各種届出**: 欠席、公欠、遅刻、早退の申請
- **承認ワークフロー**: 教員/管理者による申請の承認・却下
- **履歴管理**: 申請と承認の履歴を記録

### 📅 時間割・カレンダー
- **時間割管理**: 週間時間割の登録・表示
- **Excelインポート**: 時間割データの一括登録
- **カレンダー表示**: 月間/週間カレンダーでのスケジュール確認

## 技術スタック

### フロントエンド
- **React 18**: UIライブラリ
- **React Router**: ルーティング
- **Zustand**: 状態管理
- **Axios**: API通信
- **CSS Modules**: スタイリング
- **Framer Motion**: アニメーション & トランジション

### バックエンド
- **Node.js**: ランタイム環境
- **Express**: Webフレームワーク
- **MySQL**: リレーショナルデータベース
- **JWT**: 認証・認可
- **Jest**: テストフレームワーク

## セットアップ手順

### 1. 前提条件
- Node.js (v16以上)
- MySQL (v5.7以上)

### 2. リポジトリのクローンと依存関係のインストール
```bash
# フロントエンドの依存関係
npm install

# バックエンドの依存関係
cd backend-nodejs
npm install
cd ..
```

### 3. データベースのセットアップ
1. MySQLでデータベースを作成します。
2. `.env` ファイルを設定します（`backend-nodejs/.env`）。

```env
DB_HOST=localhost
DB_USER=your_user
DB_PASS=your_password
DB_NAME=attendance_db
JWT_SECRET=your_secret_key
PORT=3001
```

3. マイグレーションを実行してテーブルを作成します。
```bash
# Windowsの場合
run_migrations.bat

# または手動で
node backend-nodejs/scripts/migrate.js
```

### 4. アプリケーションの起動

**バックエンドサーバー:**
```bash
cd backend-nodejs
npm run dev
```

**フロントエンド開発サーバー:**
```bash
# 別のターミナルで
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## テストの実行

バックエンドのユニットテストと統合テストを実行するには：

```bash
cd backend-nodejs
npm test
```

## ディレクトリ構成

```
attendance-app/
├── backend-nodejs/         # バックエンド
│   ├── config/            # 設定
│   ├── middleware/        # ミドルウェア（認証など）
│   ├── routes/            # APIルート定義
│   ├── services/          # ビジネスロジック
│   ├── tests/             # テストコード
│   └── utils/             # ユーティリティ
├── database_migrations/    # DBマイグレーションSQL
├── src/                   # フロントエンド
│   ├── api/               # APIクライアント
│   ├── components/        # UIコンポーネント
│   ├── pages/             # ページコンポーネント
│   ├── stores/            # 状態管理 (Zustand)
│   └── utils/             # ユーティリティ
└── ...
```

## ライセンス

MIT License