import React from 'react';
import Badge from '../ui/Badge';

export default function ExtensibilityTab({ extensibility = [], tradeoffs = [] }) {
  const getBadgeVariant = (diff) => {
    if (diff === 'Easy') return 'success';
    if (diff === 'Medium') return 'warning';
    return 'danger';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {extensibility && extensibility.length > 0 && (
        <div>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            🔧 Extensibility Roadmap
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {extensibility.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                  <Badge variant={getBadgeVariant(item.difficulty)}>
                    {item.difficulty}
                  </Badge>
                  <span style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.area}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-normal)', margin: 0 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tradeoffs && tradeoffs.length > 0 && (
        <div>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            ⚖️ Architecture Tradeoffs
          </h3>
          <ul style={{ paddingLeft: 'var(--space-4)', margin: 0 }}>
            {tradeoffs.map((t, i) => (
              <li key={i} style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-normal)', marginBottom: 'var(--space-2)' }}>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
