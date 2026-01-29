// qr_codesテーブルにorganization_idを追加するスクリプト
const mysql = require('mysql2/promise');
const dbConfig = require('./db_config');

async function addOrganizationId() {
    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('qr_codes テーブルに organization_id カラムを追加中...\n');

        // organization_idカラムを追加
        await connection.query(`
      ALTER TABLE qr_codes 
      ADD COLUMN organization_id INT NOT NULL DEFAULT 1 
      COMMENT '所属組織ID' 
      AFTER is_active
    `);
        console.log('✓ organization_id カラムを追加しました');

        // 外部キー制約を追加
        await connection.query(`
      ALTER TABLE qr_codes 
      ADD CONSTRAINT fk_qr_codes_organization
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);
        console.log('✓ 外部キー制約を追加しました');

        // インデックスを追加
        await connection.query(`
      ALTER TABLE qr_codes 
      ADD INDEX idx_organization_active (organization_id, is_active)
    `);
        console.log('✓ インデックスを追加しました');

        console.log('\n✅ qr_codes テーブルの修正が完了しました！');

    } catch (error) {
        console.error('❌ エラー:', error.message);
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('※ organization_id カラムは既に存在しています');
        }
    } finally {
        await connection.end();
    }
}

addOrganizationId();
