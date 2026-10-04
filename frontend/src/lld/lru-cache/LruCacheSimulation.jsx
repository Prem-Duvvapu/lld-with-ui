import { useState } from 'react';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { simCacheClear, simSetCapacity, simSetPolicy, simCachePut, simCacheGet, simCacheRemove, simGetSnapshot, simBatchSimulate } from './api';
import '../../components/SimulationPanel.css';
import '../../components/ResilienceSimulation.css';

const ENTRIES = [
  ['user_session_101', 'JWT_Token_Admin'],
  ['db_product_99', 'Core_i9_Laptop'],
  ['cdn_banner_jpg', 'Header_Hero_Img'],
  ['api_rate_limit', 'ReqCount_42'],
  ['shopping_cart_5', 'Items_3_Total_499'],
];
const STEPS = [
  { title: 'Initialize an empty LRU sandbox', detail: 'Clear sandbox entries, restore capacity 5 and LRU policy. Backend counters and earlier log entries are retained.' },
  ...ENTRIES.map(([key]) => ({ title: `Cache ${key}`, detail: 'Insert this entry and inspect the server-provided ordering. The frontend does not choose an eviction victim.' })),
  { title: 'Read the session', detail: 'A real cache hit moves user_session_101 to the most-recently-used position.' },
  { title: 'Insert a new order', detail: 'Inserting a sixth key makes the backend evict the least-recently-used entry.' },
  { title: 'Check the evicted product', detail: 'Read db_product_99 to observe the actual miss. No database fallback is implemented or called.' },
  { title: 'Review the memory rack', detail: 'Read the final cache snapshot and log. Manual sandbox experiments are now available.' },
];

function readResult(response, key) {
  return { snapshot: response.snapshot, message: response.found ? `Cache hit for ${key}: ${response.value}` : `Cache miss for ${key}. No database fallback is performed.` };
}

async function executeStep(index, previous) {
  if (index === 0) {
    await simCacheClear();
    await simSetCapacity(5);
    return { snapshot: await simSetPolicy('LRU'), message: 'Empty sandbox · capacity 5 · LRU policy. Counters are cumulative.' };
  }
  if (index <= ENTRIES.length) {
    const [key, value] = ENTRIES[index - 1];
    return { snapshot: await simCachePut(key, value), message: `Cached ${key}.` };
  }
  if (index === 6 || index === 8) {
    const key = index === 6 ? 'user_session_101' : 'db_product_99';
    return readResult(await simCacheGet(key), key);
  }
  if (index === 7) return { snapshot: await simCachePut('new_order_808', 'Order_Status_Placed'), message: 'New order inserted; inspect the backend eviction log.' };
  return { snapshot: await simGetSnapshot(), message: previous.message };
}

