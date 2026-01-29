const { query } = require('./backend-nodejs/config/database');
const fs = require('fs');
async function run() {
    try {
        const slots = await query('SELECT * FROM organization_time_slots');
        const sessions = await query('SELECT * FROM class_sessions WHERE class_date = "2026-01-28"');
        const settings = await query('SELECT * FROM organization_settings');
        const data = { slots, sessions, settings };
        fs.writeFileSync('table_dump.json', JSON.stringify(data, null, 2));
        console.log('Dumped to table_dump.json');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
