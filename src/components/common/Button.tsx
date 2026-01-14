import React, { ButtonHTMLAttributes, MouseEventHandler, ReactNode, useState, useRef } from 'react';
import { motion, AnimatePresence, HTMLMotionProps, useAnimation } from 'framer-motion';
import './Button.css';

// ボタンのバリアント
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline';

// ボタンのサイズ
export type ButtonSize = 'small' | 'medium' | 'large';

// Props 型定義
interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'type'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean; // 成功状態を表示
  fullWidth?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  success = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const controls = useAnimation();

  const baseClasses = 'btn';
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    danger: 'btn--danger',
    success: 'btn--success',
    outline: 'btn--outline',
  };
  const sizeClasses: Record<ButtonSize, string> = {
    small: 'btn--small',
    medium: 'btn--medium',
    large: 'btn--large',
  };

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled ? 'btn--disabled' : '',
    loading ? 'btn--loading' : '',
    success ? 'btn--success-state' : '',
    fullWidth ? 'btn--full-width' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    // リップル効果を作成
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { x, y, id: Date.now() };

      setRipples(prev => [...prev, newRipple]);

      // リップルを自動削除
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }

    // クリックアニメーション
    controls.start({
      scale: [1, 0.95, 1],
      transition: { duration: 0.2 },
    });

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      animate={controls}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {/* リップル効果 */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="btn__ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* ローディングスピナー */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.span
            key="spinner"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="btn__spinner"
          />
        )}
      </AnimatePresence>

      {/* 成功アイコン */}
      <AnimatePresence mode="wait">
        {success && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: [0, 360] }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="btn__success-icon"
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>

      {/* ボタンコンテンツ */}
      <motion.span
        className="btn__content"
        animate={{
          opacity: loading || success ? 0.7 : 1,
          x: loading ? 8 : success ? -8 : 0,
        }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
};

Button.displayName = 'Button';

export default Button;
