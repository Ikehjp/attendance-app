# サブフォルダデプロイ手順書

## 概要

このドキュメントでは、Reactアプリケーションを `/var/www/html/link-up` に配置し、トップページからリンクを設置する手順を説明します。

## セットアップ済みの設定

以下の設定が既に完了しています：

### 1. package.json の設定
```json
"homepage": "/link-up"
```

### 2. React Router の設定
`src/App.jsx` で `BrowserRouter` に `basename="/link-up"` を設定済み

### 3. PWA設定
- `public/manifest.json` の `start_url` と `scope` を `/link-up/` に設定済み
- `public/sw.js` のパスを `/link-up/` 対応に設定済み

### 4. Apache設定
- `public/.htaccess` を作成済み（React Router対応）

## デプロイ手順

### ステップ1: ビルドファイルの確認

ビルドが完了していることを確認します：

```bash
# Windows（開発環境）で実行済み
npm run build
```

ビルドが成功すると、以下のようなメッセージが表示されます：
```
The project was built assuming it is hosted at /link-up/.
```

### ステップ2: サーバーへのファイル転送

`build` フォルダの内容をサーバーの `/var/www/html/link-up/` にアップロードします：

```bash
# サーバー上で実行
sudo mkdir -p /var/www/html/link-up
sudo cp -r build/* /var/www/html/link-up/

# または SCP を使用して転送
scp -r build/* user@server:/var/www/html/link-up/
```

### ステップ3: トップページの配置

`index.html` をサーバーの `/var/www/html/` に配置します：

```bash
# サーバー上で実行
sudo cp index.html /var/www/html/
```

### ステップ4: ファイル権限の設定

```bash
# サーバー上で実行
sudo chown -R www-data:www-data /var/www/html/link-up
sudo chown -R www-data:www-data /var/www/html/index.html
sudo chmod -R 755 /var/www/html/link-up
```

### ステップ5: Apache設定の確認

`.htaccess` が正しく機能するように、Apache の設定を確認します：

```bash
# Apache の設定確認
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### ステップ6: 動作確認

ブラウザで以下のURLにアクセスして動作を確認します：

1. **トップページ**: `http://your-server-ip/`
2. **アプリ本体**: `http://your-server-ip/link-up/`
3. **ログインページ**: `http://your-server-ip/link-up/login`

## ファイル構成

デプロイ後のファイル構成は以下の通りです：

```
/var/www/html/
├── index.html                    # トップページ
└── link-up/
    ├── index.html                # Reactアプリ
    ├── .htaccess                 # Apache設定
    ├── manifest.json             # PWA設定
    ├── sw.js                     # Service Worker
    ├── static/
    │   ├── js/
    │   │   ├── main.*.js
    │   │   └── 206.*.js
    │   └── css/
    │       └── main.*.css
    └── [その他のアセット]
```

## 注意事項

### 1. パスの一貫性
すべてのリソースパスは `/link-up/` で始まる必要があります。

### 2. React Router の動作
SPAのため、すべてのルートは `index.html` にリダイレクトされます。これは `.htaccess` で実現しています。

### 3. PWA機能
Service Worker は `/link-up/sw.js` に配置されます。

### 4. キャッシュ
ビルドファイル名にハッシュが付いているため、キャッシュの問題は発生しません。

## トラブルシューティング

### 問題1: ページが真っ白になる
- **原因**: パスが正しく設定されていない
- **解決策**: 
  1. ブラウザのコンソールでエラーを確認
  2. `package.json` の `homepage` が `/link-up` になっているか確認
  3. `App.jsx` の `basename` が `/link-up` になっているか確認

### 問題2: ルーティングが機能しない
- **原因**: `.htaccess` が機能していない
- **解決策**:
  ```bash
  sudo a2enmod rewrite
  sudo systemctl restart apache2
  ```

### 問題3: 静的なリソースが読み込まれない
- **原因**: ファイル権限の問題
- **解決策**:
  ```bash
  sudo chmod -R 755 /var/www/html/link-up
  ```

### 問題4: Service Worker が機能しない
- **原因**: HTTPS が必要な場合がある
- **解決策**: 本番環境では HTTPS を推奨

## 開発環境でのテスト

本番環境にデプロイする前に、ローカルでテストできます：

```bash
# 本番環境と同じ構成でテストする場合
# serve をインストール
npm install -g serve

# buildフォルダをルートとして起動
cd build
serve -s . -l 3000

# サブフォルダでテストする場合
# C:\Users\yasud\attendance-app に戻る
serve -s build -l 3000 --rewrite

# ブラウザで以下にアクセス
# http://localhost:3000/link-up/
```

## 更新手順

アプリを更新する場合は、以下の手順を実行します：

1. ソースコードを更新
2. `npm run build` でビルド
3. サーバーの `/var/www/html/link-up/` を更新
4. ファイル権限を再設定（必要に応じて）

## まとめ

以上の手順で、Reactアプリケーションをサブフォルダに配置し、トップページからリンクを設置できます。

重要なポイント：
- ✅ `homepage: "/link-up"` を設定
- ✅ `basename="/link-up"` を設定
- ✅ PWA設定を更新
- ✅ `.htaccess` を配置
- ✅ ファイル権限を正しく設定

質問や問題が発生した場合は、上記のトラブルシューティングを参照してください。

