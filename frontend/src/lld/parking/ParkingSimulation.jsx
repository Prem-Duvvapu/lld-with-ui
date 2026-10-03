import { useState } from 'react';
import { simReset, simEntry, simScan, simPay, simState } from './api';
import { Input, Select } from '../../components/ui/Input';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import './ParkingSimulation.css';

const STEPS = [
  { title: 'Prepare the parking lot', detail: 'Reset the sandbox, then choose your vehicle and strategies before issuing a ticket.' },
  { title: 'Enter and receive a ticket', detail: 'The server assigns an available spot using your selected strategy.' },
  { title: 'Park in the assigned spot', detail: 'Follow the ticket’s spot ID. The highlighted space is the one reserved by the server.' },
  { title: 'Leave the vehicle', detail: 'The ticket stays active while you are away. Playback pacing does not change the server’s parking duration.' },
  { title: 'Return to the exit gate', detail: 'Bring the same ticket to the exit. The space remains occupied until payment succeeds.' },
  { title: 'Preview the fee', detail: 'The server calculates a read-only price preview with your pricing strategy.' },
  { title: 'Pay and release the spot', detail: 'Payment finalizes the ticket and releases its assigned space on the server.' },
  { title: 'Drive through the exit', detail: 'The gate opens after payment. The receipt records the amount actually charged.' },
  { title: 'Check the final state', detail: 'Refresh the sandbox to confirm the space is available and there are no active tickets.' },
];

