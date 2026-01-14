/**
 * データベースの状態を確認するスクリプト
 */

require('dotenv').config();
const { query, pool } = require('../config/database');
const logger = require('../utils/logger');

async function checkDatabase() {
    try {
        console.log('\n=== データベース接続確認 ===\n');

        // データベース接続確認
        const connection = await pool.getConnection();
        console.log('✅ データベース接続成功');
        connection.release();

        // テーブル一覧を取得
        console.log('\n=== テーブル一覧 ===\n');
        const tables = await query('SHOW TABLES');
        console.log(`テーブル数: ${tables.length}`);
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`${index + 1}. ${tableName}`);
        });

        // usersテーブルの確認
        console.log('\n=== usersテーブルの確認 ===\n');
        try {
            const users = await query('SELECT id, name, email, employee_id, role FROM users');
            console.log(`ユーザー数: ${users.length}`);

            if (users.length > 0) {
                console.log('\n登録済みユーザー:');
                users.forEach(user => {
                    console.log(`- ID: ${user.id}, 名前: ${user.name}, メール: ${user.email}, 社員ID: ${user.employee_id}, 役割: ${user.role}`);
                });
            } else {
                console.log('⚠️ ユーザーが登録されていません');
            }
        } catch (error) {
            console.log('❌ usersテーブルが存在しません:', error.message);
        }

        // studentsテーブルの確認
        console.log('\n=== studentsテーブルの確認 ===\n');
        try {
            const students = await query('SELECT student_id, name, card_id, email, grade, class_name FROM students LIMIT 10');
            console.log(`学生数: ${students.length}`);

            if (students.length > 0) {
                console.log('\n登録済み学生（最初の10件）:');
                students.forEach(student => {
                    console.log(`- ID: ${student.student_id}, 名前: ${student.name}, カードID: ${student.card_id}, 学年: ${student.grade} ${student.class_name}`);
                });
            } else {
                console.log('⚠️ 学生が登録されていません');
            }
        } catch (error) {
            console.log('❌ studentsテーブルが存在しません:', error.message);
        }

        // マイグレーション状態の確認
        console.log('\n=== マイグレーション状態 ===\n');
        try {
            const migrations = await query('SELECT version, name, executed_at, success FROM schema_migrations ORDER BY executed_at DESC LIMIT 5');
            console.log(`実行済みマイグレーション数: ${migrations.length}`);

            if (migrations.length > 0) {
                console.log('\n最近のマイグレーション:');
                migrations.forEach(m => {
                    const status = m.success ? '✅' : '❌';
                    const date = new Date(m.executed_at).toLocaleString('ja-JP');
                    console.log(`${status} ${m.name} (${date})`);
                });
            } else {
                console.log('⚠️ マイグレーションが実行されていません');
            }
        } catch (error) {
            console.log('⚠️ schema_migrationsテーブルが存在しません（マイグレーション未実行）');
        }

        console.log('\n=== チェック完了 ===\n');

    } catch (error) {
        console.error('❌ エラー:', error.message);
        logger.error('データベースチェックエラー:', error);
    } finally {
        await pool.end();
    }
}

checkDatabase();
