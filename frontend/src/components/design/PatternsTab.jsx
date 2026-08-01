import React from 'react';
import Badge from '../ui/Badge';

export default function PatternsTab({ designPatterns = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
      {designPatterns.map((p, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {p.name}
            </span>
            <Badge variant={p.used ? 'success' : 'neutral'}>
              {p.used ? '✓ Applied' : '— Not Used'}
            </Badge>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-normal)', margin: 0 }}>
            {p.explanation}
          </p>
        </div>
      ))}
    </div>
  );
}
