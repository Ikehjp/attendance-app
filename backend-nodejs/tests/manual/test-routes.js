// 各ルートモジュールのテスト
const routes = [
    ['Auth', './routes/auth'],
    ['Users', './routes/users'],
    ['Attendance', './routes/attendance'],
    ['Students', './routes/students'],
    ['Student Attendance', './routes/student-attendance'],
    ['Classes', './routes/classes'],
    ['Subjects', './routes/subjects'],
    ['Groups', './routes/groups'],
    ['QR', './routes/qr'],
    ['Events', './routes/events'],
    ['Reports', './routes/reports'],
    ['Notifications', './routes/notifications'],
    ['Settings', './routes/settings'],
    ['Export', './routes/export'],
    ['Organizations', './routes/organizations'],
    ['Security', './routes/security'],
    ['Absence Requests', './routes/absence-requests'],
    ['Approvals', './routes/approvals'],
    ['Timetables', './routes/timetables'],
    ['Attendance Stats', './routes/attendance-stats'],
    ['Invitations', './routes/invitations']
];

console.log('ルートモジュールテスト開始\n');

let failedCount = 0;

for (const [name, path] of routes) {
    try {
        require(path);
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  エラー: ${error.message}`);
        const stack = error.stack.split('\n').slice(0, 8);
        console.error(`  スタック:\n${stack.map(l => '    ' + l).join('\n')}\n`);
        failedCount++;
    }
}

console.log(`\n${failedCount === 0 ? '✅' : '❌'} テスト完了 (失敗: ${failedCount}/${routes.length})`);
process.exit(failedCount > 0 ? 1 : 0);
