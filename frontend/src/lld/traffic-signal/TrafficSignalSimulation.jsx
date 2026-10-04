import * as api from './api';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import '../../components/SimulationPanel.css';
import './TrafficSignalSimulation.css';

const STEPS = [
  { title: 'Prepare the intersection', detail: 'Reset the four-way sandbox. North starts green; every other approach starts red.' },
  { title: 'Advance the green countdown', detail: 'Explicitly advance 8 simulated seconds. North changes to yellow.' },
  { title: 'Rotate right-of-way', detail: 'Advance the 3-second clearance. North changes to red and South gets green.' },
  { title: 'Inspect a mid-phase countdown', detail: 'Advance 4 seconds while South remains green. Remaining seconds come from the server.' },
  { title: 'Give West emergency priority', detail: 'Engage the override for light 3. West gets green, every other light gets red, and ordinary cycling stops.' },
  { title: 'Inspect the frozen clock', detail: 'Advance 5 simulated seconds. During an override, the server intentionally keeps West green without counting down.' },
  { title: 'Resume normal operation', detail: 'Clear the emergency override. West enters yellow before normal cycling resumes.' },
  { title: 'Return to rotation', detail: 'Advance the 3-second clearance. West changes to red and North gets green again.' },
  { title: 'Review the final intersection', detail: 'Fetch the final signal states, command activity, and observed phase changes.' },
];

const SIGNAL_POSITIONS = { NORTH: [210, 70], SOUTH: [370, 270], WEST: [200, 255], EAST: [385, 90] };

export default function TrafficSignalSimulation() {
  const playback = useSimulationPlayback(STEPS.length, async index => {
    if (index === 0) return api.simReset();
    if (index === 1) return api.simTick(8, 2);
    if (index === 2) return api.simTick(3, 3);
    if (index === 3) return api.simTick(4, 4);
    if (index === 4) return api.simEmergency(3, 5);
    if (index === 5) return api.simTick(5, 6);
    if (index === 6) return api.simResume(7);
    if (index === 7) return api.simTick(3, 8);
    return api.simGetSnapshot();
  });
  const { intersection, events = [], phaseChangeLog = [] } = playback.result || {};
  const lights = intersection?.lights || [];
  const green = position => lights.find(light => light.position?.toUpperCase() === position)?.currentState === 'GREEN';

  return (
    <div className="simulation-panel traffic-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <p className="traffic-sim-clock-note">Only explicit clock steps advance simulated seconds. Playback speed changes reading time, not signal timers.</p>
      {intersection && <div className="traffic-sim-scene" aria-hidden="true">
        <svg viewBox="0 0 600 360">
          <defs><g id="traffic-sim-vehicle">
            <rect x="-9" y="-16" width="18" height="32" rx="5" fill="currentColor" />
            <rect x="-6" y="-8" width="12" height="7" rx="2" fill="#bfdbfe" />
            <rect x="-6" y="7" width="12" height="5" rx="2" fill="#0f172a" />
            <path d="M-7 -12 H-3 M3 -12 H7" stroke="#fef08a" strokeWidth="2" />
          </g></defs>
          <rect width="600" height="360" fill="#13251d" />
          <path d="M240 0 H360 V360 H240 Z M0 120 H600 V240 H0 Z" fill="#334155" />
          <path d="M300 0 V105 M300 255 V360 M0 180 H225 M375 180 H600" stroke="#facc15" strokeWidth="3" strokeDasharray="12 10" />
          {lights.map(light => {
            const [horizontal, vertical] = SIGNAL_POSITIONS[light.position?.toUpperCase()] || [0, 0];
            return <g key={light.id} transform={`translate(${horizontal},${vertical})`}>
              <rect x="-10" y="-16" width="74" height="34" rx="6" fill="#0f172a" stroke="#64748b" />
              {['RED', 'YELLOW', 'GREEN'].map((state, position) => <circle key={state} cx={position * 22 + 4} cy="1" r="8" fill={light.currentState === state ? ['#ef4444', '#facc15', '#22c55e'][position] : '#475569'} />)}
              <text x="27" y="-25" fill="#fff" fontSize="13" textAnchor="middle">{light.position}</text>
            </g>;
          })}
          <g className="traffic-sim-car" style={{ color: '#ef4444', transform: `translate(268px, ${green('NORTH') ? 290 : 70}px)` }}><use href="#traffic-sim-vehicle" transform="rotate(180)" /></g>
          <g className="traffic-sim-car" style={{ color: '#60a5fa', transform: `translate(318px, ${green('SOUTH') ? 40 : 300}px)` }}><use href="#traffic-sim-vehicle" /></g>
          <g className="traffic-sim-car" style={{ color: '#facc15', transform: `translate(${green('WEST') ? 520 : 65}px, 220px)` }}><use href="#traffic-sim-vehicle" transform="rotate(90)" /></g>
          <g className="traffic-sim-car" style={{ color: '#e2e8f0', transform: `translate(${green('EAST') ? 60 : 520}px, 160px)` }}><use href="#traffic-sim-vehicle" transform="rotate(-90)" /></g>
        </svg>
      </div>}
      <section className="simulation-panel-card" aria-label="Intersection status">
        <h3>{playback.done ? 'Final intersection snapshot' : 'Signals and emergency priority'}</h3>
        {intersection ? <>
          <p><strong>Emergency override: {intersection.emergencyActive ? 'Active' : 'Off'}</strong></p>
          <div className="simulation-panel-grid">{lights.map(light => <div key={light.id}>
            <h4>{light.position}</h4><p><strong>{light.currentState}</strong> · {light.timer}s remaining</p>
          </div>)}</div>
        </> : <p>Start to load the sandbox’s signal states.</p>}
      </section>
      <details className="simulation-panel-card" open>
        <summary>Command activity ({events.length})</summary>
        <ol>{events.slice().reverse().map(event => <li key={event.id}><strong>{event.eventType}</strong> · Step {event.stepNumber}<p>{event.description}</p></li>)}</ol>
      </details>
      <details className="simulation-panel-card">
        <summary>Observed phase changes ({phaseChangeLog.length})</summary>
        <ol>{phaseChangeLog.slice().reverse().map((change, position) => <li key={position}>{change.position}: {change.previousPhase} → {change.newPhase}</li>)}</ol>
      </details>
    </div>
  );
}
