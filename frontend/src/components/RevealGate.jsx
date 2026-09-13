const cardStyle = {
  maxWidth: '480px',
  margin: '40px auto',
  padding: '32px 28px',
  textAlign: 'center',
  background: 'var(--bg-tertiary)',
  border: '1px dashed var(--border-primary)',
  borderRadius: 'var(--radius-lg, 16px)',
};

/**
 * The "try it yourself first" prompt shown in place of a module's solution content
 * (Entities/Patterns/Principles/Extensibility sub-tabs, or the whole Class/Sequence Diagram tab)
 * until the visitor explicitly reveals it. See hooks/useReveal.js.
 */
export default function RevealGate({ onReveal, label }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 'var(--font-lg, 18px)', color: 'var(--text-primary)' }}>
        Try it yourself first
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 'var(--font-sm, 14px)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Think through {label || 'the design'} yourself before looking at the real implementation —
        that's the actual practice. Reveal whenever you're ready to compare.
      </p>
      <button
        type="button"
        onClick={onReveal}
        style={{
          padding: '10px 22px',
          borderRadius: 'var(--radius-md, 10px)',
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 'var(--font-sm, 14px)',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        🔓 Reveal Solution
      </button>
    </div>
  );
}
