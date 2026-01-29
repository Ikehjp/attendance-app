const { query } = require('./backend-nodejs/config/database');
async function run() {
    try {
        const slots = await query('SELECT * FROM organization_time_slots');
        console.log('TIME SLOTS:');
        console.table(slots);
        const settings = await query('SELECT * FROM organization_settings');
        console.log('SETTINGS:');
        console.table(settings);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
