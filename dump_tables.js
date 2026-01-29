const { query } = require('./backend-nodejs/config/database');
async function run() {
    try {
        const slots = await query('SELECT * FROM organization_time_slots');
        console.log('--- ALL SLOTS ---');
        console.table(slots);

        const sessions = await query('SELECT * FROM class_sessions WHERE class_date = "2026-01-28"');
        console.log('--- TODAY SESSIONS ---');
        console.table(sessions);

        const settings = await query('SELECT * FROM organization_settings');
        console.log('--- ALL SETTINGS ---');
        console.table(settings);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
