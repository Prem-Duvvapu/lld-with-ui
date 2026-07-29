import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { configure, addAppender, sendLog, getLogs, getConfig, clearLogs } from './api';

const LEVEL_COLORS = {
  DEBUG: '#888888',
  INFO: '#22c55e',
  WARN: '#eab308',
  ERROR: '#ef4444'
};

export default function LoggingFrameworkPage() {
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loggerName, setLoggerName] = useState('AppLogger');
  const [level, setLevel] = useState('INFO');
  const [message, setMessage] = useState('');
  const [newAppender, setNewAppender] = useState('');
  const logsEndRef = useRef(null);

  const loadData = async () => {
    try {
      const cfg = await getConfig();
      setConfig(cfg);
      const l = await getLogs();
      setLogs(l);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleConfigure = async (e) => {
    e.preventDefault();
    const cfg = await configure(level);
    setConfig(cfg);
  };

  const handleAddAppender = async (e) => {
    e.preventDefault();
    if (!newAppender.trim()) return;
    const cfg = await addAppender(newAppender.trim().toUpperCase());
    setConfig(cfg);
    setNewAppender('');
  };

  const handleSendLog = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await sendLog(loggerName, level, message.trim());
    setMessage('');
    loadData();
  };

  const handleClear = async () => {
    await clearLogs();
    loadData();
  };

  return (
    <LldPage module="logging-framework" title="Logging Framework" icon="📝" tabs={['app', 'design', 'diagram']}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Left Column: Configuration & Log Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Configuration Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-primary)' }}>⚙️ Logger Configuration</h3>
            {config && (
              <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <div>Active Level: <strong style={{ color: 'var(--accent)' }}>{config.activeLevel}</strong></div>
                <div style={{ marginTop: 6 }}>Appenders: <span style={{ fontFamily: 'monospace', color: '#b5e890' }}>{config.appenders.join(', ')}</span></div>
              </div>
            )}
            <form onSubmit={handleConfigure} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <select value={level} onChange={e => setLevel(e.target.value)} style={{ flex: 1, padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }}>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Set Level</button>
            </form>
            <form onSubmit={handleAddAppender} style={{ display: 'flex', gap: 10 }}>
              <input type="text" placeholder="Appender name (e.g. FILE)" value={newAppender} onChange={e => setNewAppender(e.target.value)} style={{ flex: 1, padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }} />
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Add Appender</button>
            </form>
          </div>

          {/* Emit Log Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-primary)' }}>✍️ Emit Log Message</h3>
            <form onSubmit={handleSendLog} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Logger Name</label>
                <input type="text" value={loggerName} onChange={e => setLoggerName(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Level</label>
                <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }}>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Message</label>
                <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter log message..." style={{ width: '100%', padding: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6 }} />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Send Log</button>
            </form>
          </div>
        </div>

        {/* Right Column: Log Output Console */}
        <div style={{ background: '#1e1e1e', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', height: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #333', paddingBottom: 8 }}>
            <span style={{ fontFamily: 'monospace', color: '#fff', fontSize: 14, fontWeight: 600 }}>🖥️ Log Output Console</span>
            <button onClick={handleClear} style={{ padding: '4px 10px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Clear</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.length === 0 && <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>No logs recorded yet.</div>}
            {logs.map((log) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString();
              const color = LEVEL_COLORS[log.level] || '#fff';
              return (
                <div key={log.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', borderBottom: '1px solid #2a2a2a', paddingBottom: 4 }}>
                  <span style={{ color: '#666' }}>[{timeStr}]</span>
                  <span style={{ color, fontWeight: 700, minWidth: 50 }}>{log.level}</span>
                  <span style={{ color: '#8ab4f8' }}>[{log.loggerName}]</span>
                  <span style={{ color: '#ddd', flex: 1, wordBreak: 'break-all' }}>{log.message}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </LldPage>
  );
}
