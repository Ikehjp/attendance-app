#!/bin/bash
# バックエンド配置スクリプト (Node.js用)

echo "=== バックエンド配置を開始します ==="

# 設定
APP_DIR="/var/www/html/attendance-backend"
API_LINK="/var/www/html/api"

# 1. ディレクトリの作成
echo "ディレクトリを作成中..."
sudo mkdir -p $APP_DIR

# 2. 権限の設定 (現在のユーザーに一時的に権限を付与)
echo "権限を設定中..."
sudo chown -R $USER:$USER $APP_DIR

# 3. ファイルのコピー (手動アップロード前提の場合はスキップ、またはここで行う)
# ここでは、カレントディレクトリの内容をデプロイ先にコピーすると仮定
# echo "ファイルをコピー中..."
# cp -r ./* $APP_DIR/

# 4. 依存関係のインストール
echo "依存関係をインストール中..."
cd $APP_DIR
npm install --production

# 5. 環境変数の確認
if [ ! -f .env ]; then
    echo "警告: .envファイルが見つかりません。.env.exampleをコピーして設定してください。"
    cp .env.example .env
fi

# 6. PM2によるプロセス管理
echo "PM2でプロセスを再起動中..."
# PM2がインストールされているか確認
if command -v pm2 &> /dev/null; then
    pm2 describe attendance-backend > /dev/null
    if [ $? -eq 0 ]; then
        pm2 reload attendance-backend
    else
        pm2 start server.js --name "attendance-backend"
        pm2 save
    fi
else
    echo "エラー: PM2がインストールされていません。'npm install -g pm2' を実行してください。"
fi

# 7. シンボリックリンクの作成 (必要であれば)
# フロントエンドからのアクセスパスを維持するため
# 注意: Node.jsは通常ポート(3001)で動作するため、Apache/Nginxのリバースプロキシ設定が別途必要です。
# このスクリプトではリバースプロキシの設定は行いません。

echo ""
echo "=== 配置完了 ==="
echo ""
echo "次のステップ:"
echo "1. .envファイルを編集してデータベース接続情報などを設定してください。"
echo "2. Apache/Nginxの設定で、/api へのリクエストを http://localhost:3001 にプロキシするように設定してください。"
echo "   例 (Apache):"
echo "   ProxyPass /api http://localhost:3001/api"
echo "   ProxyPassReverse /api http://localhost:3001/api"
