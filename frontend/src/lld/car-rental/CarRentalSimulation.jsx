import { useState } from 'react';
import * as api from './api';
import { ApiError } from '../../utils/api';
import { Select } from '../../components/ui/Input';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import '../../components/SimulationPanel.css';
import './CarRentalSimulation.css';

const STEPS = [
  { title: 'Prepare the rental sandbox', detail: 'Reset the isolated fleet and ledger. Capture fresh dates for this run.' },
  { title: 'Create the vehicle and customers', detail: 'Seed one SUV and three customers: Ava, Ben, and Cleo. Retain the IDs returned by the server.' },
  { title: 'Reserve for Ava', detail: 'Reserve the SUV for a five-day window. The server calculates the estimate and pricing strategy.' },
  { title: 'Confirm Ava’s reservation', detail: 'Process payment using the selected method and confirm the returned reservation ID.' },
  { title: 'Race for another date window', detail: 'Send Ben and Cleo’s overlapping requests together. Require one reservation and one expected availability conflict; unrelated errors stop playback.' },
  { title: 'Inspect the race outcome', detail: 'Refresh both server ledgers. The winner has a pending reservation, not a paid or confirmed booking.' },
  { title: 'Pick up Ava’s vehicle', detail: 'Activate Ava’s reservation. Inspect the server’s rented vehicle status.' },
  { title: 'Return Ava’s vehicle', detail: 'Return with an odometer reading of 8,500 km. Read the actual charge and availability from the response.' },
  { title: 'Cancel the race winner’s reservation', detail: 'Cancel the pending reservation using the winning response’s ID, releasing its dates.' },
  { title: 'Review the final rental ledger', detail: 'Fetch vehicle status, odometer, and all reservation statuses after return and cancellation.' },
];

