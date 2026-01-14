import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const API_BASE_URL = '/api';

// API レスポンス型
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    status?: number | null;
}

// エラーレスポンス型
export interface ApiErrorResponse extends ApiResponse {
    status: number | null;
}

// APIクライアントの設定
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Cookie送受信用
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// マルチパートフォームデータ用のクライアント
export const formDataClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  timeout: 30000, // ファイルアップロードのため長めに設定
});

// レスポンスインターセプター
const responseInterceptor = (response: AxiosResponse) => {
  // 成功レスポンス（主に data プロパティを返す）
  // バックエンドが { success: true, data: {...} } 形式で返すことを想定
  if (response.data && response.data.success) {
    return response.data;
  }
  // バックエンドが data プロパティなしで返す場合（例: /auth/me）
  if (response.status === 200 && response.data) {
    return { success: true, data: response.data };
  }
  return response;
};

const errorInterceptor = (error: AxiosError<any>) => {
  // エラーハンドリングを強化
  const errorResponse: ApiErrorResponse = {
    success: false,
    message: '不明なエラーが発生しました',
    status: null,
    data: null,
  };

  if (error.response) {
    // サーバーからの応答がある場合
    errorResponse.status = error.response.status;

    // Blobレスポンスのエラーハンドリング (JSONパース試行)
    if (error.response.config && error.response.config.responseType === 'blob' && error.response.data instanceof Blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            errorResponse.message = errorData.message || `API接続エラー: ${error.response?.statusText}`;
            errorResponse.data = errorData;
            console.error('API Error (Blob):', errorResponse.message);
            reject(errorResponse);
          } catch (e) {
            errorResponse.message = `API接続エラー: ${error.response?.statusText}`;
            console.error('API Error (Blob parse failed):', errorResponse.message);
            reject(errorResponse);
          }
        };
        reader.onerror = () => {
          errorResponse.message = `API接続エラー: ${error.response?.statusText}`;
          reject(errorResponse);
        };
        reader.readAsText(error.response.data);
      });
    }

    if (error.response.data && error.response.data.message) {
      errorResponse.message = error.response.data.message;
    } else {
      errorResponse.message = `API接続エラー: ${error.response.statusText}`;
    }
    errorResponse.data = error.response.data;
  } else if (error.request) {
    // サーバーに接続できない場合
    errorResponse.message = 'API接続エラー: サーバーに接続できません。サーバーが起動しているか確認してください。';
  } else {
    // その他のエラー
    errorResponse.message = `API接続エラー: ${error.message}`;
  }

  console.error('API Error:', errorResponse.message);
  return Promise.reject(errorResponse);
};

// インターセプターを適用
apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);
formDataClient.interceptors.response.use(responseInterceptor, errorInterceptor);

// リクエストインターセプター (apiClientのみ)
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
