const { query } = require('./backend-nodejs/config/database');
async function run() {
    try {
        const slots = await query('SELECT * FROM organization_time_slots');
        const settings = await query('SELECT * FROM organization_settings');
        console.log('---JSON_START---');
        console.log(JSON.stringify({ slots, settings }));
        console.log('---JSON_END---');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
