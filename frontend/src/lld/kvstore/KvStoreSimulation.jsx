import { useEffect, useRef, useState } from 'react';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import * as api from './api';
import { formatKvExpiry as utc } from './formatKvExpiry';
import './KvStoreSimulation.css';

const STEPS = [
  { title: 'Prepare an empty sandbox', detail: 'Clear demo mappings, commands and events. The live Store and CAS tabs use separate state.' },
  { title: 'Write the example value', detail: 'SET demo-key to your chosen value. Java assigns the version and records the command.' },
  { title: 'Read the value back', detail: 'GET demo-key and inspect the confirmed server value. This step performs a real read.' },
  { title: 'Rebuild from the in-memory log', detail: 'Clear sandbox mappings and replay retained commands. Neither the map nor this log survives a process restart.' },
  { title: 'Observe real TTL expiry', detail: 'Java sets a separate key with a one-second TTL, waits on the server and checks readability. An expired mapping may remain physically stored.' },
  { title: 'Race the selected CAS workers', detail: 'Real Java threads attempt the same expected version. Inspect their returned outcomes; playback does not schedule JVM threads.' },
  { title: 'Read the final snapshot', detail: 'Refresh mappings, commands, events and the recorded race summary from Java.' },
];

function checkedSnapshot(snapshot) {
  const count = value => Number.isSafeInteger(value) && value >= 0;
  if (!snapshot || typeof snapshot.entries !== 'object' || snapshot.entries === null || Array.isArray(snapshot.entries)
      || !Array.isArray(snapshot.events) || !Array.isArray(snapshot.wal) || !Number.isSafeInteger(snapshot.walSize)) {
    throw new Error('The server did not return a usable sandbox snapshot. Reset before continuing.');
  }
  const validEntries = Object.values(snapshot.entries).every(entry => entry && typeof entry.value === 'string'
    && count(entry.version) && entry.version > 0 && (entry.expiresAtEpoch == null || Number.isInteger(entry.expiresAtEpoch)));
  const validEvents = snapshot.events.every(event => event && count(event.id)
    && ['timestamp', 'actor', 'type', 'description'].every(field => typeof event[field] === 'string'));
  const validCounts = ['storedEntryCount', 'readableEntryCount', 'eventCount', 'snapshotAtEpoch'].every(field => snapshot[field] == null || count(snapshot[field]));
  const validRace = !snapshot.raceResult || ['workers', 'won', 'lost', 'finalVersion'].every(field => count(snapshot.raceResult[field]));
  if (!validEntries || !validEvents || !validCounts || !validRace || !snapshot.wal.every(command => typeof command === 'string')
      || (snapshot.expiredKeys != null && (!Array.isArray(snapshot.expiredKeys) || !snapshot.expiredKeys.every(key => typeof key === 'string')))) {
    throw new Error('The sandbox response contains records this view cannot display reliably. Reset before continuing.');
  }
  return snapshot;
}

