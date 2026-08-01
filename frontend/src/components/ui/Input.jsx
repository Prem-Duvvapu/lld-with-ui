import React from 'react';
import './FormControls.css';

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="ui-form-group">
      {label && <label htmlFor={inputId} className="ui-label">{label}</label>}
      <input
        id={inputId}
        type={type}
        className={`ui-input ${error ? 'ui-input--error' : ''} ${className}`}
        {...props}
      />
      {error ? (
        <span className="ui-helper-text ui-helper-text--error">{error}</span>
      ) : helperText ? (
        <span className="ui-helper-text">{helperText}</span>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  options = [],
  error,
  helperText,
  children,
  className = '',
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="ui-form-group">
      {label && <label htmlFor={selectId} className="ui-label">{label}</label>}
      <select
        id={selectId}
        className={`ui-select ${error ? 'ui-select--error' : ''} ${className}`}
        {...props}
      >
        {children || options.map((opt) => (
          typeof opt === 'object' ? (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ) : (
            <option key={opt} value={opt}>{opt}</option>
          )
        ))}
      </select>
      {error ? (
        <span className="ui-helper-text ui-helper-text--error">{error}</span>
      ) : helperText ? (
        <span className="ui-helper-text">{helperText}</span>
      ) : null}
    </div>
  );
}
