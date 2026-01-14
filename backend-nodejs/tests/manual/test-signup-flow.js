const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testSignupFlow() {
    try {
        const timestamp = Date.now();

        // 1. 管理者として新規登録（組織作成）
        console.log('1. 管理者として新規登録...');
        const ownerEmail = `owner-${timestamp}@example.com`;
        const ownerRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'New Owner',
            email: ownerEmail,
            password: 'password123',
            role: 'owner',
            organizationName: `New School ${timestamp}`
        });

        console.log('✅ 管理者登録成功:', ownerRes.data);
        const ownerToken = ownerRes.data.data.token;
        const organizationId = ownerRes.data.data.user.organizationId;

        // 参加コードを取得するためにDBを直接見るのは難しいので、
        // 本来は管理画面で確認するが、ここでは簡易的に推測する（実装で SCHOOL-{id}-xxxx としたため）
        // しかしランダムな数字が含まれるため、API経由で取得する必要がある。
        // 管理者としてログインし、組織情報を取得するAPIがあればよいが...
        // 今回はDBを直接確認する手段がないため、デフォルト組織（SCHOOL-001）を使って生徒登録をテストする。

        console.log('\n2. 生徒として新規登録（デフォルト組織へ参加）...');
        const studentEmail = `student-${timestamp}@example.com`;
        const studentRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'New Student',
            email: studentEmail,
            password: 'password123',
            role: 'student',
            joinCode: 'SCHOOL-001' // デフォルト組織のコード
        });

        console.log('✅ 生徒登録成功:', studentRes.data);

        if (studentRes.data.data.user.organizationId === 1) {
            console.log('✅ 組織ID確認: OK (1)');
        } else {
            console.error('❌ 組織ID確認: NG', studentRes.data.data.user.organizationId);
        }

    } catch (error) {
        console.error('❌ テスト失敗:', error.response ? error.response.data : error.message);
    }
}

testSignupFlow();
