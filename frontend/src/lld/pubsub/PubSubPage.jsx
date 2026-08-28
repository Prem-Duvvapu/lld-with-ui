import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  getTopics, createTopic, subscribe, unsubscribe, publish, publishToSubscriber,
  simReset, simCreateTopic, simSubscribe, simUnsubscribe, simPublish, simPublishToSubscriber,
  simGetSnapshots, simGetEvents,
} from './api';

const styles = `
.ps-page { max-width: 1100px; margin: 0 auto; }
.ps-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.ps-toolbar-stat { font-size: 12px; color: var(--text-secondary); }
.ps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ps-grid.wide-right { grid-template-columns: 1fr 1.4fr; }
@media (max-width: 800px) { .ps-grid, .ps-grid.wide-right { grid-template-columns: 1fr; } }
.ps-card { background: var(--bg-card, #fff); border-radius: 12px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border-primary); }
.ps-card h3 { font-size: 14.5px; margin-bottom: 12px; color: var(--text-primary); }
.ps-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.ps-field label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; }
.ps-field input, .ps-field select, .ps-field textarea { padding: 8px 10px; border-radius: 7px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; }
.ps-row { display: flex; gap: 8px; }
.ps-row .ps-field { flex: 1; }
.ps-btn { padding: 9px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; color: #fff; background: var(--accent, #7c3aed); transition: all 0.15s; }
.ps-btn:hover { opacity: 0.92; transform: translateY(-1px); }
.ps-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.ps-btn-outline { padding: 7px 14px; border: 2px solid var(--border-primary); border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; background: transparent; color: var(--text-primary); }
.ps-btn-outline:hover { border-color: var(--accent); color: var(--accent); }
.ps-btn-danger { background: #d64545; }
.ps-btn-sm { padding: 4px 9px; font-size: 10.5px; border-radius: 6px; }

.ps-topic-item { background: var(--bg-primary); padding: 14px; border-radius: 9px; border: 1px solid var(--border-primary); margin-bottom: 10px; }
.ps-topic-item:last-child { margin-bottom: 0; }
.ps-topic-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ps-topic-name { font-weight: 800; font-size: 14.5px; color: var(--accent, #7c3aed); }
.ps-pill { font-size: 10.5px; padding: 2px 8px; border-radius: 20px; background: rgba(124,58,237,0.12); color: var(--accent, #7c3aed); font-weight: 700; }
.ps-sub-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--bg-card, #fff); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-primary); font-size: 11.5px; margin: 3px 4px 0 0; }
.ps-sub-chip button { border: none; background: none; color: #ef4444; font-weight: 700; cursor: pointer; font-size: 12px; }
.ps-empty { color: var(--text-muted, #999); font-size: 12px; font-style: italic; }
.ps-error { text-align: center; padding: 8px 12px; margin: 8px 0; font-size: 12.5px; color: #fff; background: #d64545; border-radius: 6px; }
.ps-notice { text-align: center; padding: 8px 12px; margin: 8px 0; font-size: 12.5px; color: #92400e; background: #fef3c7; border-radius: 6px; }

.ps-queue-row { background: var(--bg-card, #fff); border-radius: 8px; padding: 10px 12px; border: 1px solid var(--border-primary); margin-top: 10px; }
.ps-queue-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; align-items: center; }
.ps-type-badge { font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; }
.ps-type-PRINT { background: #d7f5db; color: #1b7a30; }
.ps-type-SLOW { background: #fde3cf; color: #b1490c; }
.ps-type-LOGGING { background: #dbeafe; color: #1d4ed8; }
.ps-bar-track { height: 9px; background: rgba(128,128,128,0.18); border-radius: 5px; margin: 8px 0 6px; overflow: hidden; }
.ps-bar-fill { height: 100%; border-radius: 5px; transition: width 0.4s ease, background 0.3s; }
.ps-queue-stats { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-secondary); }

.ps-step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.ps-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.ps-step-dot.active { background: var(--accent, #7c3aed); box-shadow: 0 0 8px rgba(124,58,237,0.5); }
.ps-step-dot.done { background: #3fb950; }
.ps-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin: 12px 0; }
.ps-hud-tile { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; text-align: center; }
.ps-hud-tile .v { font-size: 15px; font-weight: 800; color: var(--text-primary); }
.ps-hud-tile .l { font-size: 9.5px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.ps-log { max-height: 220px; overflow-y: auto; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; font-size: 11.5px; }
.ps-log-row { padding: 5px 0; border-bottom: 1px dashed var(--border-primary); color: var(--text-secondary); }
.ps-log-row:last-child { border-bottom: none; }
.ps-log-row.warn { color: #b1490c; font-weight: 700; }
.ps-log-row.reject { color: #d64545; font-weight: 700; }
.ps-log-time { color: var(--text-muted, #999); margin-right: 6px; }
.ps-actions { display: flex; gap: 8px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
.ps-intro { text-align: center; padding: 24px 12px; color: var(--text-secondary); font-size: 13px; }
.ps-intro code { background: var(--bg-primary); padding: 1px 5px; border-radius: 4px; }

.ps-stage { background: #0f172a; padding: 22px; border-radius: 12px; color: #e2e8f0; margin-bottom: 16px; }
.ps-stage-hub { display: flex; justify-content: center; margin-bottom: 18px; }
.ps-hub-node { text-align: center; background: #1e293b; border: 2px solid #7c3aed; padding: 12px 26px; border-radius: 14px; box-shadow: 0 0 20px rgba(124,58,237,0.35); }
.ps-hub-node .t { font-weight: 800; font-size: 14px; color: #c4b5fd; }
.ps-hub-node .s { font-size: 10.5px; color: #94a3b8; margin-top: 2px; }
.ps-stage-topics { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
.ps-stage-topic { background: #1e293b; border-radius: 10px; padding: 12px 14px; border: 1px solid #334155; transition: box-shadow 0.3s, border-color 0.3s; }
.ps-stage-topic.pulse { border-color: #7c3aed; box-shadow: 0 0 16px rgba(124,58,237,0.55); }
.ps-stage-topic-head { font-weight: 800; font-size: 12.5px; color: #f1f5f9; display: flex; justify-content: space-between; }
.ps-stage-sub { background: #0f172a; border-radius: 7px; padding: 8px 10px; margin-top: 8px; border: 1px solid #334155; }
.ps-stage-sub.full { border-color: #ef4444; }
.ps-stage-sub-head { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
.ps-stage-track { height: 7px; background: #334155; border-radius: 4px; margin: 6px 0; overflow: hidden; }
.ps-stage-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
.ps-stage-stats { display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8; }
`;

