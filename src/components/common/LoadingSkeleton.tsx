import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import './LoadingSkeleton.css';

interface SkeletonBaseProps extends HTMLMotionProps<'div'> {
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBase: React.FC<SkeletonBaseProps> = ({ className = '', style = {}, ...props }) => {
  return (
    <motion.div
      className={`skeleton-base ${className}`}
      style={style}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      {...props}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  height?: number;
  className?: string;
  gap?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 1, height = 20, className = '', gap = 10 }) => {
  return (
    <div className={`skeleton-text-container ${className}`} style={{ gap: `${gap}px` }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className="skeleton-text-line"
          style={{ height: `${height}px`, width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
};

interface SkeletonRectProps {
  width: number | string;
  height: number | string;
  className?: string;
}

export const SkeletonRect: React.FC<SkeletonRectProps> = ({ width, height, className = '' }) => {
  return (
    <SkeletonBase
      className={`skeleton-rect ${className}`}
      style={{ width, height }}
    />
  );
};

interface SkeletonCircleProps {
  size: number | string;
  className?: string;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size, className = '' }) => {
  return (
    <SkeletonBase
      className={`skeleton-circle ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

type SkeletonType = 'text' | 'rect' | 'circle';

interface LoadingSkeletonProps extends Omit<SkeletonTextProps, 'height'> {
  type?: SkeletonType;
  width?: number | string; // For rect/circle
  height?: number | string; // For rect (overrides SkeletonTextProps.height)
  size?: number | string; // For circle
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'text', ...props }) => {
  if (type === 'rect') return <SkeletonRect width={props.width!} height={props.height!} className={props.className} />;
  if (type === 'circle') return <SkeletonCircle size={props.size || props.width!} className={props.className} />;

  // For text, we need to ensure height is treated as number if passed to SkeletonText, or handle string
  // But SkeletonText expects number. If we want to support string height for text lines, we need to update SkeletonText.
  // Assuming text height is usually number. If props.height is string, we might ignore it or parse it.
  // Let's cast it for now or assume it matches.
  return <SkeletonText {...props} height={typeof props.height === 'number' ? props.height : 20} />;
};

export default LoadingSkeleton;
