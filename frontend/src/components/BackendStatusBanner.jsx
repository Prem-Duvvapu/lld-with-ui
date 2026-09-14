import { useEffect, useState } from 'react';
import { BACKEND_STATUS, getBackendStatus, subscribeBackendStatus } from '../utils/api';

const base = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 16,
  zIndex: 'var(--z-toast, 1000)',
  maxWidth: 'min(520px, calc(100vw - 32px))',
  padding: '10px 16px',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 600,
  boxShadow: 'var(--shadow-lg)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  lineHeight: 1.45,
};

/**
 * Tells the user what the backend is actually doing.
 *
 * The deployed API runs on a free tier that sleeps after inactivity and needs ~50s to
 * wake. Without this, the first visitor after a quiet period just sees a spinner that
 * never resolves and concludes the site is broken — which, for a portfolio link, is the
 * single most expensive failure mode in the project. Saying "it's waking up, this takes
 * about a minute" costs nothing and turns a dead page into an honest one.
 */
export default function BackendStatusBanner() {
  const [status, setStatus] = useState(getBackendStatus);

  useEffect(() => subscribeBackendStatus(setStatus), []);

  if (status === BACKEND_STATUS.OK) return null;

  if (status === BACKEND_STATUS.WAKING) {
    return (
      <div
        style={{ ...base, background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning)' }}
        role="status"
        aria-live="polite"
      >
        <span className="module-data-spinner" aria-hidden="true" />
        <span>
          Waking the server up — it sleeps when idle on the free tier and takes about a minute.
          Everything will load once it&apos;s awake.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{ ...base, background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
      role="alert"
    >
      <span>
        Can&apos;t reach the server right now.{' '}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            font: 'inherit',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Reload
        </button>
      </span>
    </div>
  );
}
