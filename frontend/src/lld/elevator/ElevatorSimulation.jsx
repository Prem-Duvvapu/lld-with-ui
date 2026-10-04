import { useState } from 'react';
import * as api from './api';
import { Select } from '../../components/ui/Input';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import '../../components/SimulationPanel.css';
import './ElevatorSimulation.css';

const STEPS = [
  { title: 'Prepare the elevator sandbox', detail: 'Reset four isolated cars. This guided route travels from floor 1 to floor 3.' },
  { title: 'Request a ride', detail: 'Ask the server to assign a car for F1 → F3. Inspect the returned assignment and door state.' },
  { title: 'Allow boarding', detail: 'Advance one backend tick while the pickup doors are open.' },
  { title: 'Close pickup doors', detail: 'Advance another tick and inspect the car’s departure state.' },
  { title: 'Travel between floors', detail: 'Advance one tick. The server moves the car, not the animation.' },
  { title: 'Arrive at the destination', detail: 'Advance one tick and inspect the stop at floor 3.' },
  { title: 'Allow passengers to leave', detail: 'Advance one tick while destination doors remain open.' },
  { title: 'Finish the first ride', detail: 'Advance one tick and verify the tracked car is idle at floor 3.' },
  { title: 'Take the tracked car offline', detail: 'Put the idle car into maintenance. This changes eligibility for the next request, not an in-progress passenger’s assignment.' },
  { title: 'Request another ride', detail: 'Request F1 → F3 again. Inspect which available car the backend selects while the first car is offline.' },
  { title: 'Restore the first car', detail: 'Return the maintained car to service. The second ride keeps its own assignment.' },
  { title: 'Review the fleet', detail: 'Fetch the final snapshot and activity. The second ride may still be in transit; playback completion does not imply every car is idle.' },
];

function assignedCar(snapshot) {
  const assignment = snapshot.events?.at(-1);
  const carId = assignment?.eventType === 'ELEVATOR_ASSIGNED' ? assignment.data?.assignedElevatorId : null;
  if (carId == null) throw new Error('The request did not return a car assignment. Reset the sandbox before continuing.');
  return carId;
}

export default function ElevatorSimulation() {
  const [source, setSource] = useState(1);
  const [destination, setDestination] = useState(6);
  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    let snapshot = previous?.snapshot;
    let firstCarId = previous?.firstCarId ?? null;
    let secondCarId = previous?.secondCarId ?? null;
    if (index === 0) { snapshot = await api.simReset(); firstCarId = null; secondCarId = null; }
    if (index === 1) { snapshot = await api.simRequest(1, 3); firstCarId = assignedCar(snapshot); }
    if (index >= 2 && index <= 7) snapshot = await api.simStep();
    if (index === 7) {
      const car = snapshot.elevators?.[firstCarId];
      if (car?.currentFloor !== 3 || car.state !== 'IDLE') throw new Error('The tracked car has not finished the F1 → F3 ride. Reset the sandbox to repeat the walkthrough.');
    }
    if (index === 8) snapshot = await api.simMaintenance(firstCarId, true);
    if (index === 9) {
      snapshot = await api.simRequest(1, 3);
      secondCarId = assignedCar(snapshot);
      if (String(secondCarId) === String(firstCarId)) throw new Error('The offline car was assigned again. Reset the sandbox before continuing.');
    }
    if (index === 10) snapshot = await api.simMaintenance(firstCarId, false);
    if (index === 11) snapshot = await api.simGetSnapshots();
    return { snapshot, firstCarId, secondCarId };
  });
  const { snapshot, firstCarId, secondCarId } = playback.result || {};
  const cars = Object.values(snapshot?.elevators || {}).sort((first, second) => first.id - second.id);
  const events = snapshot?.events || [];
  const explore = action => playback.runAction(async previous => ({ ...previous, snapshot: await action() }));

  return (
    <div className="simulation-panel elevator-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <section className="simulation-panel-card" aria-label="Elevator fleet summary">
        <h3>{playback.done ? 'Fleet snapshot · walkthrough complete' : 'Floor, doors, and dispatch'}</h3>
        <p>Guided route: F1 → F3. Each step waits for the server before the scene changes.</p>
        {snapshot ? <>
          <p>{cars.filter(car => car.state !== 'MAINTENANCE').length}/{cars.length} cars in service · {snapshot.pendingRequests?.length || 0} queued calls.</p>
          {firstCarId != null && <p>First assignment: E{firstCarId}{secondCarId != null && <> · Second assignment: E{secondCarId}</>}.</p>}
          <div className="elevator-sim-building" aria-hidden="true">
            <div className="elevator-sim-floor-labels">{Array.from({ length: 10 }, (_, position) => <span key={position}>F{10 - position}</span>)}</div>
            {cars.map(car => <div key={car.id} className="elevator-sim-shaft">
              <div className={`elevator-sim-car ${car.state === 'MAINTENANCE' ? 'offline' : ''}`} style={{ bottom: `${(car.currentFloor - 1) * 10}%` }}>E{car.id}</div>
            </div>)}
          </div>
          <div className="simulation-panel-grid">
            {cars.map(car => <div key={car.id}>
              <h4>{car.name}</h4>
              <p><strong>F{car.currentFloor} · {car.state}</strong></p>
              <p>Direction: {car.direction} · Load: {car.occupancy}/{car.capacity}</p>
              <p>Up stops: {car.upStops?.join(', ') || 'None'} · Down stops: {car.downStops?.join(', ') || 'None'}</p>
            </div>)}
          </div>
        </> : <p>Start to load the isolated fleet. No sandbox action runs on page load.</p>}
      </section>
      {playback.done && <fieldset className="simulation-panel-card" disabled={playback.busy || Boolean(playback.error)}>
        <legend>Explore the sandbox</legend>
        <p>The guide is complete. Try your own calls, advance one tick at a time, or change maintenance. These actions use the same isolated fleet and do not change walkthrough progress.</p>
        <div className="simulation-panel-grid">
          <Select label="Source floor" id="elevator-sim-source" value={source} onChange={event => setSource(Number(event.target.value))}>
            {Array.from({ length: 10 }, (_, position) => <option key={position} value={position + 1}>{position + 1}</option>)}
          </Select>
          <Select label="Destination floor" id="elevator-sim-destination" value={destination} onChange={event => setDestination(Number(event.target.value))}>
            {Array.from({ length: 10 }, (_, position) => <option key={position} value={position + 1}>{position + 1}</option>)}
          </Select>
        </div>
        {source === destination && <p>Choose different source and destination floors.</p>}
        <div className="elevator-sim-actions">
          <button type="button" disabled={source === destination} onClick={() => explore(() => api.simRequest(source, destination))}>Request ride</button>
          <button type="button" onClick={() => explore(() => api.simStep())}>Advance one tick</button>
          {cars.map(car => <button key={car.id} type="button" onClick={() => explore(() => api.simMaintenance(car.id, car.state !== 'MAINTENANCE'))}>{car.state === 'MAINTENANCE' ? 'Restore' : 'Take offline'} E{car.id}</button>)}
        </div>
      </fieldset>}
      <details className="simulation-panel-card" open>
        <summary>Sandbox activity ({events.length})</summary>
        <ol>{events.slice().reverse().map(event => <li key={event.id}><strong>{event.eventType}</strong> · {event.actorName}<p>{event.description}</p></li>)}</ol>
      </details>
    </div>
  );
}
