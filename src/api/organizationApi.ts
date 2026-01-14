import { apiClient, ApiResponse } from './client';

/**
 * 組織管理API
 */
export const organizationApi = {
  /**
   * 組織情報取得
   * @param {number} orgId - 組織ID
   * @returns {Promise} 組織情報
   */
  getOrganization: async(orgId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/organizations/${orgId}`)) as unknown as ApiResponse;
  },

  /**
   * 組織情報更新（管理者のみ）
   * @param {number} orgId - 組織ID
   * @param {Object} data - 更新データ
   * @returns {Promise} 更新結果
   */
  updateOrganization: async(orgId: number | string, data: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/organizations/${orgId}`, data)) as unknown as ApiResponse;
  },

  /**
   * 組織統計取得
   * @param {number} orgId - 組織ID
   * @returns {Promise} 統計データ
   */
  getOrganizationStats: async(orgId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/organizations/${orgId}/stats`)) as unknown as ApiResponse;
  },

  /**
   * すべての組織取得（管理者のみ）
   * @returns {Promise} 組織一覧
   */
  getAllOrganizations: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/organizations')) as unknown as ApiResponse;
  },

  /**
   * 組織作成（管理者のみ）
   * @param {Object} data - 組織データ
   * @returns {Promise} 作成結果
   */
  createOrganization: async(data: any): Promise<ApiResponse> => {
    return (await apiClient.post('/organizations', data)) as unknown as ApiResponse;
  },

  /**
   * 組織削除（管理者のみ）
   * @param {number} orgId - 組織ID
   * @returns {Promise} 削除結果
   */
  deleteOrganization: async(orgId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/organizations/${orgId}`)) as unknown as ApiResponse;
  },
};

export default organizationApi;
