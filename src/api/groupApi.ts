import { apiClient, ApiResponse } from './client';

/**
 * グループ（クラス）管理API
 */
export const groupApi = {
  /**
   * グループ一覧取得（権限に応じてフィルタリング）
   * @param {Object} filters - フィルタ条件
   * @returns {Promise} グループ一覧
   */
  getGroups: async(filters: any = {}): Promise<ApiResponse> => {
    return (await apiClient.get('/groups', { params: filters })) as unknown as ApiResponse;
  },

  /**
   * グループ詳細取得
   * @param {number} groupId - グループID
   * @returns {Promise} グループ詳細
   */
  getGroup: async(groupId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/groups/${groupId}`)) as unknown as ApiResponse;
  },

  /**
   * グループ作成（管理者のみ）
   * @param {Object} data - グループデータ
   * @returns {Promise} 作成結果
   */
  createGroup: async(data: any): Promise<ApiResponse> => {
    return (await apiClient.post('/groups', data)) as unknown as ApiResponse;
  },

  /**
   * グループ更新
   * @param {number} groupId - グループID
   * @param {Object} data - 更新データ
   * @returns {Promise} 更新結果
   */
  updateGroup: async(groupId: number | string, data: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/groups/${groupId}`, data)) as unknown as ApiResponse;
  },

  /**
   * グループ削除（管理者のみ）
   * @param {number} groupId - グループID
   * @returns {Promise} 削除結果
   */
  deleteGroup: async(groupId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/groups/${groupId}`)) as unknown as ApiResponse;
  },

  /**
   * グループメンバー一覧取得
   * @param {number} groupId - グループID
   * @returns {Promise} メンバー一覧
   */
  getGroupMembers: async(groupId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/groups/${groupId}/members`)) as unknown as ApiResponse;
  },

  /**
   * グループにメンバー追加
   * @param {number} groupId - グループID
   * @param {string} studentId - 学生ID
   * @param {Date} joinedAt - 参加日
   * @returns {Promise} 追加結果
   */
  addMember: async(groupId: number | string, studentId: number | string, joinedAt: Date = new Date()): Promise<ApiResponse> => {
    return (await apiClient.post(`/groups/${groupId}/members`, {
      studentId: studentId,
      joinedAt: joinedAt.toISOString().split('T')[0],
    })) as unknown as ApiResponse;
  },

  /**
   * グループからメンバー削除
   * @param {number} groupId - グループID
   * @param {string} studentId - 学生ID
   * @returns {Promise} 削除結果
   */
  removeMember: async(groupId: number | string, studentId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/groups/${groupId}/members/${studentId}`)) as unknown as ApiResponse;
  },

  /**
   * グループ担当教員一覧取得
   * @param {number} groupId - グループID
   * @returns {Promise} 担当教員一覧
   */
  getGroupTeachers: async(groupId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/groups/${groupId}/teachers`)) as unknown as ApiResponse;
  },

  /**
   * グループに教員割り当て
   * @param {number} groupId - グループID
   * @param {number} userId - 教員ユーザーID
   * @param {string} role - 役割（'main' | 'assistant'）
   * @param {Date} assignedAt - 割り当て日
   * @returns {Promise} 割り当て結果
   */
  assignTeacher: async(groupId: number | string, userId: number | string, role: string = 'main', assignedAt: Date = new Date()): Promise<ApiResponse> => {
    return (await apiClient.post(`/groups/${groupId}/teachers`, {
      userId,
      role,
      assignedAt: assignedAt.toISOString().split('T')[0],
    })) as unknown as ApiResponse;
  },

  /**
   * グループから教員削除
   * @param {number} groupId - グループID
   * @param {number} userId - 教員ユーザーID
   * @returns {Promise} 削除結果
   */
  removeTeacher: async(groupId: number | string, userId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/groups/${groupId}/teachers/${userId}`)) as unknown as ApiResponse;
  },

  /**
   * グループ統計取得
   * @param {number} groupId - グループID
   * @returns {Promise} 統計データ
   */
  getGroupStats: async(groupId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/groups/${groupId}/stats`)) as unknown as ApiResponse;
  },
};

export default groupApi;
