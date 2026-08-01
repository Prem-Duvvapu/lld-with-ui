import React from 'react';
import './Table.css';

export function Table({
  headers = [],
  data = [],
  renderRow,
  striped = false,
  hoverable = true,
  className = '',
  children
}) {
  return (
    <div className={`ui-table-container ${className}`}>
      <table className={`ui-table ${striped ? 'ui-table--striped' : ''} ${hoverable ? 'ui-table--hoverable' : ''}`}>
        {children ? (
          children
        ) : (
          <>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => renderRow ? renderRow(item, index) : (
                <tr key={item.id || index}>
                  {Object.values(item).map((val, cellIdx) => (
                    <td key={cellIdx}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>
    </div>
  );
}