const TYPE_COLOR = { PRINT: '#10b981', SLOW: '#f59e0b', LOGGING: '#3b82f6' };

function queueColor(type, pct) {
  if (pct >= 100) return '#ef4444';
  return TYPE_COLOR[type] || '#7c3aed';
}

// ---------------------------------------------------------------------------
// Live tabs: Topics & Publishers, Subscribers & Inboxes — both share one poll
// of the real (non-sim) /api/pubsub/topics.
// ---------------------------------------------------------------------------

function LiveTabs({ activeTab }) {
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [newTopicName, setNewTopicName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [publishPayload, setPublishPayload] = useState('');
  const [publisherId, setPublisherId] = useState('pub-1');

  const [subId, setSubId] = useState('sub-new');
  const [subName, setSubName] = useState('New Consumer');
  const [subType, setSubType] = useState('PRINT');
  const [subCapacity, setSubCapacity] = useState(20);

  usePolling(async () => {
    try {
      const data = await getTopics();
      if (Array.isArray(data)) {
        setTopics(data);
        setSelectedTopic((prev) => (prev && data.some((t) => t.name === prev)) ? prev : (data[0]?.name || ''));
      }
    } catch { /* retry next tick */ }
  }, 1500, []);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 2500); };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) return;
    setError('');
    try { await createTopic(newTopicName.trim()); setNewTopicName(''); flash(`Topic "${newTopicName.trim()}" created`); }
    catch (e) { setError(e.message); }
  };

  const handlePublish = async () => {
    if (!selectedTopic || !publishPayload.trim()) return;
    setError('');
    try {
      const rejected = await publish(selectedTopic, publishPayload.trim(), publisherId || 'anonymous');
      if (rejected && rejected.length > 0) {
        setError(`Backpressure: rejected by full queue for ${rejected.join(', ')}`);
      } else {
        flash('Published — broadcast to every subscriber');
      }
      setPublishPayload('');
    } catch (e) { setError(e.message); }
  };

  const handleSubscribe = async () => {
    if (!selectedTopic || !subId.trim()) return;
    setError('');
    try {
      await subscribe(selectedTopic, subId.trim(), subName.trim() || subId.trim(), subType, Number(subCapacity) || 20, subType === 'SLOW' ? 250 : 0);
      flash(`Subscribed ${subName || subId} to ${selectedTopic}`);
    } catch (e) { setError(e.message); }
  };

  const handleUnsubscribe = async (topicName, subscriberId) => {
    setError('');
    try { await unsubscribe(topicName, subscriberId); flash(`Unsubscribed ${subscriberId} from ${topicName}`); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="ps-toolbar">
        <span className="ps-toolbar-stat">Live broker &middot; polls every 1.5s</span>
      </div>
      {error && <div className="ps-error">{error}</div>}
      {notice && <div className="ps-notice">{notice}</div>}

      {activeTab === 'topics' && (
        <div className="ps-grid">
          <div className="ps-card">
            <h3>➕ Create Topic</h3>
            <div className="ps-row">
              <div className="ps-field" style={{ flex: 2 }}>
                <input placeholder="e.g. crypto-alerts" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} />
              </div>
              <button className="ps-btn" onClick={handleCreateTopic}>Create</button>
            </div>

            <h3 style={{ marginTop: 18 }}>🚀 Publish (broadcast)</h3>
            <div className="ps-field">
              <label>Topic</label>
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
                {topics.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.publishedCount} published)</option>)}
              </select>
            </div>
            <div className="ps-field">
              <label>Publisher ID</label>
              <input value={publisherId} onChange={(e) => setPublisherId(e.target.value)} />
            </div>
            <div className="ps-field">
              <label>Payload</label>
              <textarea rows={3} placeholder="Type message content..." value={publishPayload} onChange={(e) => setPublishPayload(e.target.value)} />
            </div>
            <button className="ps-btn" onClick={handlePublish} style={{ width: '100%' }}>Publish Now</button>
          </div>

          <div className="ps-card">
            <h3>📡 Active Topics ({topics.length})</h3>
            {topics.length === 0 && <div className="ps-empty">No topics yet — create one.</div>}
            {topics.map((t) => (
              <div className="ps-topic-item" key={t.name}>
                <div className="ps-topic-head">
                  <span className="ps-topic-name">{t.name}</span>
                  <span className="ps-pill">{t.publishedCount} published</span>
                </div>
                <div>
                  {(!t.workers || t.workers.length === 0) && <span className="ps-empty">No active subscribers</span>}
                  {t.workers && t.workers.map((w) => (
                    <span className="ps-sub-chip" key={w.subscriber.id}>
                      👤 {w.subscriber.name} (Q {w.queueSize}/{w.queueCapacity})
                      <button onClick={() => handleUnsubscribe(t.name, w.subscriber.id)} title="Unsubscribe">×</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div className="ps-grid wide-right">
          <div className="ps-card">
            <h3>📥 Add Subscriber</h3>
            <div className="ps-field">
              <label>Target Topic</label>
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
                {topics.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="ps-field">
              <label>Subscriber ID</label>
              <input value={subId} onChange={(e) => setSubId(e.target.value)} />
            </div>
            <div className="ps-field">
              <label>Name</label>
              <input value={subName} onChange={(e) => setSubName(e.target.value)} />
            </div>
            <div className="ps-field">
              <label>Type</label>
              <select value={subType} onChange={(e) => setSubType(e.target.value)}>
                <option value="PRINT">Fast Consumer (instant)</option>
                <option value="SLOW">Slow Consumer (250ms/msg)</option>
                <option value="LOGGING">Audit Logger</option>
              </select>
            </div>
            <div className="ps-field">
              <label>Bounded Queue Capacity</label>
              <input type="number" min={1} value={subCapacity} onChange={(e) => setSubCapacity(e.target.value)} />
            </div>
            <button className="ps-btn" onClick={handleSubscribe} style={{ width: '100%' }}>Subscribe Now</button>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10 }}>
              Re-subscribing the same id to a topic it's already on is rejected (409 DuplicateSubscriptionException) — unsubscribe first to change capacity or delay.
            </p>
          </div>

          <div className="ps-card">
            <h3>📊 Live Subscriber Queues</h3>
            {topics.length === 0 && <div className="ps-empty">No topics yet.</div>}
            {topics.map((t) => (
              <div key={t.name} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--accent, #7c3aed)', marginBottom: 4 }}>{t.name}</div>
                {(!t.workers || t.workers.length === 0) && <div className="ps-empty">No active subscribers</div>}
                {t.workers && t.workers.map((w) => {
                  const pct = w.queueCapacity > 0 ? Math.round((w.queueSize / w.queueCapacity) * 100) : 0;
                  return (
                    <div className="ps-queue-row" key={w.subscriber.id}>
                      <div className="ps-queue-head">
                        <span>👤 {w.subscriber.name} <code style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>({w.subscriber.id})</code></span>
                      </div>
                      <div className="ps-bar-track">
                        <div className="ps-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#ef4444' : '#10b981' }} />
                      </div>
                      <div className="ps-queue-stats">
                        <span>Queue {w.queueSize}/{w.queueCapacity} ({pct}%)</span>
                        <span>Delivered {w.deliveredCount} &middot; Rejected <strong style={{ color: w.rejectedCount > 0 ? '#ef4444' : 'inherit' }}>{w.rejectedCount}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulation tab: 8-step guided walkthrough of the isolated /api/pubsub/sim/* sandbox.
// ---------------------------------------------------------------------------

const SIM_STEPS = [
  'Reset sandbox',
  'View seeded topics & subscribers',
  'Subscribe a new consumer',
  'Publish a message (fan-out)',
  'Rapid burst publish (provoke backpressure)',
  'Direct/strict send (QueueFullException & friends)',
  'Unsubscribe a consumer',
  'Review telemetry & event log',
];

function BrokerStage({ topics, pulseTopic }) {
  return (
    <div className="ps-stage">
      <div className="ps-stage-hub">
        <div className="ps-hub-node">
          <div className="t">⚡ Broker Hub</div>
          <div className="s">{topics.length} topic{topics.length === 1 ? '' : 's'} live</div>
        </div>
      </div>
      <div className="ps-stage-topics">
        {topics.map((t) => (
          <div className={`ps-stage-topic ${pulseTopic === t.name ? 'pulse' : ''}`} key={t.name}>
            <div className="ps-stage-topic-head">
              <span>{t.name}</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{t.publishedCount} sent</span>
            </div>
            {(!t.subscribers || t.subscribers.length === 0) && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 6 }}>No subscribers</div>}
            {t.subscribers && t.subscribers.map((s) => {
              const pct = s.queueCapacity > 0 ? Math.round((s.queueSize / s.queueCapacity) * 100) : 0;
              const full = s.queueSize >= s.queueCapacity;
              return (
                <div className={`ps-stage-sub ${full ? 'full' : ''}`} key={s.id}>
                  <div className="ps-stage-sub-head">
                    <span>👤 {s.name}</span>
                    <span className={`ps-type-badge ps-type-${s.type}`}>{s.type}</span>
                  </div>
                  <div className="ps-stage-track">
                    <div className="ps-stage-fill" style={{ width: `${pct}%`, background: queueColor(s.type, pct) }} />
                  </div>
                  <div className="ps-stage-stats">
                    <span>Q {s.queueSize}/{s.queueCapacity}</span>
                    <span>✓{s.deliveredCount} · ✕{s.rejectedCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulationTab() {
  const [snapshots, setSnapshots] = useState([]);
  const [events, setEvents] = useState([]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pulseTopic, setPulseTopic] = useState(null);
  const mountedRef = useRef(true);

  const [newSubTopic, setNewSubTopic] = useState('tech-news');
  const [newSubId, setNewSubId] = useState('sub-demo');
  const [newSubType, setNewSubType] = useState('SLOW');
  const [newSubCapacity, setNewSubCapacity] = useState(3);

  const [publishTopic, setPublishTopic] = useState('tech-news');
  const [publishText, setPublishText] = useState('Breaking news update');

  const [directSubId, setDirectSubId] = useState('sub-slow');

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const started = snapshots.length > 0 || events.length > 0;

  const pulse = (topicName) => {
    setPulseTopic(topicName);
    setTimeout(() => { if (mountedRef.current) setPulseTopic(null); }, 700);
  };

  const withBusy = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } finally { if (mountedRef.current) setBusy(false); }
  };

  const applySnapshots = (snaps) => { if (mountedRef.current && Array.isArray(snaps)) setSnapshots(snaps); };
  const refreshEvents = async () => {
    try { const evs = await simGetEvents(); if (mountedRef.current && Array.isArray(evs)) setEvents(evs); }
    catch { /* ignore */ }
  };

  const doReset = () => withBusy(async () => {
    const snaps = await simReset();
    applySnapshots(snaps);
    await refreshEvents();
    setStep(1);
  });

  const doSubscribe = () => withBusy(async () => {
    const snaps = await simSubscribe(newSubTopic, newSubId, newSubId, newSubType, Number(newSubCapacity) || 5, newSubType === 'SLOW' ? 400 : 0);
    applySnapshots(snaps);
    await refreshEvents();
    pulse(newSubTopic);
    setStep((s) => Math.max(s, 2));
  });

  const doPublish = () => withBusy(async () => {
    const snaps = await simPublish(publishTopic, publishText || 'Ping', 'sim-publisher');
    applySnapshots(snaps);
    await refreshEvents();
    pulse(publishTopic);
    setStep((s) => Math.max(s, 3));
  });

  const doBurst = () => withBusy(async () => {
    for (let i = 0; i < 8; i++) {
      const snaps = await simPublish(publishTopic, `Burst #${i + 1}`, 'sim-burst');
      applySnapshots(snaps);
    }
    await refreshEvents();
    pulse(publishTopic);
    setStep((s) => Math.max(s, 4));
  });

  const doDirectSend = () => withBusy(async () => {
    const snaps = await simPublishToSubscriber(publishTopic, directSubId, 'Direct ping', 'sim-direct');
    applySnapshots(snaps);
    await refreshEvents();
    pulse(publishTopic);
    setStep((s) => Math.max(s, 5));
  });

  const doUnsubscribe = (topicName, subscriberId) => withBusy(async () => {
    const snaps = await simUnsubscribe(topicName, subscriberId);
    applySnapshots(snaps);
    await refreshEvents();
    setStep((s) => Math.max(s, 6));
  });

  const finalStep = () => setStep(7);
  const exitSandbox = () => { setSnapshots([]); setEvents([]); setStep(0); setError(''); };

  const allSubscribers = snapshots.flatMap((t) => (t.subscribers || []).map((s) => ({ ...s, topicName: t.name })));
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div>
      <div className="ps-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`ps-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>{SIM_STEPS[step]}</span>
      </div>

      {error && <div className="ps-error">{error}</div>}

      {!started ? (
        <div className="ps-intro">
          <p>
            Runs entirely against the isolated <code>/api/pubsub/sim/*</code> sandbox — its own
            <code> Broker</code> and <code>PubSubRepository</code>, seeded with topics
            <code> tech-news</code>/<code>sports-alerts</code> and a fast, slow (capacity 3) and
            audit-logging subscriber — so nothing here can ever touch the live topics above.
          </p>
          <div className="ps-actions">
            <button className="ps-btn" onClick={doReset} disabled={busy}>▶ Reset Sandbox</button>
          </div>
        </div>
      ) : (
        <>
          <div className="ps-hud">
            <div className="ps-hud-tile"><div className="v">{snapshots.length}</div><div className="l">Topics</div></div>
            <div className="ps-hud-tile"><div className="v">{allSubscribers.length}</div><div className="l">Subscribers</div></div>
            <div className="ps-hud-tile"><div className="v">{allSubscribers.reduce((a, s) => a + s.deliveredCount, 0)}</div><div className="l">Delivered</div></div>
            <div className="ps-hud-tile"><div className="v">{allSubscribers.reduce((a, s) => a + s.rejectedCount, 0)}</div><div className="l">Rejected</div></div>
            <div className="ps-hud-tile"><div className="v">{events.length}</div><div className="l">Events Logged</div></div>
          </div>

          <BrokerStage topics={snapshots} pulseTopic={pulseTopic} />

          {step <= 2 && (
            <div className="ps-card" style={{ marginBottom: 14 }}>
              <h3>② Subscribe a new consumer</h3>
              <div className="ps-row">
                <div className="ps-field">
                  <label>Topic</label>
                  <select value={newSubTopic} onChange={(e) => setNewSubTopic(e.target.value)}>
                    {snapshots.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="ps-field">
                  <label>Subscriber ID</label>
                  <input value={newSubId} onChange={(e) => setNewSubId(e.target.value)} />
                </div>
                <div className="ps-field">
                  <label>Type</label>
                  <select value={newSubType} onChange={(e) => setNewSubType(e.target.value)}>
                    <option value="PRINT">Fast</option>
                    <option value="SLOW">Slow</option>
                    <option value="LOGGING">Logging</option>
                  </select>
                </div>
                <div className="ps-field">
                  <label>Capacity</label>
                  <input type="number" min={1} value={newSubCapacity} onChange={(e) => setNewSubCapacity(e.target.value)} />
                </div>
              </div>
              <button className="ps-btn" onClick={doSubscribe} disabled={busy}>Subscribe</button>
            </div>
          )}

          {step >= 2 && step <= 5 && (
            <div className="ps-card" style={{ marginBottom: 14 }}>
              <h3>③④⑤ Publish traffic</h3>
              <div className="ps-row">
                <div className="ps-field">
                  <label>Topic</label>
                  <select value={publishTopic} onChange={(e) => setPublishTopic(e.target.value)}>
                    {snapshots.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="ps-field" style={{ flex: 2 }}>
                  <label>Payload</label>
                  <input value={publishText} onChange={(e) => setPublishText(e.target.value)} />
                </div>
              </div>
              <div className="ps-actions" style={{ marginTop: 0, justifyContent: 'flex-start' }}>
                <button className="ps-btn" onClick={doPublish} disabled={busy}>🚀 Publish One</button>
                <button className="ps-btn-outline" onClick={doBurst} disabled={busy}>⚡ Rapid Burst (8 msgs)</button>
              </div>

              {step >= 4 && (
                <>
                  <h3 style={{ marginTop: 16 }}>⑤ Direct/strict send</h3>
                  <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Unlike broadcast publish, a direct send throws a typed exception instead of
                    reporting a rejected id — <code>QueueFullException</code> (409) if that one
                    subscriber's queue is full, <code>DispatchFailedException</code> (410) if its
                    worker already stopped. The sandbox catches it server-side and logs it as an
                    event so you can see the failure without the call itself erroring out.
                  </p>
                  <div className="ps-row">
                    <div className="ps-field">
                      <label>Target Subscriber</label>
                      <select value={directSubId} onChange={(e) => setDirectSubId(e.target.value)}>
                        {allSubscribers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.topicName})</option>)}
                      </select>
                    </div>
                  </div>
                  <button className="ps-btn ps-btn-danger" onClick={doDirectSend} disabled={busy}>🎯 Direct Send</button>
                </>
              )}
            </div>
          )}

          <div className="ps-grid wide-right">
            <div className="ps-card">
              <h3>⑥ Subscribers (unsubscribe to try it)</h3>
              {allSubscribers.length === 0 && <div className="ps-empty">No subscribers.</div>}
              {allSubscribers.map((s) => (
                <div className="ps-sub-chip" key={s.topicName + s.id} style={{ display: 'flex' }}>
                  👤 {s.name} · {s.topicName}
                  {step >= 5 && (
                    <button onClick={() => doUnsubscribe(s.topicName, s.id)} title="Unsubscribe" disabled={busy}>×</button>
                  )}
                </div>
              ))}
              {lastEvent && (
                <div style={{ marginTop: 14, fontSize: 11.5 }}>
                  <strong>Last event:</strong> {lastEvent.description}
                </div>
              )}
            </div>
            <div className="ps-card">
              <h3>Event Log</h3>
              <div className="ps-log">
                {events.length === 0 && <div className="ps-empty">No events yet.</div>}
                {events.slice().reverse().slice(0, 40).map((ev) => (
                  <div key={ev.id} className={`ps-log-row ${ev.type === 'BACKPRESSURE_REJECT' || ev.type === 'DIRECT_SEND_REJECTED' ? 'reject' : ''}`}>
                    <span className="ps-log-time">[{ev.timestamp}]</span>
                    <strong>{ev.actor}</strong>: {ev.description}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ps-actions">
            {step >= 6 && step < 7 && (
              <button className="ps-btn-outline" onClick={finalStep}>Review Telemetry &rarr;</button>
            )}
            <button className="ps-btn-outline" onClick={doReset} disabled={busy}>&#8635; Reset</button>
            <button className="ps-btn-outline" onClick={exitSandbox} disabled={busy}>Exit Sandbox</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PubSubPage() {
  return (
    <LldPage
      module="pubsub"
      title="Pub/Sub System (Message Broker)"
      icon="📡"
      tabs={[
        { id: 'topics', label: '📡 Topics & Publishers' },
        { id: 'subscribers', label: '📥 Subscribers & Inboxes' },
        'simulation', 'sequence', 'diagram', 'design',
      ]}
    >
      {(activeTab) => (
        <div className="ps-page">
          <style>{styles}</style>
          {(activeTab === 'topics' || activeTab === 'subscribers') && <LiveTabs activeTab={activeTab} />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
