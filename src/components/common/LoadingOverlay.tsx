import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message = '読み込み中...' }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="loading-overlay__content">
            <div className="loading-overlay__spinner" />
            <p className="loading-overlay__message">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
