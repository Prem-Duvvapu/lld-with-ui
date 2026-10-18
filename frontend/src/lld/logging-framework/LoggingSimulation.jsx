import { useEffect, useRef, useState } from 'react';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { simReset, simConfigure, simEmitLog, simGetLogs, simGetTelemetry, simGetAppenderLogs } from './api';

const SINKS = ['CONSOLE', 'FILE', 'DATABASE', 'ELASTICSEARCH'];
const STEPS = [
  { title: 'Reset sandbox', detail: 'Clear demo events and sinks, then read the initial Java configuration.' },
  { title: 'Apply threshold', detail: 'Send the selected threshold to the isolated Java logger.' },
  { title: 'Emit log event', detail: 'Send your event. Java decides whether to accept or filter it.' },
  { title: 'Inspect stored events', detail: 'Read the repository and telemetry to inspect the result.' },
  { title: 'Inspect console sink', detail: 'Read the formatted records returned by the console appender.' },
  { title: 'Inspect file sink', detail: 'Read the file appender, including any returned rotation markers.' },
  { title: 'Inspect database sink', detail: 'Read the database appender records.' },
  { title: 'Inspect Elasticsearch sink', detail: 'Read the search appender and refresh the final telemetry snapshot.' }
];

export default function LoggingSimulation({ loggers, levels }) {
  const [loggerName, setLoggerName] = useState(loggers[0]);
  const [level, setLevel] = useState('INFO');
  const [threshold, setThreshold] = useState('INFO');
  const [message, setMessage] = useState('User JWT authentication verified');
  const [selectedSink, setSelectedSink] = useState('CONSOLE');
  const lifecycle = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);

  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    const options = { signal: lifecycle.current.signal };
    if (index === 0) {
      if (!message.trim()) throw new Error('Enter a simulation message before starting.');
      await simReset(options);
      return { telemetry: await simGetTelemetry(options), emitted: false, logs: [], sinks: {} };
    }
    if (index === 1) {
      return { ...previous, telemetry: await simConfigure(threshold, options) };
    }
    if (index === 2) {
      const attempt = { loggerName, level, message: message.trim() };
      const emitted = await simEmitLog(loggerName, level, attempt.message, { traceId: 'sim-trc-901', userId: 'usr-442' }, options);
      return { ...previous, emitted: true, message: emitted, attempt, telemetry: await simGetTelemetry(options) };
    }
    if (index === 3) {
      return { ...previous, logs: await simGetLogs(options), telemetry: await simGetTelemetry(options) };
    }
    const sink = SINKS[index - 4];
    const records = await simGetAppenderLogs(sink, options);
    return {
      ...previous,
      sinks: { ...previous.sinks, [sink]: records },
      telemetry: index === STEPS.length - 1 ? await simGetTelemetry(options) : previous.telemetry
    };
  });

  const snapshot = playback.result;
  const telemetry = snapshot?.telemetry;
  const sinkRecords = snapshot?.sinks[selectedSink];
  const draftError = message.trim() ? '' : 'Enter a message to start the walkthrough.';

  return (
    <section className="logging-workspace logging-simulation" aria-labelledby="logging-simulation-heading">
      <div className="logging-sim-card">
        <h3 id="logging-simulation-heading">Follow a log through the sandbox</h3>
        <p>Choose an event and threshold, then inspect the Java logger and its four appenders. Start/reset clears demo logs only; live logs and settings are unchanged.</p>
        <fieldset className="logging-controls logging-sim-settings" disabled={playback.busy || playback.playing || playback.completed > 1}>
          <legend>Event settings</legend>
          <label>Logger category
            <select value={loggerName} onChange={event => setLoggerName(event.target.value)}>
              {loggers.map(logger => <option key={logger} value={logger}>{logger}</option>)}
            </select>
          </label>
          <label>Emitted log level
            <select value={level} onChange={event => setLevel(event.target.value)}>
              {levels.map(severity => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </label>
          <label>Filter threshold
            <select value={threshold} onChange={event => setThreshold(event.target.value)}>
              {levels.map(severity => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </label>
          <label>Simulation message
            <input value={message} onChange={event => setMessage(event.target.value)} aria-invalid={Boolean(draftError)} aria-describedby="logging-sim-input-help" required />
          </label>
        </fieldset>
        <p id="logging-sim-input-help">Settings lock after the threshold is applied. Reset the sandbox to try another event.</p>
        {draftError && <p role="alert" className="logging-error">{draftError}</p>}
      </div>

      <fieldset className="logging-controls" aria-label="Walkthrough controls" disabled={Boolean(draftError)}>
        <SimulationControls steps={STEPS} playback={playback} />
      </fieldset>
      <p>Each step performs an operation or reads a snapshot. Playback shows walkthrough progress, not the timing of internal Java execution.</p>

      <ol className="logging-sim-steps" aria-label="Logging walkthrough steps">
        {STEPS.map((step, index) => (
          <li key={step.title} className={index < playback.completed ? 'complete' : index === playback.completed ? 'current' : ''} aria-current={index === playback.completed ? 'step' : undefined}>
            <strong>{step.title}</strong>
            <span>{index < playback.completed ? 'Done' : index === playback.completed ? 'Next' : 'Waiting'}</span>
          </li>
        ))}
      </ol>

      {telemetry && (
        <div className="logging-sim-card">
          <h3>Latest backend snapshot</h3>
          <dl className="logging-sim-stats">
            <div><dt>Threshold</dt><dd>{telemetry.globalLevel}</dd></div>
            <div><dt>Stored events</dt><dd>{telemetry.totalLogs}</dd></div>
            <div><dt>Dispatch mode</dt><dd>{telemetry.asyncEnabled ? 'Asynchronous' : 'Synchronous'}</dd></div>
            <div><dt>Formatter</dt><dd>{telemetry.formatter}</dd></div>
            <div><dt>Queue depth / capacity</dt><dd>{telemetry.currentQueueDepth} / {telemetry.queueCapacity}</dd></div>
            <div><dt>Dropped events</dt><dd>{telemetry.droppedLogs}</dd></div>
          </dl>
          <p>The sandbox uses synchronous dispatch. Its queue metrics describe the available dispatcher, which this walkthrough does not enqueue into.</p>
        </div>
      )}

      {snapshot?.emitted && (
        <div className="logging-sim-card">
          <p role="status"><strong>{snapshot.message ? 'Accepted by the Java logger.' : 'Filtered by the Java logger.'}</strong></p>
          <p>{snapshot.attempt.loggerName} · {snapshot.attempt.level} · {snapshot.attempt.message}</p>
          {snapshot.message && <pre className="logging-sim-output">{snapshot.message.formattedMessage || snapshot.message.message}</pre>}
        </div>
      )}

      <div className="logging-sim-card">
        <h3>Stored event snapshot</h3>
        {playback.completed < 4 ? <p>Inspect stored events at step 4 to see the repository response.</p> : (
          <>
            <p>{snapshot.logs.length} events returned. Showing the latest 50 at most.</p>
            {snapshot.logs.length === 0 && <p>No events were stored in this snapshot.</p>}
            <ul className="logging-sim-output-list">
              {snapshot.logs.slice(-50).map(event => <li key={event.id}><pre className="logging-sim-output">{event.formattedMessage || event.message}</pre></li>)}
            </ul>
          </>
        )}
      </div>

      <div className="logging-sim-card">
        <h3>Appender snapshots</h3>
        <div className="logging-sim-sinks" role="group" aria-label="Appender snapshots">
          {SINKS.map(sink => <button key={sink} type="button" aria-pressed={selectedSink === sink} aria-controls="logging-sim-sink-records" onClick={() => setSelectedSink(sink)}>{sink}</button>)}
        </div>
        <section id="logging-sim-sink-records" aria-label={`${selectedSink} snapshot`}>
          <h4>{selectedSink}</h4>
          {sinkRecords === undefined ? <p>Complete the corresponding inspection step to read this sink.</p> : (
            <>
              <p>{sinkRecords.length} records returned. Showing the latest 50 at most.</p>
              {sinkRecords.length === 0 && <p>No records were returned by this appender.</p>}
              <ul className="logging-sim-output-list">
                {sinkRecords.slice(-50).map((record, index) => <li key={index}><pre className="logging-sim-output">{record}</pre></li>)}
              </ul>
            </>
          )}
        </section>
      </div>

      <details className="logging-sim-card">
        <summary>How the logger routes an accepted event</summary>
        <p>Logger checks its effective threshold before formatting and saving. Accepted events enter a level-routing Chain of Responsibility, which selects the handler matching the event level and writes to enabled appenders. The live console also supports async dispatch; this sandbox runs synchronously.</p>
      </details>
    </section>
  );
}
