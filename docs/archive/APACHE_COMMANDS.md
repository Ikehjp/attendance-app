# Apacheコマンド一覧

## Apacheサービスの管理

### サービスの確認
```bash
sudo systemctl status apache2
```

### Apacheの起動
```bash
sudo systemctl start apache2
```

### Apacheの停止
```bash
sudo systemctl stop apache2
```

### Apacheの再起動
```bash
sudo systemctl restart apache2
```

### Apacheの設定をリロード（再起動なし）
```bash
sudo systemctl reload apache2
```

### Apacheの有効化（自動起動）
```bash
sudo systemctl enable apache2
```

### Apacheの無効化（自動起動停止）
```bash
sudo systemctl disable apache2
```

## エラーログの確認

### リアルタイムでエラーログを表示
```bash
sudo tail -f /var/log/apache2/error.log
```

### 最新の50行を表示
```bash
sudo tail -n 50 /var/log/apache2/error.log
```

### アクセスログを表示
```bash
sudo tail -f /var/log/apache2/access.log
```

## 設定ファイルの確認とテスト

### 設定ファイルの構文チェック
```bash
sudo apache2ctl configtest
```

### 設定ファイルの場所
```bash
# メインの設定ファイル
/etc/apache2/apache2.conf

# サイト設定
/etc/apache2/sites-available/
/etc/apache2/sites-enabled/

# モジュール設定
/etc/apache2/mods-available/
/etc/apache2/mods-enabled/
```

## モジュールの管理

### 有効なモジュールを確認
```bash
apache2ctl -M
```

### rewriteモジュールを有効化
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### headersモジュールを有効化
```bash
sudo a2enmod headers
sudo systemctl restart apache2
```

### 無効化
```bash
sudo a2dismod rewrite
sudo systemctl restart apache2
```

## トラブルシューティング

### Apacheが起動しない場合
```bash
# ステータス確認
sudo systemctl status apache2

# 詳細なエラーメッセージを確認
sudo journalctl -u apache2
sudo journalctl -u apache2 -n 50
```

### ポートが使用中の場合
```bash
# 使用中のポートを確認
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Apacheの設定を確認
sudo lsof -i :80
```

### 権限の問題
```bash
# ファイルの所有権を確認
ls -la /var/www/html

# 所有権を修正
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### .htaccessが機能しない場合
```bash
# AllowOverrideの設定を確認
sudo grep -r "AllowOverride" /etc/apache2/

# AllowOverrideを有効化する場合
# /etc/apache2/sites-available/000-default.conf または
# /etc/apache2/sites-available/default.conf
# で以下のように設定:
# <Directory /var/www/html>
#     AllowOverride All
# </Directory>
```

## 一般的なコマンドまとめ

```bash
# 最もよく使用するコマンド
sudo systemctl restart apache2    # Apache再起動
sudo tail -f /var/log/apache2/error.log  # エラーログの監視
sudo apache2ctl configtest        # 設定確認
```

## 現在のプロジェクトで必要な作業

```bash
# 1. モジュールを有効化
sudo a2enmod rewrite
sudo a2enmod headers

# 2. Apacheを再起動
sudo systemctl restart apache2

# 3. エラーログを確認
sudo tail -f /var/log/apache2/error.log

# 4. ステータス確認
sudo systemctl status apache2
```

