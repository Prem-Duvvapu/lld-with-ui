import { useState, useEffect, useRef, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  getHotels, getRooms, bookRoom,
  simReset, simGetState, simGetEvents, simBookRoom, simCheckIn, simCheckOut, simCancelBooking, simRace,
} from './api';

// This page used to be a fully standalone document (its own header/back-link/nav, manually
// mounted ClassDiagram/SequenceDiagram/DesignDetails) with a "Simulation" tab that called the
// REAL production booking/check-in/check-out endpoints against live hotel data — every visitor
// who played with the demo actually booked, checked in, and checked out Room R3 for real, the
// exact "no isolated /sim/* sandbox" gap RCA-039 flagged. It now runs inside the shared LldPage
// shell like every other module, and the Simulation tab drives the isolated /api/hotel/sim/*
// engine (a second, independent HotelRepository/RoomBookingService instance) added alongside it.
const CSS = `
.hotel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.hotel-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 20px; cursor: pointer; transition: all 0.2s; }
.hotel-card:hover { border-color: var(--accent); box-shadow: 0 2px 12px rgba(102,126,234,0.15); }
.hotel-card h3 { font-size: 18px; margin-bottom: 6px; color: var(--text-primary); }
.hotel-card .location { color: var(--text-muted); font-size: 13px; }
.hotel-card .rating { color: var(--warning); font-weight: 700; font-size: 14px; }
.hotel-card .amenities { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
.hotel-card .amenity-tag { padding: 2px 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 10px; color: var(--text-muted); }
.room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; }
.room-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; transition: all 0.2s; }
.room-card .room-no { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.room-card .room-type { font-size: 12px; color: var(--info); text-transform: uppercase; letter-spacing: 0.5px; }
.room-card .room-price { font-size: 20px; font-weight: 700; color: var(--accent); margin: 6px 0; }
.room-card .room-status { font-size: 11px; font-weight: 600; }
.room-card .room-status.avail { color: var(--success); }
.room-card .room-status.booked { color: var(--danger); }
.form-card { max-width: 400px; margin: 16px auto; }
.form-card h2 { margin-bottom: 16px; font-size: 18px; color: var(--info); }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary); transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
.btn-primary { width: 100%; padding: 12px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102,126,234,0.3); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.result-card { margin-top: 16px; padding: 16px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-primary); }
.result-card h3 { margin-bottom: 10px; font-size: 15px; color: var(--info); }
.result-card .detail { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid var(--border-secondary); }
.result-card .detail:last-child { border-bottom: none; }
.result-card .label { color: var(--text-muted); } .result-card .value { font-weight: 600; color: var(--text-primary); }
.error { margin-top: 12px; padding: 10px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; border: 1px solid var(--danger-bg); font-size: 13px; }
.success { margin-top: 12px; padding: 10px; background: var(--success-bg); color: var(--success); border-radius: 8px; border: 1px solid var(--success-bg); font-size: 13px; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.step-dot.done { background: var(--success); }
.sim-panel { background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; }
.sim-walkthrough { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 16px; margin-bottom: 20px; }
.sim-rooms { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
.sim-room-tile { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 8px; padding: 10px; text-align: center; font-size: 11px; transition: all 0.3s; }
.sim-room-tile.avail { border-color: var(--success); }
.sim-room-tile.held { border-color: var(--warning); box-shadow: 0 0 10px rgba(234,179,8,0.25); }
.sim-room-tile .room-id { font-weight: 800; font-size: 14px; color: var(--text-primary); }
.sim-event-stream { background: var(--bg-primary); border-radius: 10px; border: 1px solid var(--border-primary); padding: 16px; display: flex; flex-direction: column; max-height: 340px; overflow-y: auto; }
.sim-event { background: var(--bg-secondary); padding: 8px 10px; border-radius: 6px; font-size: 11px; margin-bottom: 6px; }
.sim-event .head { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 10px; }
.sim-event .head strong { color: var(--text-primary); }
.sim-event.race { border-left: 3px solid var(--warning); }
.sim-event.error { border-left: 3px solid var(--danger); }
`;

