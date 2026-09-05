import { useState } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  send, getAll, getRecipients,
  simReset, simSendOtp, simSendPromoToOptedOutUser, simSendWithForcedFailure,
  simRetryOutcome, simSendDuplicate, simConcurrentDuplicateRace,
} from './api';

const TYPES = ['OTP', 'TRANSACTIONAL', 'PROMOTIONAL', 'ALERT'];
const CHANNELS = ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'];

const CSS = `
.nt-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.nt-form-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }
.nt-form-row input, .nt-form-row select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.nt-btn { padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; background: var(--accent-gradient); color: #fff; }
.nt-btn:hover { opacity: 0.9; }
.nt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.nt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.nt-table th { text-align: left; padding: 8px; color: var(--text-muted); border-bottom: 1px solid var(--border-primary); }
.nt-table td { padding: 8px; border-bottom: 1px solid var(--border-primary); color: var(--text-primary); }
.nt-status { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 999px; }
.nt-status.SENT { background: rgba(34,197,94,0.15); color: #22c55e; }
.nt-status.PENDING, .nt-status.RETRYING { background: rgba(234,179,8,0.15); color: #eab308; }
.nt-status.SUPPRESSED { background: rgba(148,163,184,0.15); color: var(--text-muted); }
.nt-status.FAILED { background: var(--danger-bg); color: var(--danger); }
.nt-banner { max-width: 620px; margin: 0 auto 16px; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.nt-banner.ok { background: rgba(34,197,94,0.12); border: 1px solid #22c55e; color: #22c55e; }
.nt-banner.err { background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); }

.nt-stage { position: relative; background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 16px; min-height: 200px; }
.nt-recipient { max-width: 360px; margin: 0 auto 20px; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; text-align: center; }
.nt-notif-tile { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin: 8px auto; max-width: 460px; font-size: 12px; color: #ddd; }
.nt-log { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
.nt-log-line { padding: 3px 0; border-bottom: 1px solid var(--border-primary); }
.nt-log-line.SUCCESS { color: #22c55e; }
.nt-log-line.ERROR { color: var(--danger); }
.nt-log-line.WARNING { color: #eab308; }
.nt-log-line.INFO { color: var(--text-muted); }

.step-indicator { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); }
.step-dot.done { background: #22c55e; }
.step-dot.active { background: #667eea; transform: scale(1.3); }
`;

function AppTab() {
  const [notifications, setNotifications] = useState([]);
  const [recipients, setRecipients] = useState({});
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ recipientId: '', type: 'TRANSACTIONAL', channel: 'EMAIL', message: '' });

  const load = async () => {
    try {
      const [notifs, recips] = await Promise.all([getAll(), getRecipients()]);
      setNotifications(notifs);
      setRecipients(recips);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load notifications');
    }
  };

  usePolling(load, 3000, []);

  const handleSend = async () => {
    if (!form.recipientId) return;
    try {
      await send(
        Number(form.recipientId), form.type, form.channel,
        { message: form.message || 'Hello!' }, null, null,
      );
      setForm((f) => ({ ...f, message: '' }));
      load();
    } catch (err) {
      setError(err?.message || 'Send failed');
    }
  };

  return (
    <div className="nt-container">
      <style>{CSS}</style>
      {error && <div className="nt-banner err">⚠ {error}</div>}

      <div className="nt-form-row">
        <select value={form.recipientId} onChange={(e) => setForm((f) => ({ ...f, recipientId: e.target.value }))}>
          <option value="">recipient…</option>
          {Object.entries(recipients).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
        <button className="nt-btn" onClick={handleSend}>Send</button>
      </div>

      <table className="nt-table">
        <thead>
          <tr><th>Recipient</th><th>Type</th><th>Priority</th><th>Channel</th><th>Status</th><th>Attempts</th></tr>
        </thead>
        <tbody>
          {notifications.slice().reverse().map((n) => (
            <tr key={n.id}>
              <td>{recipients[n.recipientId] || n.recipientId}</td>
              <td>{n.type}</td>
              <td>{n.priority}</td>
              <td>{n.channel}</td>
              <td><span className={`nt-status ${n.status}`}>{n.status}</span></td>
              <td>{n.attemptCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STEPS = [
  { title: 'Reset', detail: 'Fresh isolated sandbox — one recipient, opted out of PROMOTIONAL over SMS.' },
  { title: 'Send OTP', detail: 'A HIGH-priority OTP over EMAIL — delivers on the first attempt.' },
  { title: 'Promo to Opted-Out User', detail: 'A PROMOTIONAL/SMS send — moves straight to SUPPRESSED, the channel is never called.' },
  { title: 'Forced Failure', detail: 'An ALERT over the always-failing PUSH channel — one attempt fails, status is RETRYING.' },
  { title: 'Retry Outcome', detail: 'The retry loop plays out against the always-failing channel until it exhausts its budget.' },
  { title: 'Duplicate Idempotency Key', detail: 'The same idempotencyKey sent twice resolves to one notification both times.' },
  { title: 'Concurrent Race', detail: 'Two threads race send() with the identical idempotency key — proving the per-key lock closes the check-then-act race.' },
  { title: 'Final Snapshot', detail: 'Review the full event log.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);

  const runStep = async () => {
    try {
      let snap;
      if (step === 0) snap = await simReset();
      else if (step === 1) snap = await simSendOtp(1);
      else if (step === 2) snap = await simSendPromoToOptedOutUser(2);
      else if (step === 3) snap = await simSendWithForcedFailure(3);
      else if (step === 4) snap = await simRetryOutcome(4);
      else if (step === 5) snap = await simSendDuplicate(5);
      else if (step === 6) snap = await simConcurrentDuplicateRace(6);
      else snap = snapshot;
      setSnapshot(snap);
      setError(null);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      setError(err?.message || 'Simulation step failed');
    }
  };

  const recipient = snapshot?.recipient;
  const notifs = snapshot?.notifications ?? [];
  const events = snapshot?.events ?? [];

  return (
    <div className="nt-container">
      <style>{CSS}</style>
      <div className="step-indicator">
        {STEPS.map((_, i) => (
          <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        <b>Step {step + 1}/{STEPS.length}: {STEPS[step].title}</b> — {STEPS[step].detail}
      </div>
      {error && <div className="nt-banner err">⚠ {error}</div>}

      <div className="nt-stage">
        {recipient && (
          <div className="nt-recipient">
            <div style={{ fontWeight: 700, color: '#fff' }}>{recipient.name}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>recipient id {recipient.id}</div>
          </div>
        )}
        {notifs.slice().reverse().map((n) => (
          <div key={n.id} className="nt-notif-tile">
            #{n.id} {n.type} via {n.channel} — <span className={`nt-status ${n.status}`}>{n.status}</span> (attempt {n.attemptCount})
          </div>
        ))}
      </div>

      <button className="nt-btn" onClick={runStep} disabled={step >= STEPS.length - 1 && snapshot}>
        {step === 0 ? 'Start Simulation' : step >= STEPS.length - 1 ? 'Done' : 'Next Step →'}
      </button>

      <div className="nt-log" style={{ marginTop: 16 }}>
        {events.slice().reverse().map((e) => (
          <div key={e.id} className={`nt-log-line ${e.status}`}>[{e.eventType}] {e.title} — {e.description}</div>
        ))}
      </div>
    </div>
  );
}

export default function NotificationPage() {
  return (
    <LldPage module="notification" title="Notification System" icon="🔔" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
