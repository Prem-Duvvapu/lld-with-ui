import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { configure, addAppender, sendLog, getLogs, getConfig } from './api';

const LEVEL_COLORS = { DEBUG: '#888', INFO: '#22c55e', WARN: '#eab308', ERROR: '#ef4444' };

const styles = `
.logging-config { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-primary); }
.logging-config label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.logging-config select, .logging-config input { padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 13px; background: var(--bg-primary); color: var(--text-primary); }
.logging-config button { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
.logging-config button:hover { opacity: 0.85; }
.btn-primary { background: #667eea; color: #fff; }
.btn-success { background: #22c55e; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.log-form { background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-primary); }
.log-form-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.log-form-row label { font-size: 13px; font-weight: 600; color: var(--text-primary); min-width: 100px; }
.log-form-row input, .log-form-row select { flex: 1; padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 13px; background: var(--bg-primary); color: var(--text-primary); min-width: 150px; }
.log-form-row textarea { flex: 1; padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 13px; background: var(--bg-primary); color: var(--text-primary); resize: vertical; min-height: 60px; min-width: 150px; font-family: inherit; }
.log-viewer { background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-primary); overflow: hidden; }
.log-viewer table { width: 100%; border-collapse: collapse; font-size: 13px; }
.log-viewer th { text-align: left; padding: 10px 12px; background: var(--bg-tertiary); color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid var(--border-primary); }
.log-viewer td { padding: 8px 12px; border-bottom: 1px solid var(--border-secondary); color: var(--text-primary); }
.log-viewer tr:hover { filter: brightness(1.1); }
.log-viewer-container { max-height: 400px; overflow-y: auto; }
.log-level-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.log-timestamp { font-size: 12px; color: var(--text-muted); font-family: monospace; }
.logger-name { font-family: monospace; font-size: 12px; color: #8ab4f8; }
.no-logs { text-align: center; padding: 40px; color: var(--text-muted); font-size: 14px; }
.config-display { font-size: 12px; color: var(--text-muted); padding: 4px 0; }
`;

export default function LoggingFrameworkPage() {
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({ activeLevel: 'INFO', appenders: ['CONSOLE'] });
  const [levelSelect, setLevelSelect] = useState('INFO');
  const [appenderInput, setAppenderInput] = useState('');
  const [loggerName, setLoggerName] = useState('');
  const [logLevel, setLogLevel] = useState('INFO');
  const [message, setMessage] = useState('');
  const viewerRef = useRef(null);

  const loadLogs = () => getLogs().then(setLogs).catch(() => {});
  const loadConfig = () => getConfig().then(setConfig).catch(() => {});

  useEffect(() => { loadLogs(); loadConfig(); }, []);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.scrollTop = viewerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleConfigure = () => {
    configure(levelSelect).then(cfg => {
      setConfig(cfg);
      setLevelSelect(cfg.activeLevel);
    });
  };

  const handleAddAppender = () => {
    if (!appenderInput.trim()) return;
    addAppender(appenderInput.trim()).then(cfg => {
      setConfig(cfg);
      setAppenderInput('');
    });
  };

  const handleSendLog = () => {
    if (!loggerName.trim() || !message.trim()) return;
    sendLog(loggerName.trim(), logLevel, message.trim()).then(() => {
      setMessage('');
      loadLogs();
    });
  };

  const levelOptions = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

  return (
    <LldPage module="logging-framework" title="Logging Framework" icon="📝" tabs={['app', 'design', 'diagram']}>
      <style>{styles}</style>

      <div className="logging-config">
        <label>Active Level:</label>
        <select value={levelSelect} onChange={e => setLevelSelect(e.target.value)}>
          {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button className="btn-primary" onClick={handleConfigure}>Configure</button>

        <label>Add Appender:</label>
        <input value={appenderInput} onChange={e => setAppenderInput(e.target.value)} placeholder="e.g. FILE" />
        <button className="btn-success" onClick={handleAddAppender}>Add</button>

        <span className="config-display">
          Level: <strong>{config.activeLevel}</strong> | Appenders: <strong>{(config.appenders || []).join(', ')}</strong>
        </span>
      </div>

      <div className="log-form">
        <div className="log-form-row">
          <label>Logger Name:</label>
          <input value={loggerName} onChange={e => setLoggerName(e.target.value)} placeholder="e.g. Main" />
        </div>
        <div className="log-form-row">
          <label>Level:</label>
          <select value={logLevel} onChange={e => setLogLevel(e.target.value)}>
            {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="log-form-row">
          <label>Message:</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter log message..." />
        </div>
        <button className="btn-primary" onClick={handleSendLog}>Send Log</button>
      </div>

      <div className="log-viewer">
        <div style={{ padding: '10px 12px', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>
          Log Viewer ({logs.length} entries)
        </div>
        <div className="log-viewer-container" ref={viewerRef}>
          {logs.length === 0 ? (
            <div className="no-logs">No log messages yet. Send a log message above.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Level</th>
                  <th>Logger</th>
                  <th>Message</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id || idx} style={{ background: log.level === 'ERROR' ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{log.id}</td>
                    <td>
                      <span className="log-level-badge" style={{ background: LEVEL_COLORS[log.level] + '22', color: LEVEL_COLORS[log.level] }}>
                        {log.level}
                      </span>
                    </td>
                    <td><span className="logger-name">{log.loggerName}</span></td>
                    <td style={{ color: LEVEL_COLORS[log.level] || 'var(--text-primary)' }}>{log.message}</td>
                    <td><span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </LldPage>
  );
}