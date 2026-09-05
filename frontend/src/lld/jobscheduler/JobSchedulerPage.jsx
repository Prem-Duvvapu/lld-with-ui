import { useState } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  createJob, listJobs, cancelJob, getHistory, preview,
  simReset, simScheduleOneTime, simScheduleCron, simAdvanceClock,
  simTriggerMisfire, simCancelJob, simRace, simGetSnapshot,
} from './api';

const CSS = `
.js-container { display: flex; flex-direction: column; gap: 16px; }
.js-panel { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 16px; }
.js-panel h3 { margin: 0 0 12px; font-size: 14px; color: var(--text-primary); }
.js-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.js-form input, .js-form select { padding: 7px 10px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; min-width: 150px; }
.js-form-actions { display: flex; gap: 8px; margin-left: auto; }
.js-btn { padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); }
.js-btn.success { border-color: var(--success); color: var(--success); }
.js-btn.danger { border-color: var(--danger); color: var(--danger); }
.js-btn.small { padding: 4px 10px; font-size: 11px; margin-top: 8px; }
.js-btn:hover { opacity: 0.85; }
.js-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.js-error { padding: 8px 12px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; font-size: 12px; font-weight: 600; }
.js-empty { text-align: center; padding: 40px; color: var(--text-muted); }
.js-preview { margin-top: 10px; font-family: var(--code-font, monospace); font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 2px; }
.js-preview-row b { color: var(--text-primary); }

.js-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
.js-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 14px; }
.js-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
.js-name { font-weight: 700; font-size: 13px; color: var(--text-primary); }
.js-meta { font-size: 11px; color: var(--text-muted); padding: 2px 0; word-break: break-word; }
.js-pill { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; white-space: nowrap; }
.js-pill.scheduled { background: var(--accent-gradient); color: #fff; }
.js-pill.running { background: var(--warning-bg); color: var(--warning); }
.js-pill.completed { background: var(--success-bg); color: var(--success); }
.js-pill.failed { background: var(--danger-bg); color: var(--danger); }
.js-pill.cancelled { background: var(--bg-tertiary); color: var(--text-muted); }
.js-pill.misfired { background: var(--warning-bg); color: var(--warning); }

.js-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.js-table th, .js-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border-primary); color: var(--text-primary); }
.js-table th { color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; }

.js-sim-stage { background: var(--bg-secondary); border: 2px solid var(--border-primary); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.js-clock { font-family: var(--code-font, monospace); font-size: 13px; padding: 6px 14px; border-radius: 8px; background: var(--bg-tertiary); color: var(--accent); border: 1px solid var(--border-primary); }
.js-step-indicator { display: flex; gap: 6px; justify-content: center; }
.js-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); }
.js-step-dot.done { background: var(--success); }
.js-step-dot.active { background: var(--accent); transform: scale(1.3); }
.js-log { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; font-family: var(--code-font, monospace); font-size: 11px; max-height: 220px; overflow-y: auto; width: 100%; }
.js-log-row { padding: 3px 0; border-bottom: 1px dashed var(--border-secondary); color: var(--text-muted); }
.js-log-row:last-child { border-bottom: none; }
.js-log-row.SUCCESS { color: var(--success); }
.js-log-row.WARNING { color: var(--warning); }
.js-log-row.ERROR { color: var(--danger); }
.js-log-row.INFO { color: var(--text-primary); }
`;

function StatusPill({ status }) {
  return <span className={`js-pill ${(status || '').toLowerCase()}`}>{status}</span>;
}

