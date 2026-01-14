/**
 * データベースマイグレーション管理スクリプト
 * 
 * 使用方法:
 *   npm run migrate              - 未実行のマイグレーションをすべて実行
 *   npm run migrate:status       - マイグレーションのステータス確認
 *   npm run migrate:rollback     - 最後のマイグレーションをロールバック
 *   npm run migrate:create 名前  - 新しいマイグレーションファイルを作成
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { pool, query, transaction } = require('../config/database');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * マイグレーション管理テーブルの作成
 */
async function createMigrationsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INT NULL,
        checksum VARCHAR(64) NULL,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT NULL,
        INDEX idx_version (version),
        INDEX idx_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('マイグレーション管理テーブルを確認しました');
  } catch (error) {
    logger.error('マイグレーション管理テーブル作成エラー:', error.message);
    throw error;
  }
}

/**
 * 実行済みマイグレーションの取得
 */
async function getExecutedMigrations() {
  try {
    const rows = await query(
      `SELECT version, name, executed_at, success FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`
    );
    return rows;
  } catch (error) {
    logger.error('実行済みマイグレーション取得エラー:', error.message);
    return [];
  }
}

/**
 * マイグレーションファイルの一覧取得
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(file => file.endsWith('.sql') || file.endsWith('.js'))
      .filter(file => !file.includes('run_migration')) // 実行スクリプト除外
      .sort();
  } catch (error) {
    logger.error('マイグレーションファイル読み込みエラー:', error.message);
    return [];
  }
}

/**
 * ファイルのチェックサム計算
 */
function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * SQLマイグレーションの実行
 */
async function executeSqlMigration(filePath, content) {
  const statements = content
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await query(statement + ';');
  }
}

/**
 * JSマイグレーションの実行
 */
async function executeJsMigration(filePath) {
  const migration = require(filePath);
  
  if (typeof migration.up !== 'function') {
    throw new Error('マイグレーションには up() 関数が必要です');
  }

  await migration.up({ query, transaction });
}

/**
 * 単一マイグレーションの実行
 */
async function runMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const version = filename.replace(/\.(sql|js)$/, '');
  
  logger.info(`マイグレーション実行: ${filename}`);
  const startTime = Date.now();

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const checksum = calculateChecksum(content);

    await transaction(async (conn) => {
      // マイグレーション実行
      if (filename.endsWith('.sql')) {
        await executeSqlMigration(filePath, content);
      } else if (filename.endsWith('.js')) {
        await executeJsMigration(filePath);
      }

      // 実行記録を保存
      const executionTime = Date.now() - startTime;
      await query(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, name, execution_time_ms, checksum, success) VALUES (?, ?, ?, ?, ?)`,
        [version, filename, executionTime, checksum, true]
      );
    });

    logger.info(`✅ ${filename} 完了 (${Date.now() - startTime}ms)`);
    return { success: true, filename, time: Date.now() - startTime };
  } catch (error) {
    logger.error(`❌ ${filename} 失敗:`, error.message);
    
    // エラー記録を保存
    try {
      await query(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, name, success, error_message) VALUES (?, ?, ?, ?)`,
        [version, filename, false, error.message]
      );
    } catch (logError) {
      logger.error('エラーログ保存失敗:', logError.message);
    }

    return { success: false, filename, error: error.message };
  }
}

/**
 * 未実行マイグレーションの実行
 */
