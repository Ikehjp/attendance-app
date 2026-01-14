/**
 * マイグレーション: add_last_login_to_users
 * 作成日時: 2026/1/13 11:07:37
 */

/**
 * マイグレーションの適用
 */
async function up({ query, transaction }) {
  // ユーザーテーブルに最終ログイン日時とログイン回数を追加
  await query(`
    ALTER TABLE users 
    ADD COLUMN last_login TIMESTAMP NULL,
    ADD COLUMN login_count INT DEFAULT 0
  `);

  // パフォーマンス向上のためインデックスを追加
  await query(`
    CREATE INDEX idx_users_last_login ON users(last_login)
  `);
}

/**
 * マイグレーションのロールバック
 */
async function down({ query, transaction }) {
  // インデックスを削除
  await query(`
    DROP INDEX idx_users_last_login ON users
  `);

  // 追加したカラムを削除
  await query(`
    ALTER TABLE users 
    DROP COLUMN last_login,
    DROP COLUMN login_count
  `);
}

module.exports = { up, down };
