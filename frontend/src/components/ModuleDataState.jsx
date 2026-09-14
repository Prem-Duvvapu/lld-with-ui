const wrap = {
  color: 'var(--text-muted)',
  textAlign: 'center',
  padding: 32,
  fontSize: 14,
};

/**
 * The non-ready states for content loaded by `useModuleData`. A failed chunk fetch
 * says so, rather than borrowing the "no content yet" copy — those are different
 * problems and only one of them is worth retrying.
 */
export default function ModuleDataState({ status, label }) {
  if (status === 'loading') {
    return (
      <div style={wrap} role="status" aria-live="polite">
        <span className="module-data-spinner" aria-hidden="true" />
        Loading {label.toLowerCase()}…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ ...wrap, color: 'var(--danger)' }} role="alert">
        {label} couldn&apos;t be loaded. Check your connection and reload the page.
      </div>
    );
  }

  return <div style={wrap}>{label} not available for this module yet.</div>;
}
