const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function runTests() {
    console.log('🚀 シナリオテストを開始します...\n');
    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    };

    try {
        const timestamp = Date.now();

        // --- F-01 組織作成（管理者登録） ---
        console.log('\n--- F-01 組織作成（管理者登録） ---');
        const ownerEmail = `owner-${timestamp}@example.com`;
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Owner',
                email: ownerEmail,
                password: 'password123',
                role: 'owner',
                organizationName: `Org ${timestamp}`
            });
            assert(res.data.success === true, '登録成功レスポンス');
            assert(res.data.data.user.role === 'owner', 'ロールがownerであること');
            assert(res.data.data.user.organizationId > 0, '組織IDが発行されていること');
        } catch (e) {
            assert(false, `例外発生: ${e.message}`);
        }

        // --- F-03 組織参加失敗（無効コード） ---
        console.log('\n--- F-03 組織参加失敗（無効コード） ---');
        try {
            await axios.post(`${API_URL}/auth/register`, {
                name: 'Invalid Student',
                email: `invalid-${timestamp}@example.com`,
                password: 'password123',
                role: 'student',
                joinCode: 'INVALID-CODE'
            });
            assert(false, 'エラーになるべき');
        } catch (e) {
            if (e.response) {
                assert(e.response.data.success === false, 'successがfalseであること');
                assert(e.response.data.message.includes('無効な参加コード'), 'エラーメッセージが正しいこと');
            } else {
                assert(false, `予期せぬエラー: ${e.message}`);
            }
        }

        // --- F-02 組織参加（生徒登録） ---
        console.log('\n--- F-02 組織参加（生徒登録） ---');
        const studentEmail = `student-${timestamp}@example.com`;
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Student',
                email: studentEmail,
                password: 'password123',
                role: 'student',
                joinCode: 'SCHOOL-001'
            });
            assert(res.data.success === true, '登録成功レスポンス');
            assert(res.data.data.user.role === 'student', 'ロールがstudentであること');
            assert(res.data.data.user.organizationId === 1, 'デフォルト組織(ID:1)に参加していること');
        } catch (e) {
            assert(false, `例外発生: ${e.message}`);
        }

        // --- A-02 ログイン成功 ---
        console.log('\n--- A-02 ログイン成功 ---');
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                email: ownerEmail,
                password: 'password123'
            });
            assert(res.data.success === true, 'ログイン成功レスポンス');
            assert(res.data.data.token !== undefined, 'トークンが返却されること');
        } catch (e) {
            assert(false, `例外発生: ${e.message}`);
        }

        // --- A-03 ログイン失敗 ---
        console.log('\n--- A-03 ログイン失敗 ---');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: ownerEmail,
                password: 'wrongpassword'
            });
            assert(false, 'エラーになるべき');
        } catch (e) {
            if (e.response) {
                assert(e.response.status === 401, 'ステータスコードが401であること');
                assert(e.response.data.success === false, 'successがfalseであること');
            } else {
                assert(false, `予期せぬエラー: ${e.message}`);
            }
        }

    } catch (error) {
        console.error('致命的なエラー:', error);
    } finally {
        console.log('\n========================================');
        console.log(`テスト結果: ${passed} PASS, ${failed} FAIL`);
        console.log('========================================');
    }
}

runTests();