async function runPendingMigrations() {
  try {
    await createMigrationsTable();

    const allFiles = await getMigrationFiles();
    const executed = await getExecutedMigrations();
    const executedVersions = new Set(executed.map(m => m.version));

    const pending = allFiles.filter(file => {
      const version = file.replace(/\.(sql|js)$/, '');
      return !executedVersions.has(version);
    });

    if (pending.length === 0) {
      logger.info('✅ 実行すべきマイグレーションはありません');
      return { success: true, count: 0 };
    }

    logger.info(`📋 ${pending.length}個の未実行マイグレーションが見つかりました`);

    const results = [];
    for (const file of pending) {
      const result = await runMigration(file);
      results.push(result);

      if (!result.success) {
        logger.error('マイグレーションが失敗しました。中断します。');
        break;
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info(`\n📊 マイグレーション結果: ${successCount}個成功, ${failCount}個失敗`);

    return {
      success: failCount === 0,
      count: successCount,
      results
    };
  } catch (error) {
    logger.error('マイグレーション実行エラー:', error.message);
    throw error;
  }
}

/**
 * マイグレーションステータスの表示
 */
async function showStatus() {
  try {
    await createMigrationsTable();

    const allFiles = await getMigrationFiles();
    const executed = await getExecutedMigrations();
    const executedMap = new Map(executed.map(m => [m.version, m]));

    console.log('\n📋 マイグレーションステータス\n');
    console.log('ステータス | ファイル名 | 実行日時');
    console.log('---------|---------|----------');

    for (const file of allFiles) {
      const version = file.replace(/\.(sql|js)$/, '');
      const migration = executedMap.get(version);

      if (migration) {
        const status = migration.success ? '✅ 実行済み' : '❌ 失敗';
        const date = new Date(migration.executed_at).toLocaleString('ja-JP');
        console.log(`${status} | ${file} | ${date}`);
      } else {
        console.log(`⏳ 未実行   | ${file} | -`);
      }
    }

    const pendingCount = allFiles.length - executed.filter(m => m.success).length;
    console.log(`\n合計: ${allFiles.length}個 (実行済み: ${executed.filter(m => m.success).length}, 未実行: ${pendingCount})\n`);
  } catch (error) {
    logger.error('ステータス表示エラー:', error.message);
    throw error;
  }
}

/**
 * 最後のマイグレーションをロールバック
 */
async function rollbackLast() {
  try {
    await createMigrationsTable();

    const executed = await getExecutedMigrations();
    const successful = executed.filter(m => m.success);

    if (successful.length === 0) {
      logger.info('ロールバックするマイグレーションがありません');
      return;
    }

    const lastMigration = successful[successful.length - 1];
    logger.info(`ロールバック中: ${lastMigration.name}`);

    const filePath = path.join(MIGRATIONS_DIR, lastMigration.name);

    // JSマイグレーションの場合はdown関数を実行
    if (lastMigration.name.endsWith('.js')) {
      const migration = require(filePath);
      
      if (typeof migration.down !== 'function') {
        logger.warn('このマイグレーションにはdown()関数がありません');
      } else {
        await transaction(async (conn) => {
          await migration.down({ query, transaction });
          await query(
            `DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`,
            [lastMigration.version]
          );
        });
        logger.info(`✅ ${lastMigration.name} をロールバックしました`);
      }
    } else {
      logger.warn('SQLマイグレーションのロールバックは手動で行う必要があります');
      logger.info(`マイグレーション記録を削除する場合: DELETE FROM ${MIGRATIONS_TABLE} WHERE version = '${lastMigration.version}'`);
    }
  } catch (error) {
    logger.error('ロールバックエラー:', error.message);
    throw error;
  }
}

/**
 * 新しいマイグレーションファイルの作成
 */
async function createMigration(name) {
  try {
    if (!name) {
      throw new Error('マイグレーション名を指定してください');
    }

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    const filename = `${timestamp}_${name}.js`;
    const filePath = path.join(MIGRATIONS_DIR, filename);

    const template = `/**
 * マイグレーション: ${name}
 * 作成日時: ${new Date().toLocaleString('ja-JP')}
 */

/**
 * マイグレーションの適用
 */
async function up({ query, transaction }) {
  // マイグレーション処理をここに記述
  await query(\`
    -- SQL文を記述
  \`);
}

/**
 * マイグレーションのロールバック
 */
async function down({ query, transaction }) {
  // ロールバック処理をここに記述
  await query(\`
    -- SQL文を記述
  \`);
}

module.exports = { up, down };
`;

    await fs.writeFile(filePath, template, 'utf8');
    logger.info(`✅ マイグレーションファイルを作成しました: ${filename}`);
    console.log(`\nファイルパス: ${filePath}\n`);
  } catch (error) {
    logger.error('マイグレーションファイル作成エラー:', error.message);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  const command = process.argv[2] || 'run';
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'run':
      case 'up':
        await runPendingMigrations();
        break;

      case 'status':
        await showStatus();
        break;

      case 'rollback':
      case 'down':
        await rollbackLast();
        break;

      case 'create':
        await createMigration(arg);
        break;

      default:
        console.log(`
使用方法:
  npm run migrate              - 未実行のマイグレーションをすべて実行
  npm run migrate:status       - マイグレーションのステータス確認
  npm run migrate:rollback     - 最後のマイグレーションをロールバック
  npm run migrate:create 名前  - 新しいマイグレーションファイルを作成
        `);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('エラー:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main();
}

module.exports = {
  runPendingMigrations,
  showStatus,
  rollbackLast,
  createMigration
};
