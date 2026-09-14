import { useId } from 'react';
import { useAttempt } from '../hooks/useAttempt';

const PLACEHOLDER = `e.g.
Entities: ParkingLot, Level, Spot, Ticket, Vehicle
Key decisions: Spot allocation via a Strategy so pricing can vary by vehicle type
Concurrency: one lock per level, taken in ascending level order
Trade-off: in-memory map keeps lookup O(1) but loses state on restart`;

const labelStyle = {
  display: 'block',
  fontSize: 'var(--font-sm, 13px)',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 6,
};

const textareaStyle = {
  width: '100%',
  minHeight: 132,
  padding: '10px 12px',
  borderRadius: 'var(--radius-md, 10px)',
  border: '1px solid var(--border-primary)',
  background: 'var(--bg-input, var(--bg-primary))',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--font-sm, 13px)',
  lineHeight: 1.55,
  resize: 'vertical',
};

/**
 * Where the visitor writes their own design before revealing the real one.
 *
 * Saved per module on every keystroke — a note that vanishes because someone forgot to
 * press a save button is worse than not offering the box at all.
 */
export default function AttemptBox({ module, compact = false }) {
  const { getAttempt, setAttempt } = useAttempt();
  const id = useId();
  const value = getAttempt(module);

  return (
    <div style={{ textAlign: 'left', marginTop: compact ? 0 : 24 }}>
      <label htmlFor={id} style={labelStyle}>
        ✍️ Your design {compact ? '' : '(saved as you type, in this browser only)'}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => setAttempt(module, e.target.value)}
        placeholder={PLACEHOLDER}
        style={textareaStyle}
        spellCheck="false"
      />
      <p style={{ margin: '6px 2px 0', fontSize: 'var(--font-xs, 11px)', color: 'var(--text-muted)' }}>
        {value.trim()
          ? 'Saved. It stays on screen after you reveal, so you can compare.'
          : 'Jot down the entities and the one or two decisions you would defend.'}
      </p>
    </div>
  );
}
