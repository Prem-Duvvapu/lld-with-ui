import React from 'react';
import './EmptyState.css';

export default function EmptyState({
  icon = '📭',
  title = 'No data available',
  description,
  action,
  className = ''
}) {
  return (
    <div className={`ui-empty-state ${className}`}>
      {icon && <div className="ui-empty-state__icon">{icon}</div>}
      <h3 className="ui-empty-state__title">{title}</h3>
      {description && <p className="ui-empty-state__description">{description}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
}
