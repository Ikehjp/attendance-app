import React from 'react';
import { motion } from 'framer-motion';
import './Toast.css';

export interface ToastProps {
  id: string | number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onClose: (id: string | number) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`toast toast--${type}`}
    >
      <div className="toast__message">{message}</div>
      <button className="toast__close" onClick={() => onClose(id)}>
        ×
      </button>
    </motion.div>
  );
};

export default Toast;
