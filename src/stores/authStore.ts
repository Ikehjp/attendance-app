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
  token: string | null;
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
  token: localStorage.getItem('authToken'),
  isAuthenticated: false,
  isLoading: true,
  viewMode: null,

  setLoading: (loading) => set({ isLoading: loading }),

  // 表示モード切り替えアクション
  toggleViewMode: () => {
    const { user, viewMode } = get();
    if (!user || user.role === 'student') return;

    set({ viewMode: viewMode === 'student' ? null : 'student' });
  },

  // ログインアクション
  login: async (email, password) => {
    try {
      const response = await attendanceApi.login(email, password);

      if (response.success) {
        const { user, token } = response.data;
        
        if (token) {
          localStorage.setItem('authToken', token);
        }

        set({ user, token, isAuthenticated: true, viewMode: null });
        return { success: true };
      } else {
        set({ user: null, token: null, isAuthenticated: false, viewMode: null });
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      set({ user: null, token: null, isAuthenticated: false, viewMode: null });
      return { success: false, message: 'ログインに失敗しました' };
    }
  },

  // ▼▼▼ 修正: 新規登録アクション（自動ログイン機能付き） ▼▼▼
  register: async (userData) => {
    try {
      // 1. まず新規登録を実行
      const response = await attendanceApi.register(userData);

      if (response.success) {
        let { user, token } = response.data;

        // 2. もし登録APIがトークンを返してこなかった場合、
        //    登録に使ったメアドとパスワードで「裏ログイン」を試みる
        if (!token && userData.email && userData.password) {
          console.log('🔄 新規登録成功。トークン取得のため自動ログインを試みます...');
          try {
            const loginResponse = await attendanceApi.login(userData.email, userData.password);
            if (loginResponse.success && loginResponse.data.token) {
              token = loginResponse.data.token;
              user = loginResponse.data.user; // 最新のユーザー情報で上書き
              console.log('✅ 自動ログイン成功。トークンを取得しました。');
            }
          } catch (loginError) {
            console.warn('⚠️ 自動ログインに失敗しました:', loginError);
            // ログイン失敗しても、登録自体は成功しているのでそのまま進む（トークンなし状態）
          }
        }

        // 3. トークンがあれば保存
        if (token) {
          localStorage.setItem('authToken', token);
        }

        set({ user, token, isAuthenticated: true, viewMode: null });
        return { success: true };
      } else {
        set({ user: null, token: null, isAuthenticated: false, viewMode: null });
        return { success: false, message: response.message || '登録に失敗しました' };
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      set({ user: null, token: null, isAuthenticated: false, viewMode: null });
      return { success: false, message: error.message || '登録に失敗しました' };
    }
  },
  // ▲▲▲ 修正ここまで ▲▲▲

  // ログアウトアクション
  logout: async () => {
    try {
      await attendanceApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, viewMode: null });
    }
  },

  // ユーザー情報をセットするアクション
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  // 初期化チェック
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await attendanceApi.getAuthUser();
      if (response.success) {
        const storedToken = localStorage.getItem('authToken');
        set({ 
          user: response.data.user, 
          isAuthenticated: true,
          token: storedToken,
        });
      }
    } catch (error) {
      set({ user: null, token: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;