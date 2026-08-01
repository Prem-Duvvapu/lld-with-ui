import React from 'react';
import './Skeleton.css';

export default function Skeleton({
  variant = 'rect', // 'rect' | 'circle' | 'text'
  width,
  height,
  className = '',
  style
}) {
  return (
    <div
      className={`ui-skeleton ui-skeleton--${variant} ${className}`}
      style={{
        width: width || (variant === 'circle' ? height : undefined),
        height,
        ...style
      }}
    />
  );
}
