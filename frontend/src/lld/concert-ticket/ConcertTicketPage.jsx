import { useState, useEffect, useCallback, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import { ApiError } from '../../utils/api';
import {
  getEvents, getSeats, getUsers, selectSeats, confirmBooking, cancelBooking, getUserBookings,
  simReset, simGetEvents, simGetSeats, simGetEventLog, simSelectSeats, simConfirmBooking,
  simCancelBooking, simExpireHold
} from './api';

const CSS = `
.ct-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ct-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.ct-select { background: var(--bg-primary); border: 1px solid var(--border-primary); color: var(--text-primary); border-radius: 8px; padding: 8px 12px; font-size: 13px; }
.ct-btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: transform 0.15s; }
.ct-btn:hover:not(:disabled) { transform: translateY(-1px); }
.ct-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ct-btn-primary { background: var(--accent-gradient, var(--accent)); color: #fff; }
.ct-btn-success { background: var(--success); color: #fff; }
.ct-btn-danger { background: var(--danger); color: #fff; }
.ct-btn-ghost { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-primary); }

.ct-event-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; margin-bottom: 20px; }
.ct-event-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
.ct-event-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.ct-event-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
.ct-event-artist { font-size: 16px; font-weight: 800; color: var(--text-primary); }
.ct-event-meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.ct-stage-box { position: relative; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; text-align: center; }
.stage-banner { background: var(--accent-gradient, var(--accent)); color: #fff; padding: 10px; border-radius: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }

.ct-section-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 14px 0 8px; }
.seat-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; max-width: 560px; margin: 0 auto 14px; }
.seat-item { padding: 8px 2px; background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.15s; text-align: center; color: var(--text-primary); }
.seat-item.vip { border-color: var(--warning); color: var(--warning); }
.seat-item.gold { border-color: var(--accent); color: var(--accent); }
.seat-item.silver { border-color: var(--info); color: var(--info); }
.seat-item.general { border-color: var(--text-muted); color: var(--text-muted); }
.seat-item.selected { border-color: var(--success); background: var(--success); color: #fff; transform: scale(1.08); }
.seat-item.held { border-color: var(--danger); background: rgba(248,81,73,0.15); color: var(--danger); cursor: not-allowed; }
.seat-item.booked { background: var(--border-primary); color: var(--text-muted); cursor: not-allowed; border-color: transparent; }

.ticket-card { background: var(--bg-card); border: 2px dashed var(--accent); border-radius: 12px; padding: 16px; width: 300px; margin: 0 auto; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.ct-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.ct-badge.PENDING { background: rgba(210,153,34,0.18); color: var(--warning); }
.ct-badge.CONFIRMED { background: rgba(63,185,80,0.18); color: var(--success); }
.ct-badge.CANCELLED { background: rgba(139,148,158,0.18); color: var(--text-muted); }
.ct-badge.REFUNDED { background: rgba(88,166,255,0.18); color: var(--info); }

.ct-booking-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.ct-error { background: rgba(248,81,79,0.12); border: 1px solid var(--danger); color: var(--danger); padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; }
.ct-toast { background: rgba(63,185,80,0.12); border: 1px solid var(--success); color: var(--success); padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; }

.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 14px; flex-wrap: wrap; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.step-dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.step-dot.done { background: var(--success); }

.sim-scene { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.sim-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; }
.sim-hud-tile { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 8px; padding: 10px; text-align: center; }
.sim-hud-tile .val { font-size: 20px; font-weight: 800; color: var(--accent); }
.sim-hud-tile .lbl { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.sim-log { max-height: 220px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 8px; padding: 10px; font-family: monospace; font-size: 12px; }
.sim-log-row { padding: 4px 0; border-bottom: 1px solid var(--border-primary); color: var(--text-secondary); }
.sim-log-row:last-child { border-bottom: none; }
.sim-log-row.HOLD_SUCCESS, .sim-log-row.BOOKING_CONFIRMED { color: var(--success); }
.sim-log-row.HOLD_FAILED, .sim-log-row.BOOKING_FAILED { color: var(--danger); }
.sim-log-row.HOLD_EXPIRED { color: var(--warning); }
.ct-race-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.ct-race-actor { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 14px; text-align: center; }
.ct-race-actor.won { border-color: var(--success); }
.ct-race-actor.lost { border-color: var(--danger); opacity: 0.75; }
`;

const SEAT_TYPE_CLASS = { VIP: 'vip', GOLD: 'gold', SILVER: 'silver', GENERAL: 'general' };
const DEMO_USER_IDS = ['user1', 'user2', 'user3', 'user4'];

function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// =========================================================================
// TAB 1 — BROWSE & BOOK
// =========================================================================
function BookTab() {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('user1');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [booking, setBooking] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
    getUsers().then(setUsers).catch(() => {});
  }, []);

  const refreshSeats = useCallback(() => {
    if (!selectedEvent) return Promise.resolve();
    return getSeats(selectedEvent.id).then(setSeats).catch(() => {});
  }, [selectedEvent]);

  usePolling(refreshSeats, 4000, [selectedEvent]);

  useEffect(() => {
    if (!booking || booking.status !== 'PENDING') return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [booking]);

  const holdRemainingMs = booking && booking.status === 'PENDING' ? booking.holdExpiresAt - nowMs : 0;

  useEffect(() => {
    if (booking && booking.status === 'PENDING' && holdRemainingMs <= 0) {
      setToast('⏳ Hold expired — seats released back to the pool.');
      setBooking(null);
      setSelectedSeatIds([]);
      refreshSeats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdRemainingMs]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE') return;
    setSelectedSeatIds((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]);
  };

  const doSelectEvent = (ev) => {
    setSelectedEvent(ev);
    setSelectedSeatIds([]);
    setBooking(null);
    setTicket(null);
    setError('');
  };

  const doHold = async () => {
    if (!selectedEvent || selectedSeatIds.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const b = await selectSeats(selectedEvent.id, selectedSeatIds, userId);
      setBooking(b);
      setToast(`🔒 ${selectedSeatIds.length} seat(s) held for 10 minutes. Complete payment to confirm.`);
      refreshSeats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to hold seats.');
      refreshSeats();
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!booking) return;
    setBusy(true);
    setError('');
    try {
      const confirmed = await confirmBooking(booking.id, paymentMethod, `web-${booking.id}`);
      setBooking(confirmed);
      setTicket(confirmed);
      setToast(`🎉 Payment successful! Booking #${confirmed.id} confirmed.`);
      refreshSeats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Payment failed.');
      setBooking(null);
      setSelectedSeatIds([]);
      refreshSeats();
    } finally {
      setBusy(false);
    }
  };

  const doCancelHold = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await cancelBooking(booking.id);
      setBooking(null);
      setSelectedSeatIds([]);
      setToast('Hold cancelled — seats released.');
      refreshSeats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Cancel failed.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBooking(null);
    setTicket(null);
    setSelectedSeatIds([]);
    setError('');
    setToast('');
    refreshSeats();
  };

  return (
    <div className="ct-container">
      <style>{CSS}</style>
      {error && <div className="ct-error">⚠️ {error}</div>}
      {toast && !error && <div className="ct-toast">{toast}</div>}

      <div className="ct-row">
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Booking as</label>
        <select className="ct-select" value={userId} onChange={(e) => setUserId(e.target.value)}>
          {(users.length ? users : DEMO_USER_IDS.map((id) => ({ id, name: id }))).map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
          ))}
        </select>
      </div>

      <div className="ct-section-label">Upcoming Concerts</div>
      <div className="ct-event-grid">
        {events.map((ev) => (
          <div
            key={ev.id}
            className={`ct-event-card ${selectedEvent && selectedEvent.id === ev.id ? 'selected' : ''}`}
            onClick={() => doSelectEvent(ev)}
          >
            <div className="ct-event-artist">🎤 {ev.artist}</div>
            <div className="ct-event-meta">{ev.title}</div>
            <div className="ct-event-meta">{ev.venueName} — {ev.venueLocation}</div>
            <div className="ct-event-meta">{new Date(ev.dateTime).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="ct-stage-box">
          <div className="stage-banner">🎤 {selectedEvent.artist} — {selectedEvent.venueName}</div>

          {!ticket && (
            <>
              <div className="seat-grid">
                {seats.map((s) => {
                  const isSelected = selectedSeatIds.includes(s.id);
                  const statusClass = s.status === 'HELD' ? 'held' : s.status === 'BOOKED' ? 'booked' : '';
                  return (
                    <div
                      key={s.id}
                      className={`seat-item ${SEAT_TYPE_CLASS[s.seatType] || ''} ${statusClass} ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleSeat(s)}
                      title={`${s.id} — ${s.seatType} — ₹${s.price}`}
                    >
                      <div>{s.id.split('-').slice(1).join('')}</div>
                    </div>
                  );
                })}
              </div>

              {!booking && (
                <button className="ct-btn ct-btn-primary" disabled={busy || selectedSeatIds.length === 0} onClick={doHold}>
                  🔒 Hold {selectedSeatIds.length || ''} Seat(s)
                </button>
              )}

              {booking && booking.status === 'PENDING' && (
                <div>
                  <div style={{ margin: '12px 0', fontWeight: 700, color: 'var(--danger)' }}>
                    ⏱️ Hold expires in {formatCountdown(holdRemainingMs)} — Total: ₹{booking.totalAmount.toFixed(2)}
                  </div>
                  <div className="ct-row" style={{ justifyContent: 'center' }}>
                    <select className="ct-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="NET_BANKING">Net Banking</option>
                      <option value="WALLET">Wallet</option>
                    </select>
                    <button className="ct-btn ct-btn-success" disabled={busy} onClick={doConfirm}>
                      💳 Pay ₹{booking.totalAmount.toFixed(2)} & Confirm
                    </button>
                    <button className="ct-btn ct-btn-ghost" disabled={busy} onClick={doCancelHold}>Cancel Hold</button>
                  </div>
                </div>
              )}
            </>
          )}

          {ticket && (
            <div>
              <div className="ticket-card">
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>E-TICKET</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', margin: '4px 0' }}>#{ticket.id}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{ticket.seatIds.join(', ')}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                  ₹{ticket.totalAmount.toFixed(2)} PAID — {ticket.paymentRef}
                </div>
                <span className={`ct-badge ${ticket.status}`}>{ticket.status}</span>
              </div>
              <button className="ct-btn ct-btn-primary" style={{ marginTop: 16 }} onClick={reset}>
                🔄 Book Another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// TAB 2 — MY BOOKINGS
// =========================================================================
function BookingsTab() {
  const [userId, setUserId] = useState('user1');
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(() => {
    return getUserBookings(userId).then(setBookings).catch(() => {});
  }, [userId]);

  usePolling(refresh, 5000, [userId]);

  const doCancel = async (bookingId) => {
    setBusyId(bookingId);
    setError('');
    try {
      await cancelBooking(bookingId);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Cancel failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ct-container">
      <style>{CSS}</style>
      <div className="ct-row">
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>View bookings for</label>
        <select className="ct-select" value={userId} onChange={(e) => setUserId(e.target.value)}>
          {DEMO_USER_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </div>
      {error && <div className="ct-error">⚠️ {error}</div>}
      {bookings.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bookings yet for this user.</p>}
      {bookings.map((b) => (
        <div className="ct-booking-card" key={b.id}>
          <div>
            <strong>Booking #{b.id}</strong> — {b.seatIds.join(', ')}
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ₹{b.totalAmount.toFixed(2)} {b.refundAmount > 0 && `(refunded ₹${b.refundAmount.toFixed(2)})`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`ct-badge ${b.status}`}>{b.status}</span>
            {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
              <button className="ct-btn ct-btn-danger" disabled={busyId === b.id} onClick={() => doCancel(b.id)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================================================================
// TAB 3 — INTERACTIVE 2D SIMULATION (8 steps, real /sim/* calls)
// =========================================================================
const SIM_STEPS = [
  { title: 'Reset Sandbox', detail: 'Wipe and reseed the isolated simulation venue — never touches live booking data.' },
  { title: 'Load Seat Map', detail: 'Fetch the sandbox event and its seat map from the real /sim/* engine.' },
  { title: 'Two Customers Race', detail: 'Alice and Bob both try to hold the exact same seat at (almost) the same instant.' },
  { title: 'Winner Confirms & Pays', detail: 'Whoever won the seat lock confirms their booking — seat flips HELD → BOOKED.' },
  { title: 'A Third Customer Holds', detail: 'Charlie holds a different seat, starting a 10-minute TTL countdown.' },
  { title: 'TTL Reaper Sweeps', detail: 'Force Charlie’s hold into the past and run the reaper — the seat must return to AVAILABLE.' },
  { title: 'Seat Re-Held Instantly', detail: 'Diana immediately holds the now-freed seat, proving expiry genuinely releases it.' },
  { title: 'Cancel & Inspect Log', detail: 'Cancel Diana’s booking and review the full event log with seat-status snapshots.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [simEvent, setSimEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [log, setLog] = useState([]);
  const [race, setRace] = useState(null); // { winner, loser, seatId }
  const [charlieBooking, setCharlieBooking] = useState(null);
  const [dianaBooking, setDianaBooking] = useState(null);
  const targetSeatRef = useRef(null);
  const holdSeatRef = useRef(null);

  const refreshScene = async (eventId) => {
    const [freshSeats, freshLog] = await Promise.all([simGetSeats(eventId), simGetEventLog()]);
    setSeats(freshSeats);
    setLog(freshLog.slice().reverse());
  };

  const runStep = async () => {
    setBusy(true);
    setError('');
    try {
      if (step === 0) {
        await simReset();
        const events = await simGetEvents();
        const ev = events[0];
        setSimEvent(ev);
        await refreshScene(ev.id);
      } else if (step === 1) {
        await refreshScene(simEvent.id);
        const avail = (await simGetSeats(simEvent.id)).filter((s) => s.status === 'AVAILABLE');
        targetSeatRef.current = avail[0].id;
        holdSeatRef.current = avail[1].id;
      } else if (step === 2) {
        const seatId = targetSeatRef.current;
        const [a, b] = await Promise.allSettled([
          simSelectSeats(simEvent.id, [seatId], 'user1', 'Alice'),
          simSelectSeats(simEvent.id, [seatId], 'user2', 'Bob'),
        ]);
        const winner = a.status === 'fulfilled' ? { name: 'Alice', result: a.value } : { name: 'Bob', result: b.value };
        const loserName = a.status === 'fulfilled' ? 'Bob' : 'Alice';
        setRace({ winnerName: winner.name, loserName, seatId, bookingId: winner.result.bookingId });
        await refreshScene(simEvent.id);
      } else if (step === 3) {
        const confirmed = await simConfirmBooking(race.bookingId, race.winnerName);
        setRace((prev) => ({ ...prev, confirmed }));
        await refreshScene(simEvent.id);
      } else if (step === 4) {
        const held = await simSelectSeats(simEvent.id, [holdSeatRef.current], 'user3', 'Charlie');
        setCharlieBooking(held);
        await refreshScene(simEvent.id);
      } else if (step === 5) {
        await simExpireHold(simEvent.id, [holdSeatRef.current], 'System Reaper');
        await refreshScene(simEvent.id);
      } else if (step === 6) {
        const reheld = await simSelectSeats(simEvent.id, [holdSeatRef.current], 'user4', 'Diana');
        setDianaBooking(reheld);
        await refreshScene(simEvent.id);
      } else if (step === 7) {
        if (dianaBooking) await simCancelBooking(dianaBooking.bookingId, 'Diana');
        await refreshScene(simEvent.id);
      }
      setStep((s) => Math.min(s + 1, SIM_STEPS.length));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e.message || 'Simulation step failed.'));
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep(0);
    setError('');
    setRace(null);
    setCharlieBooking(null);
    setDianaBooking(null);
    setSimEvent(null);
    setSeats([]);
    setLog([]);
  };

  const done = step >= SIM_STEPS.length;
  const wins = log.filter((e) => e.eventType === 'HOLD_SUCCESS' || e.eventType === 'BOOKING_CONFIRMED').length;
  const rejections = log.filter((e) => e.eventType === 'HOLD_FAILED').length;

  return (
    <div className="ct-container">
      <style>{CSS}</style>

      <div className="step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s.title} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s.title} />
        ))}
      </div>

      <div className="sim-scene">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
            {done ? '✅ Simulation Complete' : `Step ${step + 1} of ${SIM_STEPS.length}: ${SIM_STEPS[step].title}`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {done ? 'Restart to run the race again — outcomes are decided by the backend’s per-seat lock, not scripted.' : SIM_STEPS[step].detail}
          </div>
        </div>

        <div className="sim-hud">
          <div className="sim-hud-tile"><div className="val">{seats.filter((s) => s.status === 'AVAILABLE').length}</div><div className="lbl">Available</div></div>
          <div className="sim-hud-tile"><div className="val">{seats.filter((s) => s.status === 'HELD').length}</div><div className="lbl">Held</div></div>
          <div className="sim-hud-tile"><div className="val">{seats.filter((s) => s.status === 'BOOKED').length}</div><div className="lbl">Booked</div></div>
          <div className="sim-hud-tile"><div className="val">{wins}</div><div className="lbl">Successful Holds</div></div>
          <div className="sim-hud-tile"><div className="val">{rejections}</div><div className="lbl">Rejected</div></div>
        </div>

        {seats.length > 0 && (
          <div className="seat-grid" style={{ maxWidth: 640 }}>
            {seats.map((s) => {
              const statusClass = s.status === 'HELD' ? 'held' : s.status === 'BOOKED' ? 'booked' : '';
              const isRaceSeat = race && s.id === race.seatId;
              return (
                <div
                  key={s.id}
                  className={`seat-item ${SEAT_TYPE_CLASS[s.seatType] || ''} ${statusClass}`}
                  style={isRaceSeat ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}
                  title={`${s.id} — ${s.status}${s.heldByUserId ? ` by ${s.heldByUserId}` : ''}`}
                >
                  {s.id.split('-').slice(1).join('')}
                </div>
              );
            })}
          </div>
        )}

        {race && step >= 3 && (
          <div className="ct-race-panel">
            <div className={`ct-race-actor ${race.winnerName === 'Alice' ? 'won' : 'lost'}`}>
              <div style={{ fontSize: 22 }}>{race.winnerName === 'Alice' ? '🏆' : '❌'}</div>
              <div style={{ fontWeight: 700 }}>Alice</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{race.winnerName === 'Alice' ? `Won seat ${race.seatId}` : 'Rejected — seat already held'}</div>
            </div>
            <div className={`ct-race-actor ${race.winnerName === 'Bob' ? 'won' : 'lost'}`}>
              <div style={{ fontSize: 22 }}>{race.winnerName === 'Bob' ? '🏆' : '❌'}</div>
              <div style={{ fontWeight: 700 }}>Bob</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{race.winnerName === 'Bob' ? `Won seat ${race.seatId}` : 'Rejected — seat already held'}</div>
            </div>
          </div>
        )}

        {error && <div className="ct-error">⚠️ {error}</div>}

        <div className="ct-row" style={{ justifyContent: 'center' }}>
          {!done
            ? <button className="ct-btn ct-btn-primary" disabled={busy} onClick={runStep}>{busy ? 'Running…' : `Run Step ${step + 1} →`}</button>
            : <button className="ct-btn ct-btn-ghost" onClick={restart}>🔄 Restart Simulation</button>}
        </div>
      </div>

      <div className="ct-section-label">Live Event Log (backend /sim/log)</div>
      <div className="sim-log">
        {log.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Run a step to populate the event log…</div>}
        {log.map((e) => (
          <div key={e.id} className={`sim-log-row ${e.eventType}`}>
            [{e.eventType}] {e.actor}: {e.description}
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// PAGE SHELL
// =========================================================================
export default function ConcertTicketPage() {
  return (
    <LldPage
      module="concert-ticket"
      title="Concert Ticket Booking"
      icon="🎫"
      tabs={[
        { id: 'book', label: '🎫 Browse & Book' },
        { id: 'bookings', label: '📜 My Bookings' },
        { id: 'simulation', label: '🕹️ Interactive 2D Simulation' },
        'diagram',
        'sequence',
        'design',
      ]}
    >
      {(activeTab) => (
        <>
          {activeTab === 'book' && <BookTab />}
          {activeTab === 'bookings' && <BookingsTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
