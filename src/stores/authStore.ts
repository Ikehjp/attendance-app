import { create } from 'zustand';
import { attendanceApi } from '../api/attendanceApi';

// ユーザー型定義
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'teacher' | 'employee' | 'student';
  organization_id?: number;
  organization_name?: string;
  student_id?: string;
  employee_id?: string;
  department?: string;
  [key: string]: any;
}

// 認証結果型
interface AuthResult {
  success: boolean;
  message?: string;
}

// ストア状態型
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  viewMode: 'student' | null;
  setLoading: (loading: boolean) => void;
  toggleViewMode: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (userData: any) => Promise<AuthResult>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  viewMode: null,

  setLoading: (loading) => set({ isLoading: loading }),

  // 表示モード切り替えアクション
  toggleViewMode: () => {
    const { user, viewMode } = get();
    // 学生ユーザーは切り替え不可
    if (!user || user.role === 'student') return;

    set({ viewMode: viewMode === 'student' ? null : 'student' });
  },

  // ログインアクション
  login: async (email, password) => {
    try {
      const response = await attendanceApi.login(email, password);

      if (response.success) {
        const { user } = response.data;
        set({ user, isAuthenticated: true, viewMode: null });
        return { success: true };
      } else {
        set({ user: null, isAuthenticated: false, viewMode: null });
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      set({ user: null, isAuthenticated: false, viewMode: null });
      return { success: false, message: 'ログインに失敗しました' };
    }
  },

  // 新規登録アクション
  register: async (userData) => {
    try {
      const response = await attendanceApi.register(userData);

      if (response.success) {
        const { user } = response.data;
        set({ user, isAuthenticated: true, viewMode: null });
        return { success: true };
      } else {
        set({ user: null, isAuthenticated: false, viewMode: null });
        return { success: false, message: response.message || '登録に失敗しました' };
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      set({ user: null, isAuthenticated: false, viewMode: null });
      return { success: false, message: error.message || '登録に失敗しました' };
    }
  },

  // ログアウトアクション
  logout: async () => {
    try {
      await attendanceApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      set({ user: null, isAuthenticated: false, viewMode: null });
    }
  },

  // ユーザー情報をセットするアクション
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  // 初期化チェック（Cookieによる自動ログイン確認用）
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await attendanceApi.getAuthUser();
      if (response.success) {
        set({ user: response.data.user, isAuthenticated: true });
      }
    } catch (error) {
      // 認証切れなどはここで無視して未ログイン状態にする
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;
