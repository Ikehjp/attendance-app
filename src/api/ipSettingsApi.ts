import { apiClient } from './client';

export interface IpRange {
    id: number;
    name: string;
    ip_start: string;
    ip_end: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: any[];
}

export const ipSettingsApi = {
    // すべてのIP範囲を取得
    getAll: async (): Promise<ApiResponse<IpRange[]>> => {
        return (await apiClient.get('/ip-settings')) as unknown as ApiResponse<IpRange[]>;
    },

    // 新しいIP範囲を追加
    create: async (data: Omit<IpRange, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<IpRange>> => {
        return (await apiClient.post('/ip-settings', data)) as unknown as ApiResponse<IpRange>;
    },

    // IP範囲を更新
    update: async (id: number, data: Partial<Omit<IpRange, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse> => {
        return (await apiClient.put(`/ip-settings/${id}`, data)) as unknown as ApiResponse;
    },

    // IP範囲を削除
    delete: async (id: number): Promise<ApiResponse> => {
        return (await apiClient.delete(`/ip-settings/${id}`)) as unknown as ApiResponse;
    },
};
