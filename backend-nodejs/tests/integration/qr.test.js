const request = require('supertest');
const express = require('express');
const QRService = require('../../services/QRService');

// ミドルウェアのモック定義
jest.mock('../../middleware/auth', () => ({
    authenticate: jest.fn((req, res, next) => {
        req.user = { id: 1, role: 'admin', name: 'Admin User' };
        next();
    }),
    requireAdmin: jest.fn((req, res, next) => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden' });
        }
    })
}));

jest.mock('../../services/QRService');
jest.mock('../../services/StudentAttendanceService');
jest.mock('../../config/database', () => ({
    query: jest.fn()
}));

// ルーターの読み込みを遅延させるための変数
let qrRoutes;
const app = express();
app.use(express.json());

describe('QR Routes', () => {
    beforeAll(() => {
        // モック設定後にルーターを読み込む
        qrRoutes = require('../../routes/qr');
        app.use('/api/qr', qrRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // デフォルトの認証ユーザー設定（管理者）
        const auth = require('../../middleware/auth');
        auth.authenticate.mockImplementation((req, res, next) => {
            req.user = { id: 1, role: 'admin', name: 'Admin User' };
            next();
        });
    });

    describe('POST /api/qr/generate-location', () => {
        test('管理者がQRコードを生成できる', async () => {
            QRService.generateLocationQRCode.mockResolvedValue({
                success: true,
                qrCode: 'mock_qr_code'
            });

            const response = await request(app)
                .post('/api/qr/generate-location')
                .send({ locationName: 'Test Location' });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(QRService.generateLocationQRCode).toHaveBeenCalled();
        });

        test('一般ユーザーはQRコードを生成できない', async () => {
            // 一般ユーザーとして認証
            const auth = require('../../middleware/auth');
            auth.authenticate.mockImplementation((req, res, next) => {
                req.user = { id: 2, role: 'student', name: 'Student User' };
                next();
            });

            const response = await request(app)
                .post('/api/qr/generate-location')
                .send({ locationName: 'Test Location' });

            expect(response.status).toBe(403);
        });
    });

    describe('POST /api/qr/scan-with-validation', () => {
        test('有効なQRコードと学生IDでスキャンできる', async () => {
            QRService.scanQRCodeWithIPValidation.mockResolvedValue({
                success: true,
                message: '出席を記録しました'
            });

            const response = await request(app)
                .post('/api/qr/scan-with-validation')
                .send({ qrCode: 'valid_qr', studentId: 'STU001' });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(QRService.scanQRCodeWithIPValidation).toHaveBeenCalledWith(
                { qrCode: 'valid_qr', studentId: 'STU001' },
                expect.any(String), // IP address
                expect.any(String)  // User Agent
            );
        });
    });
});
