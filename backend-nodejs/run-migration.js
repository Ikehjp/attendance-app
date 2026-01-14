const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

/**
 * マイグレーション実行スクリプト
 * 使用方法: node run-migration.js --confirm
 */

async function runMigration() {
    let connection;

    try {
        console.log('🚀 マイグレーション開始...\n');

        // データベース接続（既存の設定に合わせる）
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'server',
            password: 'pass',
            database: 'sotsuken',
            multipleStatements: true  // 複数のSQL文を実行可能にする
        });

        console.log('✅ データベース接続成功\n');

        // マイグレーションファイルを読み込み
        const migrationPath = path.join(__dirname, 'migrations', '001_multi_tenant_architecture.sql');
        const sqlContent = await fs.readFile(migrationPath, 'utf-8');

        console.log('📄 マイグレーションファイル読み込み完了\n');
        console.log('⚠️  警告: このマイグレーションは既存のユーザーデータを削除します');
        console.log('⚠️  警告: 実行前にデータベースのバックアップを取得することを推奨します\n');

        // 確認プロンプト（自動実行の場合はスキップ）
        if (process.argv.includes('--confirm')) {
            console.log('🔧 マイグレーション実行中...\n');

            // SQL実行
            await connection.query(sqlContent);

            console.log('✅ マイグレーション完了\n');

            // 結果確認
            const [results] = await connection.query('SELECT * FROM v_organization_summary');
            console.log('📊 組織サマリー:');
            console.table(results);

            console.log('\n🎉 マルチテナントアーキテクチャへの移行が完了しました！');
            console.log('\n初期ログイン情報:');
            console.log('  Email: admin@example.com');
            console.log('  Password: admin123');
            console.log('  Role: owner');
            console.log('  Organization: デフォルト組織\n');

        } else {
            console.log('❌ マイグレーションは実行されませんでした');
            console.log('   実行するには --confirm フラグを付けてください:');
            console.log('   node run-migration.js --confirm\n');
        }

    } catch (error) {
        console.error('❌ マイグレーションエラー:', error.message);
        if (error.sql) {
            console.error('\n失敗したSQL:');
            console.error(error.sql.substring(0, 500));
        }
        console.error('\n詳細:');
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('データベース接続を閉じました');
        }
    }
}

// 実行
runMigration();
