console.log('Test file loaded');

const request = require('supertest');
const express = require('express');
const ApprovalService = require('../../services/ApprovalService');

// ミドルウェアのモック定義
jest.mock('../../middleware/auth', () => ({
    authenticate: jest.fn((req, res, next) => {
        console.log('Default mock auth called');
        req.user = { id: 1, role: 'teacher', name: 'Teacher User' };
        next();
    }),
    requireAdmin: jest.fn((req, res, next) => next())
}));

jest.mock('../../services/ApprovalService');

// ルーターの読み込みを遅延させるための変数
let approvalRoutes;
const app = express();
app.use(express.json());

describe('Approval Routes', () => {
    beforeAll(() => {
        console.log('Setting up test app...');
        try {
            // モック設定後にルーターを読み込む
            approvalRoutes = require('../../routes/approvals');
            app.use('/api/approvals', approvalRoutes);
            console.log('Routes loaded successfully');
        } catch (error) {
            console.error('Error loading routes:', error);
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // デフォルトの認証ユーザー設定
        const auth = require('../../middleware/auth');
        auth.authenticate.mockImplementation((req, res, next) => {
            req.user = { id: 1, role: 'teacher', name: 'Teacher User' };
            next();
        });
    });

    describe('POST /api/approvals/:requestId/approve', () => {
        test('教員が申請を承認できる', async () => {
            ApprovalService.approveRequest.mockResolvedValue({
                id: 1,
                status: 'approved'
            });

            const response = await request(app)
                .post('/api/approvals/1/approve')
                .send({ comment: 'OK' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(ApprovalService.approveRequest).toHaveBeenCalledWith(1, 1, 'OK');
        });

        test('権限がないユーザー（学生）は承認できない', async () => {
            // 学生ユーザーとして認証
            const auth = require('../../middleware/auth');
            auth.authenticate.mockImplementation((req, res, next) => {
                req.user = { id: 2, role: 'student', name: 'Student User' };
                next();
            });

            const response = await request(app)
                .post('/api/approvals/1/approve')
                .send({ comment: 'OK' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(ApprovalService.approveRequest).not.toHaveBeenCalled();
        });
    });
});