function futureDate(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function CarRentalSimulation() {
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    let baseDate = previous?.baseDate;
    let vehicle = previous?.vehicle || null;
    let customers = previous?.customers || [];
    let reservation = previous?.reservation || null;
    let race = previous?.race || null;
    let cancellation = previous?.cancellation || null;
    let activity = previous?.activity || [];
    if (index === 0) {
      await api.simReset();
      baseDate = new Date().toISOString(); vehicle = null; customers = []; reservation = null; race = null; cancellation = null; activity = [];
    }
    if (index === 1) {
      vehicle = await api.simSeedVehicle({ make: 'Ford', model: 'Explorer', year: 2023, licensePlate: 'SIM-001', type: 'SUV', status: 'AVAILABLE', branchId: 'SIM-BR', odometer: 0 });
      customers = [];
      for (const name of ['Ava', 'Ben', 'Cleo']) customers.push(await api.simSeedCustomer({ name }));
    }
    if (index === 2) reservation = await api.simReserve(customers[0].id, vehicle.id, futureDate(baseDate, 10), futureDate(baseDate, 15));
    if (index === 3) reservation = await api.simConfirm(reservation.id, paymentMethod);
    if (index === 4) {
      const outcomes = await Promise.allSettled(customers.slice(1).map(customer => api.simReserve(customer.id, vehicle.id, futureDate(baseDate, 20), futureDate(baseDate, 23))));
      const rejected = outcomes.filter(outcome => outcome.status === 'rejected');
      const unexpected = rejected.find(outcome => !(outcome.reason instanceof ApiError && outcome.reason.status === 409 && outcome.reason.body?.code === 'VehicleNotAvailableException'));
      if (unexpected) throw unexpected.reason;
      const accepted = outcomes.filter(outcome => outcome.status === 'fulfilled');
      if (accepted.length !== 1 || rejected.length !== 1 || accepted[0].value?.status !== 'PENDING' || !accepted[0].value?.id) throw new Error('The race did not return exactly one pending reservation and one availability conflict. Reset the sandbox before continuing.');
      race = {
        winner: customers[outcomes.findIndex(outcome => outcome.status === 'fulfilled') + 1].name,
        loser: customers[outcomes.findIndex(outcome => outcome.status === 'rejected') + 1].name,
        reservation: accepted[0].value,
        rejection: rejected[0].reason.message,
      };
    }
    if (index === 6) reservation = await api.simPickup(reservation.id);
    if (index === 7) reservation = await api.simReturn(reservation.id, 8500);
    if (index === 8) cancellation = await api.simCancel(race.reservation.id);
    const [vehicles, reservations] = await Promise.all([api.simGetVehicles(), api.simGetReservations()]);
    if (vehicle) vehicle = vehicles.find(candidate => candidate.id === vehicle.id) || vehicle;
    if (reservation) reservation = reservations.find(candidate => candidate.id === reservation.id) || reservation;
    activity = [...activity, STEPS[index].title];
    return { baseDate, vehicle, customers, reservation, race, cancellation, vehicles, reservations, activity };
  });
  const { vehicle, customers = [], reservation, race, cancellation, reservations = [], activity = [] } = playback.result || {};

  return (
    <div className="simulation-panel car-rental-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <fieldset className="simulation-panel-card" disabled={playback.busy || playback.playing || playback.completed > 3}>
        <legend>Payment settings</legend>
        <Select label="Payment method" id="rental-sim-payment" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>
          <option value="UPI">UPI</option><option value="CREDIT_CARD">Credit card</option><option value="DEBIT_CARD">Debit card</option><option value="WALLET">Wallet</option>
        </Select>
        <p>Reset to change settings after payment confirmation.</p>
      </fieldset>
      <section className="simulation-panel-card" aria-label="Rental fleet summary">
        <h3>{playback.done ? 'Final rental snapshot' : 'Vehicle and reservation status'}</h3>
        {vehicle ? <>
          <div className={`rental-sim-vehicle ${vehicle.status === 'RENTED' ? 'rented' : ''}`}>
            <svg viewBox="0 0 160 70" aria-hidden="true">
              <path d="M14 48 V28 Q14 22 22 22 H105 L126 36 H144 Q150 36 150 44 V54 H14 Z" fill="currentColor" />
              <path d="M25 27 H58 V37 H25 Z M65 27 H100 L115 37 H65 Z" fill="#bfdbfe" />
              <circle cx="42" cy="54" r="12" fill="#1e293b" /><circle cx="42" cy="54" r="5" fill="#94a3b8" />
              <circle cx="124" cy="54" r="12" fill="#1e293b" /><circle cx="124" cy="54" r="5" fill="#94a3b8" />
              <path d="M145 40 V46" stroke="#facc15" strokeWidth="4" />
            </svg>
            <strong>{vehicle.make} {vehicle.model}</strong><p>{vehicle.id} · {vehicle.status} · {vehicle.odometer} km</p>
          </div>
          {reservation && <dl>
            <div><dt>Ava’s reservation</dt><dd>{reservation.id} · {reservation.status}</dd></div>
            <div><dt>Rental dates</dt><dd>{reservation.startDate} → {reservation.endDate}</dd></div>
            <div><dt>Estimated charge</dt><dd>₹{reservation.estimatedCost?.toFixed(2)}</dd></div>
            <div><dt>Pricing strategy</dt><dd>{reservation.pricingStrategyName}</dd></div>
            {reservation.actualCost != null && <div><dt>Actual charge</dt><dd>₹{reservation.actualCost.toFixed(2)}</dd></div>}
          </dl>}
        </> : <p>Create the sandbox fleet to see the vehicle’s status.</p>}
        {race && <div className="simulation-panel-note"><p><strong>{race.winner} won</strong> · Reservation {race.reservation.id} initially PENDING.</p><p>{race.loser} was rejected: {race.rejection}</p></div>}
        {cancellation && <p>Race reservation {cancellation.id}: {cancellation.status}.</p>}
      </section>
      <section className="simulation-panel-card" aria-label="Reservation ledger">
        <h3>Server reservation ledger ({reservations.length})</h3>
        <div className="simulation-panel-grid">{reservations.map(entry => <div key={entry.id}>
          <h4>{customers.find(customer => customer.id === entry.customerId)?.name || entry.customerId} · {entry.id}</h4>
          <p><strong>{entry.status}</strong> · {entry.startDate} → {entry.endDate}</p>
          <p>Estimate: ₹{entry.estimatedCost?.toFixed(2)}</p>
        </div>)}</div>
        {!reservations.length && <p>No sandbox reservations yet.</p>}
      </section>
      <details className="simulation-panel-card" open>
        <summary>Completed walkthrough actions ({activity.length})</summary>
        <p>This is a local action checklist, not a backend audit log. Use the refreshed server ledger to inspect committed state.</p>
        <ol>{activity.slice().reverse().map((title, position) => <li key={position}>{title}</li>)}</ol>
      </details>
    </div>
  );
}
