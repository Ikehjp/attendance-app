import { create } from 'zustand';

// Toast 型定義
export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration: number;
}

// ストア状態型
interface ToastState {
    toasts: Toast[];
    addToast: (message: string, type?: Toast['type'], duration?: number) => void;
    removeToast: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export default useToastStore;