function HotelsTab() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guestName, setGuestName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
    getHotels().then(setHotels).catch(() => setError('Failed to load hotels'));
  }, []);

  const selectHotel = async (hotel) => {
    setSelectedHotel(hotel);
    setBookingResult(null);
    setError('');
    try {
      const data = await getRooms(hotel.id);
      setRooms(data);
    } catch { setError('Failed to load rooms'); }
  };

  // Poll room availability while a hotel is open so another guest's booking is reflected
  // without a manual refresh.
  usePolling(() => {
    if (!selectedHotel) return;
    getRooms(selectedHotel.id).then(setRooms).catch(() => {});
  }, 5000, [selectedHotel]);

  const handleBook = async (roomId) => {
    if (!guestName || !checkIn || !checkOut) { setError('Fill all fields'); return; }
    setError(''); setLoading(true);
    try {
      const data = await bookRoom(roomId, 'user1', guestName, checkIn, checkOut);
      if (data.error) setError(data.error);
      else { setBookingResult(data); setGuestName(''); }
    } catch { setError('Booking failed'); }
    finally { setLoading(false); }
  };

  const roomTypeColors = { SINGLE: '#4ecdc4', DOUBLE: '#45b7d1', SUITE: '#ffd700', DELUXE: '#ff6b6b' };

  return (
    <div>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}. Ensure the Java Spring Boot backend is running on port 9190 (<code>cd backend && mvn spring-boot:run</code>).
        </div>
      )}
      {!selectedHotel ? (
        <>
          <h2 style={{ color: 'var(--info)', fontSize: 18, marginBottom: 16 }}>Select a Hotel</h2>
          <div className="hotel-grid">
            {hotels.map((h) => (
              <div key={h.id} className="hotel-card" onClick={() => selectHotel(h)}>
                <h3>{h.name}</h3>
                <div className="location">{h.location}</div>
                <div className="rating">{'⭐'.repeat(Math.round(h.rating))} {h.rating}</div>
                <div className="amenities">{h.amenities?.map((a) => <span key={a} className="amenity-tag">{a}</span>)}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button onClick={() => { setSelectedHotel(null); setBookingResult(null); }} style={{ padding: '8px 16px', border: '1px solid var(--border-primary)', borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Back to Hotels</button>
          <h2 style={{ color: 'var(--info)', fontSize: 18, marginBottom: 4 }}>{selectedHotel.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{selectedHotel.location}</p>

          <h3 style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>Rooms</h3>
          <div className="room-grid">
            {rooms.map((r) => (
              <div key={r.id} className="room-card">
                <div className="room-type" style={{ color: roomTypeColors[r.type] }}>{r.type}</div>
                <div className="room-no">Room {r.roomNumber}</div>
                <div className="room-price">₹{r.price.toLocaleString()}<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/night</span></div>
                <div className={`room-status ${r.status === 'AVAILABLE' ? 'avail' : 'booked'}`}>{r.status}</div>
                {r.status === 'AVAILABLE' && <button onClick={() => handleBook(r.id)} className="btn-primary" style={{ marginTop: 8, padding: 8, fontSize: 12, width: '100%' }}>Book Now</button>}
              </div>
            ))}
          </div>

          {bookingResult && (
            <div className="result-card">
              <h3>Booking Confirmed!</h3>
              <div className="detail"><span className="label">Booking ID</span><span className="value">{bookingResult.id}</span></div>
              <div className="detail"><span className="label">Guest</span><span className="value">{bookingResult.guestName}</span></div>
              <div className="detail"><span className="label">Check In</span><span className="value">{bookingResult.checkIn}</span></div>
              <div className="detail"><span className="label">Check Out</span><span className="value">{bookingResult.checkOut}</span></div>
              <div className="detail"><span className="label">Total</span><span className="value">₹{bookingResult.totalAmount.toFixed(2)}</span></div>
            </div>
          )}

          <div className="form-card">
            <h2>Book a Room</h2>
            <div className="form-group"><label>Guest Name</label><input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. John Doe" /></div>
            <div className="form-group"><label>Check In</label><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
            <div className="form-group"><label>Check Out</label><input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
            {error && <div className="error">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// Dates chosen so the guided script deterministically exercises both TariffStrategy branches:
// nextFriday/nextSaturday guarantee a weekend-inclusive stay (WeekendTariffStrategy), while the
// short guestB stay two weeks out touches no Friday/Saturday night (StandardTariffStrategy).
function isoDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
function nextFriday() {
  const d = new Date();
  const add = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add + 7); // push a week out so it never collides with "today"
  return d;
}

const guestACheckInDate = nextFriday();
const guestACheckOutDate = new Date(guestACheckInDate);
guestACheckOutDate.setDate(guestACheckOutDate.getDate() + 2); // Fri -> Sun, guaranteed to include Fri & Sat nights
const guestAIn = guestACheckInDate.toISOString().slice(0, 10);
const guestAOut = guestACheckOutDate.toISOString().slice(0, 10);

const SIM_STEPS = [
  { label: 'Reset Sandbox', hint: 'Re-seed the isolated sim repository: 2 hotels, 10 rooms, zero bookings.' },
  { label: 'Book Room R1 for Alice', hint: `Fri–Sun stay (${guestAIn} → ${guestAOut}) spans a weekend night, so TariffStrategyFactory resolves WeekendTariffStrategy.` },
  { label: 'Concurrency Race on Room R4', hint: '5 simulated guests race to book R4 for the same dates at the same instant — RoomBookingService\'s per-room lock must let exactly one win.' },
  { label: 'Check In Alice', hint: 'Alice\'s booking moves PENDING/CONFIRMED → CHECKED_IN.' },
  { label: 'Check Out Alice', hint: 'CHECKED_IN → CHECKED_OUT, freeing Room R1\'s calendar for that date range.' },
  { label: 'Book Room R2 for Bob', hint: 'A short 1-night stay with no Friday/Saturday night, so StandardTariffStrategy applies instead.' },
  { label: 'Cancel Bob\'s Booking', hint: 'CancellationRefundStrategyFactory resolves a refund tier purely from days-until-check-in.' },
  { label: 'Final Snapshot', hint: 'Every booking this run produced, as the sandbox now stands.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookingA, setBookingA] = useState(null);
  const [bookingB, setBookingB] = useState(null);
  const [raceResult, setRaceResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const refresh = useCallback(async () => {
    const [s, e] = await Promise.all([simGetState(), simGetEvents()]);
    if (!mountedRef.current) return;
    if (!s.error) setState(s);
    if (!e.error) setEvents(e);
  }, []);

  const runStep = async (action) => {
    setLoading(true); setError('');
    try {
      await action();
      await refresh();
      if (mountedRef.current) setStep((s) => s + 1);
    } catch {
      if (mountedRef.current) setError('Step failed — see the event stream for details.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const doReset = () => runStep(async () => {
    const r = await simReset();
    if (r.error) throw new Error(r.error);
    setBookingA(null); setBookingB(null); setRaceResult(null);
    await refresh();
  });

  const doBookA = () => runStep(async () => {
    const b = await simBookRoom('R1', 'sim-alice', 'Alice', guestAIn, guestAOut);
    if (b.error) throw new Error(b.error);
    setBookingA(b);
  });

  const doRace = () => runStep(async () => {
    const raceIn = isoDate(30);
    const raceOut = isoDate(32);
    const r = await simRace('R4', raceIn, raceOut, 5);
    if (r.error) throw new Error(r.error);
    setRaceResult(r);
  });

  const doCheckInA = () => runStep(async () => {
    if (!bookingA) return;
    const b = await simCheckIn(bookingA.id, 'Alice');
    if (b.error) throw new Error(b.error);
    setBookingA(b);
  });

  const doCheckOutA = () => runStep(async () => {
    if (!bookingA) return;
    const b = await simCheckOut(bookingA.id, 'Alice');
    if (b.error) throw new Error(b.error);
    setBookingA(b);
  });

  const doBookB = () => runStep(async () => {
    const shortIn = isoDate(14);
    const shortOut = isoDate(15);
    const b = await simBookRoom('R2', 'sim-bob', 'Bob', shortIn, shortOut);
    if (b.error) throw new Error(b.error);
    setBookingB(b);
  });

  const doCancelB = () => runStep(async () => {
    if (!bookingB) return;
    const b = await simCancelBooking(bookingB.id, 'Bob');
    if (b.error) throw new Error(b.error);
    setBookingB(b);
  });

  const doFinish = () => runStep(async () => {});

  const stepActions = [doReset, doBookA, doRace, doCheckInA, doCheckOutA, doBookB, doCancelB, doFinish];
  const isDone = step >= SIM_STEPS.length;

  const rooms = state?.rooms || [];

  return (
    <div className="sim-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--info)' }}>🏨 Booking Lifecycle & Concurrency Simulation</h2>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Isolated sandbox — a second HotelRepository/RoomBookingService instance, never touching real hotel data.
          </div>
        </div>
        {step > 0 && (
          <button onClick={doReset} disabled={loading} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>↺ Reset</button>
        )}
      </div>

      <div className="step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s.label} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s.label} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
          {isDone ? 'Complete' : `Step ${step + 1} / ${SIM_STEPS.length}`}
        </span>
      </div>

      <div className="sim-walkthrough">
        {!isDone ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{SIM_STEPS[step].label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{SIM_STEPS[step].hint}</div>
            <button
              onClick={() => stepActions[step]()}
              disabled={loading}
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 24px', fontSize: 13 }}
            >
              ▶ {loading ? 'Running...' : 'Run This Step'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 700, color: 'var(--success)' }}>Simulation complete — Alice's stay ran through booking, check-in and check-out; Bob's booking was cancelled with a refund; and the R4 race settled with exactly one winner.</div>
          </div>
        )}
        {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
      </div>

      {raceResult && (
        <div className="result-card" style={{ marginBottom: 20 }}>
          <h3>🏁 Race Result — Room R4</h3>
          <div className="detail"><span className="label">Attempts</span><span className="value">{raceResult.attempts}</span></div>
          <div className="detail"><span className="label">Winner</span><span className="value">{raceResult.winner}</span></div>
          <div className="detail"><span className="label">Rejected</span><span className="value">{raceResult.rejected}</span></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Sandbox Rooms (Hotel H1)</div>
          <div className="sim-rooms">
            {rooms.filter(r => r.hotelId === 'H1').map((r) => {
              const isHeld = [bookingA, bookingB].some(b => b && b.roomId === r.id && ['CONFIRMED', 'CHECKED_IN'].includes(b.status));
              return (
                <div key={r.id} className={`sim-room-tile ${isHeld ? 'held' : 'avail'}`}>
                  <div className="room-id">{r.id}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{r.type}</div>
                  <div style={{ color: 'var(--text-muted)' }}>₹{r.price}</div>
                </div>
              );
            })}
          </div>
          {(bookingA || bookingB) && (
            <div className="result-card">
              <h3>Sandbox Bookings</h3>
              {bookingA && (
                <div className="detail"><span className="label">Alice — {bookingA.roomId}</span><span className="value">{bookingA.status} ({bookingA.tariffStrategyName})</span></div>
              )}
              {bookingB && (
                <div className="detail"><span className="label">Bob — {bookingB.roomId}</span><span className="value">{bookingB.status}{bookingB.refundAmount != null && bookingB.status === 'CANCELLED' ? ` · ₹${bookingB.refundAmount} refunded` : ''}</span></div>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Live Simulation Event Stream ({events.length})</div>
          <div className="sim-event-stream">
            {events.slice().reverse().map((ev) => (
              <div key={ev.id} className={`sim-event ${ev.eventType === 'RACE' ? 'race' : ''}`}>
                <div className="head"><strong>{ev.eventType}</strong><span>{ev.actor}</span></div>
                <div style={{ marginTop: 2, color: 'var(--text-secondary)' }}>{ev.description}</div>
              </div>
            ))}
            {events.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>Run "Reset Sandbox" to begin.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HotelPage() {
  return (
    <LldPage
      module="hotel"
      title="Hotel Management System"
      icon="🏨"
      tabs={[{ id: 'hotels', label: '🏨 Hotels' }, 'simulation', 'diagram', 'sequence', 'design']}
    >
      {(tab) => (
        <>
          <style>{CSS}</style>
          {tab === 'hotels' && <HotelsTab />}
          {tab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