export default function LruCacheSimulation() {
  const playback = useSimulationPlayback(STEPS.length, executeStep);
  const { snapshot, message } = playback.result || {};
  const [putKey, setPutKey] = useState('');
  const [putValue, setPutValue] = useState('');
  const [getKey, setGetKey] = useState('');
  const [capacity, setCapacity] = useState('5');
  const [policy, setPolicy] = useState('LRU');
  const nodes = snapshot?.nodes || [];
  const submit = (event, action) => { event.preventDefault(); void playback.runAction(action); };
  return (
    <div className="simulation-panel resilience-simulation">
      <p className="simulation-panel-note">A real, isolated in-memory cache. The guide restores LRU with five slots; complete it to unlock policy, capacity, and key experiments.</p>
      <SimulationControls steps={STEPS} playback={playback} />
      {!snapshot && <p className="simulation-panel-note">Start to initialize the sandbox. The sandbox is not polled, and no workload runs automatically.</p>}
      {snapshot && <>
        <section className="simulation-panel-card" aria-label="Cache sandbox state">
          <h3>Memory rack · {snapshot.policy}</h3>
          <p role="status">{message}</p>
          <dl>
            <div><dt>Occupied slots</dt><dd>{snapshot.size} / {snapshot.capacity}</dd></div>
            <div><dt>Cache hits / misses</dt><dd>{snapshot.stats.hits} / {snapshot.stats.misses}</dd></div>
            <div><dt>Evictions</dt><dd>{snapshot.stats.evictions}</dd></div>
            <div><dt>Hit rate</dt><dd>{snapshot.stats.hitRate}%</dd></div>
          </dl>
          <p>Counters and the last 50 backend log entries persist across sandbox resets. The rack follows the server's returned order.</p>
          {nodes.length === 0 ? <p className="simulation-panel-note">No cached entries. All {snapshot.capacity} slots are available.</p> : <ol className="resilience-cache-rack" aria-label="Cached entries in backend order">
            {nodes.map((node, index) => <li key={node.key}>
              <span className="resilience-cache-rank">{snapshot.policy === 'LRU' && index === 0 ? 'HEAD · Most recently used' : snapshot.policy === 'LRU' && index === nodes.length - 1 ? 'TAIL · Least recently used' : `Server position ${index + 1}`}</span>
              <strong>{node.key}</strong><span>{node.value === '' ? '(empty value)' : node.value}</span>
              <span>Access count: {node.accessCount}</span>
              {playback.done && <button type="button" disabled={playback.busy || Boolean(playback.error)} onClick={() => playback.runAction(async () => {
                const response = await simCacheRemove(node.key);
                return { snapshot: response.snapshot, message: response.removed ? `Removed ${node.key}.` : `${node.key} was not present.` };
              })}>Remove {node.key}</button>}
            </li>)}
          </ol>}
          <p>{snapshot.policy === 'LRU' ? 'With LRU, reads refresh recency; the least-recently-used entry is evicted when capacity is exceeded.' : `${snapshot.policy} ordering and eviction are computed by the backend, not simulated locally.`}</p>
        </section>
        <fieldset className="resilience-experiments" disabled={!playback.done || playback.busy || Boolean(playback.error)}>
          <legend>Sandbox experiments</legend>
          {!playback.done && <p>Complete the guide to unlock these controls without changing its expected workload.</p>}
          <div className="resilience-form-grid">
            <form onSubmit={event => submit(event, async () => ({ snapshot: await simCachePut(putKey.trim(), putValue), message: `Cached ${putKey.trim()}.` }))}>
              <label>Put key<input required pattern={'.*\\S.*'} value={putKey} onChange={event => setPutKey(event.target.value)} /></label>
              <label>Put value<input value={putValue} onChange={event => setPutValue(event.target.value)} /></label>
              <button type="submit" disabled={!putKey.trim()}>Put entry</button>
            </form>
            <form onSubmit={event => submit(event, async () => readResult(await simCacheGet(getKey.trim()), getKey.trim()))}>
              <label>Get key<input required pattern={'.*\\S.*'} value={getKey} onChange={event => setGetKey(event.target.value)} /></label>
              <button type="submit" disabled={!getKey.trim()}>Get entry</button>
            </form>
            <form onSubmit={event => submit(event, async () => ({ snapshot: await simSetCapacity(Number(capacity)), message: 'Capacity updated by the backend.' }))}>
              <label>New capacity<input type="number" min="1" max="10" required value={capacity} onChange={event => setCapacity(event.target.value)} /></label>
              <button type="submit">Apply capacity</button>
            </form>
            <form onSubmit={event => submit(event, async () => ({ snapshot: await simSetPolicy(policy), message: `Policy changed to ${policy}.` }))}>
              <label>New eviction policy<select value={policy} onChange={event => setPolicy(event.target.value)}><option value="LRU">LRU</option><option value="LFU">LFU</option><option value="FIFO">FIFO</option></select></label>
              <button type="submit">Apply policy</button>
            </form>
          </div>
          <button type="button" onClick={() => playback.runAction(async () => ({ snapshot: await simBatchSimulate(), message: 'Sample entries loaded using the current backend policy and capacity.' }))}>Load sample entries</button>
          <button type="button" onClick={() => playback.runAction(async () => ({ snapshot: await simCacheClear(), message: 'Sandbox entries cleared. Policy, capacity, and counters are retained.' }))}>Clear sandbox entries</button>
        </fieldset>
        <details className="simulation-panel-card">
          <summary>Backend cache log · {snapshot.logs.length} entries · newest first</summary>
          <ol>{snapshot.logs.map(entry => <li key={entry.id}><strong>{entry.op} · {entry.status}</strong> · {entry.key}: {entry.detail}</li>)}</ol>
        </details>
      </>}
    </div>
  );
}
