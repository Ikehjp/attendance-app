const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'server',
    password: 'pass',
    database: 'sotsuken',
    multipleStatements: true,
};

async function createMissingTables() {
    let conn;
    try {
        console.log('\n=== 不足テーブルの作成 ===\n');
        conn = await mysql.createConnection(DB_CONFIG);

        // 1. attendance_records テーブル
        console.log('[1/3] attendance_records テーブルを作成中...');
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS attendance_records (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '出席記録ID',
          session_id INT NOT NULL COMMENT '授業セッションID',
          student_id VARCHAR(50) NOT NULL COMMENT '学生ID',
          status ENUM('present', 'late', 'absent', 'excused') NOT NULL DEFAULT 'absent' COMMENT '出席状態',
          check_in_time TIMESTAMP NULL DEFAULT NULL COMMENT 'チェックイン時刻',
          qr_code_id INT DEFAULT NULL COMMENT '使用したQRコードID',
          ip_address VARCHAR(45) DEFAULT NULL COMMENT 'チェックイン時のIPアドレス',
          location_data JSON DEFAULT NULL COMMENT '位置情報データ',
          notes TEXT DEFAULT NULL COMMENT '備考',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
          
          FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL,
          
          INDEX idx_session_student (session_id, student_id),
          INDEX idx_student_date (student_id, created_at),
          INDEX idx_status (status),
          UNIQUE KEY unique_session_student (session_id, student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出席記録テーブル'
      `);
            console.log('✓ attendance_records テーブル作成完了');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERR') {
                console.log('⊙ attendance_records テーブルは既に存在します');
            } else {
                console.log('⚠ エラー:', error.message);
            }
        }

        // 2. organization_time_slots テーブル
        console.log('\n[2/3] organization_time_slots テーブルを作成中...');
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS organization_time_slots (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '時間枠ID',
          organization_id INT NOT NULL COMMENT '組織ID',
          period_number INT NOT NULL COMMENT '時限番号',
          period_name VARCHAR(50) DEFAULT NULL COMMENT '時限名',
          start_time TIME NOT NULL COMMENT '開始時刻',
          end_time TIME NOT NULL COMMENT '終了時刻',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
          
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          
          UNIQUE KEY unique_org_period (organization_id, period_number),
          INDEX idx_organization (organization_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織時間枠テーブル'
      `);
            console.log('✓ organization_time_slots テーブル作成完了');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERR') {
                console.log('⊙ organization_time_slots テーブルは既に存在します');
            } else {
                console.log('⚠ エラー:', error.message);
            }
        }

        // 3. invitations テーブル
        console.log('\n[3/3] invitations テーブルを作成中...');
        try {
            await conn.query(`
        CREATE TABLE IF NOT EXISTS invitations (
          id INT AUTO_INCREMENT PRIMARY KEY COMMENT '招待ID',
          organization_id INT NOT NULL COMMENT '招待先組織ID',
          email VARCHAR(255) NOT NULL COMMENT '招待対象のメールアドレス',
          role ENUM('teacher', 'student') NOT NULL COMMENT '招待ロール',
          token VARCHAR(255) UNIQUE NOT NULL COMMENT '招待トークン',
          invited_by INT NOT NULL COMMENT '招待者のユーザーID',
          expires_at TIMESTAMP NOT NULL COMMENT '有効期限',
          accepted_at TIMESTAMP NULL DEFAULT NULL COMMENT '受諾日時',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
          
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
          
          INDEX idx_token (token),
          INDEX idx_expires (expires_at),
          INDEX idx_email_org (email, organization_id),
          INDEX idx_organization_status (organization_id, accepted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招待管理テーブル'
      `);
            console.log('✓ invitations テーブル作成完了');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERR') {
                console.log('⊙ invitations テーブルは既に存在します');
            } else {
                console.log('⚠ エラー:', error.message);
            }
        }

        // 最終確認
        console.log('\n=== 最終テーブル確認 ===');
        const [tables] = await conn.query('SHOW TABLES');
        const tableList = tables.map((t) => Object.values(t)[0]);

        const requiredTables = [
            'attendance_records',
            'organization_time_slots',
            'invitations',
        ];

        console.log('\n作成対象テーブルの状態:');
        requiredTables.forEach((tableName) => {
            const exists = tableList.includes(tableName);
            console.log(`  ${exists ? '✓' : '✗'} ${tableName}`);
        });

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

createMissingTables().catch(console.error);
