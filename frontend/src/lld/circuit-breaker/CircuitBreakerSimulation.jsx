import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { simReset, simCall, simAdvanceClock, simGetSnapshot } from './api';
import '../../components/SimulationPanel.css';
import '../../components/ResilienceSimulation.css';

const STEPS = [
  { title: 'Initialize the sandbox', detail: 'Create a CLOSED payment-gateway breaker: three consecutive failures trip it; cooldown is 5,000 ms.' },
  { title: 'Failing call 1', detail: 'The simulated downstream fails. Inspect the server’s consecutive-failure counter.' },
  { title: 'Failing call 2', detail: 'A second downstream failure brings the breaker closer to its trip threshold.' },
  { title: 'Failing call 3', detail: 'The backend trips the circuit OPEN after the third consecutive failure.' },
  { title: 'Observe a rejected call', detail: 'The backend records CALL_REJECTED without attempting the downstream. This expected event is not a transport error.' },
  { title: 'Advance the sandbox clock', detail: 'Advance exactly 5,000 ms. The breaker remains OPEN until a call starts a HALF_OPEN trial.' },
  { title: 'Fail the recovery trial', detail: 'The call enters HALF_OPEN internally; a failed trial reopens the circuit and starts a new cooldown.' },
  { title: 'Advance the clock again', detail: 'Advance another 5,000 ms to make the next recovery trial eligible.' },
  { title: 'Succeed on the next trial', detail: 'The backend resolves a successful HALF_OPEN trial and closes the circuit.' },
  { title: 'Review recovery', detail: 'Read the final breaker state, attempted calls, rejections, and sandbox telemetry.' },
];

async function executeStep(index) {
  if (index === 0) return simReset();
  if (index === 5 || index === 7) return simAdvanceClock(5000, index + 1);
  if (index === 9) return simGetSnapshot();
  const snapshot = await simCall(index === 4 || index === 8, index + 1);
  const expected = index === 4 ? 'CALL_REJECTED' : index === 8 ? 'CALL_SUCCEEDED' : 'CALL_FAILED';
  if (snapshot.events.at(-1)?.eventType !== expected) throw new Error(`Expected ${expected} from the sandbox; the returned event did not match.`);
  return snapshot;
}

export default function CircuitBreakerSimulation() {
  const playback = useSimulationPlayback(STEPS.length, executeStep);
  const { breaker, events = [] } = playback.result || {};
  return (
    <div className="simulation-panel resilience-simulation">
      <p className="simulation-panel-note">An isolated breaker with a manual clock. Playback speed does not advance cooldown time, and no real downstream service is called.</p>
      <SimulationControls steps={STEPS} playback={playback} />
      {!breaker && <p className="simulation-panel-note">Start to create the sandbox. No simulation requests run automatically.</p>}
      {breaker && <>
        <section className="simulation-panel-card" aria-label="Circuit breaker sandbox state">
          <h3>{breaker.name} · {breaker.phase}</h3>
          <div className="resilience-circuit-flow" aria-hidden="true">
            <div>Caller</div><span>→</span>
            <div className={`resilience-circuit-gate ${breaker.phase === 'OPEN' ? 'blocked' : ''}`}>
              <svg viewBox="0 0 100 60"><circle cx="15" cy="30" r="6" /><circle cx="85" cy="30" r="6" /><path d={breaker.phase === 'OPEN' ? 'M21 30 L72 8 M79 30 L90 30' : 'M21 30 H79'} /></svg>
              <strong>{breaker.phase}</strong>
            </div><span>→</span><div>Simulated downstream</div>
          </div>
          <dl>
            <div><dt>Consecutive failures</dt><dd>{breaker.consecutiveFailures}</dd></div>
            <div><dt>Attempted calls</dt><dd>{breaker.totalCalls}</dd></div>
            <div><dt>Rejected calls</dt><dd>{breaker.totalRejections}</dd></div>
            <div><dt>Cooldown remaining</dt><dd>{breaker.remainingCooldownMillis} ms</dd></div>
          </dl>
          <p>{breaker.phase === 'OPEN' ? breaker.remainingCooldownMillis > 0 ? 'Calls are blocked until the manual clock reaches the cooldown boundary.' : 'Cooldown has elapsed. The next call starts a trial; advancing the clock alone does not change the phase.' : 'The circuit is closed; the backend allows calls through.'}</p>
          <p>HALF_OPEN is resolved inside a single backend call. The displayed snapshot shows the phase after that trial, not a fabricated intermediate frame.</p>
        </section>
        <details className="simulation-panel-card">
          <summary>Sandbox event log · {events.length} events</summary>
          <ol>{events.map(event => <li key={event.id}><strong>{event.eventType}</strong> · {event.title}: {event.description}</li>)}</ol>
        </details>
      </>}
    </div>
  );
}
