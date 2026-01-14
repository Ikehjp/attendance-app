/**
 * モジュール連携チェック用ユーティリティ
 * 各モジュールが正しく連携しているか確認するためのヘルパー関数
 */

/**
 * API呼び出しの安全性チェック
 * @param {string} functionName - 関数名
 * @param {Object} params - パラメータオブジェクト
 * @param {Array<string>} requiredParams - 必須パラメータの配列
 */
export const validateApiParams = (functionName, params, requiredParams = []) => {
  const missingParams = requiredParams.filter(param => {
    const value = params[param];
    return value === undefined || value === null || value === '';
  });

  if (missingParams.length > 0) {
    throw new Error(
      `${functionName}: 必須パラメータが不足しています: ${missingParams.join(', ')}`,
    );
  }
};

/**
 * ユーザーIDの検証
 * @param {number|string} userId - ユーザーID
 * @param {string} context - コンテキスト（エラーメッセージ用）
 */
export const validateUserId = (userId, context = '操作') => {
  if (!userId) {
    throw new Error(`${context}にはユーザーIDが必要です`);
  }
  if (typeof userId !== 'number' && typeof userId !== 'string') {
    throw new Error(`${context}のユーザーIDが無効です`);
  }
};

/**
 * 認証状態のチェック
 * @param {Object} authState - 認証状態オブジェクト
 * @param {boolean} requireAuth - 認証が必要かどうか
 */
export const validateAuthState = (authState, requireAuth = true) => {
  if (requireAuth && !authState.isAuthenticated) {
    throw new Error('この操作にはログインが必要です');
  }
  if (requireAuth && !authState.user?.id) {
    throw new Error('ユーザー情報が取得できませんでした');
  }
};

/**
 * APIレスポンスの検証
 * @param {Object} response - APIレスポンス
 * @param {string} context - コンテキスト（エラーメッセージ用）
 */
export const validateApiResponse = (response, context = 'API呼び出し') => {
  if (!response) {
    throw new Error(`${context}: レスポンスがありません`);
  }
  if (response.success === false) {
    throw new Error(response.message || `${context}に失敗しました`);
  }
};

/**
 * エラーハンドリングのヘルパー
 * @param {Error} error - エラーオブジェクト
 * @param {string} context - コンテキスト
 * @param {Function} onError - エラー処理コールバック
 */
export const handleApiError = (error, context = '操作', onError = null) => {
  const errorMessage = error.message || `${context}中にエラーが発生しました`;
  
  if (onError && typeof onError === 'function') {
    onError(errorMessage, error);
  }
  
  // 開発環境でのみエラーログ出力
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(`${context}エラー:`, error);
  }
  
  return errorMessage;
};

/**
 * 安全なAPI呼び出しのラッパー
 * @param {Function} apiCall - API呼び出し関数
 * @param {Object} params - パラメータ
 * @param {Array<string>} requiredParams - 必須パラメータ
 * @param {string} context - コンテキスト
 */
export const safeApiCall = async(apiCall, params, requiredParams = [], context = 'API呼び出し') => {
  try {
    // 必須パラメータの検証
    validateApiParams(apiCall.name || context, params, requiredParams);
    
    // API呼び出し
    const response = await apiCall(params);
    
    // レスポンスの検証
    validateApiResponse(response, context);
    
    return response;
  } catch (error) {
    handleApiError(error, context);
    throw error;
  }
};

