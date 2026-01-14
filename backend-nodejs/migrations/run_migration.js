const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// .envを親ディレクトリから読み込む
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigrations() {
    let connection;

    try {
        console.log('🔌 データベースに接続中...');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        console.log(`   User: ${process.env.DB_USER}`);

        // データベース接続を作成
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('✅ データベースに接続しました\n');

        // マイグレーション履歴テーブルを作成（存在しない場合）
        await connection.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 実行済みマイグレーションを取得
        const [executed] = await connection.query('SELECT name FROM migrations');
        const executedNames = new Set(executed.map(row => row.name));

        // SQLマイグレーションファイルを取得（連番順）
        const files = await fs.readdir(__dirname);
        const sqlFiles = files
            .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
            .sort();

        if (sqlFiles.length === 0) {
            console.log('📂 マイグレーションファイルが見つかりません');
            return;
        }

        console.log(`📂 ${sqlFiles.length} 件のマイグレーションファイルを検出\n`);

        let appliedCount = 0;
        let skippedCount = 0;

        for (const file of sqlFiles) {
            if (executedNames.has(file)) {
                console.log(`⏭️  ${file} (既に適用済み)`);
                skippedCount++;
                continue;
            }

            const sqlPath = path.join(__dirname, file);
            const sql = await fs.readFile(sqlPath, 'utf8');

            console.log(`🚀 ${file} を実行中...`);

            try {
                await connection.query(sql);
                await connection.query('INSERT INTO migrations (name) VALUES (?)', [file]);
                console.log(`✅ ${file} 適用完了`);
                appliedCount++;
            } catch (error) {
                console.error(`❌ ${file} でエラー発生:`, error.message);
                throw error;
            }
        }

        console.log('\n========================================');
        console.log(`📊 結果: ${appliedCount} 件適用, ${skippedCount} 件スキップ`);
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ マイグレーションエラー:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ データベース接続を閉じました');
        }
    }
}

runMigrations();
