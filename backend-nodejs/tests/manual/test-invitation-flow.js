const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3001/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function testInvitationFlow() {
    try {
        console.log('1. 管理者ログイン...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        console.log('Login Response Keys:', Object.keys(loginRes.data));
        if (loginRes.data.data) {
            console.log('Login Response Data Keys:', Object.keys(loginRes.data.data));
        }

        if (!loginRes.data.data) {
            throw new Error('レスポンスにdataプロパティがありません');
        }

        const token = loginRes.data.data.token;
        if (!token) {
            throw new Error('レスポンスにtokenが含まれていません');
        }

        console.log('✅ ログイン成功');
        console.log('Token:', token.substring(0, 20) + '...');

        // トークンの中身を確認
        const decoded = jwt.decode(token);
        console.log('Decoded Token:', decoded);

        const headers = { Authorization: `Bearer ${token}` };

        console.log('\n2. 招待の作成...');
        const inviteEmail = `test-teacher-${Date.now()}@example.com`;
        const inviteRes = await axios.post(`${API_URL}/invitations/invite`, {
            email: inviteEmail,
            role: 'teacher'
        }, { headers });

        console.log('✅ 招待作成成功:', inviteRes.data);
        const inviteToken = inviteRes.data.data.token;

        console.log('\n3. 招待トークンの検証...');
        const validateRes = await axios.get(`${API_URL}/invitations/validate/${inviteToken}`);
        console.log('✅ トークン検証成功:', validateRes.data);

        console.log('\n4. 招待の受諾（ユーザー作成）...');
        const acceptRes = await axios.post(`${API_URL}/invitations/accept/${inviteToken}`, {
            name: 'Test Teacher',
            password: 'password123'
        });
        console.log('✅ 招待受諾成功:', acceptRes.data);

        console.log('\n5. 新しいユーザーでログイン...');
        const newLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: inviteEmail,
            password: 'password123'
        });
        console.log('✅ 新ユーザーログイン成功:', newLoginRes.data);

        if (newLoginRes.data.data.user.role === 'teacher') {
            console.log('✅ ロール確認: OK (teacher)');
        } else {
            console.error('❌ ロール確認: NG', newLoginRes.data.data.user.role);
        }

    } catch (error) {
        console.error('❌ テスト失敗:', error.response ? error.response.data : error.message);
    }
}

testInvitationFlow();
