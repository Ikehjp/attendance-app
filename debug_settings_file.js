const TimetableService = require('./backend-nodejs/services/TimetableService');
const fs = require('fs');

async function test() {
    try {
        const settings = await TimetableService.getOrganizationSettings(1);
        fs.writeFileSync('debug_output.json', JSON.stringify(settings, null, 2));
    } catch (err) {
        console.error(err);
        fs.writeFileSync('debug_output.json', JSON.stringify({ error: err.message }));
    } finally {
        const { closePool } = require('./backend-nodejs/config/database');
        await closePool();
    }
}

test();
