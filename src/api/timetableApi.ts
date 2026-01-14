import { apiClient, formDataClient, ApiResponse } from './client';

/**
 * 時間割管理API
 */
export const timetableApi = {
  /**
   * 時間割作成
   * @param {Object} data - 時間割データ
   * @returns {Promise} 作成結果
   */
  createTimetable: async(data: any): Promise<ApiResponse> => {
    return (await apiClient.post('/timetables', data)) as unknown as ApiResponse;
  },

  /**
   * グループの時間割取得
   * @param {number} groupId - グループID
   * @returns {Promise} 時間割一覧
   */
  getTimetablesByGroup: async(groupId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/timetables/group/${groupId}`)) as unknown as ApiResponse;
  },

  /**
   * 時間割詳細取得
   * @param {number} timetableId - 時間割ID
   * @returns {Promise} 時間割詳細
   */
  getTimetable: async(timetableId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/timetables/${timetableId}`)) as unknown as ApiResponse;
  },

  /**
   * 時間割更新
   * @param {number} timetableId - 時間割ID
   * @param {Object} data - 更新データ
   * @returns {Promise} 更新結果
   */
  updateTimetable: async(timetableId: number | string, data: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/timetables/${timetableId}`, data)) as unknown as ApiResponse;
  },

  /**
   * 時間割削除
   * @param {number} timetableId - 時間割ID
   * @returns {Promise} 削除結果
   */
  deleteTimetable: async(timetableId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/timetables/${timetableId}`)) as unknown as ApiResponse;
  },

  /**
   * 授業セッション追加
   * @param {number} timetableId - 時間割ID
   * @param {Object} sessionData - セッションデータ
   * @returns {Promise} 追加結果
   */
  addClassSession: async(timetableId: number | string, sessionData: any): Promise<ApiResponse> => {
    return (await apiClient.post(`/timetables/${timetableId}/sessions`, sessionData)) as unknown as ApiResponse;
  },

  /**
   * 授業セッション更新
   * @param {number} sessionId - セッションID
   * @param {Object} data - 更新データ
   * @returns {Promise} 更新結果
   */
  updateClassSession: async(sessionId: number | string, data: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/timetables/sessions/${sessionId}`, data)) as unknown as ApiResponse;
  },

  /**
   * 授業セッション削除
   * @param {number} sessionId - セッションID
   * @returns {Promise} 削除結果
   */
  deleteClassSession: async(sessionId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/timetables/sessions/${sessionId}`)) as unknown as ApiResponse;
  },

  /**
   * 授業休講設定
   * @param {number} sessionId - セッションID
   * @param {boolean} isCancelled - 休講フラグ
   * @param {string} reason - 理由（オプション）
   * @returns {Promise} 設定結果
   */
  toggleSessionCancellation: async(sessionId: number | string, isCancelled: boolean, reason: string = ''): Promise<ApiResponse> => {
    return (await apiClient.put(`/timetables/sessions/${sessionId}/cancel`, {
      isCancelled,
      reason,
    })) as unknown as ApiResponse;
  },

  /**
   * カレンダーデータ取得（年/月/週対応）
   * @param {number} groupId - グループID
   * @param {string} periodType - 期間タイプ（'year' | 'month' | 'week'）
   * @param {string} startDate - 開始日（YYYY-MM-DD）
   * @param {string} endDate - 終了日（YYYY-MM-DD）
   * @returns {Promise} カレンダーデータ
   */
  getTimetableByPeriod: async(groupId: number | string, periodType: string, startDate: string, endDate: string): Promise<ApiResponse> => {
    return (await apiClient.get(`/timetables/calendar/${groupId}`, {
      params: {
        periodType,
        startDate,
        endDate,
      },
    })) as unknown as ApiResponse;
  },

  /**
   * Excelから時間割インポート
   * @param {File} file - Excelファイル
   * @param {number} groupId - グループID
   * @returns {Promise} インポート結果
   */
  importFromExcel: async(file: File, groupId: number | string): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId.toString());

    return (await formDataClient.post('/timetables/import', formData, {
      timeout: 60000,
    })) as unknown as ApiResponse;
  },

  /**
   * 時間割テンプレート一覧取得
   * @returns {Promise} テンプレート一覧
   */
  getTemplates: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/timetables/templates')) as unknown as ApiResponse;
  },

  /**
   * 時間割テンプレート作成
   * @param {Object} data - テンプレートデータ
   * @returns {Promise} 作成結果
   */
  createTemplate: async(data: any): Promise<ApiResponse> => {
    return (await apiClient.post('/timetables/templates', data)) as unknown as ApiResponse;
  },

  /**
   * テンプレートから時間割作成
   * @param {number} templateId - テンプレートID
   * @param {number} groupId - グループID
   * @param {string} academicYear - 学年
   * @param {string} semester - 学期
   * @returns {Promise} 作成結果
   */
  createFromTemplate: async(templateId: number | string, groupId: number | string, academicYear: string, semester: string): Promise<ApiResponse> => {
    return (await apiClient.post(`/timetables/templates/${templateId}/apply`, {
      groupId,
      academicYear,
      semester,
    })) as unknown as ApiResponse;
  },

  // ========================================
  // 組織設定関連API
  // ========================================

  /**
   * 組織の時間割設定を取得
   * @returns {Promise} 設定情報
   */
  getOrganizationSettings: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/timetables/settings')) as unknown as ApiResponse;
  },

  /**
   * 組織の時間割設定を保存
   * @param {Object} settings - 設定データ
   * @returns {Promise} 保存結果
   */
  saveOrganizationSettings: async(settings: any): Promise<ApiResponse> => {
    return (await apiClient.post('/timetables/settings', settings)) as unknown as ApiResponse;
  },
};

export default timetableApi;
