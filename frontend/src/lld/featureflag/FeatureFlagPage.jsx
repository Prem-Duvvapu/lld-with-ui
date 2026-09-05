import { useState } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  createFlag, listFlags, setEnabled, updateRules, evaluate,
  simReset, simCreateFlag, simSetEnabled, simSetRule, simEvaluate,
  simConcurrentUpdateDemo,
} from './api';

const CSS = `
.ff-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ff-form-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }
.ff-form-row input { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.ff-btn { padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; background: var(--accent-gradient); color: #fff; }
.ff-btn:hover { opacity: 0.9; }
.ff-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ff-btn.danger { background: var(--danger); }
.ff-flags { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 16px; }
.ff-card { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; }
.ff-card h4 { margin: 0 0 6px; font-size: 14px; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; }
.ff-pill { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 999px; }
.ff-pill.on { background: rgba(34,197,94,0.15); color: #22c55e; }
.ff-pill.off { background: rgba(148,163,184,0.15); color: var(--text-muted); }
.ff-rule { font-size: 12px; color: var(--text-muted); margin: 6px 0; }
.ff-banner { max-width: 620px; margin: 0 auto 16px; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.ff-banner.ok { background: rgba(34,197,94,0.12); border: 1px solid #22c55e; color: #22c55e; }
.ff-banner.err { background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); }

.ff-stage { position: relative; background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 16px; min-height: 200px; }
.ff-flag-tile { max-width: 360px; margin: 0 auto 20px; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; text-align: center; }
.ff-flag-tile .key { font-family: monospace; font-size: 15px; color: #fff; font-weight: 700; }
.ff-flag-tile .rule { font-size: 12px; color: #aaa; margin-top: 8px; }
.ff-eval-result { max-width: 620px; margin: 0 auto 16px; padding: 12px 16px; border-radius: 8px; font-size: 13px; }
.ff-eval-result.match { background: rgba(34,197,94,0.12); border: 1px solid #22c55e; color: #22c55e; }
.ff-eval-result.nomatch { background: rgba(148,163,184,0.12); border: 1px solid var(--border-primary); color: var(--text-muted); }
.ff-log { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
.ff-log-line { padding: 3px 0; border-bottom: 1px solid var(--border-primary); }
.ff-log-line.SUCCESS { color: #22c55e; }
.ff-log-line.ERROR { color: var(--danger); }
.ff-log-line.WARNING { color: #eab308; }
.ff-log-line.INFO { color: var(--text-muted); }

.step-indicator { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); }
.step-dot.done { background: #22c55e; }
.step-dot.active { background: #667eea; transform: scale(1.3); }
`;

