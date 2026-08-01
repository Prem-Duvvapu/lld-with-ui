import React from 'react';

export default function RequirementsTab({ requirements = [], tldr = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {tldr && tldr.length > 0 && (
        <div style={{
          background: 'var(--info-bg)',
          border: '1px solid var(--info)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-2)'
        }}>
          <h4 style={{ fontSize: 'var(--font-sm)', color: 'var(--info)', fontWeight: 700, marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚡ 2-Minute Executive Summary (TL;DR)
          </h4>
          <ul style={{ paddingLeft: 'var(--space-4)', margin: 0 }}>
            {tldr.map((item, idx) => (
              <li key={idx} style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)', lineHeight: 'var(--leading-normal)', marginBottom: 'var(--space-1)' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          📋 System Requirements & Constraints
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {requirements.map((r, i) => (
            <li key={i} style={{
              display: 'flex',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) 0',
              borderBottom: i < requirements.length - 1 ? '1px solid var(--border-secondary)' : 'none',
              fontSize: 'var(--font-sm)',
              color: 'var(--text-primary)',
              lineHeight: 'var(--leading-relaxed)'
            }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
