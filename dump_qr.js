const { query } = require('./backend-nodejs/config/database');
async function run() {
    try {
        const qrCodes = await query('SELECT * FROM qr_codes');
        console.log(JSON.stringify(qrCodes, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
