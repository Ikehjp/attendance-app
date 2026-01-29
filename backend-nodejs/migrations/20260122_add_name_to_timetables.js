/**
 * マイグレーション: add_name_to_timetables
 * 作成日時: 2026/01/22
 */

/**
 * マイグレーションの適用
 */
async function up({ query, transaction }) {
    // timetables テーブルに name カラムを追加
    await query(`
    ALTER TABLE timetables
    ADD COLUMN name VARCHAR(255) DEFAULT NULL COMMENT '時間割名' AFTER group_id;
  `);

    console.log('timetables テーブルに name カラムを追加しました');
}

/**
 * マイグレーションのロールバック
 */
async function down({ query, transaction }) {
    // timetables テーブルから name カラムを削除
    await query(`
    ALTER TABLE timetables
    DROP COLUMN name;
  `);

    console.log('timetables テーブルから name カラムを削除しました');
}

module.exports = { up, down };
