const request = require('supertest');
const app = require('../server');
const { pool } = require('../config/database');

describe('Auth API Integration Tests', () => {
    let ownerToken;
    let ownerEmail;
    let studentEmail;
    let organizationId;

    beforeAll(async () => {
        console.log('Starting tests...');
        try {
            const connection = await pool.getConnection();
            console.log('DB Connection successful');
            connection.release();
        } catch (error) {
            console.error('DB Connection failed:', error);
        }
    });

    afterAll(async () => {
        // テスト終了後にDB接続を切断
        await pool.end();
    });

    describe('POST /api/auth/register (Owner)', () => {
        it('should create a new organization and owner account', async () => {
            const timestamp = Date.now();
            ownerEmail = `test-owner-${timestamp}@example.com`;
            const orgName = `Test Org ${timestamp}`;

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test Owner',
                    email: ownerEmail,
                    password: 'password123',
                    role: 'owner',
                    organizationName: orgName
                });

            console.log('Register Response:', JSON.stringify(res.body, null, 2));

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.role).toBe('owner');
            expect(res.body.data.user.email).toBe(ownerEmail);
            expect(res.body.data.user.organizationId).toBeDefined();

            organizationId = res.body.data.user.organizationId;
            ownerToken = res.body.data.token;
        });

        it('should fail if email already exists', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test Owner Duplicate',
                    email: ownerEmail,
                    password: 'password123',
                    role: 'owner',
                    organizationName: 'Duplicate Org'
                });

            expect(res.statusCode).toEqual(200); // アプリ仕様により200でsuccess:falseを返す場合がある
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('既に使用されています');
        });
    });

    describe('POST /api/auth/register (Student)', () => {
        it('should register a student with valid join code', async () => {
            const timestamp = Date.now();
            studentEmail = `test-student-${timestamp}@example.com`;

            // デフォルト組織の参加コードを使用 (SCHOOL-001)
            // または、先ほど作成した組織の参加コードを取得する必要があるが、
            // API経由で取得する手段が管理者ログイン後のAPIになるため、
            // ここでは確実な SCHOOL-001 を使用する。
            const joinCode = 'SCHOOL-001';

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test Student',
                    email: studentEmail,
                    password: 'password123',
                    role: 'student',
                    joinCode: joinCode
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.role).toBe('student');
            expect(res.body.data.user.organizationId).toBe(1); // デフォルト組織ID
        });

        it('should fail with invalid join code', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Invalid Student',
                    email: `invalid-${Date.now()}@example.com`,
                    password: 'password123',
                    role: 'student',
                    joinCode: 'INVALID-CODE'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('無効な参加コード');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: ownerEmail,
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
        });

        it('should fail with invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: ownerEmail,
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBe(false);
        });
    });
});
