import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import {
  configure,
  setLoggerLevel,
  setFormatter,
  toggleAppender,
  setAsyncMode,
  sendLog,
  getLogs,
  getConfig,
  getAppenderLogs,
  triggerBurst,
  clearLogs,
  simReset,
  simEmitLog,
  simGetLogs,
  simGetTelemetry,
  simGetAppenderLogs
} from './api';
import { usePolling } from '../../hooks/usePolling';
import './LoggingFrameworkPage.css';

const LEVEL_COLORS = {
  TRACE: '#a855f7',
  DEBUG: '#94a3b8',
  INFO: '#22c55e',
  WARN: '#eab308',
  ERROR: '#ef4444',
  FATAL: '#f87171'
};

const LOGGERS = ['AuthService', 'PaymentGateway', 'OrderProcessor', 'InventoryService', 'NotificationHub'];
const LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

function InteractivePipelineSimulation() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simLevel, setSimLevel] = useState('INFO');
  const [simThreshold, setSimThreshold] = useState('INFO');
  const [simLogger, setSimLogger] = useState('AuthService');
  const [simMsg, setSimMsg] = useState('User JWT authentication verified');
  const [telemetry, setTelemetry] = useState(null);
  const [activeAppenderTab, setActiveAppenderTab] = useState('CONSOLE');
  const [appenderLogs, setAppenderLogs] = useState([]);

  const pipelineSteps = [
    { title: '1. Producer Threads', desc: 'Application threads invoke logger.info(), warn(), or error()' },
    { title: '2. Level Filter Chain', desc: 'Chain of Responsibility evaluates LogLevel >= ActiveThreshold' },
    { title: '3. MDC Context Enricher', desc: 'Attaches traceId, userId, threadName, and IST timestamp' },
    { title: '4. Formatter Strategy', desc: 'Transforms message using SimpleText, Json, or PatternFormatter' },
    { title: '5. Async Bounded Buffer', desc: 'Enqueues into ArrayBlockingQueue (capacity 50) with drop guard' },
    { title: '6. Worker Dispatcher', desc: 'Async worker thread drains queue without blocking main threads' },
    { title: '7. Appender Distribution', desc: 'Broadcasts formatted message to Console, File, DB, and ES sinks' },
    { title: '8. Storage & File Rotation', desc: 'Appenders persist logs & execute file rotation (app.log.1, app.log.2)' }
  ];

  const loadSimData = async () => {
    try {
      const telem = await simGetTelemetry();
      setTelemetry(telem);
      const appLogs = await simGetAppenderLogs(activeAppenderTab);
      setAppenderLogs(appLogs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSimData();
  }, [activeAppenderTab]);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= pipelineSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleRunSim = async () => {
    await simEmitLog(simLogger, simLevel, simMsg, { traceId: 'sim-trc-901', userId: 'usr-442' });
    await loadSimData();
    setActiveStep(0);
    setIsPlaying(true);
  };

  const handleSimReset = async () => {
    await simReset();
    setSimLevel('INFO');
    setSimThreshold('INFO');
    setSimLogger('AuthService');
    setSimMsg('User JWT authentication verified');
    setActiveStep(0);
    setIsPlaying(false);
    await loadSimData();
  };

  const isPassed = LEVELS.indexOf(simLevel) >= LEVELS.indexOf(simThreshold);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Control Panel */}
      <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>🕹️ 8-Step Interactive Pipeline Simulation</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleRunSim} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
              ▶ Emit & Run Pipeline
            </button>

            <button onClick={handleSimReset} style={{ padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
              🔄 Reset Sandbox
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Logger Category</label>
            <select value={simLogger} onChange={e => setSimLogger(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }}>
              {LOGGERS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Emitted Log Level</label>
            <select value={simLevel} onChange={e => setSimLevel(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Filter Threshold</label>
            <select value={simThreshold} onChange={e => setSimThreshold(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Simulation Message</label>
            <input type="text" value={simMsg} onChange={e => setSimMsg(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }} />
          </div>
        </div>
      </div>

      {/* Telemetry HUD */}
      {telemetry && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Logs Processed</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>{telemetry.totalLogs}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Async Queue Depth</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#eab308', marginTop: 4 }}>{telemetry.currentQueueDepth} / {telemetry.queueCapacity}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dropped Logs (Overflow)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: telemetry.droppedLogs > 0 ? '#ef4444' : '#22c55e', marginTop: 4 }}>{telemetry.droppedLogs}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active Appender Sinks</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#a855f7', marginTop: 4 }}>{telemetry.appenders?.filter(a => a.enabled).length} / {telemetry.appenders?.length}</div>
          </div>
        </div>
      )}

      {/* 8-Step Pipeline Tracker */}
      <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          CHAIN OF RESPONSIBILITY & PIPELINE TRACKER
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {pipelineSteps.map((step, idx) => {
            const isActive = activeStep === idx;
            const isCompleted = activeStep > idx;
            const isFilterStep = idx === 1;
            return (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                style={{
                  background: isActive ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  border: `2px solid ${isActive ? 'var(--accent)' : isCompleted ? '#22c55e' : 'var(--border-primary)'}`,
                  padding: 14,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{step.title}</span>
                  {isCompleted && <span style={{ color: '#22c55e', fontSize: 12 }}>✓</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{step.desc}</div>
                {isFilterStep && (
                  <div style={{ marginTop: 8, padding: '4px 8px', borderRadius: 4, background: isPassed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: isPassed ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 700, textAlign: 'center' }}>
                    {isPassed ? `PASSED (${simLevel} ≥ ${simThreshold})` : `FILTERED (${simLevel} < ${simThreshold})`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Appender Sinks Inspector in Simulation */}
      <div style={{ background: '#1e1e1e', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: 'monospace', color: '#fff', fontSize: 14, fontWeight: 600 }}>🗄️ Appender Destination Logs</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['CONSOLE', 'FILE', 'DATABASE', 'ELASTICSEARCH'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveAppenderTab(tab)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeAppenderTab === tab ? 'var(--accent)' : '#333',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#111', padding: 14, borderRadius: 8, height: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, color: '#b5e890' }}>
          {appenderLogs.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>No records in {activeAppenderTab} sink.</div>}
          {appenderLogs.map((log, i) => (
            <div key={i} style={{ borderBottom: '1px solid #222', paddingBottom: 4, marginBottom: 4 }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveLoggingWorkspace({ activeTab }) {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loggerName, setLoggerName] = useState('AuthService');
  const [level, setLevel] = useState('INFO');
  const [message, setMessage] = useState('');
  const [contextJson, setContextJson] = useState('{"traceId": "trc-901", "userId": "usr-12"}');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [activeAppenderTab, setActiveAppenderTab] = useState('CONSOLE');
  const [appenderSinkLogs, setAppenderSinkLogs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [contextError, setContextError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const busyRef = useRef(false);
  const requestVersion = useRef(0);
  const lifecycle = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => {
      controller.abort();
      requestVersion.current += 1;
    };
  }, []);

  const loadData = async (signal = lifecycle.current?.signal, force = false) => {
    if (busyRef.current && !force) return;
    const version = ++requestVersion.current;
    try {
      const [cfg, entries, sinkLogs] = await Promise.all([
        getConfig({ signal }),
        getLogs({ signal }),
        getAppenderLogs(activeAppenderTab, { signal })
      ]);
      if (signal?.aborted || lifecycle.current?.signal.aborted || version !== requestVersion.current) return;
      setConfig(cfg);
      setLogs(entries);
      setAppenderSinkLogs(sinkLogs);
      setLoadError('');
    } catch (e) {
      if (!signal?.aborted && !lifecycle.current?.signal.aborted && version === requestVersion.current) {
        setLoadError(e.message || 'Could not refresh logging data.');
      }
      throw e;
    } finally {
      if (!signal?.aborted && !lifecycle.current?.signal.aborted && version === requestVersion.current) setLoading(false);
    }
  };

  usePolling(loadData, 2000, [activeAppenderTab]);

  const retryLoad = async () => {
    if (busyRef.current) return;
    setLoading(true);
    try {
      await loadData();
    } catch {
      return;
    }
  };

  const runAction = async (operation, successMessage, onSuccess) => {
    if (busyRef.current) return;
    busyRef.current = true;
    requestVersion.current += 1;
    setPending(true);
    setActionError('');
    setStatus('');
    const signal = lifecycle.current.signal;
    try {
      const result = await operation({ signal });
      if (signal.aborted) return;
      onSuccess?.(result);
      setStatus(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      try {
        await loadData(signal, true);
      } catch {
        return;
      }
    } catch (e) {
      if (!signal.aborted) {
        setActionError(`${e.message || 'The request failed.'} Refresh the data before retrying if the result is uncertain.`);
      }
    } finally {
      busyRef.current = false;
      if (!signal.aborted) {
        setPending(false);
        setLoading(false);
      }
    }
  };

  const updateConfiguration = (operation) => runAction(operation, 'Configuration updated.', setConfig);

  const handleGlobalConfig = (event) => {
    const nextLevel = event.target.value;
    updateConfiguration((options) => configure(nextLevel, options));
  };

  const handleFormatterChange = (formatter) => updateConfiguration((options) => setFormatter(formatter, options));

  const handleToggleAppender = (name, currentStatus) => updateConfiguration((options) => toggleAppender(name, !currentStatus, options));

  const handleToggleAsync = (currentAsync) => updateConfiguration((options) => setAsyncMode(!currentAsync, options));

  const handleSendLog = (event) => {
    event.preventDefault();
    if (busyRef.current) return;
    if (!message.trim()) return;
    let ctx = null;
    try {
      if (contextJson.trim()) ctx = JSON.parse(contextJson);
      if (contextJson.trim() && (ctx === null || Array.isArray(ctx) || typeof ctx !== 'object')) {
        throw new Error('Expected an object');
      }
    } catch {
      setContextError('Enter a valid JSON object, such as {"traceId":"trc-901"}, or leave this field empty.');
      return;
    }
    setContextError('');
    runAction(
      (options) => sendLog(loggerName, level, message.trim(), ctx, options),
      (result) => result ? 'Log accepted. Refresh the console to inspect delivery.' : 'Log filtered by the active logger threshold.',
      () => setMessage('')
    );
  };

  const handleTriggerBurst = () => runAction((options) => triggerBurst(10, options), 'Burst request completed. Inspect the console for accepted logs.');

  const handleClear = () => runAction(clearLogs, 'Log entries and appender buffers cleared.', () => setConfirmClear(false));

  const filteredLogs = logs.filter(l => {
    if (filterLevel !== 'ALL' && l.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return l.message.toLowerCase().includes(q) || l.loggerName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="logging-workspace" aria-busy={pending || loading}>
          {loading && <p role="status">Loading logging data…</p>}
          {loadError && <div role="alert" className="logging-error">Could not refresh logging data: {loadError} {config && 'Showing the last successful snapshot.'} <button type="button" onClick={retryLoad} disabled={loading || pending}>Retry</button></div>}
          {actionError && <div role="alert" className="logging-error">{actionError} <button type="button" onClick={retryLoad} disabled={loading || pending}>Refresh data</button></div>}
          <p role="status">{pending ? 'Saving changes…' : status}</p>
          <fieldset disabled={pending} className="logging-controls">

          {/* TAB 1: Live Logging Console & Emitter */}
          {activeTab === 'app' && (
            <div className="logging-console-layout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Log Emitter */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-primary)' }}>✍️ Emit Log Event</h3>
                  <form onSubmit={handleSendLog}>
                    <fieldset disabled={pending} className="logging-fields">
                    <div>
                      <label htmlFor="live-logger" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Logger Category</label>
                      <select id="live-logger" value={loggerName} onChange={e => setLoggerName(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }}>
                        {LOGGERS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="live-level" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Severity Level</label>
                      <select id="live-level" value={level} onChange={e => setLevel(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }}>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="live-message" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Log Message</label>
                      <textarea id="live-message" required rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter log message (e.g. Database connection re-established)..." style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }} />
                    </div>

                    <div>
                      <label htmlFor="live-context" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>MDC Context Tags (JSON)</label>
                      <input id="live-context" type="text" value={contextJson} aria-invalid={Boolean(contextError)} aria-describedby={contextError ? 'live-context-error' : undefined} onChange={e => { setContextJson(e.target.value); setContextError(''); }} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, fontFamily: 'monospace', fontSize: 11 }} />
                      {contextError && <p id="live-context-error" role="alert" className="logging-error">{contextError}</p>}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" disabled={!message.trim()} style={{ flex: 1, padding: '10px', background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                        📡 Send Log
                      </button>
                      <button type="button" onClick={handleTriggerBurst} style={{ padding: '10px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                        ⚡ Burst (10 Logs)
                      </button>
                    </div>
                    </fieldset>
                  </form>
                </div>

                {/* Configuration Summary Card */}
                {config && (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--text-primary)' }}>⚙️ Active Configuration</h3>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>Global Threshold: <strong style={{ color: 'var(--text-primary)' }}>{config.globalLevel}</strong></div>
                      <div>Formatter Strategy: <strong style={{ color: 'var(--accent)' }}>{config.activeFormatter}</strong></div>
                      <div>Async Logging: <strong style={{ color: config.asyncEnabled ? 'var(--success)' : 'var(--warning)' }}>{config.asyncEnabled ? 'ENABLED (Queue: 50)' : 'DISABLED (Sync Direct)'}</strong></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Console Feed */}
              <div style={{ background: '#1e1e1e', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', height: 620 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #333', paddingBottom: 8, flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontFamily: 'monospace', color: '#fff', fontSize: 14, fontWeight: 600 }}>🖥️ Live Log Console Stream ({filteredLogs.length})</span>

                  <div className="logging-toolbar">
                    <input aria-label="Search logs" type="text" placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #444', background: '#222', color: '#fff', fontSize: 11 }} />

                    <select aria-label="Filter log severity" value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #444', background: '#222', color: '#fff', fontSize: 11 }}>
                      <option value="ALL">ALL LEVELS</option>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>

                    <button onClick={() => setConfirmClear(true)} style={{ padding: '4px 10px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Clear</button>
                  </div>
                </div>

                {confirmClear && <div className="logging-clear-confirmation" role="group" aria-label="Confirm clearing logs"><p>This clears all live log entries and appender buffers.</p><button onClick={handleClear}>Confirm clear</button> <button onClick={() => setConfirmClear(false)}>Cancel</button></div>}
                <div className="logging-feed" role="region" aria-label="Live log entries" tabIndex={0} style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredLogs.length === 0 && <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>No log messages matched criteria.</div>}
                  {filteredLogs.map((log) => {
                    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '00:00:00';
                    const color = LEVEL_COLORS[log.level] || '#fff';
                    return (
                      <div key={log.id} style={{ borderBottom: '1px solid #2a2a2a', paddingBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                          <span style={{ color: '#aaa', fontSize: 11 }}>[{timeStr}]</span>
                          <span style={{ color, fontWeight: 700, minWidth: 50 }}>{log.level}</span>
                          <span style={{ color: '#8ab4f8' }}>[{log.loggerName}]</span>
                          <span style={{ color: '#aaa', fontSize: 11 }}>({log.threadName || 'main'})</span>
                        </div>
                        <div style={{ color: '#eee', marginTop: 2, paddingLeft: 4 }}>
                          {log.formattedMessage || log.message}
                        </div>
                        {log.context && Object.keys(log.context).length > 0 && (
                          <div style={{ color: '#888', fontSize: 10, marginTop: 2, paddingLeft: 4 }}>
                            MDC Context: {JSON.stringify(log.context)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Multi-Appender Sinks */}
          {activeTab === 'appenders' && config && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="logging-card-grid">
                {config.appenders?.map((app) => (
                  <div key={app.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{app.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Type: {app.type}</div>
                      </div>
                      <button
                        aria-label={`${app.enabled ? 'Disable' : 'Enable'} ${app.name} appender`}
                        aria-pressed={app.enabled}
                        onClick={() => handleToggleAppender(app.name, app.enabled)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: app.enabled ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: app.enabled ? 'var(--success)' : 'var(--danger)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        {app.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>Destination: <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{app.destination}</span></div>
                      <div>Appended Logs: <strong style={{ color: 'var(--text-primary)' }}>{app.logCount}</strong></div>
                      {app.type === 'FILE' && (
                        <div>File Size: <strong style={{ color: '#eab308' }}>{app.fileSizeBytes} B</strong> (Rotations: {app.activeRotations})</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Appender Inspection Feed */}
              <div style={{ background: '#1e1e1e', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                <div className="logging-sink-heading">
                  <span style={{ fontFamily: 'monospace', color: '#fff', fontSize: 14, fontWeight: 600 }}>🔍 Appender Storage Inspection</span>
                  <div className="logging-toolbar">
                    {['CONSOLE', 'FILE', 'DATABASE', 'ELASTICSEARCH'].map(tab => (
                      <button
                        key={tab}
                        aria-pressed={activeAppenderTab === tab}
                        disabled={pending}
                        onClick={() => setActiveAppenderTab(tab)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: activeAppenderTab === tab ? 'var(--accent)' : '#333',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#111', padding: 16, borderRadius: 8, height: 350, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, color: '#b5e890' }}>
                  {appenderSinkLogs.length === 0 && <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: 60 }}>No logs captured in {activeAppenderTab} sink.</div>}
                  {appenderSinkLogs.map((item, idx) => (
                    <div key={idx} style={{ borderBottom: '1px solid #222', paddingBottom: 6, marginBottom: 6, wordBreak: 'break-all' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Logger Hierarchy & Configuration */}
          {activeTab === 'hierarchy' && config && (
            <div className="logging-card-grid">
              {/* Formatter Strategy & Async Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 14, color: 'var(--text-primary)' }}>🎨 Formatter Strategy</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {['SIMPLE', 'JSON', 'PATTERN'].map(fmt => (
                      <button
                        key={fmt}
                        aria-pressed={config.activeFormatter === fmt}
                        onClick={() => handleFormatterChange(fmt)}
                        style={{
                          padding: '12px',
                          borderRadius: 8,
                          border: `2px solid ${config.activeFormatter === fmt ? 'var(--accent)' : 'var(--border-primary)'}`,
                          background: config.activeFormatter === fmt ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 14, color: 'var(--text-primary)' }}>⚡ Asynchronous Non-Blocking Logging</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Async Queue Worker</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Enqueues logs into ArrayBlockingQueue to prevent main-thread latency</div>
                    </div>
                    <button
                      aria-label="Async queue worker"
                      aria-pressed={config.asyncEnabled}
                      onClick={() => handleToggleAsync(config.asyncEnabled)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 6,
                        border: 'none',
                        background: config.asyncEnabled ? 'var(--success-bg)' : 'var(--warning-bg)',
                        color: config.asyncEnabled ? 'var(--success)' : 'var(--warning)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {config.asyncEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Logger Threshold Overrides */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 14, color: 'var(--text-primary)' }}>🌲 Logger Hierarchy & Per-Category Levels</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>ROOT LOGGER</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Global Fallback Threshold</div>
                    </div>
                    <select aria-label="Root logger threshold" value={config.globalLevel} onChange={handleGlobalConfig} style={{ padding: '6px 12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, fontWeight: 700 }}>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  {LOGGERS.map(lName => {
                    return (
                      <div key={lName} style={{ padding: 10, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{lName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Inherits from ROOT if not overridden</div>
                        </div>
                        <select
                          aria-label={`${lName} threshold`}
                          value={config.loggerLevels?.[lName] || 'DEFAULT'}
                          onChange={(event) => { const nextLevel = event.target.value; updateConfiguration((options) => setLoggerLevel(lName, nextLevel, options)); }}
                          style={{ padding: '4px 10px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 12 }}
                        >
                          <option value="DEFAULT">DEFAULT (Inherit)</option>
                          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </fieldset>
    </div>
  );
}

export default function LoggingFrameworkPage() {
  return (
    <LldPage module="logging-framework" title="Logging Framework" icon="📝" tabs={['app', 'appenders', 'hierarchy', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => activeTab === 'simulation'
        ? <InteractivePipelineSimulation />
        : <LiveLoggingWorkspace activeTab={activeTab} />}
    </LldPage>
  );
}
