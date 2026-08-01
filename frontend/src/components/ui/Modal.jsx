import React, { useEffect } from 'react';
import './Modal.css';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '540px',
  className = ''
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div
        className={`ui-modal ${className}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ui-modal__header">
          {title && <h3 className="ui-modal__title">{title}</h3>}
          {onClose && (
            <button className="ui-modal__close" onClick={onClose} aria-label="Close modal">
              ×
            </button>
          )}
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
