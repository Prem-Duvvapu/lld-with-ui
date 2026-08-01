import React from 'react';
import './Badge.css';

export default function Badge({
  children,
  variant = 'neutral', // 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'accent'
  size = 'md', // 'sm' | 'md'
  icon = null,
  className = '',
  style
}) {
  return (
    <span className={`ui-badge ui-badge--${variant} ui-badge--${size} ${className}`} style={style}>
      {icon && <span className="ui-badge__icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
