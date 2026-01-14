import React from 'react';
import { AnimatePresence } from 'framer-motion';
import useToastStore from '../../stores/toastStore';
import Toast from './Toast';
import './Toast.css';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
