const AttendanceService = require('./backend-nodejs/services/AttendanceService');

async function testAttendance() {
    try {
        const organizationId = 1;
        const userId = 1;
        const studentId = '000004';

        console.log('Simulating attendance check at ' + new Date().toLocaleTimeString());

        // Call the private/internal method if exposed, or the public one
        const result = await AttendanceService.processAttendanceWithTimeCheck(
            organizationId,
            userId,
            studentId,
            null
        );

        console.log('Result:', JSON.stringify(result, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        // Need to close DB pool if running standalone
        const { closePool } = require('./backend-nodejs/config/database');
        await closePool();
    }
}

testAttendance();