function AppTab() {
  const [flags, setFlags] = useState([]);
  const [error, setError] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [ruleCountry, setRuleCountry] = useState({});
  const [evalInputs, setEvalInputs] = useState({});
  const [evalResults, setEvalResults] = useState({});

  const load = async () => {
    try {
      setFlags(await listFlags());
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load flags');
    }
  };

  usePolling(load, 3000, []);

  const handleCreate = async () => {
    if (!newKey.trim()) return;
    try {
      await createFlag(newKey.trim(), newDesc.trim());
      setNewKey('');
      setNewDesc('');
      load();
    } catch (err) {
      setError(err?.message || 'Create failed');
    }
  };

  const handleToggle = async (key, enabled) => {
    try {
      await setEnabled(key, enabled);
      load();
    } catch (err) {
      setError(err?.message || 'Toggle failed');
    }
  };

  const handleSetRule = async (key) => {
    const country = (ruleCountry[key] || '').trim().toUpperCase();
    if (!country) return;
    try {
      await updateRules(key, { type: 'COUNTRY', value: country });
      load();
    } catch (err) {
      setError(err?.message || 'Rule update failed');
    }
  };

  const handleEvaluate = async (key) => {
    const inputs = evalInputs[key] || {};
    try {
      const result = await evaluate(key, {
        userId: inputs.userId || 'anon',
        country: inputs.country || '',
        attributes: {},
      });
      setEvalResults((r) => ({ ...r, [key]: result }));
    } catch (err) {
      setError(err?.message || 'Evaluate failed');
    }
  };

  return (
    <div className="ff-container">
      <style>{CSS}</style>
      {error && <div className="ff-banner err">⚠ {error}</div>}

      <div className="ff-form-row">
        <input placeholder="flag key (e.g. new-checkout)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <input placeholder="description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
        <button className="ff-btn" onClick={handleCreate}>Create Flag</button>
      </div>

      <div className="ff-flags">
        {flags.map((f) => (
          <div key={f.key} className="ff-card">
            <h4>
              <span>{f.key}</span>
              <span className={`ff-pill ${f.enabled ? 'on' : 'off'}`}>{f.enabled ? 'Enabled' : 'Disabled'}</span>
            </h4>
            <div className="ff-rule">{f.ruleDescription}</div>
            <button className="ff-btn" onClick={() => handleToggle(f.key, !f.enabled)}>
              {f.enabled ? 'Disable' : 'Enable'}
            </button>

            <div className="ff-form-row" style={{ marginTop: 10 }}>
              <input
                placeholder="target country e.g. IN"
                value={ruleCountry[f.key] || ''}
                onChange={(e) => setRuleCountry((s) => ({ ...s, [f.key]: e.target.value }))}
              />
              <button className="ff-btn" onClick={() => handleSetRule(f.key)}>Set Country Rule</button>
            </div>

            <div className="ff-form-row">
              <input
                placeholder="userId"
                value={evalInputs[f.key]?.userId || ''}
                onChange={(e) => setEvalInputs((s) => ({ ...s, [f.key]: { ...s[f.key], userId: e.target.value } }))}
              />
              <input
                placeholder="country"
                value={evalInputs[f.key]?.country || ''}
                onChange={(e) => setEvalInputs((s) => ({ ...s, [f.key]: { ...s[f.key], country: e.target.value } }))}
              />
              <button className="ff-btn" onClick={() => handleEvaluate(f.key)}>Evaluate</button>
            </div>
            {evalResults[f.key] && (
              <div className={`ff-eval-result ${evalResults[f.key].matched ? 'match' : 'nomatch'}`}>
                {evalResults[f.key].explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Reset', detail: 'Fresh isolated sandbox — no flags yet.' },
  { title: 'Create Flag', detail: 'A new flag is created disabled — the kill switch defaults off.' },
  { title: 'Enable Flag', detail: 'The kill switch flips on — targeting rules now apply.' },
  { title: 'Target India', detail: 'A COUNTRY=IN targeting rule is swapped in atomically.' },
  { title: 'Evaluate: India user', detail: 'A user from IN is evaluated against the rule — matches.' },
  { title: 'Evaluate: US user', detail: 'A user from US is evaluated against the same rule — does not match.' },
  { title: 'Concurrent Race', detail: 'One thread evaluates in a tight loop while another swaps the rule tree — proving the volatile reference swap never produces a torn read.' },
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
      else if (step === 1) snap = await simCreateFlag(1);
      else if (step === 2) snap = await simSetEnabled(true, 2);
      else if (step === 3) snap = await simSetRule({ type: 'COUNTRY', value: 'IN' }, 'Target India', 3);
      else if (step === 4) snap = await simEvaluate('India user', 'u-in', 'IN', {}, 4);
      else if (step === 5) snap = await simEvaluate('US user', 'u-us', 'US', {}, 5);
      else if (step === 6) snap = await simConcurrentUpdateDemo(6);
      else snap = snapshot;
      setSnapshot(snap);
      setError(null);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      setError(err?.message || 'Simulation step failed');
    }
  };

  const flag = (snapshot?.flags ?? [])[0];
  const events = snapshot?.events ?? [];

  return (
    <div className="ff-container">
      <style>{CSS}</style>
      <div className="step-indicator">
        {STEPS.map((_, i) => (
          <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        <b>Step {step + 1}/{STEPS.length}: {STEPS[step].title}</b> — {STEPS[step].detail}
      </div>
      {error && <div className="ff-banner err">⚠ {error}</div>}

      <div className="ff-stage">
        {flag && (
          <div className="ff-flag-tile">
            <div className="key">{flag.key}</div>
            <span className={`ff-pill ${flag.enabled ? 'on' : 'off'}`}>{flag.enabled ? 'ENABLED' : 'DISABLED'}</span>
            <div className="rule">{flag.ruleDescription}</div>
          </div>
        )}
      </div>

      <button className="ff-btn" onClick={runStep} disabled={step >= STEPS.length - 1 && snapshot}>
        {step === 0 ? 'Start Simulation' : step >= STEPS.length - 1 ? 'Done' : 'Next Step →'}
      </button>

      <div className="ff-log" style={{ marginTop: 16 }}>
        {events.slice().reverse().map((e) => (
          <div key={e.id} className={`ff-log-line ${e.status}`}>[{e.eventType}] {e.title} — {e.description}</div>
        ))}
      </div>
    </div>
  );
}

export default function FeatureFlagPage() {
  return (
    <LldPage module="featureflag" title="Feature Flag" icon="🚩" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
