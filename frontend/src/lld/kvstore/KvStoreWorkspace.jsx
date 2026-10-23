import { useEffect, useRef } from 'react';
import './KvStoreWorkspace.css';

function expiryText(epoch) {
  if (epoch == null) return 'No expiry recorded';
  const date = new Date(epoch);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(epoch);
}

export default function KvStoreWorkspace({ activeTab, model }) {
  const { activate } = model;
  const heading = useRef(null);
  const cancel = useRef(null);
  const hadConfirmation = useRef(null);
  useEffect(() => activate(), [activate, activeTab]);
  useEffect(() => {
    if (model.confirmation) cancel.current?.focus();
    else if (hadConfirmation.current === activeTab) heading.current?.focus();
    hadConfirmation.current = model.confirmation ? activeTab : null;
  }, [activeTab, model.confirmation]);

  const busy = Boolean(model.pending);
  const writesBlocked = busy || Boolean(model.uncertain);
  const field = (name, label, type = 'text', hint) => <div className="kv-field">
    <label htmlFor={`kv-${name}`}>{label}</label>
    <input id={`kv-${name}`} name={name} type={type} value={model.draft[name]}
      onChange={event => model.update(name, event.target.value)}
      min={type === 'number' ? 1 : undefined} step={type === 'number' ? 1 : undefined}
      aria-invalid={Boolean(model.errors[name])}
      aria-describedby={model.errors[name] ? `kv-${name}-error` : hint ? `kv-${name}-hint` : undefined} />
    {hint && <small id={`kv-${name}-hint`}>{hint}</small>}
    {model.errors[name] && <p className="kv-field-error" id={`kv-${name}-error`}>{model.errors[name]}</p>}
  </div>;
  const submit = action => event => {
    event.preventDefault();
    const invalid = action();
    if (invalid) event.currentTarget.elements.namedItem(invalid)?.focus();
  };
  const confirmationKey = event => {
    if (event.key === 'Escape' && !busy) { event.preventDefault(); model.setConfirmation(null); }
  };

  return <section className="kv-workspace" aria-label="Live key-value workspace" aria-busy={busy}>
    {model.feedback && <p className="kv-feedback" data-tone={model.feedback.type} role={model.feedback.type === 'error' ? 'alert' : 'status'}>{model.feedback.text}</p>}
    {model.retryRead && <button type="button" className="kv-secondary" disabled={busy} onClick={() => model.read(model.retryRead.key, model.retryRead.forCas)}>Retry GET {JSON.stringify(model.retryRead.key)}</button>}
    {model.pending && <div className="kv-pending"><p role="status">{model.pending.kind} request in progress for {JSON.stringify(model.pending.key)}…</p><button type="button" className="kv-secondary" onClick={model.stopWaiting}>Stop waiting</button></div>}
    {model.uncertain && <div className="kv-uncertain" role="alert">
      <p>The outcome of {model.uncertain.kind} {JSON.stringify(model.uncertain.key)} is unknown. It may have completed.</p>
      <p>Inspect the key before choosing another write. A read is only a current snapshot; it does not cancel an earlier request or prove that request cannot finish later.</p>
      <div className="kv-actions"><button type="button" disabled={busy} onClick={() => model.read(model.uncertain.key)}>Inspect current key</button><button type="button" className="kv-secondary" disabled={busy || !model.uncertain.inspected} onClick={model.allowWrites}>Allow another write</button></div>
    </div>}
    {model.confirmation && <div className="kv-confirmation" role="group" aria-label={`Confirm deletion of ${model.confirmation}`}>
      <p>Delete {JSON.stringify(model.confirmation)}? This removes the current value, which may differ from the saved response.</p>
      <div className="kv-actions"><button type="button" className="kv-danger" disabled={writesBlocked} onKeyDown={confirmationKey} onClick={model.confirmDelete}>Confirm delete</button><button ref={cancel} type="button" className="kv-secondary" disabled={busy} onKeyDown={confirmationKey} onClick={() => model.setConfirmation(null)}>Cancel</button></div>
    </div>}
    {activeTab === 'store' ? <div className="kv-grid">
      <section className="kv-card" aria-labelledby="kv-set-title">
        <h3 ref={heading} tabIndex={-1} id="kv-set-title">SET</h3>
        <p>Create or replace a value. The server assigns its version.</p>
        <form noValidate onSubmit={submit(model.submitSet)} aria-label="Set a key">
          <fieldset disabled={writesBlocked}>
            {field('setKey', 'Key to SET')}
            {field('setValue', 'Value to SET', 'text', 'An empty string is a valid value.')}
            {field('ttl', 'TTL seconds (optional)', 'number', 'Leave blank for no expiry. Use positive whole seconds.')}
            <button type="submit">SET</button>
          </fieldset>
        </form>
      </section>
      <section className="kv-card" aria-labelledby="kv-get-title">
        <h3 id="kv-get-title">GET</h3><p>Read the server’s current value and version.</p>
        <form noValidate onSubmit={submit(() => model.read())} aria-label="Read a key">
          <fieldset disabled={busy}>{field('getKey', 'Key to GET')}<button type="submit">GET</button></fieldset>
        </form>
      </section>
    </div> : <section className="kv-card kv-cas" aria-labelledby="kv-cas-title">
      <h3 ref={heading} tabIndex={-1} id="kv-cas-title">Compare-and-Swap</h3>
      <p>A stale version is rejected by the server. Reading a version does not reserve the key.</p>
      <form noValidate onSubmit={submit(model.submitCas)} aria-label="Compare and swap a key">
        <fieldset disabled={writesBlocked}>
          {field('casKey', 'Key for CAS')}
          <button type="button" className="kv-secondary" onClick={() => model.read(model.draft.casKey, true)}>Read current version</button>
          {field('expectedVersion', 'Expected version', 'number')}
          {field('newValue', 'New value', 'text', 'Your proposed value is preserved if the request fails.')}
          <button type="submit">Attempt CAS</button>
        </fieldset>
      </form>
    </section>}
    {model.missing != null && <p className="kv-missing" role="status">The server reported {JSON.stringify(model.missing)} not found (404). The previous confirmed record, if any, is retained below.</p>}
    {model.record && <section className="kv-card kv-record" aria-label="Last confirmed record">
      <h3>Last confirmed record</h3><p>From the last successful {model.record.source} response. Other writes or expiry may have changed it since.</p>
      <dl><dt>Key</dt><dd><code>{JSON.stringify(model.record.key)}</code></dd><dt>Value</dt><dd><code>{JSON.stringify(model.record.entry.value)}</code></dd><dt>Version</dt><dd>{model.record.entry.version}</dd><dt>Server expiry (UTC)</dt><dd>{expiryText(model.record.entry.expiresAtEpoch)}</dd></dl>
      {activeTab === 'store' && <button type="button" className="kv-secondary" aria-label={`Delete confirmed key ${model.record.key}`} disabled={writesBlocked} onClick={() => model.setConfirmation(model.record.key)}>Delete this key</button>}
    </section>}
    {activeTab === 'store' && model.recent.length > 0 && <section className="kv-card kv-recent" aria-label="Recent successful SET responses">
      <h3>Recent successful SET responses</h3><p>Latest response per key, up to 10. These are saved responses, not a current inventory.</p>
      <ul>{model.recent.map(item => <li key={item.key}><span><code>{JSON.stringify(item.key)}</code> · version {item.entry.version}</span><button type="button" className="kv-secondary" aria-label={`Delete recent key ${item.key}`} disabled={writesBlocked} onClick={() => model.setConfirmation(item.key)}>Delete</button></li>)}</ul>
    </section>}
  </section>;
}
