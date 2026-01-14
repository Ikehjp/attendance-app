/**
 * イベント管理テーブルのマイグレーションスクリプト
 * Phase 2: イベント管理機能の追加
 */

require('dotenv').config();
const { query } = require('../config/database');
const logger = require('../utils/logger');

async function runMigration() {
  try {
    logger.info('イベント管理テーブルのマイグレーションを開始します...');

    // イベントテーブルの作成
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'イベントID',
        title VARCHAR(255) NOT NULL COMMENT 'イベントタイトル',
        description TEXT NULL COMMENT 'イベント説明',
        start_date DATETIME NOT NULL COMMENT '開始日時',
        end_date DATETIME NULL COMMENT '終了日時',
        location VARCHAR(255) NULL COMMENT '場所',
        created_by INT NOT NULL COMMENT '作成者ID',
        is_public BOOLEAN DEFAULT FALSE COMMENT '公開フラグ',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_start_date (start_date),
        INDEX idx_end_date (end_date),
        INDEX idx_created_by (created_by),
        INDEX idx_is_public (is_public),
        INDEX idx_date_range (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベントテーブル'
    `);

    logger.info('✓ eventsテーブルを作成しました');

    // イベント参加者テーブルの作成
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '参加者ID',
        event_id INT NOT NULL COMMENT 'イベントID',
        user_id INT NOT NULL COMMENT 'ユーザーID',
        status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending' COMMENT '参加ステータス',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_event_user (event_id, user_id),
        INDEX idx_event_id (event_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベント参加者テーブル'
    `);

    logger.info('✓ event_participantsテーブルを作成しました');
    logger.info('✅ マイグレーションが正常に完了しました');

    process.exit(0);
  } catch (error) {
    logger.error('❌ マイグレーションエラー:', error.message);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
}

runMigration();

