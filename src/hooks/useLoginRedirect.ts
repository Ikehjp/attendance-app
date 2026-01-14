import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

/**
 * ログイン誘導用のカスタムフック
 * 認証が必要な操作を行う際に、未ログインの場合はログインページに誘導
 */
export const useLoginRedirect = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  /**
     * 認証が必要な操作を実行する前にログイン状態をチェック
     * @param {Function} action - 認証済みの場合に実行する関数
     * @param {string} redirectPath - ログイン後のリダイレクト先（オプション）
     */
  const requireAuth = (action: () => void, redirectPath: string | null = null): boolean => {
    if (!isAuthenticated) {
      // ログイン後に元のページに戻るための情報を保存
      const currentPath = window.location.pathname;
      const redirectTo = redirectPath || currentPath;

      navigate('/login', {
        state: {
          from: redirectTo,
          message: 'この操作を行うにはログインが必要です',
        },
      });
      return false;
    }

    // 認証済みの場合はアクションを実行
    if (typeof action === 'function') {
      action();
    }
    return true;
  };

  /**
     * 特定のロールが必要な操作を実行する前にログイン状態とロールをチェック
     * @param {string|string[]} requiredRoles - 必要なロール
     * @param {Function} action - 認証済みかつロールが適切な場合に実行する関数
     * @param {string} redirectPath - ログイン後のリダイレクト先（オプション）
     */
  const requireRole = (requiredRoles: string | string[], action: () => void, redirectPath: string | null = null): boolean => {
    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      const redirectTo = redirectPath || currentPath;

      navigate('/login', {
        state: {
          from: redirectTo,
          message: 'この操作を行うにはログインが必要です',
        },
      });
      return false;
    }

    // ロールチェック（実装は後で追加）
    // const { user } = useAuth();
    // const userRole = user?.role;
    // const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    // if (!roles.includes(userRole)) {
    //   navigate('/unauthorized');
    //   return false;
    // }

    if (typeof action === 'function') {
      action();
    }
    return true;
  };

  /**
     * ログイン状態をチェックしてブール値を返す
     * @returns {boolean} ログイン済みかどうか
     */
  const checkAuth = (): boolean => {
    return isAuthenticated;
  };

  return {
    requireAuth,
    requireRole,
    checkAuth,
    isAuthenticated,
  };
};
