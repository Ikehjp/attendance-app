# システム仕様拡張案

> [!NOTE]
> このドキュメントは2024年11月に作成された提案書です。現在のバックエンド実装は **Node.js (Express)** です。

## 📊 現状の実装状況

### ✅ 既に実装済み

1. **認証システム**
   - ログイン・登録機能 (SaaS型: 管理者/生徒)
   - JWT認証
   - ユーザー権限管理（owner/admin/teacher/student）
   - マルチテナント対応（組織別分離）
   
2. **ページ構成**
   - `/login` - ログインページ
   - `/register` - 登録ページ
   - `/dashboard` - ダッシュボード
   - `/calendar` - カレンダーページ
   - `/student-attendance` - 学生出欠記録
   - `/groups` - グループ管理
   - `/profile` - プロフィール
   - `/student-dashboard` - 学生用ダッシュボード

3. **出欠管理機能**
   - 出欠記録
   - QRコードスキャン
   - グループ管理
   - レポート生成

4. **バックエンド技術スタック**
   - Node.js + Express
   - MySQL (mysql2)
   - JWT認証

---

## 🎯 新しい仕様で追加が必要な機能

### 1. ゲストアクセス機能 🆕

**要件:**
- 未ログイン状態でもサイトを閲覧可能
- 制限付きアクセス（出欠記録などは不可）
- 画面右上のアイコンでサインイン画面に遷移

**実装方針:**
```jsx
// src/contexts/AuthContext.jsx にゲストモードを追加
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isGuest: true, // 新規追加
};

// src/App.jsx でゲストアクセス可能なページを定義
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isGuest } = useAuth();
  return isAuthenticated || isGuest ? children : null;
};
```

**影響範囲:**
- トップページのゲストビュー作成
- ヘッダーにゲスト用のサインインボタン追加
- 一部ページをゲスト閲覧可能にする

---

### 2. イベント作成機能 📅

**要件:**
- カレンダーにイベントを作成・管理
- イベントの共有機能
- イベントへの参加管理

**現状:**
- `/calendar` ページは存在するが、イベント作成機能の実装状況を確認が必要

**実装方針:**
```jsx
// src/pages/EventManagementPage.jsx（新規作成）
- イベント作成フォーム
- イベント一覧表示
- イベント編集・削除
- カレンダーAPI連携
```

**必要なAPI (Node.js/Express):**
```javascript
// backend-nodejs/routes/events.js
- POST /api/events - イベント作成
- GET /api/events - イベント一覧取得
- PUT /api/events/:id - イベント更新
- DELETE /api/events/:id - イベント削除
```

**データベース:**
```sql
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    created_by INT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE event_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

### 3. チャット機能 💬

> [!WARNING]
> **ステータス: 将来のロードマップ**
> チャット機能は現在未実装です。実装する場合はSocket.IOを使用したリアルタイム通信が必要となり、開発工数が大きくなります。

**要件:**
- Slackクローン機能
- ワークスペース管理
- チャンネル管理
- リアルタイムメッセージ送信
- ダイレクトメッセージ

**実装の複雑さ:** ⚠️ **高**

**実装方針:**

#### フロントエンド構造
```
src/
├── pages/
│   └── ChatPage.jsx          # メインのチャットページ
├── components/
│   ├── chat/
│   │   ├── WorkspaceSelector.jsx
│   │   ├── Sidebar.jsx
│   │   ├── MainContent.jsx
│   │   ├── MessageInput.jsx
│   │   └── MessageList.jsx
```

#### バックエンド構造
```
backend-nodejs/
├── routes/
│   └── chat.js               # チャット用API
├── services/
│   └── ChatService.js        # チャットビジネスロジック
└── socket/
    └── chatSocket.js         # Socket.IO実装
```

**必要な技術:**
- Socket.IO (リアルタイム通信)
- WebSocket接続管理
- メッセージ履歴管理

**データベース:**
```sql
CREATE TABLE workspaces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE channels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    channel_id INT,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'file', 'image') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE workspace_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 📋 実装優先順位

### Phase 1: 最小限の実装（1-2週間）
1. ✅ ゲストアクセス機能
2. ✅ イベント作成機能の拡張
3. ✅ ダッシュボードの権限別表示改善

### Phase 2: チャット機能（2-3週間）
4. 🔮 チャット機能の実装 **[将来のロードマップ]**
   - ワークスペース管理
   - 基本的なメッセージ送受信
   
### Phase 3: 高度な機能（1-2週間）
5. 🔄 リアルタイム機能の強化
6. 🔄 チャット機能の高度化
7. 🔄 モバイル最適化

---

## 🔧 即座に実装可能な改善

### 1. ゲストアクセス機能

**変更ファイル:**
- `src/contexts/AuthContext.jsx` - ゲストモード追加
- `src/App.jsx` - ゲストルート追加
- `src/pages/HomePage.jsx` - 新規作成
- `src/components/layout/Header.jsx` - ゲスト用UI

### 2. 権限別ダッシュボード表示

**現在のダッシュボードを機能別に分割:**
- 一般ユーザー: 自分の出欠状況、申請フォーム、イベント
- 管理者: クラス管理、生徒一覧、出欠確認、イベント

---

## 💡 推奨アプローチ

### オプションA: 段階的実装（推奨）
1. まずゲストアクセスとイベント機能を実装
2. 現行システムの安定性を確保
3. ユーザーフィードバックを収集
4. チャット機能を後から追加

### オプションB: 全面的な再設計
- プロトタイプから作り直し
- 実装時間: 3-4週間
- リスク: 高

---

## 📝 次のステップ

どのアプローチで進めますか？

1. **段階的実装を開始** - ゲストアクセスとイベント機能から
2. **全面的な再設計** - 全てを一から実装
3. **現状維持** - エラー修正と安定化を優先

ご希望をお聞かせください！
