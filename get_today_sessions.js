const { query } = require('./backend-nodejs/config/database');
async function run() {
    try {
        const rows = await query('SELECT * FROM class_sessions WHERE class_date = "2026-01-28"');
        console.log(JSON.stringify(rows));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