export default function ParkingSimulation() {
  const [vehicleNumber, setVehicleNumber] = useState('KA-01-HH-1234');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [spotStrategy, setSpotStrategy] = useState('NEAREST');
  const [pricingStrategy, setPricingStrategy] = useState('HOURLY');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [activity, setActivity] = useState('Shopping');

  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    if (index === 0) return { snapshot: await simReset(), ticket: null, previewAmount: null, receipt: null };
    if (index === 1) {
      const snapshot = await simEntry(vehicleNumber, vehicleType, spotStrategy);
      const ticket = snapshot.activeTickets?.[0];
      if (!ticket?.ticketNumber) throw new Error('The entry response did not include a ticket. Reset the sandbox to continue.');
      return { ...previous, snapshot, ticket };
    }
    if (index === 5) {
      const snapshot = await simScan(previous.ticket.ticketNumber, pricingStrategy);
      return { ...previous, snapshot, previewAmount: snapshot.previewAmount };
    }
    if (index === 6) {
      const snapshot = await simPay(previous.ticket.ticketNumber, pricingStrategy, paymentMethod);
      const receipt = snapshot.events?.slice().reverse().find(event => event.eventType === 'VEHICLE_EXITED' && event.data?.ticketNumber === previous.ticket.ticketNumber)?.data;
      if (!receipt) throw new Error('The payment response did not include a receipt. Reset the sandbox to continue.');
      return { ...previous, snapshot, receipt };
    }
    if (index === 8) return { ...previous, snapshot: await simState() };
    return previous;
  });

  const { snapshot, ticket, previewAmount, receipt } = playback.result || {};
  const spots = [...(snapshot?.spots || [])].sort((first, second) => first.id.localeCompare(second.id));
  const floors = [...new Set(spots.map(spot => spot.floorNumber))].sort((first, second) => first - second);
  const away = playback.completed === 4;
  const parked = playback.completed >= 3 && playback.completed < 5;
  const carPosition = playback.completed >= 8 ? 'calc(100% + 40px)' : playback.completed >= 5 ? 'calc(100% - 80px)' : playback.completed >= 1 ? '40px' : '-50px';
  const status = receipt ? 'Paid — spot released' : previewAmount != null ? 'Fee preview ready' : ticket ? 'Active ticket — spot reserved' : snapshot ? 'Parking lot ready' : 'Ready to start';
  const amount = value => typeof value === 'number' ? `₹${value.toFixed(2)}` : '—';

  return (
    <div className="parking-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <details className="parking-sim-settings-shell" open={playback.completed < 2}>
        <summary>Vehicle and parking settings{ticket ? ` · ${ticket.vehicleType}, ${spotStrategy}, ${pricingStrategy}, ${paymentMethod}` : ''}</summary>
        <fieldset className="parking-sim-settings" disabled={playback.busy || playback.playing || playback.completed > 1}>
        <legend>Vehicle and parking settings</legend>
        <p>Choose settings before the ticket is issued. Reset the sandbox to try a different setup.</p>
        <div className="parking-sim-settings-grid">
          <Input label="Vehicle number" id="parking-sim-vehicle-number" value={vehicleNumber} onChange={event => setVehicleNumber(event.target.value)} />
          <Select label="Vehicle type" id="parking-sim-vehicle-type" value={vehicleType} onChange={event => setVehicleType(event.target.value)}>
            <option value="CAR">Car</option><option value="BIKE">Bike</option><option value="TRUCK">Truck</option>
          </Select>
          <Select label="Spot assignment" id="parking-sim-assignment" value={spotStrategy} onChange={event => setSpotStrategy(event.target.value)}>
            <option value="NEAREST">Nearest spot</option><option value="FARTHEST">Farthest spot</option>
          </Select>
          <Select label="Pricing strategy" id="parking-sim-pricing" value={pricingStrategy} onChange={event => setPricingStrategy(event.target.value)}>
            <option value="HOURLY">Hourly</option><option value="FLAT">Flat rate</option><option value="DYNAMIC">Dynamic surge</option>
          </Select>
          <Select label="Payment method" id="parking-sim-payment" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>
            <option value="UPI">UPI</option><option value="CARD">Card</option><option value="CASH">Cash</option>
          </Select>
          <Select label="While away" id="parking-sim-activity" value={activity} onChange={event => setActivity(event.target.value)}>
            <option>Shopping</option><option>Movie</option><option>Eating</option>
          </Select>
        </div>
        </fieldset>
      </details>

      <p className="parking-sim-status">{status}{away ? ` · ${activity}` : ''}</p>
      <div className="parking-sim-scene" aria-label="Parking sandbox layout">
        <div className="parking-sim-floors">
          {!spots.length && <p>Start the simulation to load the parking spaces.</p>}
          {floors.map(floor => <div key={floor}>
            <h4>Floor {floor}</h4>
            <div className="parking-sim-spots">
              {spots.filter(spot => spot.floorNumber === floor).map(spot => <div key={spot.id} className={`parking-sim-spot${spot.occupied ? ' occupied' : ''}${spot.id === ticket?.spotId ? ' assigned' : ''}`}>
                <strong>{spot.id}</strong><span>{spot.vehicleType}</span><span>{spot.occupied ? 'Occupied' : 'Available'}</span>
                {spot.id === ticket?.spotId && <span>{spot.occupied ? 'Your vehicle' : 'Released'}</span>}
              </div>)}
            </div>
          </div>)}
        </div>
        <div className="parking-sim-road" aria-hidden="true">
          <div className="parking-sim-gate entry">Entry<span className={ticket ? 'open' : ''} /></div>
          <div className="parking-sim-gate exit">Exit<span className={receipt ? 'open' : ''} /></div>
          {!parked && <div className="parking-sim-car" style={{ left: carPosition }}>{vehicleType === 'BIKE' ? '🏍️' : vehicleType === 'TRUCK' ? '🚚' : '🚗'}</div>}
          {away && <div className="parking-sim-person">🚶 {activity}</div>}
        </div>
      </div>

      <div className="parking-sim-summary">
        <h3>{playback.done ? 'Final parking summary' : 'Ticket and payment'}</h3>
        <dl>
          <div><dt>Ticket</dt><dd>{ticket?.ticketNumber || '—'}</dd></div>
          <div><dt>Assigned spot</dt><dd>{ticket?.spotId || '—'}</dd></div>
          <div><dt>Vehicle</dt><dd>{ticket ? `${ticket.vehicleNumber} (${ticket.vehicleType})` : '—'}</dd></div>
          <div><dt>Fee preview</dt><dd>{amount(previewAmount)}</dd></div>
          <div><dt>Paid amount</dt><dd>{amount(receipt?.amount)}{receipt ? ` via ${receipt.paymentMethod}` : ''}</dd></div>
          <div><dt>Active tickets</dt><dd>{snapshot?.activeTickets?.length ?? '—'}</dd></div>
          <div><dt>Sandbox gates</dt><dd>{snapshot ? `${snapshot.entryGateId} / ${snapshot.exitGateId}` : '—'}</dd></div>
        </dl>
      </div>
      <details className="parking-sim-events" open>
        <summary>Sandbox activity ({snapshot?.events?.length || 0})</summary>
        <ol>{snapshot?.events?.slice().reverse().map(event => <li key={event.id}><strong>{event.eventType}</strong> · {event.timestamp}<p>{event.description}</p></li>)}</ol>
        {!snapshot?.events?.length && <p>Activity appears as you progress through the simulation.</p>}
      </details>
    </div>
  );
}
