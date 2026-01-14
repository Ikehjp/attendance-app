const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'server',
    password: 'pass',
    database: 'sotsuken',
    multipleStatements: true,
};

async function addMissingTablesAndColumns() {
    let conn;
    try {
        console.log('\n=== 不足テーブル・カラムの追加 ===\n');
        conn = await mysql.createConnection(DB_CONFIG);

        // 1. group_teachers テーブル
        console.log('[1/4] group_teachers テーブルを作成中...');
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS group_teachers (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '教員割り当てID',
          group_id INT NOT NULL COMMENT 'グループID',
          user_id INT NOT NULL COMMENT '教員ユーザーID',
          role ENUM('main', 'assistant') DEFAULT 'assistant' COMMENT '担当種別',
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '割り当て日時',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
          
          FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          UNIQUE KEY unique_group_teacher (group_id, user_id),
          INDEX idx_user (user_id),
          INDEX idx_group_role (group_id, role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='グループ教員割り当てテーブル'
      `);
            console.log('✓ group_teachers テーブル作成完了');
        } catch (error) {
            console.log(error.code === 'ER_TABLE_EXISTS_ERR' ? '⊙ 既に存在' : `⚠ エラー: ${error.message}`);
        }

        // 2. scan_logs テーブル
        console.log('\n[2/4] scan_logs テーブルを作成中...');
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS scan_logs (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'スキャンログID',
          qr_code_id INT NOT NULL COMMENT 'QRコードID',
          student_id VARCHAR(50) DEFAULT NULL COMMENT '学生ID',
          scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'スキャン時刻',
          ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IPアドレス',
          user_agent TEXT DEFAULT NULL COMMENT 'ユーザーエージェント',
          location_data JSON DEFAULT NULL COMMENT '位置情報',
          status ENUM('success', 'failed', 'invalid') NOT NULL DEFAULT 'success' COMMENT 'スキャン結果',
          error_message TEXT DEFAULT NULL COMMENT 'エラーメッセージ',
          
          FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
          
          INDEX idx_qr_code (qr_code_id),
          INDEX idx_student (student_id),
          INDEX idx_scan_time (scan_time),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QRコードスキャンログテーブル'
      `);
            console.log('✓ scan_logs テーブル作成完了');
        } catch (error) {
            console.log(error.code === 'ER_TABLE_EXISTS_ERR' ? '⊙ 既に存在' : `⚠ エラー: ${error.message}`);
        }

        // 3. request_approvals テーブル
        console.log('\n[3/4] request_approvals テーブルを作成中...');
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS request_approvals (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '承認ID',
          request_id INT NOT NULL COMMENT '申請ID',
          approver_id INT NOT NULL COMMENT '承認者ID',
          status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '承認状態',
          comments TEXT DEFAULT NULL COMMENT '承認コメント',
          approved_at TIMESTAMP NULL DEFAULT NULL COMMENT '承認日時',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
          
          FOREIGN KEY (request_id) REFERENCES absence_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
          
          INDEX idx_request (request_id),
          INDEX idx_approver (approver_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='申請承認テーブル'
      `);
            console.log('✓ request_approvals テーブル作成完了');
        } catch (error) {
            console.log(error.code === 'ER_TABLE_EXISTS_ERR' ? '⊙ 既に存在' : `⚠ エラー: ${error.message}`);
        }

        // 4. organization_activity_logs テーブル
        console.log('\n[4/4] organization_activity_logs テーブルを作成中...');
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS organization_activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ログID',
          organization_id INT NOT NULL COMMENT '組織ID',
          user_id INT DEFAULT NULL COMMENT '実行ユーザーID',
          action VARCHAR(100) NOT NULL COMMENT 'アクション',
          details JSON DEFAULT NULL COMMENT '詳細情報',
          ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IPアドレス',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '実行日時',
          
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          
          INDEX idx_organization_action (organization_id, action),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織アクティビティログ'
      `);
            console.log('✓ organization_activity_logs テーブル作成完了');
        } catch (error) {
            console.log(error.code === 'ER_TABLE_EXISTS_ERR' ? '⊙ 既に存在' : `⚠ エラー: ${error.message}`);
        }

        // カラムの追加
        console.log('\n=== 不足カラムの追加 ===\n');

        // organizations.owner_id
        console.log('[1/3] organizations.owner_id を追加中...');
        try {
            await conn.query('ALTER TABLE organizations ADD COLUMN owner_id INT DEFAULT NULL COMMENT "組織オーナーのユーザーID"');
            console.log('✓ owner_id カラム追加完了');
        } catch (error) {
            console.log(error.code === 'ER_DUP_FIELDNAME' ? '⊙ 既に存在' : `⚠ エラー: ${error.message}`);
        }

        // groups.organization_id
        console.log('\n[2/3] groups.organization_id を追加中...');
        try {
            await conn.query('ALTER TABLE `groups` ADD COLUMN organization_id INT DEFAULT 1 COMMENT "所属組織ID"');
            console.log('✓ organization_id カラム追加完了');

            // 外部キー制約を追加
            try {
                await conn.query('ALTER TABLE `groups` ADD CONSTRAINT fk_groups_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
                console.log('✓ 外部キー制約追加完了');
            } catch (fkError) {
                console.log(fkError.code === 'ER_DUP_KEYNAME' ? '⊙ 外部キー制約は既に存在' : `⚠ 外部キーエラー: ${fkError.message}`);
            }
        } catch (error) {
            console.log(error.code === 'ER_DUP_FIELDNAME' ? '⊙ 既に存在' : `⚠ エラー: ${error.message}`);
        }

        // groups.status
        console.log('\n[3/3] groups.status を追加中...');
        try {
            await conn.query('ALTER TABLE `groups` ADD COLUMN status ENUM("active", "inactive", "archived") DEFAULT "active" COMMENT "グループ状態"');
            console.log('✓ status カラム追加完了');
        } catch (error) {
            console.log(error.code === 'ER_DUP_FIELDNAME' ? '⊙ 既に存在' : `⚠ エラー: ${error.message}`);
        }

        console.log('\n=== すべての処理が完了しました ===\n');
    } catch (error) {
        console.error('エラー:', error.message);
        process.exit(1);
    } finally {
        if (conn) {
            await conn.end();
        }
    }
}

addMissingTablesAndColumns().catch(console.error);
