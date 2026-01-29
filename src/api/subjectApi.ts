import { apiClient, ApiResponse } from './client';

/**
 * 科目管理API
 */
export const subjectApi = {
    /**
     * 科目一覧取得
     * @returns {Promise} 科目一覧
     */
    getSubjects: async (): Promise<ApiResponse> => {
        return (await apiClient.get('/subjects')) as unknown as ApiResponse;
    },

    /**
     * 科目詳細取得
     * @param {number} subjectId - 科目ID
     * @returns {Promise} 科目詳細
     */
    getSubject: async (subjectId: number | string): Promise<ApiResponse> => {
        return (await apiClient.get(`/subjects/${subjectId}`)) as unknown as ApiResponse;
    },

    /**
     * 科目作成
     * @param {Object} data - 科目データ
     * @returns {Promise} 作成結果
     */
    createSubject: async (data: {
        subjectCode: string;
        subjectName: string;
        description?: string;
        credits?: number;
    }): Promise<ApiResponse> => {
        // バックエンドはsnake_caseを期待するので変換
        const payload = {
            subject_code: data.subjectCode,
            subject_name: data.subjectName,
            description: data.description,
            credits: data.credits,
        };
        return (await apiClient.post('/subjects', payload)) as unknown as ApiResponse;
    },

    /**
     * 科目更新
     * @param {number} subjectId - 科目ID
     * @param {Object} data - 更新データ
     * @returns {Promise} 更新結果
     */
    updateSubject: async (subjectId: number | string, data: any): Promise<ApiResponse> => {
        return (await apiClient.put(`/subjects/${subjectId}`, data)) as unknown as ApiResponse;
    },

    /**
     * 科目削除
     * @param {number} subjectId - 科目ID
     * @returns {Promise} 削除結果
     */
    deleteSubject: async (subjectId: number | string): Promise<ApiResponse> => {
        return (await apiClient.delete(`/subjects/${subjectId}`)) as unknown as ApiResponse;
    },
};

export default subjectApi;
