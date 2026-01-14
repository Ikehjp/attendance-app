import { apiClient, ApiResponse } from './client';

/**
 * セキュリティ・QR管理API
 */
export const securityApi = {
  // === IP範囲管理 ===

  /**
   * 許可IP範囲一覧取得
   * @returns {Promise} IP範囲一覧
   */
  getIPRanges: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/security/ip-ranges')) as unknown as ApiResponse;
  },

  /**
   * IP範囲追加（管理者のみ）
   * @param {Object} data - IP範囲データ
   * @returns {Promise} 追加結果
   */
  addIPRange: async(data: any): Promise<ApiResponse> => {
    return (await apiClient.post('/security/ip-ranges', data)) as unknown as ApiResponse;
  },

  /**
   * IP範囲更新（管理者のみ）
   * @param {number} id - IP範囲ID
   * @param {Object} data - 更新データ
   * @returns {Promise} 更新結果
   */
  updateIPRange: async(id: number | string, data: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/security/ip-ranges/${id}`, data)) as unknown as ApiResponse;
  },

  /**
   * IP範囲削除（管理者のみ）
   * @param {number} id - IP範囲ID
   * @returns {Promise} 削除結果
   */
  deleteIPRange: async(id: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/security/ip-ranges/${id}`)) as unknown as ApiResponse;
  },

  /**
   * IPアドレス検証
   * @param {string} ipAddress - 検証するIPアドレス
   * @returns {Promise} 検証結果
   */
  validateIP: async(ipAddress: string): Promise<ApiResponse> => {
    return (await apiClient.post('/security/validate-ip', { ipAddress })) as unknown as ApiResponse;
  },

  // === スキャンログ ===

  /**
   * スキャンログ一覧取得（管理者のみ）
   * @param {Object} filters - フィルタ条件
   * @returns {Promise} スキャンログ一覧
   */
  getScanLogs: async(filters: any = {}): Promise<ApiResponse> => {
    return (await apiClient.get('/security/scan-logs', {
      params: filters,
    })) as unknown as ApiResponse;
  },

  /**
   * セキュリティ統計取得（管理者のみ）
   * @param {string} period - 期間（'day' | 'week' | 'month'）
   * @returns {Promise} 統計データ
   */
  getSecurityStats: async(period: string = 'week'): Promise<ApiResponse> => {
    return (await apiClient.get('/security/stats', {
      params: { period },
    })) as unknown as ApiResponse;
  },

  // === QRコード管理 ===

  /**
   * 場所ベースQRコード生成（管理者のみ）
   * @param {Object} data - QRコードデータ
   * @returns {Promise} 生成結果（QR画像含む）
   */
  generateLocationQR: async(data: any): Promise<ApiResponse> => {
    return (await apiClient.post('/qr/generate-location', data)) as unknown as ApiResponse;
  },

  /**
   * QRコード一覧取得
   * @param {Object} filters - フィルタ条件
   * @returns {Promise} QRコード一覧
   */
  getQRCodes: async(filters: any = {}): Promise<ApiResponse> => {
    return (await apiClient.get('/qr/codes', {
      params: filters,
    })) as unknown as ApiResponse;
  },

  /**
   * QRコード詳細取得
   * @param {number} id - QRコードID
   * @returns {Promise} QRコード詳細
   */
  getQRCode: async(id: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/qr/codes/${id}`)) as unknown as ApiResponse;
  },

  /**
   * QRコード無効化（管理者のみ）
   * @param {number} id - QRコードID
   * @returns {Promise} 無効化結果
   */
  deactivateQRCode: async(id: number | string): Promise<ApiResponse> => {
    return (await apiClient.put(`/qr/${id}/deactivate`)) as unknown as ApiResponse;
  },

  /**
   * QRコード削除（管理者のみ）
   * @param {number} id - QRコードID
   * @returns {Promise} 削除結果
   */
  deleteQRCode: async(id: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/qr/${id}`)) as unknown as ApiResponse;
  },

  /**
   * IP検証付きQRスキャン
   * @param {string} qrCode - QRコード
   * @param {string} studentId - 学生ID
   * @returns {Promise} スキャン結果（出席記録含む）
   */
  scanQRWithValidation: async(qrCode: string, studentId: number | string): Promise<ApiResponse> => {
    return (await apiClient.post('/qr/scan-with-validation', {
      qrCode,
      studentId,
    })) as unknown as ApiResponse;
  },
};

export default securityApi;
