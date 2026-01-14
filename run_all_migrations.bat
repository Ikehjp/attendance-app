@echo off
REM ==========================================
REM 統合データベースマイグレーション実行スクリプト
REM ==========================================

echo ======================================
echo 統合型出欠管理システム
echo データベースマイグレーション実行
echo ======================================
echo.

REM データベース接続情報
set DB_USER=server
set DB_NAME=sotsuken
set BACKEND_DIR=backend-nodejs\migrations

echo [警告] このスクリプトはデータベースに永続的な変更を加えます。
echo 続行する前に必ずバックアップを取ってください。
echo.
echo データベース: %DB_NAME%
echo ユーザー: %DB_USER%
echo.
pause

echo.
echo [Step 0] データベース接続確認...
mysql -u %DB_USER% -p -e "USE %DB_NAME%; SELECT 'データベース接続成功' AS status;"
if errorlevel 1 (
    echo [エラー] データベースへの接続に失敗しました。
    echo 接続情報を確認してください。
    pause
    exit /b 1
)

echo.
echo [Step 1] バックエンドマイグレーション: マルチテナントアーキテクチャ
mysql -u %DB_USER% -p %DB_NAME% < %BACKEND_DIR%\001_multi_tenant_architecture.sql
if errorlevel 1 (
    echo [警告] Migration 001でエラーが発生しましたが、続行します。
)
echo [完了] Migration 001実行完了
echo.

echo [Step 2] join_codeカラムの追加
mysql -u %DB_USER% -p %DB_NAME% < %BACKEND_DIR%\002_add_join_code.sql
if errorlevel 1 (
    echo [警告] Migration 002でエラーが発生しましたが、続行します。
)
echo [完了] Migration 002実行完了
echo.

echo [Step 3] 時間割設定の追加
mysql -u %DB_USER% -p %DB_NAME% < %BACKEND_DIR%\002_timetable_settings.sql
if errorlevel 1 (
    echo [警告] Migration 003でエラーが発生しましたが、続行します。
)
echo [完了] Migration 003実行完了
echo.

echo [Step 4] ユーザーテーブルの修正
mysql -u %DB_USER% -p %DB_NAME% < %BACKEND_DIR%\003_fix_user_table.sql
if errorlevel 1 (
    echo [警告] Migration 004でエラーが発生しましたが、続行します。
)
echo [完了] Migration 004実行完了
echo.

echo [Step 5] roleカラムの修正
mysql -u %DB_USER% -p %DB_NAME% < %BACKEND_DIR%\004_fix_role_column.sql
if errorlevel 1 (
    echo [警告] Migration 005でエラーが発生しましたが、続行します。
)
echo [完了] Migration 005実行完了
echo.

echo [Step 6] request_typeカラムの修正
mysql -u %DB_USER% -p %DB_NAME% < %BACKEND_DIR%\005_fix_request_type.sql
if errorlevel 1 (
    echo [警告] Migration 006でエラーが発生しましたが、続行します。
)
echo [完了] Migration 006実行完了
echo.

echo [Step 7] グループアイコンとステータスの追加
mysql -u %DB_USER% -p %DB_NAME% < %BACKEND_DIR%\add_group_icon_and_status.sql
if errorlevel 1 (
    echo [警告] Migration 007でエラーが発生しましたが、続行します。
)
echo [完了] Migration 007実行完了
echo.

echo.
echo ======================================
echo マイグレーション完了！
echo ======================================
echo.
echo 次のステップ:
echo 1. backend-nodejs ディレクトリで npm install を実行
echo 2. backend-nodejs ディレクトリで npm run dev を実行
echo 3. フロントエンドで npm start を実行
echo.
pause
