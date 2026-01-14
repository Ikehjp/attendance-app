import React from 'react';
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion';
import './Input.css';

interface InputProps extends Omit<HTMLMotionProps<'input'>, 'ref'> {
  label?: string;
  error?: string;
  // props like value, onChange, etc are inherited from HTMLMotionProps
}

const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className = '',
  id,
  name,
  ...props
}) => {
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <motion.input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`input ${error ? 'input--error' : ''}`}
        animate={error ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
        transition={error ? { type: 'tween', duration: 0.4 } : { type: 'spring', stiffness: 500, damping: 20 }}
        whileFocus={{ scale: 1.01, borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }}
        {...props}
      />
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="input-error"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Input;
