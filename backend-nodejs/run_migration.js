require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'attendance_system'
    });

    console.log('Running timetable settings migration...');

    // 1. Add late_limit_minutes column
    try {
        await conn.query('ALTER TABLE organizations ADD COLUMN late_limit_minutes INT DEFAULT 15');
        console.log('✓ Added late_limit_minutes column');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('- late_limit_minutes already exists');
        } else {
            console.log('! Error adding late_limit_minutes:', e.message);
        }
    }

    // 2. Add date_reset_time column
    try {
        await conn.query("ALTER TABLE organizations ADD COLUMN date_reset_time TIME DEFAULT '04:00:00'");
        console.log('✓ Added date_reset_time column');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('- date_reset_time already exists');
        } else {
            console.log('! Error adding date_reset_time:', e.message);
        }
    }

    // 3. Create organization_time_slots table
    try {
        await conn.query(`
      CREATE TABLE IF NOT EXISTS organization_time_slots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        organization_id INT NOT NULL,
        period_number INT NOT NULL,
        period_name VARCHAR(50),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        UNIQUE KEY unique_org_period (organization_id, period_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✓ Created organization_time_slots table');
    } catch (e) {
        console.log('! Error creating table:', e.message);
    }

    await conn.end();
    console.log('\nMigration complete!');
}

runMigration().catch(console.error);
