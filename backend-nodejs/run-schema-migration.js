/**
 * マイグレーション実行スクリプト
 * 新スキーマへの移行を順番に実行
 */
const fs = require('fs');
const path = require('path');
const { query, getConnection } = require('./config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigration() {
    console.log('========================================');
    console.log('データベースマイグレーション開始');
    console.log('========================================\n');

    const migrationFiles = [
        '100_refactored_schema.sql',
        '101_data_migration.sql'
        // 102_rename_tables.sql は手動で実行（ロールバック用）
    ];

    try {
        for (const file of migrationFiles) {
            const filePath = path.join(MIGRATIONS_DIR, file);

            if (!fs.existsSync(filePath)) {
                console.error(`❌ ファイルが見つかりません: ${file}`);
                continue;
            }

            console.log(`\n📄 実行中: ${file}`);
            console.log('-'.repeat(40));

            const sql = fs.readFileSync(filePath, 'utf8');

            // SQLを個別のステートメントに分割
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            let successCount = 0;
            let errorCount = 0;

            for (const statement of statements) {
                try {
                    // コメントのみの行はスキップ
                    if (statement.startsWith('--') || statement.startsWith('/*')) {
                        continue;
                    }

                    await query(statement);
                    successCount++;

                    // CREATE TABLE の場合は表示
                    if (statement.toUpperCase().includes('CREATE TABLE')) {
                        const match = statement.match(/CREATE TABLE[^`]*`([^`]+)`/i);
                        if (match) {
                            console.log(`  ✓ テーブル作成: ${match[1]}`);
                        }
                    }

                    // INSERT の場合は表示
                    if (statement.toUpperCase().includes('INSERT INTO')) {
                        const match = statement.match(/INSERT INTO\s+`?([^\s`(]+)`?/i);
                        if (match) {
                            console.log(`  ✓ データ挿入: ${match[1]}`);
                        }
                    }
                } catch (error) {
                    // 重複キーエラーは警告として扱う
                    if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_KEY') {
                        console.log(`  ⚠ 重複スキップ: ${error.message.substring(0, 50)}...`);
                    } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log(`  ⚠ テーブル既存: ${error.message.substring(0, 50)}...`);
                    } else {
                        console.error(`  ❌ エラー: ${error.message}`);
                        errorCount++;
                    }
                }
            }

            console.log(`\n  完了: ${successCount} 成功, ${errorCount} エラー`);
        }

        console.log('\n========================================');
        console.log('✅ マイグレーション完了');
        console.log('========================================\n');

        // 新テーブルの確認
        console.log('📊 新テーブルの確認:');
        const tables = await query(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME LIKE '%_new'
      ORDER BY TABLE_NAME
    `);

        tables.forEach(t => {
            console.log(`  - ${t.TABLE_NAME}: ${t.TABLE_ROWS || 0} 行`);
        });

        console.log('\n⚠️ 注意: テーブル名の切り替え（102_rename_tables.sql）は');
        console.log('   動作確認後に手動で実行してください。\n');

    } catch (error) {
        console.error('❌ マイグレーション失敗:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

runMigration();
