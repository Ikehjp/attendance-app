# 出欠管理システム - 開発者ガイド

## 📋 目次
1. [開発環境のセットアップ](#開発環境のセットアップ)
2. [プロジェクト構造](#プロジェクト構造)
3. [開発フロー](#開発フロー)
4. [API仕様](#api仕様)
5. [データベース設計](#データベース設計)
6. [認証フロー](#認証フロー)

---

## 開発環境のセットアップ

### 必要なツール

- **Node.js**: 16.x以上
- **npm**: 8.x以上
- **PHP**: 7.4以上
- **MySQL**: 5.7以上
- **Git**: 2.x以上

### セットアップ手順

#### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd attendance-app
```

#### 2. フロントエンドのセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

開発サーバーは`http://localhost:3000`で起動します。

#### 3. バックエンドのセットアップ

```bash
# PHPの依存関係チェック
php -v

# データベースの作成
mysql -u root -p < database_complete.sql

# データベース接続情報の設定
# backend-php/config/config.phpを編集
```

#### 4. データベース接続情報の設定

`backend-php/config/config.php`を編集：

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sotsuken');
define('DB_USER', 'server');
define('DB_PASS', 'pass');
```

---

## プロジェクト構造

### フロントエンド（React）

```
src/
├── api/
│   └── attendanceApi.js          # API通信を管理するファイル
├── components/
│   ├── common/                   # 共通コンポーネント
│   │   ├── Button.jsx
│   │   ├── Button.css
│   │   ├── Input.jsx
│   │   ├── Input.css
│   │   └── ErrorBoundary.jsx
│   └── layout/                   # レイアウトコンポーネント
│       ├── Header.jsx
│       └── Header.css
├── contexts/
│   └── AuthContext.jsx           # 認証状態を管理するコンテキスト
├── hooks/
│   └── useAuth.js                # 認証関連のカスタムフック
├── pages/                        # ページコンポーネント
│   ├── LoginPage.jsx             # ログインページ
│   ├── LoginPage.css
│   ├── RegisterPage.jsx          # 新規登録ページ
│   ├── RegisterPage.css
│   ├── DashboardPage.jsx         # ダッシュボード
│   ├── DashboardPage.css
│   ├── CalendarPage.jsx          # カレンダーページ
│   ├── CalendarPage.css
│   ├── StudentPage.jsx           # 学生管理ページ
│   ├── StudentPage.css
│   ├── StudentAttendancePage.jsx # 学生出欠ページ
│   └── StudentAttendancePage.css
├── styles/
│   └── global.css                # グローバルスタイル
├── App.jsx                       # メインアプリケーションコンポーネント
└── index.jsx                     # エントリーポイント
```

### バックエンド（PHP）

```
backend-php/
├── api/                          # APIエンドポイント
│   ├── auth.php                  # 認証API
│   ├── attendance.php            # 出欠記録API
│   ├── audit-logs.php            # 監査ログAPI
│   ├── classes.php               # 授業管理API
│   ├── notifications.php         # 通知API
│   ├── settings.php              # システム設定API
│   ├── student-attendance.php    # 学生出欠API
│   ├── students.php              # 学生管理API
│   ├── subjects.php              # 科目管理API
│   └── users.php                 # ユーザー管理API
├── classes/                      # PHPクラス
│   ├── Attendance.php            # 出欠記録クラス
│   ├── AuditLog.php              # 監査ログクラス
│   ├── Auth.php                  # 認証クラス
│   ├── Class.php                 # 授業クラス
│   ├── JWT.php                   # JWT処理クラス
│   ├── Notification.php          # 通知クラス
│   ├── Student.php               # 学生クラス
│   ├── StudentAttendance.php     # 学生出欠クラス
│   ├── Subject.php               # 科目クラス
│   └── SystemSettings.php        # システム設定クラス
├── config/                       # 設定ファイル
│   ├── config.php                # アプリケーション設定
│   └── database.php              # データベース接続クラス
├── migrations/                   # データベースマイグレーション
│   ├── add_student_fields.sql
│   ├── create_audit_logs_table.sql
│   ├── create_detailed_attendance_table.sql
│   ├── create_enrollments_table.sql
│   ├── create_notifications_table.sql
│   ├── create_subjects_table.sql
│   └── create_system_settings_table.sql
├── .htaccess                     # URLリライトとセキュリティ設定
├── init.php                      # データベース初期化スクリプト
└── README.md                     # バックエンドの説明
```

---

## 開発フロー

### 1. 機能追加の流れ

```
1. ブランチの作成
   git checkout -b feature/新機能名

2. フロントエンドの開発
   - ページコンポーネントの作成
   - API呼び出しの実装
   - スタイルの適用

3. バックエンドの開発
   - APIエンドポイントの作成
   - ビジネスロジックの実装
   - データベース操作の実装

4. テスト
   - フロントエンドのテスト
   - バックエンドのテスト
   - 統合テスト

5. プルリクエストの作成
   git push origin feature/新機能名
```

### 2. ビルドとデプロイ

```bash
# フロントエンドのビルド
npm run build

# ビルド結果はbuild/フォルダに出力される
# このフォルダをサーバーにアップロード
```

### 3. コードスタイル

#### JavaScript/React
- ES6+の構文を使用
- 関数コンポーネントを使用
- Hooksを使用して状態管理
- インポートはアルファベット順に整理

#### PHP
- PSR-12コーディング規約に準拠
- クラス名はPascalCase
- メソッド名はcamelCase
- 適切なコメントを記述

---

## API仕様

### 認証API

#### ログイン
```http
POST /api/auth.php?action=login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "ログインに成功しました",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "user@example.com",
      "role": "employee"
    }
  }
}
```

#### 新規登録
```http
POST /api/auth.php?action=register
Content-Type: application/json

{
  "name": "山田太郎",
  "email": "user@example.com",
  "password": "password123",
  "employeeId": "EMP001",
  "department": "営業部"
}
```

#### ログアウト
```http
POST /api/auth.php?action=logout
Authorization: Bearer {token}
```

### 出欠記録API

#### 出欠記録の作成
```http
POST /api/attendance.php
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-01-15",
  "status": "present",
  "check_in_time": "2024-01-15 09:00:00",
  "check_out_time": "2024-01-15 18:00:00"
}
```

#### 出欠記録の取得
```http
GET /api/attendance.php?userId=1&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

### 学生管理API

#### 学生一覧の取得
```http
GET /api/students.php?search=山田&limit=10&offset=0
Authorization: Bearer {token}
```

#### 学生の作成
```http
POST /api/students.php
Authorization: Bearer {token}
Content-Type: application/json

{
  "studentId": "STU001",
  "name": "山田太郎",
  "cardId": "CARD001",
  "email": "yamada@example.com",
  "phone": "090-1234-5678",
  "grade": "1年",
  "className": "A組",
  "enrollmentDate": "2024-04-01"
}
```

---

## データベース設計

### テーブル一覧

#### users（ユーザー）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT | ユーザーID（主キー） |
| name | VARCHAR(255) | 氏名 |
| email | VARCHAR(255) | メールアドレス（ユニーク） |
| password | VARCHAR(255) | ハッシュ化されたパスワード |
| employee_id | VARCHAR(50) | 社員ID（ユニーク） |
| department | VARCHAR(100) | 部署 |
| role | ENUM | 役割（employee, admin） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### students（学生）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| student_id | VARCHAR(255) | 学生ID（主キー） |
| name | VARCHAR(255) | 学生名 |
| card_id | VARCHAR(255) | ICカードID |
| email | VARCHAR(255) | メールアドレス |
| phone | VARCHAR(20) | 電話番号 |
| grade | VARCHAR(50) | 学年 |
| class_name | VARCHAR(100) | クラス名 |
| enrollment_date | DATE | 入学日 |
| status | ENUM | 状態（active, inactive, graduated, suspended） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### user_attendance_records（従業員の出欠記録）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT | 記録ID（主キー） |
| user_id | INT | ユーザーID（外部キー） |
| date | DATE | 出欠日 |
| status | ENUM | 状態（present, absent, late, early_departure） |
| check_in_time | DATETIME | 出勤時刻 |
| check_out_time | DATETIME | 退勤時刻 |
| reason | TEXT | 理由 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### student_attendance_records（学生の出欠記録）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT | 記録ID（主キー） |
| student_id | VARCHAR(255) | 学生ID（外部キー） |
| timestamp | DATETIME | 記録日時 |
| created_at | TIMESTAMP | 作成日時 |

---

## 認証フロー

### 1. ログイン処理

```
1. ユーザーがログインフォームに入力
   ↓
2. フロントエンドがPOST /api/auth.php?action=loginを呼び出し
   ↓
3. バックエンドがメールアドレスとパスワードを検証
   ↓
4. 検証成功の場合、JWTトークンを生成
   ↓
5. トークンをレスポンスとして返す
   ↓
6. フロントエンドがトークンをlocalStorageに保存
   ↓
7. ダッシュボードにリダイレクト
```

### 2. 認証が必要なAPIリクエスト

```
1. フロントエンドがlocalStorageからトークンを取得
   ↓
2. リクエストヘッダーにAuthorization: Bearer {token}を追加
   ↓
3. バックエンドがトークンを検証
   ↓
4. 検証成功の場合、リクエストを処理
   ↓
5. 検証失敗の場合、401エラーを返す
   ↓
6. フロントエンドがトークンを削除し、ログインページにリダイレクト
```

### 3. 新規登録処理

```
1. ユーザーが新規登録フォームに入力
   ↓
2. フロントエンドがバリデーションを実行
   ↓
3. POST /api/auth.php?action=registerを呼び出し
   ↓
4. バックエンドがパスワードをハッシュ化
   ↓
5. データベースにユーザー情報を保存
   ↓
6. ログイン処理を実行
```

---

## デバッグ

### フロントエンドのデバッグ

```javascript
// コンソールログの使用
console.log('デバッグ情報:', data);

// React DevToolsの使用
// Chrome拡張機能をインストール

// Network タブでAPIリクエストを確認
```

### バックエンドのデバッグ

```php
// エラーログの確認
error_log('デバッグ情報: ' . print_r($data, true));

// PHPエラーログの場所
// /var/log/apache2/error.log または /var/log/nginx/error.log
```

---

## テスト

### フロントエンドのテスト

```bash
# テストの実行
npm test

# カバレッジレポートの生成
npm test -- --coverage
```

### バックエンドのテスト

```bash
# PHPUnitのインストール
composer require --dev phpunit/phpunit

# テストの実行
./vendor/bin/phpunit
```

---

## パフォーマンス最適化

### フロントエンド

- React.memo()を使用してコンポーネントをメモ化
- useMemo()とuseCallback()を使用して計算を最適化
- コード分割と遅延読み込みを実装
- 画像の最適化と遅延読み込み

### バックエンド

- データベースクエリの最適化
- インデックスの適切な使用
- キャッシュの実装（Redisなど）
- クエリ結果のページネーション

---

## セキュリティ

### フロントエンド

- XSS対策: ユーザー入力を適切にエスケープ
- CSRF対策: トークンを使用
- パスワードの安全な保存: localStorageを使用

### バックエンド

- SQLインジェクション対策: プリペアドステートメントを使用
- XSS対策: 出力のエスケープ
- CSRF対策: トークンの検証
- パスワードのハッシュ化: password_hash()を使用
- JWTの適切な管理: 有効期限の設定

---

## 参考資料

- [React公式ドキュメント](https://react.dev/)
- [React Router公式ドキュメント](https://reactrouter.com/)
- [PHP公式ドキュメント](https://www.php.net/docs.php)
- [MySQL公式ドキュメント](https://dev.mysql.com/doc/)
- [JWT.io](https://jwt.io/)

---

## ライセンス

このプロジェクトは内部使用のみを目的としています。
