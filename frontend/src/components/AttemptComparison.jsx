import { useState } from 'react';
import { useAttempt } from '../hooks/useAttempt';
import AttemptBox from './AttemptBox';

const panelStyle = {
  border: '1px solid var(--border-primary)',
  borderRadius: 'var(--radius-md, 10px)',
  background: 'var(--bg-tertiary)',
  padding: '12px 14px',
  marginBottom: 'var(--space-4, 16px)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: 'var(--font-sm, 13px)',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

/**
 * The visitor's own design, kept on screen next to the real one after they reveal.
 *
 * Without this the attempt box would be write-only: you'd note your design, reveal, and
 * then have nothing to check it against — which is the half of the exercise that
 * actually teaches. Collapsed by default once revealed so it never competes with the
 * content, but one click away.
 */
export default function AttemptComparison({ module }) {
  const { getAttempt, hasAttempt } = useAttempt();
  const [open, setOpen] = useState(true);

  if (!hasAttempt(module)) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>✍️ What you said before revealing</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-xs, 11px)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {open ? 'Collapse' : 'Show'}
        </button>
      </div>

      {open && (
        <>
          <pre
            style={{
              margin: '10px 0 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-sm, 13px)',
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}
          >
            {getAttempt(module)}
          </pre>
          <details style={{ marginTop: 10 }}>
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 'var(--font-xs, 11px)',
                color: 'var(--text-muted)',
              }}
            >
              Edit your notes
            </summary>
            <AttemptBox module={module} compact />
          </details>
        </>
      )}
    </div>
  );
}
