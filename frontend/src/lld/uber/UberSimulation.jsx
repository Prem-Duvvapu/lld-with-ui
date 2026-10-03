import { simReset, simEstimate, simRequest, simRace, simVerifyOtp, simArrive, simComplete, simGetSnapshot } from './api';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import './UberSimulation.css';

const STEPS = [
  { title: 'Prepare the ride sandbox', detail: 'Seed one rider and three drivers for a guided trip from MG Road to Koramangala.' },
  { title: 'Estimate the fare', detail: 'Ask the server for distance, duration, fare, and the selected pricing strategy.' },
  { title: 'Request and broadcast', detail: 'The server sends the ride request to eligible nearby Uber Go drivers.' },
  { title: 'Race to accept', detail: 'Two drivers try to accept the same ride. The server records the winner and the rejected attempt.' },
  { title: 'Try an incorrect OTP', detail: 'Submit 0000 to demonstrate rejection. The trip should remain accepted and must not start yet.' },
  { title: 'Verify the correct OTP', detail: 'Submit the rider’s OTP from the server response to start the trip.' },
  { title: 'Arrive at the destination', detail: 'Move the ride to payment pending after arrival in Koramangala.' },
  { title: 'Complete and pay', detail: 'Finalize payment and release the assigned driver back to the available pool.' },
  { title: 'Check the final snapshot', detail: 'Refresh the ride, driver availability, payment, and complete activity log.' },
];

export default function UberSimulation() {
  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    if (index === 0) return { snapshot: await simReset(), estimate: null, broadcastTo: [], raceResult: null, otpAttempt: null };
    if (index === 8) return { ...previous, snapshot: await simGetSnapshot() };
    let response;
    if (index === 1) response = await simEstimate(index);
    if (index === 2) response = await simRequest(index);
    if (index === 3) response = await simRace(index);
    if (index === 4) response = await simVerifyOtp('0000', index);
    if (index === 5) {
      const otp = previous.snapshot?.ride?.otp;
      if (!otp) throw new Error('The ride response did not include an OTP. Reset the sandbox to continue.');
      response = await simVerifyOtp(otp, index);
    }
    if (index === 6) response = await simArrive(index);
    if (index === 7) response = await simComplete(index);
    return {
      ...previous,
      snapshot: await simGetSnapshot(),
      estimate: response.estimate || previous.estimate,
      broadcastTo: response.broadcastTo || previous.broadcastTo,
      raceResult: index === 3 ? response : previous.raceResult,
      otpAttempt: index === 4 || index === 5 ? response : previous.otpAttempt,
    };
  });

  const { snapshot, estimate, broadcastTo = [], raceResult, otpAttempt } = playback.result || {};
  const ride = snapshot?.ride;
  const drivers = snapshot?.drivers || [];
  const events = snapshot?.events || [];
  const winner = drivers.find(driver => driver.id === raceResult?.winnerDriverId);
  const loser = drivers.find(driver => driver.id === raceResult?.loserDriverId);
  const carLeft = ride?.status === 'COMPLETED' || ride?.status === 'PAYMENT_PENDING' ? '78%' : ride?.status === 'ONGOING' ? '60%' : ride?.status === 'ACCEPTED' ? '38%' : ride ? '30%' : '6%';
  const status = ride?.status || (snapshot ? 'Sandbox ready' : 'Ready to start');

  return (
    <div className="uber-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <div className="uber-flow-scene" aria-hidden="true">
        <div className="uber-city-skyline"><span>🏢</span><span>🏬</span><span>🏦</span><span>🏪</span><span>🏥</span></div>
        <div className="uber-street-lamps"><span>💡</span><span>💡</span><span>💡</span><span>💡</span></div>
        <div className="uber-road">
          <div className="uber-road-line" />
          <div className="uber-zebra-crossing" style={{ left: '30%' }} />
          <div className="uber-zebra-crossing" style={{ left: '80%' }} />
        </div>
        <div className="uber-suburbs-bottom"><span>🏡</span><span>🌳</span><span>🏠</span><span>🌲</span><span>🏡</span></div>
        <div className="uber-flow-marker pickup" style={{ left: '6%', top: 82 }}>📍 MG Road</div>
        <div className="uber-flow-marker drop" style={{ right: '4%', top: 82 }}>🏁 Koramangala</div>
        <div className="uber-flow-car" style={{ left: carLeft }}>🚘<div className="uber-car-beam" /></div>
        <div className="uber-sim-scene-status">{status}</div>
      </div>

      <section className="uber-sim-summary" aria-label="Ride summary">
        <h3>{playback.done ? 'Final ride summary' : 'Ride and driver status'}</h3>
        <p><strong>Ride status: {status}</strong></p>
        <p>MG Road → Koramangala · Uber Go</p>
        {estimate && <dl>
          <div><dt>Distance</dt><dd>{estimate.distanceKm?.toFixed(1)} km</dd></div>
          <div><dt>Estimated duration</dt><dd>{estimate.estimatedMinutes} minutes</dd></div>
          <div><dt>Pricing strategy</dt><dd>{estimate.pricingStrategy}</dd></div>
          <div><dt>Estimated fare</dt><dd>₹{estimate.fare?.toFixed(2)}</dd></div>
        </dl>}
        {ride && <p>Ride {ride.id} · Fare ₹{ride.fare?.toFixed(2)}{ride.payment ? ` · ${ride.payment.method}: ${ride.payment.status}` : ''}</p>}
        {broadcastTo.length > 0 && <p>Broadcast to: {broadcastTo.join(', ')}</p>}
        {raceResult && <div className="uber-sim-race">
          <p>Accepted: <strong>{winner?.name || raceResult.winnerDriverId}</strong></p>
          <p>Rejected: <strong>{loser?.name || raceResult.loserDriverId}</strong> — {raceResult.outcomes?.[raceResult.loserDriverId]}</p>
        </div>}
        {ride?.otp && <p>Rider OTP: <strong>{ride.otp}</strong></p>}
        {otpAttempt && <p>{otpAttempt.accepted ? 'Correct OTP accepted — trip started.' : 'Incorrect OTP rejected — trip has not started.'}</p>}
        <h4>Drivers</h4>
        <ul>{drivers.map(driver => <li key={driver.id}>{driver.name} · {driver.vehicleType} · <strong>{driver.status}</strong></li>)}</ul>
        {!snapshot && <p>Start the simulation to load the rider and drivers.</p>}
      </section>
      <details className="uber-sim-events" open>
        <summary>Sandbox activity ({events.length})</summary>
        <ol>{events.slice().reverse().map(event => <li key={event.id} className={`uber-sim-event-${event.status}`}><strong>{event.title}</strong><p>{event.description}</p></li>)}</ol>
        {!events.length && <p>Activity appears as you progress through the simulation.</p>}
      </details>
    </div>
  );
}
