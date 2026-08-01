import React from 'react';

export default function PrinciplesTab({ principles = [], oopConcepts = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {principles && principles.length > 0 && (
        <div>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            ⚙️ SOLID & Design Principles Applied
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {principles.map((p, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  borderLeft: '4px solid var(--accent)'
                }}
              >
                <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {p.name}
                </h4>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-normal)', margin: 0 }}>
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {oopConcepts && oopConcepts.length > 0 && (
        <div>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            🔄 OOP Concepts & Design Tradeoffs
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {oopConcepts.map((o, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)'
                }}
              >
                <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--info)', marginBottom: '4px' }}>
                  {o.name}
                </h4>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)', lineHeight: 'var(--leading-normal)', marginBottom: 'var(--space-2)' }}>
                  {o.description}
                </p>
                {o.alternative && (
                  <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-secondary)' }}>
                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      Alternative Considered
                    </span>
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                      {o.alternative}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
