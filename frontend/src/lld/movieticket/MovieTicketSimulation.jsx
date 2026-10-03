import * as api from './api';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { expectSimulationRejection } from '../../utils/simulation';
import '../../components/SimulationPanel.css';
import './MovieTicketSimulation.css';

const STEPS = [
  { title: 'Prepare the cinema sandbox', detail: 'Reset the sandbox and load the first show’s seat map.' },
  { title: 'Alice holds two seats', detail: 'Hold seats 1 and 2 for Alice. The server reserves them temporarily.' },
  { title: 'Bob requests an overlapping hold', detail: 'Bob asks for seats 2 and 3. The server must reject the entire request because Alice holds seat 2.' },
  { title: 'Bob chooses other seats', detail: 'Hold seats 7 and 8 for Bob instead.' },
  { title: 'Alice confirms her booking', detail: 'Book Alice’s held seats and retain the booking ID returned by the server.' },
  { title: 'Charlie holds two seats', detail: 'Hold seats 19 and 20 for Charlie.' },
  { title: 'Demonstrate hold expiry', detail: 'Explicitly release Charlie’s hold through the sandbox expiry action. Playback speed does not advance the real hold clock.' },
  { title: 'Diana holds a released seat', detail: 'Diana reserves seat 19 after Charlie’s hold is released.' },
  { title: 'Diana confirms her booking', detail: 'Book Diana’s held seat through the server.' },
  { title: 'Alice cancels her booking', detail: 'Cancel using Alice’s actual booking ID. The server returns her seats to available.' },
  { title: 'Check the final seat map', detail: 'Refresh the seat map and activity to inspect the final held, booked, and available spaces.' },
];

export default function MovieTicketSimulation() {
  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    let aliceBooking = previous?.aliceBooking || null;
    let dianaBooking = previous?.dianaBooking || null;
    let conflict = previous?.conflict || '';
    if (index === 0) {
      await api.simReset();
      aliceBooking = null;
      dianaBooking = null;
      conflict = '';
    }
    if (index === 1) await api.simHold(1, [1, 2], 'user1', 'Alice');
    if (index === 2) conflict = await expectSimulationRejection(() => api.simHold(1, [2, 3], 'user2', 'Bob'), 409, 'SeatNotAvailableException');
    if (index === 3) await api.simHold(1, [7, 8], 'user2', 'Bob');
    if (index === 4) aliceBooking = await api.simBook(1, [1, 2], 'user1', 'Alice');
    if (index === 5) await api.simHold(1, [19, 20], 'user3', 'Charlie');
    if (index === 6) await api.simExpire(1, [19, 20], 'System');
    if (index === 7) await api.simHold(1, [19], 'user4', 'Diana');
    if (index === 8) dianaBooking = await api.simBook(1, [19], 'user4', 'Diana');
    if (index === 9) {
      if (aliceBooking?.id == null) throw new Error('Alice’s booking response did not include an ID. Reset the sandbox to continue.');
      aliceBooking = await api.simCancel(aliceBooking.id, 'Alice');
    }
    const [seats, events] = await Promise.all([api.simGetSeats(1), api.simGetEvents()]);
    return { aliceBooking, dianaBooking, conflict, seats, events };
  });
  const { aliceBooking, dianaBooking, conflict, seats = [], events = [] } = playback.result || {};
  const actors = { user1: 'Alice', user2: 'Bob', user3: 'Charlie', user4: 'Diana' };

  return (
    <div className="simulation-panel movie-ticket-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <section className="simulation-panel-card" aria-label="Sandbox seat map">
        <h3>{playback.done ? 'Final seat map' : 'Seat holds and bookings'}</h3>
        <div className="movie-sim-screen">Cinema screen</div>
        <div className="movie-sim-seats">
          {seats.map(seat => <div key={seat.id} className={`movie-sim-seat status-${seat.status}`}>
            <strong>{seat.row}{String.fromCharCode(64 + seat.col)}</strong>
            <span>#{seat.id} · {seat.status}</span>
            {seat.heldByUserId && <span>{actors[seat.heldByUserId] || seat.heldByUserId}</span>}
          </div>)}
        </div>
        {!seats.length && <p>Start the simulation to load the seat map.</p>}
        <div className="movie-sim-legend"><span>Available: {seats.filter(seat => seat.status === 'AVAILABLE').length}</span><span>Held: {seats.filter(seat => seat.status === 'HELD').length}</span><span>Booked: {seats.filter(seat => seat.status === 'BOOKED').length}</span></div>
        {conflict && <p className="simulation-panel-note">Overlapping hold rejected: {conflict}</p>}
        {aliceBooking && <p>Alice’s booking #{aliceBooking.id}: {aliceBooking.status}</p>}
        {dianaBooking && <p>Diana’s booking #{dianaBooking.id}: {dianaBooking.status}</p>}
      </section>
      <details className="simulation-panel-card" open>
        <summary>Sandbox activity ({events.length})</summary>
        <ol>{events.slice().reverse().map(event => <li key={event.id}><strong>{event.eventType}</strong> · {event.actorName}<p>{event.description}</p></li>)}</ol>
      </details>
    </div>
  );
}
