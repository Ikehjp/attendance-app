import { apiClient, ApiResponse } from './client';

/**
 * 通知 API
 */
export const notificationApi = {
  /**
   * 通知一覧を取得
   * @param {Object} options - 取得オプション
   * @returns {Promise<Object>} 通知一覧
   */
  async getNotifications(options: { limit?: number; unreadOnly?: boolean } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.unreadOnly) params.append('is_read', '0');

    const response = await apiClient.get(`/notifications?${params.toString()}`);
    return response as unknown as ApiResponse;
  },

  async getUnreadCount(): Promise<ApiResponse> {
    const response = await apiClient.get('/notifications/unread-count');
    return response as unknown as ApiResponse;
  },

  async markAsRead(notificationId: number | string): Promise<ApiResponse> {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response as unknown as ApiResponse;
  },

  async markAllAsRead(): Promise<ApiResponse> {
    const response = await apiClient.put('/notifications/read-all');
    return response as unknown as ApiResponse;
  },

  async deleteNotification(notificationId: number | string): Promise<ApiResponse> {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response as unknown as ApiResponse;
  },
};

export default notificationApi;