function fmt(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

// =========================================================================
// Jobs tab — create + operational list
// =========================================================================

function JobCard({ job, onCancel, busy }) {
  const terminal = job.status === 'CANCELLED' || job.status === 'COMPLETED' || job.status === 'FAILED';
  return (
    <div className="js-card">
      <div className="js-card-head">
        <span className="js-name">{job.name}</span>
        <StatusPill status={job.status} />
      </div>
      <div className="js-meta">{job.id} · {job.taskType}</div>
      <div className="js-meta">{job.schedule?.description}</div>
      <div className="js-meta">Misfire policy: {job.misfirePolicy?.type}</div>
      {job.status === 'SCHEDULED' && <div className="js-meta">Next fire: {fmt(job.nextExecutionTime)}</div>}
      <div className="js-meta">Runs so far: {job.history?.length || 0}</div>
      {!terminal && (
        <button className="js-btn danger small" disabled={busy} onClick={() => onCancel(job.id)}>✗ Cancel</button>
      )}
    </div>
  );
}

function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', taskType: 'GENERIC_TASK', scheduleType: 'ONE_TIME',
    delaySeconds: 60, intervalSeconds: 300, cronExpression: '0 9 * * *',
    misfirePolicy: 'FIRE_IMMEDIATELY',
  });
  const [previewTimes, setPreviewTimes] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const load = async () => {
    try { setJobs(await listJobs()); } catch (err) { setError(err.message || 'failed to load jobs'); }
  };
  usePolling(load, 4000, []);

  const buildScheduleParams = () => {
    if (form.scheduleType === 'ONE_TIME') return { delaySeconds: Number(form.delaySeconds) };
    if (form.scheduleType === 'FIXED_RATE') return { intervalSeconds: Number(form.intervalSeconds) };
    return { cronExpression: form.cronExpression };
  };

  const handlePreview = async () => {
    setPreviewError(null);
    try {
      setPreviewTimes(await preview(form.scheduleType, buildScheduleParams(), 3));
    } catch (err) {
      setPreviewError(err.message || 'preview failed');
      setPreviewTimes(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createJob({
        name: form.name || 'Untitled Job',
        taskType: form.taskType,
        scheduleType: form.scheduleType,
        scheduleParams: buildScheduleParams(),
        misfirePolicy: form.misfirePolicy,
      });
      setForm((f) => ({ ...f, name: '' }));
      setPreviewTimes(null);
      await load();
    } catch (err) {
      setError(err.message || 'failed to create job');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (id) => {
    setBusy(true);
    try {
      await cancelJob(id);
    } catch (err) {
      setError(err.message || 'cancel failed');
    } finally {
      setBusy(false);
      load();
    }
  };

  return (
    <div className="js-container">
      <style>{CSS}</style>
      <div className="js-panel">
        <h3>Schedule a Job</h3>
        <form className="js-form" onSubmit={handleCreate}>
          <input placeholder="Job name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Task type (e.g. SEND_EMAIL)" value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })} />
          <select value={form.scheduleType} onChange={(e) => { setForm({ ...form, scheduleType: e.target.value }); setPreviewTimes(null); }}>
            <option value="ONE_TIME">One-Time</option>
            <option value="FIXED_RATE">Fixed Rate</option>
            <option value="CRON">Cron</option>
          </select>
          {form.scheduleType === 'ONE_TIME' && (
            <input type="number" min="1" placeholder="Delay (seconds)" value={form.delaySeconds}
              onChange={(e) => setForm({ ...form, delaySeconds: e.target.value })} />
          )}
          {form.scheduleType === 'FIXED_RATE' && (
            <input type="number" min="1" placeholder="Interval (seconds)" value={form.intervalSeconds}
              onChange={(e) => setForm({ ...form, intervalSeconds: e.target.value })} />
          )}
          {form.scheduleType === 'CRON' && (
            <input placeholder="Cron expression, e.g. 0 9 * * *" value={form.cronExpression}
              onChange={(e) => setForm({ ...form, cronExpression: e.target.value })} />
          )}
          <select value={form.misfirePolicy} onChange={(e) => setForm({ ...form, misfirePolicy: e.target.value })}>
            <option value="FIRE_IMMEDIATELY">Misfire: Fire Immediately</option>
            <option value="SKIP_TO_NEXT_OCCURRENCE">Misfire: Skip to Next Occurrence</option>
          </select>
          <div className="js-form-actions">
            <button type="button" className="js-btn" onClick={handlePreview}>🔍 Preview next 3 fires</button>
            <button type="submit" className="js-btn success" disabled={busy}>+ Schedule Job</button>
          </div>
        </form>
        {previewError && <div className="js-error" style={{ marginTop: 10 }}>⚠ {previewError}</div>}
        {previewTimes && (
          <div className="js-preview">
            {previewTimes.length === 0
              ? 'This schedule never fires again from now.'
              : previewTimes.map((t, i) => <div key={i} className="js-preview-row">#{i + 1}: <b>{fmt(t)}</b></div>)}
          </div>
        )}
      </div>

      {error && <div className="js-error">⚠ {error}</div>}

      <div className="js-grid">
        {jobs.map((j) => <JobCard key={j.id} job={j} onCancel={handleCancel} busy={busy} />)}
      </div>
      {jobs.length === 0 && !error && <div className="js-empty">⏳ Loading jobs…</div>}
    </div>
  );
}

// =========================================================================
// History tab
// =========================================================================

function HistoryTab() {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const loadJobs = async () => {
    try {
      const js = await listJobs();
      setJobs(js);
      setSelectedId((prev) => prev || (js[0] && js[0].id) || '');
    } catch (err) {
      setError(err.message || 'failed to load jobs');
    }
  };
  usePolling(loadJobs, 5000, []);

  const loadHistory = async (signal) => {
    if (!selectedId) {
      setHistory([]);
      return;
    }
    try {
      setHistory(await getHistory(selectedId));
    } catch (err) {
      if (!signal?.aborted) setError(err.message || 'failed to load history');
    }
  };
  usePolling(loadHistory, 4000, [selectedId]);

  const selectedJob = jobs.find((j) => j.id === selectedId);

  return (
    <div className="js-container">
      <style>{CSS}</style>
      <div className="js-panel">
        <h3>Execution History</h3>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name} ({j.id})</option>)}
        </select>
        {selectedJob && <div className="js-meta" style={{ marginTop: 8 }}>{selectedJob.schedule?.description} — misfire policy: {selectedJob.misfirePolicy?.type}</div>}
      </div>

      {error && <div className="js-error">⚠ {error}</div>}

      <div className="js-panel">
        <table className="js-table">
          <thead>
            <tr><th>Fired At</th><th>Outcome</th><th>Duration (ms)</th></tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>{fmt(h.firedAt)}</td>
                <td>{h.status}</td>
                <td>{h.durationMillis}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <div className="js-empty">No executions recorded yet for this job.</div>}
      </div>
    </div>
  );
}