export default function KvStoreSimulation({ configuration, onConfigurationChange }) {
  const lifecycle = useRef(null);
  const [pagination, setPagination] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);
  const playback = useSimulationPlayback(STEPS.length, async index => {
    const options = { signal: lifecycle.current.signal };
    let snapshot;
    if (index === 0) snapshot = await api.simReset(options);
    if (index === 1) snapshot = await api.simSet('demo-key', configuration.value, undefined, options);
    if (index === 2) snapshot = await api.simGet('demo-key', options);
    if (index === 3) snapshot = await api.simReplay(options);
    if (index === 4) snapshot = await api.simTtlDemo(options);
    if (index === 5) {
      snapshot = await api.simCasRace(configuration.workers, options);
      if (!snapshot?.raceResult) throw new Error('The race response did not include its outcome. Reset before continuing.');
    }
    if (index === 6) snapshot = await api.simGetSnapshot(options);
    return checkedSnapshot(snapshot);
  });
  const snapshot = playback.result;
  const entries = Object.entries(snapshot?.entries || {}).sort(([a], [b]) => a.localeCompare(b));
  const page = pagination?.snapshot === snapshot ? pagination.page : 0;
  const pages = Math.max(1, Math.ceil(entries.length / 25));
  const events = snapshot?.events || [];
  const wal = snapshot?.wal || [];
  const race = snapshot?.raceResult;
  const frozen = playback.busy || playback.playing || playback.completed > 1;

  return <section className="kv-simulation" aria-labelledby="kv-simulation-title">
    <div className="kv-sim-card">
      <h2 id="kv-simulation-title">Explore writes, expiry and a real CAS race</h2>
      <p>Start and Reset clear this demo’s sandbox. Live Store/CAS values are separate. Leaving this tab stops upcoming steps and discards walkthrough progress; it does not roll back server work. Your settings are retained.</p>
      <fieldset className="kv-sim-settings" disabled={frozen}>
        <legend>Experiment settings</legend>
        <label htmlFor="kv-sim-value">Example value<input id="kv-sim-value" value={configuration.value} onChange={event => onConfigurationChange({ ...configuration, value: event.target.value })} aria-describedby="kv-sim-settings-help" /></label>
        <label htmlFor="kv-sim-workers">CAS workers<select id="kv-sim-workers" value={configuration.workers} onChange={event => onConfigurationChange({ ...configuration, workers: Number(event.target.value) })} aria-describedby="kv-sim-settings-help">
          {[1, 2, 4, 8, 16, 32].map(count => <option key={count} value={count}>{count} {count === 1 ? 'worker' : 'workers'}</option>)}
        </select></label>
      </fieldset>
      <p id="kv-sim-settings-help">An empty string is valid. Settings lock after the sample write; Reset unlocks them for another run.</p>
    </div>
    <SimulationControls steps={STEPS} playback={playback} />
    <ol className="kv-sim-steps" aria-label="KV walkthrough steps">{STEPS.map((step, index) => <li key={step.title} aria-current={index === playback.completed ? 'step' : undefined}>
      <strong>{step.title}</strong><span>{index < playback.completed ? 'Complete' : index === playback.completed ? 'Next' : 'Waiting'}</span>
    </li>)}</ol>

    {!snapshot ? <p className="kv-sim-card">Start the simulation to receive the first server snapshot. No experiment runs automatically.</p> : <>
      <section className="kv-sim-card" aria-labelledby="kv-sim-snapshot-title">
        <h3 id="kv-sim-snapshot-title">Last confirmed sandbox snapshot</h3>
        <p>{snapshot.snapshotAtEpoch != null ? `Captured by the server at ${utc(snapshot.snapshotAtEpoch)}.` : 'Capture time was not reported.'} Counts and readability describe that snapshot; a value may expire afterward.</p>
        {playback.error && <p>The last confirmed snapshot is retained below. It may predate the failed action.</p>}
        <dl className="kv-sim-stats">
          <div><dt>Readable entries</dt><dd>{snapshot.readableEntryCount ?? 'Not reported'}</dd></div>
          <div><dt>Retained mappings</dt><dd>{snapshot.storedEntryCount ?? 'Not reported'}</dd></div>
          <div><dt>In-memory commands</dt><dd>{snapshot.walSize}</dd></div>
          <div><dt>Events returned</dt><dd>{snapshot.eventCount ?? events.length}</dd></div>
        </dl>
        <p>Expired mappings remain in this toy store. Java’s GET and CAS expiry checks determine whether a value is readable.</p>
      </section>
      {race && <section className="kv-sim-card" aria-label="Recorded CAS race result">
        <h3>Last completed CAS race</h3><p>Actual backend outcomes, not simulated browser winners. Event order records observations; it does not reconstruct the JVM’s full schedule.</p>
        <dl className="kv-sim-stats">
          <div><dt>Workers</dt><dd>{race.workers}</dd></div><div><dt>Won</dt><dd>{race.won}</dd></div><div><dt>Lost</dt><dd>{race.lost}</dd></div>
          <div><dt>Expected version</dt><dd>{race.expectedVersion ?? 'Not reported'}</dd></div><div><dt>Final version</dt><dd>{race.finalVersion}</dd></div>
        </dl>
      </section>}
      <section className="kv-sim-card" aria-label="Retained sandbox mappings">
        <h3>Retained mappings</h3>
        {entries.length === 0 ? <p>No mappings were retained in this snapshot.</p> : <>
          <p>{entries.length} mappings returned. Page {page + 1} of {pages}; up to 25 rows per page.</p>
          <div className="kv-sim-table" role="region" tabIndex={0} aria-label="Sandbox mappings, scrollable table">
            <table><caption>Values and readability at the server’s capture time</caption><thead><tr><th scope="col">Key</th><th scope="col">Value</th><th scope="col">Version</th><th scope="col">Server expiry (UTC)</th><th scope="col">Readability</th></tr></thead>
              <tbody>{entries.slice(page * 25, (page + 1) * 25).map(([key, entry]) => <tr key={key}>
                <th scope="row"><code>{JSON.stringify(key)}</code></th><td><code>{JSON.stringify(entry.value)}</code></td><td>{entry.version}</td><td>{utc(entry.expiresAtEpoch)}</td>
                <td>{Array.isArray(snapshot.expiredKeys) ? snapshot.expiredKeys.includes(key) ? 'Expired; retained' : 'Readable at capture' : 'Not reported'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {pages > 1 && <div className="kv-sim-pagination" role="group" aria-label="Mapping pages"><button type="button" disabled={page === 0} onClick={() => setPagination({ snapshot, page: page - 1 })}>Previous mappings</button><button type="button" disabled={page + 1 === pages} onClick={() => setPagination({ snapshot, page: page + 1 })}>Next mappings</button></div>}
        </>}
      </section>
      <section className="kv-sim-card" aria-label="In-memory command log">
        <h3>In-memory command log</h3><p>{snapshot.walSize} commands recorded. Showing the latest {Math.min(50, wal.length)}, newest first. Commands are retained on the server for replay; this display limit does not compact the log.</p>
        {wal.length === 0 ? <p>No commands in this snapshot.</p> : <ol className="kv-sim-log">{wal.slice(-50).map((command, index) => <li key={index}><code>{command}</code></li>).reverse()}</ol>}
      </section>
      <section className="kv-sim-card" aria-label="Sandbox event log">
        <h3>Sandbox events</h3><p>{snapshot.eventCount ?? events.length} events returned. Showing the latest {Math.min(50, events.length)}, newest first. Times are server-local observations.</p>
        <ol className="kv-sim-log">{events.slice(-50).map(event => <li key={event.id}>
          <span>{event.timestamp} · {event.actor} · {event.type}</span><p>{event.description}</p>
        </li>).reverse()}</ol>
      </section>
    </>}
  </section>;
}
