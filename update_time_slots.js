const { query, transaction } = require('./backend-nodejs/config/database');

async function updateSlots() {
    try {
        await transaction(async (connection) => {
            console.log('Updating organization_time_slots...');

            // Delete existing slots for organization 1
            await connection.execute('DELETE FROM organization_time_slots WHERE organization_id = 1');
            console.log('Deleted existing slots.');

            // Insert new 90-minute slots
            const slots = [
                [1, 1, '1限', '09:00:00', '10:30:00'],
                [1, 2, '2限', '10:40:00', '12:10:00'],
                [1, 3, '3限', '13:00:00', '14:30:00'],
                [1, 4, '4限', '14:40:00', '16:10:00'],
                [1, 5, '5限', '16:20:00', '17:50:00']
            ];

            for (const slot of slots) {
                await connection.execute(
                    'INSERT INTO organization_time_slots (organization_id, period_number, period_name, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
                    slot
                );
            }
            console.log('Inserted new 90-minute slots.');
        });

        // Verify
        const newSlots = await query('SELECT * FROM organization_time_slots WHERE organization_id = 1 ORDER BY period_number');
        console.log('--- NEW SLOTS ---');
        console.table(newSlots);

    } catch (err) {
        console.error('Error updating slots:', err);
    } finally {
        process.exit(0);
    }
}

updateSlots();
