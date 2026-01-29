// データベース接続設定
module.exports = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'pass',
    database: process.env.DB_NAME || 'sotsuken',
    port: process.env.DB_PORT || 3306
};
