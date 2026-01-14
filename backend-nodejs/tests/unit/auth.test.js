const AuthService = require('../../services/AuthService');
const { query, transaction } = require('../../config/database');
const bcrypt = require('bcryptjs');
const JWTUtil = require('../../utils/jwt');

// モックの設定
jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn()
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn()
}));

jest.mock('../../utils/jwt', () => ({
    generateToken: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        const mockUser = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            password: 'hashed_password',
            role: 'employee',
            employee_id: 'EMP001',
            student_id: null,
            department: 'IT'
        };

        test('正しい認証情報でログイン成功', async () => {
            query.mockResolvedValue([mockUser]);
            bcrypt.compare.mockResolvedValue(true);
            JWTUtil.generateToken.mockReturnValue('mock_token');

            const result = await AuthService.login('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.data.token).toBe('mock_token');
            expect(result.data.user.email).toBe('test@example.com');
            expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['test@example.com']);
        });

        test('存在しないユーザーでログイン失敗', async () => {
            query.mockResolvedValue([]);

            const result = await AuthService.login('unknown@example.com', 'password123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('メールアドレスまたはパスワードが正しくありません');
        });

        test('パスワード不一致でログイン失敗', async () => {
            query.mockResolvedValue([mockUser]);
            bcrypt.compare.mockResolvedValue(false);

            const result = await AuthService.login('test@example.com', 'wrongpassword');

            expect(result.success).toBe(false);
            expect(result.message).toContain('メールアドレスまたはパスワードが正しくありません');
        });

        test('学生ユーザーのログイン時に学生IDを取得する', async () => {
            const studentUser = { ...mockUser, role: 'student', student_id: null };
            query.mockResolvedValueOnce([studentUser]); // ユーザー検索
            query.mockResolvedValueOnce([{ student_id: 'STU001' }]); // 学生テーブル検索
            bcrypt.compare.mockResolvedValue(true);
            JWTUtil.generateToken.mockReturnValue('mock_token');

            const result = await AuthService.login('student@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.data.user.studentId).toBe('STU001');
        });
    });

    describe('register', () => {
        const registerData = {
            name: 'New User',
            email: 'new@example.com',
            password: 'password123',
            role: 'employee',
            employeeId: 'EMP002',
            department: 'Sales'
        };

        test('新規登録成功', async () => {
            // メール重複チェック
            query.mockResolvedValueOnce([]);
            // 社員ID重複チェック
            query.mockResolvedValueOnce([]);

            bcrypt.hash.mockResolvedValue('hashed_password');

            // トランザクションモック
            const mockConnection = {
                execute: jest.fn()
                    .mockResolvedValueOnce([{ insertId: 2 }]) // ユーザー挿入
            };

            transaction.mockImplementation(async (callback) => {
                return await callback(mockConnection);
            });

            JWTUtil.generateToken.mockReturnValue('mock_token');

            const result = await AuthService.register(registerData);

            expect(result.success).toBe(true);
            expect(result.data.user.id).toBe(2);
            expect(transaction).toHaveBeenCalled();
        });

        test('既存のメールアドレスで登録失敗', async () => {
            query.mockResolvedValueOnce([{ id: 1 }]); // 既存ユーザーあり

            const result = await AuthService.register(registerData);

            expect(result.success).toBe(false);
            expect(result.message).toContain('既に使用されています');
            expect(transaction).not.toHaveBeenCalled();
        });
    });
});
