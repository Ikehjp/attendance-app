@echo off
REM ==========================================
REM データベースマイグレーション実行スクリプト
REM ==========================================

echo ======================================
echo 統合型出欠管理システム
echo データベースマイグレーション実行
echo ======================================
echo.

REM データベース接続情報
set DB_USER=server
set DB_NAME=sotsuken
set MIGRATION_DIR=database_migrations

echo [警告] このスクリプトはデータベースに永続的な変更を加えます。
echo 続行する前に必ずバックアップを取ってください。
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
echo [Step 1] Migration 001: 組織階層とグループ管理
echo テーブル: organizations, groups, group_members, group_teachers
echo users.role に 'teacher' ロールを追加
echo.
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\migration_001_organization_hierarchy.sql
if errorlevel 1 (
    echo [エラー] Migration 001の実行に失敗しました。
    pause
    exit /b 1
)
echo [完了] Migration 001が正常に実行されました。
echo.
pause

echo.
echo [Step 2] Migration 002: QRコード・セキュリティ
echo テーブル: qr_codes, allowed_ip_ranges, scan_logs
echo.
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\migration_002_qr_security.sql
if errorlevel 1 (
    echo [エラー] Migration 002の実行に失敗しました。
    pause
    exit /b 1
)
echo [完了] Migration 002が正常に実行されました。
echo.
pause

echo.
echo [Step 3] Migration 003: 時間割管理
echo テーブル: timetables, class_sessions, schedule_templates
echo.
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\migration_003_timetable.sql
if errorlevel 1 (
    echo [エラー] Migration 003の実行に失敗しました。
    pause
    exit /b 1
)
echo [完了] Migration 003が正常に実行されました。
echo.
pause

echo.
echo [Step 4] Migration 004: 欠席申請・承認フロー
echo テーブル: absence_requests, request_approvals
echo.
mysql -u %DB_USER% -p %DB_NAME% < %MIGRATION_DIR%\migration_004_absence_requests.sql
if errorlevel 1 (
    echo [エラー] Migration 004の実行に失敗しました。
    pause
    exit /b 1
)
echo [完了] Migration 004が正常に実行されました。
echo.

echo ======================================
echo マイグレーション完了！
echo ======================================
echo.
echo 次のステップ:
echo 1. verify_migration.bat を実行してスキーマを確認
echo 2. backend-nodejs ディレクトリで npm install を実行
echo 3. backend-nodejs ディレクトリで npm run dev を実行
echo.
pause
