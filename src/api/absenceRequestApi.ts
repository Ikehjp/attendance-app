import { apiClient, formDataClient, ApiResponse } from './client';

/**
 * 欠席申請・承認API
 */
export const absenceRequestApi = {
  /**
   * 欠席申請作成（学生用）
   * @param {Object} data - 申請データ
   * @param {File} file - 添付ファイル（オプション）
   * @returns {Promise} 作成結果
   */
  createRequest: async(data: any, file: File | null = null): Promise<ApiResponse> => {
    // バックエンドが期待するフィールド名に変換
    const requestBody = {
      type: data.requestType || data.type,
      date: data.requestDate || data.date,
      reason: data.reason,
      classSessionId: data.classId || data.classSessionId,
    };

    if (file) {
      const formData = new FormData();
      formData.append('type', requestBody.type);
      formData.append('date', requestBody.date);
      formData.append('reason', requestBody.reason);
      if (requestBody.classSessionId) {
        formData.append('classSessionId', requestBody.classSessionId);
      }
      formData.append('attachment', file);

      return (await formDataClient.post('/absence-requests', formData)) as unknown as ApiResponse;
    } else {
      return (await apiClient.post('/absence-requests', requestBody)) as unknown as ApiResponse;
    }
  },

  /**
   * 学生の申請一覧取得
   * @param {string} studentId - 学生ID
   * @param {Object} filters - フィルタ条件
   * @returns {Promise} 申請一覧
   */
  getRequestsByStudent: async(studentId: number | string, filters: any = {}): Promise<ApiResponse> => {
    return (await apiClient.get(`/absence-requests/student/${studentId}`, {
      params: filters,
    })) as unknown as ApiResponse;
  },

  /**
   * 教員の承認待ち申請一覧取得
   * @param {number} teacherId - 教員ID
   * @param {Object} filters - フィルタ条件
   * @returns {Promise} 申請一覧
   */
  getPendingRequestsForTeacher: async(teacherId: number | string, filters: any = {}): Promise<ApiResponse> => {
    return (await apiClient.get(`/absence-requests/teacher/${teacherId}`, {
      params: filters,
    })) as unknown as ApiResponse;
  },

  /**
   * 全申請一覧取得（管理者用）
   * @param {Object} filters - フィルタ条件
   * @returns {Promise} 申請一覧
   */
  getAllRequests: async(filters: any = {}): Promise<ApiResponse> => {
    return (await apiClient.get('/absence-requests/all', {
      params: filters,
    })) as unknown as ApiResponse;
  },

  /**
   * 申請詳細取得
   * @param {number} requestId - 申請ID
   * @returns {Promise} 申請詳細
   */
  getRequest: async(requestId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/absence-requests/${requestId}`)) as unknown as ApiResponse;
  },

  /**
   * 申請キャンセル（学生用）
   * @param {number} requestId - 申請ID
   * @returns {Promise} キャンセル結果
   */
  cancelRequest: async(requestId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/absence-requests/${requestId}`)) as unknown as ApiResponse;
  },

  /**
   * 申請承認（教員/管理者用）
   * @param {number} requestId - 申請ID
   * @param {string} comment - コメント（オプション）
   * @returns {Promise} 承認結果
   */
  approveRequest: async(requestId: number | string, comment: string = ''): Promise<ApiResponse> => {
    return (await apiClient.post(`/approvals/${requestId}/approve`, { comment })) as unknown as ApiResponse;
  },

  /**
   * 申請却下（教員/管理者用）
   * @param {number} requestId - 申請ID
   * @param {string} comment - コメント（必須）
   * @returns {Promise} 却下結果
   */
  rejectRequest: async(requestId: number | string, comment: string): Promise<ApiResponse> => {
    return (await apiClient.post(`/approvals/${requestId}/reject`, { comment })) as unknown as ApiResponse;
  },

  /**
   * 承認履歴取得
   * @param {number} requestId - 申請ID
   * @returns {Promise} 承認履歴
   */
  getApprovalHistory: async(requestId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/approvals/${requestId}/history`)) as unknown as ApiResponse;
  },
};

export default absenceRequestApi;
