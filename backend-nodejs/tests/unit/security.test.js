const SecurityService = require('../../services/SecurityService');
const { query } = require('../../config/database');

// query関数をモック化
jest.mock('../../config/database', () => ({
    query: jest.fn()
}));

// loggerをモック化してコンソール出力を抑制
jest.mock('../../utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn()
}));

describe('SecurityService', () => {
    beforeEach(() => {
        // 各テストの前にモックをクリア
        jest.clearAllMocks();
    });

    describe('isIPAllowed', () => {
        const mockIPRanges = [
            {
                id: 1,
                name: 'Office',
                ip_start: '192.168.1.1',
                ip_end: '192.168.1.255',
                description: 'Main Office'
            },
            {
                id: 2,
                name: 'VPN',
                ip_start: '10.0.0.1',
                ip_end: '10.0.0.100',
                description: 'VPN Access'
            }
        ];

        test('許可されたIP範囲内のIPアドレスを許可する', async () => {
            query.mockResolvedValue(mockIPRanges);

            const result = await SecurityService.isIPAllowed('192.168.1.50');

            expect(result.allowed).toBe(true);
            expect(result.matchedRange).toEqual({
                id: 1,
                name: 'Office',
                description: 'Main Office'
            });
        });

        test('許可されたIP範囲外のIPアドレスを拒否する', async () => {
            query.mockResolvedValue(mockIPRanges);

            const result = await SecurityService.isIPAllowed('192.168.2.1');

            expect(result.allowed).toBe(false);
            expect(result.matchedRange).toBeNull();
        });

        test('別の許可されたIP範囲内のIPアドレスを許可する', async () => {
            query.mockResolvedValue(mockIPRanges);

            const result = await SecurityService.isIPAllowed('10.0.0.50');

            expect(result.allowed).toBe(true);
            expect(result.matchedRange).toEqual({
                id: 2,
                name: 'VPN',
                description: 'VPN Access'
            });
        });

        test('境界値（開始IP）を許可する', async () => {
            query.mockResolvedValue(mockIPRanges);

            const result = await SecurityService.isIPAllowed('192.168.1.1');

            expect(result.allowed).toBe(true);
        });

        test('境界値（終了IP）を許可する', async () => {
            query.mockResolvedValue(mockIPRanges);

            const result = await SecurityService.isIPAllowed('192.168.1.255');

            expect(result.allowed).toBe(true);
        });

        test('DBエラー時は安全に拒否する', async () => {
            query.mockRejectedValue(new Error('DB Connection Error'));

            const result = await SecurityService.isIPAllowed('192.168.1.50');

            expect(result.allowed).toBe(false);
            expect(result.error).toBe('DB Connection Error');
        });
    });
});
