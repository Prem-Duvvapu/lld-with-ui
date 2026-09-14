import { useReveal } from '../hooks/useReveal';
import RevealGate from './RevealGate';

/**
 * Gates an entire tab's content (Class Diagram, Sequence Diagram) behind the shared per-module
 * reveal flag. DesignDetails.jsx gates itself internally instead, since its Requirements
 * sub-tab -- the problem statement -- must stay visible even before reveal; this wrapper is for
 * tabs that are pure "solution" with nothing to show pre-reveal.
 */
export default function SolutionGate({ module, label, children }) {
  const { isRevealed, reveal, hide } = useReveal();
  const revealed = isRevealed(module);

  if (!revealed) {
    return <RevealGate onReveal={() => reveal(module)} label={label} module={module} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => hide(module)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-xs, 12px)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          🔒 Hide again
        </button>
      </div>
      {children}
    </div>
  );
}
