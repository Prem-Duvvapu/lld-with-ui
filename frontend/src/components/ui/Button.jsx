import React from 'react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const classNames = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    loading ? 'ui-btn--loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="ui-btn__spinner" role="status" aria-label="Loading" />
      ) : icon ? (
        <span className="ui-btn__icon">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
