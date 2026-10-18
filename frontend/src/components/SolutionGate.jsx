import { useRef } from 'react';
import { useReveal } from '../hooks/useReveal';
import RevealGate from './RevealGate';
import './SolutionGate.css';

export default function SolutionGate({ module, label, children }) {
  const { isRevealed, reveal, hide } = useReveal();
  const revealed = isRevealed(module);
  const region = useRef(null);
  const disclose = visible => {
    if (visible) reveal(module);
    else hide(module);
    region.current?.focus();
  };
  return <section className="solution-gate" ref={region} tabIndex={-1} aria-label={`${label || 'Design'} solution`}>
    {!revealed ? <RevealGate onReveal={() => disclose(true)} label={label} module={module} /> : <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button type="button" onClick={() => disclose(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--font-sm)', minHeight: 44, padding: '6px 12px', cursor: 'pointer', textDecoration: 'underline' }}>🔒 Hide again</button>
      </div>
      {children}
    </>}
  </section>;
}
