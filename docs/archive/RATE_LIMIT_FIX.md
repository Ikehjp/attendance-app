# レートリミット設定の修正

## 問題
認証API（`/api/auth/*`）のレートリミットが厳しすぎて、開発環境で「認証リクエストが多すぎます」というエラーが発生していました。

## 修正内容

### 1. `.env`ファイルの更新
```env
# 変更前
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# 変更後
AUTH_RATE_LIMIT_MAX_REQUESTS=50
```

### 2. `server.js`の更新
- **レートリミット値**: 開発環境で15分間で5リクエスト → **50リクエスト**に変更
- **skipSuccessfulRequests**: `false` → `true` に変更
  - 成功したログインリクエストはカウントされなくなりました
  - 失敗したリクエスト（間違ったパスワードなど）のみがカウントされます

### 変更前の設定
```javascript
max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 10 : 5),
skipSuccessfulRequests: false,
```

### 変更後の設定
```javascript
max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 10 : 50),
skipSuccessfulRequests: true, // 成功したリクエストはカウントしない
```

## 効果

1. **開発環境での制限緩和**: 15分間で50リクエストまで許可
2. **成功リクエストの除外**: 正しい認証情報でのログインはカウントされない
3. **セキュリティ維持**: 失敗したリクエストのみがカウントされるため、ブルートフォース攻撃からは保護される

## 本番環境への注意

本番環境では、環境変数 `AUTH_RATE_LIMIT_MAX_REQUESTS` を適切に設定してください：
- セキュリティを重視する場合: `10` または `5`
- ユーザー体験を重視する場合: `20` または `30`

## テスト方法

1. サーバーを再起動
2. 複数回ログインを試行
3. エラーが出ないことを確認