// =========================================================================
// Simulation tab — 8-step guided demo against the isolated /sim/* sandbox
// =========================================================================

const SIM_STEPS = [
  { title: 'Reset Sandbox', detail: 'A fresh scheduler on a ManualClock, t=0. Nothing else on this tab touches the live jobs above.' },
  { title: 'Schedule a One-Time Job', detail: '"Send Welcome Email" fires once, 30s from now (misfire policy: Fire Immediately).' },
  { title: 'Schedule a Cron Job', detail: '"Every-Minute Heartbeat" ("* * * * *") — misfire policy: Skip to Next Occurrence.' },
  { title: 'Advance Clock +65s', detail: 'Past both jobs’ first due time — watch the email fire once and the heartbeat fire and reschedule.' },
  { title: 'Advance Clock +60s', detail: 'The heartbeat ticks again, right on schedule — a normal recurring fire.' },
  { title: 'Force a Misfire', detail: 'Jump the clock 10 minutes ahead. The heartbeat is now badly overdue — its Skip-to-Next-Occurrence policy drops the missed run and jumps straight to the next future tick, instead of firing a catch-up burst.' },
  { title: 'Cancel the Heartbeat', detail: 'Cancel it directly — it will never fire again.' },
  { title: 'Concurrent Cancel/Dispatch Race', detail: 'A fresh job is scheduled, due immediately, then cancel() and dispatch() are fired at the exact same instant on two threads. Exactly one wins — the per-job lock guarantees the other never observes the task body run.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [snapshot, setSnapshot] = useState({ jobs: [], events: [], now: null });
  const [ids, setIds] = useState({ oneTime: null, cron: null });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const runStep = async () => {
    setBusy(true);
    setError(null);
    try {
      let snap;
      if (step === 0) {
        snap = await simReset();
      } else if (step === 1) {
        snap = await simScheduleOneTime({ step: 2, name: 'Send Welcome Email', taskType: 'SEND_EMAIL', delaySeconds: 30, misfirePolicy: 'FIRE_IMMEDIATELY' });
        const job = snap.jobs.find((j) => j.taskType === 'SEND_EMAIL');
        setIds((prev) => ({ ...prev, oneTime: job && job.id }));
      } else if (step === 2) {
        snap = await simScheduleCron({ step: 3, name: 'Every-Minute Heartbeat', taskType: 'HEARTBEAT', cronExpression: '* * * * *', misfirePolicy: 'SKIP_TO_NEXT_OCCURRENCE' });
        const job = snap.jobs.find((j) => j.taskType === 'HEARTBEAT');
        setIds((prev) => ({ ...prev, cron: job && job.id }));
      } else if (step === 3) {
        snap = await simAdvanceClock(65, 4);
      } else if (step === 4) {
        snap = await simAdvanceClock(60, 5);
      } else if (step === 5) {
        snap = await simTriggerMisfire(ids.cron, 600, 6);
      } else if (step === 6) {
        snap = await simCancelJob(ids.cron, 7);
      } else if (step === 7) {
        snap = await simRace(8);
      } else {
        snap = await simGetSnapshot();
      }
      setSnapshot(snap);
      setStep((s) => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      setError(err.message || 'step failed');
      try { setSnapshot(await simGetSnapshot()); } catch { /* ignore */ }
      setStep((s) => Math.min(s + 1, SIM_STEPS.length));
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = () => {
    setStep(0);
    setSnapshot({ jobs: [], events: [], now: null });
    setIds({ oneTime: null, cron: null });
    setError(null);
  };

  return (
    <div className="js-container">
      <style>{CSS}</style>
      <div className="js-sim-stage">
        {snapshot.now && <div className="js-clock">🕐 sandbox clock: {snapshot.now}</div>}

        <div className="js-grid" style={{ width: '100%' }}>
          {snapshot.jobs.map((j) => <JobCard key={j.id} job={j} onCancel={() => {}} busy />)}
        </div>

        <div className="js-step-indicator">
          {SIM_STEPS.map((_, i) => (
            <div key={i} className={`js-step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            {step < SIM_STEPS.length ? `Step ${step + 1}/${SIM_STEPS.length}: ${SIM_STEPS[step].title}` : 'Demo Complete'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 560 }}>
            {step < SIM_STEPS.length ? SIM_STEPS[step].detail : 'Click Reset to run the demo again.'}
          </div>
        </div>

        {error && <div className="js-error">⚠ {error}</div>}

        <button
          className="js-btn success"
          disabled={busy}
          onClick={step >= SIM_STEPS.length ? resetDemo : runStep}
        >
          {step >= SIM_STEPS.length ? '↺ Run Again' : busy ? 'Working…' : `▶ ${SIM_STEPS[step]?.title || 'Run Step'}`}
        </button>

        <div className="js-log">
          {snapshot.events.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Click the button above to start.</div>
          ) : (
            [...snapshot.events].reverse().map((e) => (
              <div key={e.id} className={`js-log-row ${e.status}`}>
                [{e.eventType}] {e.title} — {e.description}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobSchedulerPage() {
  return (
    <LldPage
      module="jobscheduler"
      title="Job Scheduler"
      icon="⏰"
      tabs={[{ id: 'jobs', label: 'Jobs' }, { id: 'history', label: 'Execution History' }, 'simulation', 'diagram', 'design']}
    >
      {(activeTab) => (
        <>
          {activeTab === 'jobs' && <JobsTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
