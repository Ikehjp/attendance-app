// 各モジュールのロードテスト
console.log('モジュールロードテスト開始...\n');

const modules = [
    './middleware/auth',
    './middleware/orgContext',
    './services/AuthService',
    './services/InvitationService',
    './routes/invitations'
];

for (const modulePath of modules) {
    try {
        console.log(`✓ ${modulePath}`);
        require(modulePath);
    } catch (error) {
        console.error(`✗ ${modulePath}`);
        console.error(`  エラー: ${error.message}`);
        console.error(`  スタック: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }
}

console.log('\nテスト完了');
