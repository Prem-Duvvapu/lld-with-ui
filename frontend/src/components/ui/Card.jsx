import React from 'react';
import './Card.css';

export function Card({ children, hoverable = false, className = '', ...props }) {
  return (
    <div
      className={`ui-card ${hoverable ? 'ui-card--hoverable' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`ui-card__header ${className}`}>
      <div>
        {title && <h3 className="ui-card__title">{title}</h3>}
        {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '', style }) {
  return <div className={`ui-card__body ${className}`} style={style}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`ui-card__footer ${className}`}>{children}</div>;
}
