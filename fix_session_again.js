const { query, transaction } = require('./backend-nodejs/config/database');

async function fixTimes() {
    try {
        console.log('Fixing class_sessions times again...');
        const slots = await query('SELECT period_number, start_time, end_time FROM organization_time_slots WHERE organization_id = 1');
        const slotMap = {};
        slots.forEach(s => slotMap[s.period_number] = s);

        await transaction(async (connection) => {
            for (const [p, s] of Object.entries(slotMap)) {
                await connection.execute(
                    'UPDATE class_sessions SET start_time = ?, end_time = ? WHERE period_number = ? AND class_date >= CURDATE()',
                    [s.start_time, s.end_time, p]
                );
            }
        });
        console.log('Done.');
    } catch (e) { console.error(e); } finally { process.exit(0); }
}
fixTimes();
