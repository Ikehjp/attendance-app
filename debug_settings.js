const TimetableService = require('./backend-nodejs/services/TimetableService');
const AttendanceService = require('./backend-nodejs/services/AttendanceService');

async function test() {
    try {
        console.log('--- TimetableService.getOrganizationSettings ---');
        const settings = await TimetableService.getOrganizationSettings(1);
        console.log(JSON.stringify(settings, null, 2));

        console.log('--- AttendanceService.processAttendanceWithTimeCheck ---');
        // Mock date to 10:07
        const originalDate = global.Date;
        class MockDate extends Date {
            constructor(...args) {
                if (args.length === 0) {
                    super('2026-01-29T10:07:00+09:00');
                } else {
                    super(...args);
                }
            }
        }
        // Need to override Date in the required module... this is hard in node without proxyquire.
        // We will just assume the logic relies on `new Date()`.

        // Actually, we can just run it and see the output for CURRENT time if strictly debugging the "3制限" string.
        // But to reproduce 10:07 behavior, we might need to be clever.
        // For now, let's just inspect the slots returned by TimetableService.

    } catch (err) {
        console.error(err);
    } finally {
        const { closePool } = require('./backend-nodejs/config/database');
        await closePool();
    }
}

test();
