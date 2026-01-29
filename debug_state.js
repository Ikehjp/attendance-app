const { query } = require('./backend-nodejs/config/database');
async function run() {
    try {
        const slots = await query('SELECT * FROM organization_time_slots WHERE organization_id = 1');
        console.log('--- SLOTS ---');
        console.log(JSON.stringify(slots, null, 2));

        const sessions = await query('SELECT * FROM class_sessions WHERE class_date = "2026-01-28" AND organization_id = 1');
        console.log('--- SESSIONS ---');
        console.log(JSON.stringify(sessions, null, 2));

        const settings = await query('SELECT * FROM organization_settings WHERE organization_id = 1');
        console.log('--- SETTINGS ---');
        console.log(JSON.stringify(settings, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
