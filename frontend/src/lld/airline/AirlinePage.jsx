import React, { useState, useEffect } from 'react';
import {
  getFlights,
  searchFlights,
  getFlightSeats,
  holdSeats,
  bookFlight,
  cancelBooking,
  getUserBookings,
  simReset,
  simHold,
  simBook,
  simCancel,
  simExpire,
  simGetSnapshots,
  simGetEvents,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import SequenceDiagram from '../../components/SequenceDiagram';
import ThemeToggle from '../../components/ThemeToggle';
import { usePolling } from '../../hooks/usePolling';

const SIM_STEPS = [
  { label: 'Reset sandbox', hint: 'Seed flight AI202 (DEL→BOM) with only 12A, 12B, 12C free in Economy.' },
  { label: 'View seeded cabin', hint: 'Confirm the starting state before racing anyone for a seat.' },
  { label: 'Alice holds 12A', hint: 'A 60-second hold under a per-seat ReentrantLock — HOLD_SUCCESS.' },
  { label: 'Bob races Alice for 12A', hint: 'Same seat, same instant — SeatLockManager rejects the loser with HOLD_COLLISION.' },
  { label: 'Alice confirms a FLEXIBLE booking', hint: 'confirmSeats re-validates the hold, then BOOKING_CONFIRMED under the tiered-refund fare.' },
  { label: 'Charlie books a BASIC (saver) seat', hint: 'Holds 12B then confirms under the non-refundable fare — a different RefundPolicy entirely.' },
  { label: 'Cancel both bookings 30h out', hint: "Same notice window, different refund: Alice's FLEXIBLE fare gets 100% back, Charlie's BASIC fare gets 0%." },
  { label: 'Expire a stale hold', hint: 'Sweep any lingering HELD seat back to AVAILABLE and review the full event log.' },
];

export default function AirlinePage() {
  const [activeTab, setActiveTab] = useState('flights');

  // Real App State
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [heldSeats, setHeldSeats] = useState([]);
  const [holdTimer, setHoldTimer] = useState(0);

  const [currentUserId, setCurrentUserId] = useState('user-alice');
  const [userBookings, setUserBookings] = useState([]);
  const [passengers, setPassengers] = useState([]);

  // Search State
  const [searchSource, setSearchSource] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  // Simulation State
  const [simSnapshots, setSimSnapshots] = useState(null);
  const [simEvents, setSimEvents] = useState([]);
  const [simSelectedSeats, setSimSelectedSeats] = useState(['12A']);
  const [simUserId, setSimUserId] = useState('Sim-Alice');
  const [simPassengerName, setSimPassengerName] = useState('Alice Vance');
  const [simFareType, setSimFareType] = useState('FLEXIBLE');
  const [simCancelHours, setSimCancelHours] = useState(25);
  const [simLoading, setSimLoading] = useState(false);

  // Guided 8-step walkthrough state
  const [simStep, setSimStep] = useState(0);
  const [simGuidedBusy, setSimGuidedBusy] = useState(false);
  const [simAliceBookingId, setSimAliceBookingId] = useState(null);
  const [simCharlieBookingId, setSimCharlieBookingId] = useState(null);

  // Status Banner
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'info' });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedFlight) {
      loadFlightSeats(selectedFlight.flightId);
    }
  }, [selectedFlight]);

  // Poll the seat map so another customer's hold/booking shows up without a manual refresh —
  // deliberately doesn't touch selectedSeats, unlike loadFlightSeats, so a poll mid-selection
  // never clears what the current user has picked.
  const pollSeats = () => {
    if (!selectedFlight) return;
    getFlightSeats(selectedFlight.flightId)
      .then(seatList => setSeats(seatList || []))
      .catch(() => {});
  };
  usePolling(pollSeats, 4000, [selectedFlight]);

  useEffect(() => {
    if (currentUserId) {
      loadUserBookings(currentUserId);
    }
  }, [currentUserId]);

  // Hold Countdown Timer
  useEffect(() => {
    if (holdTimer <= 0) return;
    const interval = setInterval(() => {
      setHoldTimer(prev => {
        if (prev <= 1) {
          showBanner('Seat hold TTL expired. Please reselect your seats.', 'error');
          if (selectedFlight) loadFlightSeats(selectedFlight.flightId);
          setHeldSeats([]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [holdTimer, selectedFlight]);

  const showBanner = (text, type = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: 'info' }), 4000);
  };

  const loadInitialData = async () => {
    try {
      const flightList = await getFlights();
      if (Array.isArray(flightList) && flightList.length > 0) {
        setFlights(flightList);
        setSelectedFlight(flightList[0]);
      }
    } catch (err) {
      console.error(err);
      showBanner('Failed to connect to backend on port 9190.', 'error');
    }
  };

  const loadFlightSeats = async (flightId) => {
    try {
      const seatList = await getFlightSeats(flightId);
      setSeats(seatList || []);
      setSelectedSeats([]);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUserBookings = async (userId) => {
    try {
      const bList = await getUserBookings(userId);
      setUserBookings(bList || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await searchFlights(searchSource, searchDestination, null);
      setFlights(res || []);
      if (res && res.length > 0) {
        setSelectedFlight(res[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status === 'BOOKED' || (seat.status === 'HELD' && !heldSeats.includes(seat.seatNumber))) {
      return; // Unavailable
    }

    if (selectedSeats.includes(seat.seatNumber)) {
      const filtered = selectedSeats.filter(s => s !== seat.seatNumber);
      setSelectedSeats(filtered);
      setPassengers(prev => prev.slice(0, filtered.length));
    } else {
      const updated = [...selectedSeats, seat.seatNumber];
      setSelectedSeats(updated);
      setPassengers(prev => [
        ...prev,
        { passengerId: `P-${updated.length}`, name: `Passenger ${updated.length}`, email: `${currentUserId}@travel.com`, passportOrId: `A${Math.floor(100000 + Math.random() * 900000)}` }
      ]);
    }
  };

  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0 || !selectedFlight) return;
    try {
      await holdSeats(selectedFlight.flightId, selectedSeats, currentUserId);
      setHeldSeats([...selectedSeats]);
      setHoldTimer(300); // 5-minute TTL
      showBanner(`Successfully held seats ${selectedSeats.join(', ')} for 5 minutes!`, 'success');
      loadFlightSeats(selectedFlight.flightId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleBookFlight = async (e) => {
    e.preventDefault();
    if (heldSeats.length === 0 || !selectedFlight) {
      showBanner('Please hold your seats before confirming payment.', 'error');
      return;
    }

    try {
      const booking = await bookFlight({
        flightId: selectedFlight.flightId,
        seatNumbers: heldSeats,
        passengers,
        userId: currentUserId,
        paymentMethod: 'CARD',
        idempotencyKey: `IDEMP-${Date.now()}`,
      });

      showBanner(`Booking Confirmed! Reference ID: ${booking.bookingId}`, 'success');
      setHeldSeats([]);
      setSelectedSeats([]);
      setHoldTimer(0);
      loadFlightSeats(selectedFlight.flightId);
      loadUserBookings(currentUserId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const cancelled = await cancelBooking(bookingId);
      showBanner(`Booking cancelled. Refund Amount: ₹${cancelled.refundAmount.toFixed(2)}`, 'info');
      loadUserBookings(currentUserId);
      if (selectedFlight) loadFlightSeats(selectedFlight.flightId);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  // Simulation Handlers
  const handleSimReset = async () => {
    setSimLoading(true);
    try {
      const snap = await simReset();
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
      setSimStep(0);
      setSimAliceBookingId(null);
      setSimCharlieBookingId(null);
      showBanner('Simulation sandbox reset to default flight state.', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  // Guided 8-step walkthrough — each step drives the isolated /sim/* endpoints directly so the
  // narrative always reflects real backend state, never a client-side fake.
  const runGuidedStep = async () => {
    if (simGuidedBusy || simStep >= SIM_STEPS.length) return;
    setSimGuidedBusy(true);
    try {
      let snap = simSnapshots;
      switch (simStep) {
        case 0:
          snap = await simReset();
          setSimAliceBookingId(null);
          setSimCharlieBookingId(null);
          break;
        case 1:
          snap = await simGetSnapshots();
          break;
        case 2:
          snap = await simHold('SIM-AI-202', ['12A'], 'Sim-Alice');
          break;
        case 3:
          snap = await simHold('SIM-AI-202', ['12A'], 'Sim-Bob');
          break;
        case 4: {
          snap = await simBook('SIM-AI-202', ['12A'], 'Alice Vance', 'Sim-Alice', 'FLEXIBLE');
          const aliceBooking = (snap.bookings || []).find(b => b.userId === 'Sim-Alice' && b.status === 'CONFIRMED');
          if (aliceBooking) setSimAliceBookingId(aliceBooking.bookingId);
          break;
        }
        case 5: {
          await simHold('SIM-AI-202', ['12B'], 'Sim-Charlie');
          snap = await simBook('SIM-AI-202', ['12B'], 'Charlie Kim', 'Sim-Charlie', 'BASIC');
          const charlieBooking = (snap.bookings || []).find(b => b.userId === 'Sim-Charlie' && b.status === 'CONFIRMED');
          if (charlieBooking) setSimCharlieBookingId(charlieBooking.bookingId);
          break;
        }
        case 6: {
          if (simAliceBookingId) snap = await simCancel(simAliceBookingId, 30);
          if (simCharlieBookingId) snap = await simCancel(simCharlieBookingId, 30);
          break;
        }
        case 7:
          snap = await simExpire('SIM-AI-202');
          break;
        default:
          break;
      }
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
      setSimStep(s => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      console.error(err);
      showBanner(err.message || 'Simulation step failed.', 'error');
    } finally {
      setSimGuidedBusy(false);
    }
  };

  const handleSimHold = async () => {
    try {
      const snap = await simHold('SIM-AI-202', simSelectedSeats, simUserId);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimBook = async () => {
    try {
      const snap = await simBook('SIM-AI-202', simSelectedSeats, simPassengerName, simUserId, simFareType);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimCancel = async (bookingId) => {
    try {
      const snap = await simCancel(bookingId, simCancelHours);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimExpire = async () => {
    try {
      const snap = await simExpire('SIM-AI-202');
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, boxShadow: '0 4px 12px rgba(2,132,199,0.35)' }}>
            ✈️
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Airline Reservation System</h1>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>LLD Portfolio Module #13 · Multi-Seat Locks, Hold TTL & Strategy Refunds</span>
          </div>
        </div>

        {/* User Switcher & Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Passenger User:</span>
            <select
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', outline: 'none' }}
            >
              <option value="user-alice" style={{ background: 'var(--bg-secondary)' }}>Alice Vance (user-alice)</option>
              <option value="user-bob" style={{ background: 'var(--bg-secondary)' }}>Bob Smith (user-bob)</option>
              <option value="user-charlie" style={{ background: 'var(--bg-secondary)' }}>Charlie Kim (user-charlie)</option>
            </select>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Status Banner */}
      {statusMsg.text && (
        <div style={{ padding: '10px 24px', background: statusMsg.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          {statusMsg.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: 8, padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', overflowX: 'auto' }}>
        {[
          { id: 'flights', label: '🛫 Flight Search & Seat Map', badge: flights.length },
          { id: 'bookings', label: '🎫 My Bookings & Refunds', badge: userBookings.length },
          { id: 'simulation', label: '🕹️ Concurrency Simulation' },
          { id: 'diagram', label: '📐 Class Diagram' },
          { id: 'sequence', label: '🔀 Sequence Diagram' },
          { id: 'details', label: '📋 Design Details' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              if (t.id === 'simulation') handleSimReset();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeTab === t.id ? '#0284c7' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: '#38bdf8', color: 'var(--bg-primary)', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 800 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
        {/* =================================================================== */}
        {/* TAB 1: FLIGHT SEARCH & SEAT MAP */}
        {/* =================================================================== */}
        {activeTab === 'flights' && (
          <div>
            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24, background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
              <input
                type="text"
                placeholder="From (e.g. DEL)"
                value={searchSource}
                onChange={e => setSearchSource(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="To (e.g. BOM)"
                value={searchDestination}
                onChange={e => setSearchDestination(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 13 }}
              />
              <button type="submit" style={{ padding: '10px 20px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Search Flights
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
              {/* Flight List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available Flights</div>
                {flights.map(f => {
                  const isSelected = selectedFlight?.flightId === f.flightId;
                  return (
                    <div
                      key={f.flightId}
                      onClick={() => setSelectedFlight(f)}
                      style={{
                        background: isSelected ? 'rgba(2,132,199,0.15)' : 'var(--bg-secondary)',
                        border: `1px solid ${isSelected ? '#0284c7' : 'var(--border-primary)'}`,
                        borderRadius: 12,
                        padding: 16,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: '#38bdf8' }}>{f.flightNumber}</span>
                        <span style={{ fontSize: 11, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 6, color: 'var(--text-secondary)' }}>
                          {f.aircraft?.model}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: 700 }}>
                        <span>{f.source} ➔ {f.destination}</span>
                        <span style={{ color: '#34d399', fontSize: 12 }}>{f.availableSeatsCount} Seats Left</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Departure: {new Date(f.departureTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Aircraft Cabin Seat Map */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                      Aircraft Seat Map ({selectedFlight?.flightNumber})
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Select seats for multi-passenger checkout</div>
                  </div>

                  {/* Hold Timer Badge */}
                  {holdTimer > 0 && (
                    <div style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid #eab308', padding: '6px 14px', borderRadius: 8, color: '#eab308', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⏱ Hold Time Remaining: {formatTime(holdTimer)}
                    </div>
                  )}
                </div>

                {/* Seat Legend */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 20, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#10b981', borderRadius: 3 }}></span> Available</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#a855f7', borderRadius: 3 }}></span> Selected</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#eab308', borderRadius: 3 }}></span> Held</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 3 }}></span> Booked</span>
                </div>

                {/* Cabin Layout */}
                <div style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 14, border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>✈️ Front of Aircraft (Cockpit)</div>

                  {/* Seats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 44px)', gap: 8, justifyContent: 'center' }}>
                    {seats.map(seat => {
                      const isSelected = selectedSeats.includes(seat.seatNumber);
                      const isHeld = seat.status === 'HELD';
                      const isBooked = seat.status === 'BOOKED';

                      let bg = '#10b981';
                      if (isBooked) bg = '#ef4444';
                      else if (isHeld) bg = '#eab308';
                      else if (isSelected) bg = '#a855f7';

                      return (
                        <button
                          key={seat.seatNumber}
                          onClick={() => handleSeatClick(seat)}
                          disabled={isBooked || (isHeld && !heldSeats.includes(seat.seatNumber))}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 6,
                            border: isSelected ? '2px solid #fff' : 'none',
                            background: bg,
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 11,
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isBooked ? 0.35 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          <span>{seat.seatNumber}</span>
                          <span style={{ fontSize: 8, opacity: 0.8 }}>₹{(seat.basePrice / 1000).toFixed(0)}k</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Booking Action Panel */}
                <div style={{ marginTop: 20, borderTop: '1px solid var(--border-primary)', paddingTop: 16 }}>
                  {heldSeats.length === 0 ? (
                    <button
                      onClick={handleHoldSeats}
                      disabled={selectedSeats.length === 0}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        background: selectedSeats.length > 0 ? '#0284c7' : 'var(--border-primary)',
                        color: selectedSeats.length > 0 ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: selectedSeats.length > 0 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {selectedSeats.length > 0 ? `Hold ${selectedSeats.length} Seat(s) (5-min TTL)` : 'Select Seats to Proceed'}
                    </button>
                  ) : (
                    <form onSubmit={handleBookFlight} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                        Passenger Information ({heldSeats.length} Passenger(s)):
                      </div>
                      {passengers.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={p.name}
                            onChange={e => {
                              const updated = [...passengers];
                              updated[idx].name = e.target.value;
                              setPassengers(updated);
                            }}
                            required
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 12 }}
                          />
                          <input
                            type="text"
                            placeholder="Passport / ID"
                            value={p.passportOrId}
                            onChange={e => {
                              const updated = [...passengers];
                              updated[idx].passportOrId = e.target.value;
                              setPassengers(updated);
                            }}
                            required
                            style={{ width: 120, padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 12 }}
                          />
                          <span style={{ alignSelf: 'center', fontWeight: 800, color: '#a855f7', fontSize: 12 }}>
                            {heldSeats[idx]}
                          </span>
                        </div>
                      ))}
                      <button
                        type="submit"
                        style={{ padding: '12px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 6 }}
                      >
                        Confirm & Pay (Total: ₹{heldSeats.length * 4500})
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: MY BOOKINGS & REFUNDS */}
        {/* =================================================================== */}
        {activeTab === 'bookings' && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>
              🎫 My Flight Bookings ({userBookings.length})
            </h2>

            {userBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No active or past flight bookings found for {currentUserId}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {userBookings.map(b => {
                  const isCancelled = b.status === 'CANCELLED' || b.status === 'REFUNDED';
                  return (
                    <div key={b.bookingId} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 800, fontSize: 16, color: '#38bdf8' }}>{b.bookingId}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: isCancelled ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 700 }}>
                            {b.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                          Flight: <strong>{b.flightId}</strong> · Seats: <strong>{b.seatNumbers?.join(', ')}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          Passengers: {b.passengers?.map(p => p.name).join(', ')} · Total: ₹{b.totalAmount?.toFixed(2)}
                        </div>
                        {b.refundAmount > 0 && (
                          <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginTop: 4 }}>
                            ✓ Refunded Amount: ₹{b.refundAmount?.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelBooking(b.bookingId)}
                          style={{ padding: '8px 16px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CONCURRENCY SIMULATION */}
        {/* =================================================================== */}
        {activeTab === 'simulation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                    🕹️ Concurrency & Seat Collision Simulation
                  </h2>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Testing per-seat ReentrantLocks, multi-seat atomic rollback, and tiered cancellation refund policies.
                  </div>
                </div>
                <button
                  onClick={handleSimReset}
                  disabled={simLoading}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#334155', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  🔄 Reset Simulation
                </button>
              </div>

              {/* 8-Step Guided Walkthrough */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {SIM_STEPS.map((s, i) => (
                    <div
                      key={s.label}
                      title={s.label}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800,
                        background: i < simStep ? '#10b981' : i === simStep ? '#0284c7' : 'var(--bg-secondary)',
                        color: i <= simStep ? '#fff' : 'var(--text-muted)',
                        border: i === simStep ? '2px solid #38bdf8' : '1px solid var(--border-primary)',
                      }}
                    >
                      {i < simStep ? '✓' : i + 1}
                    </div>
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>
                    Step {Math.min(simStep + 1, SIM_STEPS.length)} / {SIM_STEPS.length}
                  </span>
                </div>
                {simStep < SIM_STEPS.length ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {SIM_STEPS[simStep].label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {SIM_STEPS[simStep].hint}
                    </div>
                    <button
                      onClick={runGuidedStep}
                      disabled={simGuidedBusy}
                      style={{
                        padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: 13,
                        background: '#0284c7',
                        color: '#fff', cursor: simGuidedBusy ? 'wait' : 'pointer', opacity: simGuidedBusy ? 0.6 : 1,
                      }}
                    >
                      {simGuidedBusy ? 'Running…' : simStep === 0 ? '▶ Start Walkthrough' : `▶ Run Step ${simStep + 1}`}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                    ✓ Walkthrough complete — inspect the cabin, HUD and event log below, or Reset to run it again.
                  </div>
                )}
              </div>

              {/* Live Telemetry HUD */}
              {simSnapshots?.flights?.[0] && (() => {
                const cabinSeats = simSnapshots.flights[0].seats || [];
                const available = cabinSeats.filter(s => s.status === 'AVAILABLE').length;
                const held = cabinSeats.filter(s => s.status === 'HELD').length;
                const booked = cabinSeats.filter(s => s.status === 'BOOKED').length;
                const lastEvent = simEvents[simEvents.length - 1];
                const collisions = simEvents.filter(e => e.type.includes('COLLISION')).length;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Available', value: available, color: '#10b981' },
                      { label: 'Held', value: held, color: '#eab308' },
                      { label: 'Booked', value: booked, color: '#ef4444' },
                      { label: 'Collisions Blocked', value: collisions, color: '#f87171' },
                      { label: 'Total Events', value: simEvents.length, color: '#38bdf8' },
                      { label: 'Last Event', value: lastEvent ? lastEvent.type.replaceAll('_', ' ') : '—', color: '#a855f7', small: true },
                    ].map(tile => (
                      <div key={tile.label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: tile.small ? 12 : 20, fontWeight: 800, color: tile.color }}>{tile.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{tile.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Manual Sandbox Controls (free-form experimentation beyond the guided script) */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                Manual Sandbox Controls
              </div>
              {/* Simulation Controls Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, background: 'var(--bg-primary)', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                {/* 1. Hold Seats Collision */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#eab308', marginBottom: 8 }}>1. Trigger Seat Hold / Race Collision</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <select
                      value={simUserId}
                      onChange={e => setSimUserId(e.target.value)}
                      style={{ flex: 1, padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value="Sim-Alice">Alice (Thread A)</option>
                      <option value="Sim-Bob">Bob (Thread B)</option>
                      <option value="Sim-Charlie">Charlie (Thread C)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Seats (e.g. 12A,12B)"
                      value={simSelectedSeats.join(',')}
                      onChange={e => setSimSelectedSeats(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      style={{ width: 110, padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={simFareType}
                      onChange={e => setSimFareType(e.target.value)}
                      title="Which RefundPolicy governs a future cancellation of this booking"
                      style={{ width: '100%', padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value="FLEXIBLE">FLEXIBLE fare (tiered refund)</option>
                      <option value="BASIC">BASIC fare (non-refundable)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleSimHold}
                      style={{ flex: 1, padding: '6px', borderRadius: 6, background: '#0284c7', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                    >
                      Hold Seats
                    </button>
                    <button
                      onClick={handleSimBook}
                      style={{ flex: 1, padding: '6px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                    >
                      Commit Booking
                    </button>
                  </div>
                </div>

                {/* 2. Hold TTL Expiration Test */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>2. Force Hold Expiry (TTL)</div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                    Simulates background TTL cleanup reverting all uncommitted HELD seats back to AVAILABLE.
                  </p>
                  <button
                    onClick={handleSimExpire}
                    style={{ width: '100%', padding: '6px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                  >
                    Trigger Stale Hold Expiration
                  </button>
                </div>

                {/* 3. Fare-Aware Cancellation Refund */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', marginBottom: 8 }}>3. Test Fare-Aware Refund Policy</div>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                    Same notice window, different result: FLEXIBLE follows the tiered schedule, BASIC always refunds ₹0.
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <select
                      value={simCancelHours}
                      onChange={e => setSimCancelHours(parseInt(e.target.value))}
                      style={{ flex: 1, padding: 6, borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value={30}>&gt;24h Out (FLEXIBLE: 100%)</option>
                      <option value={12}>12h Out (FLEXIBLE: 50%)</option>
                      <option value={1}>1h Out (FLEXIBLE: 0%)</option>
                    </select>
                  </div>
                  {simSnapshots?.bookings?.filter(b => b.status === 'CONFIRMED').map(b => (
                    <button
                      key={b.bookingId}
                      onClick={() => handleSimCancel(b.bookingId)}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: 4, background: '#a855f7', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', fontWeight: 600, marginTop: 4 }}
                    >
                      Cancel {b.bookingId} ({b.fareType}) at T-{simCancelHours}h
                    </button>
                  ))}
                </div>
              </div>

              {/* 2D Aircraft Cabin Visualizer & Log */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Aircraft Cabin */}
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    ✈️ Boeing 737 Simulation Cabin (AI202)
                  </div>

                  {simSnapshots?.flights?.[0] && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 36px)', gap: 6, justifyContent: 'center' }}>
                      {simSnapshots.flights[0].seats?.map(seat => {
                        let bg = '#10b981';
                        if (seat.status === 'BOOKED') bg = '#ef4444';
                        else if (seat.status === 'HELD') bg = '#eab308';

                        return (
                          <div
                            key={seat.seatNumber}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 4,
                              background: bg,
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: seat.status === 'BOOKED' ? 0.35 : 1,
                            }}
                          >
                            {seat.seatNumber}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Simulation Event Stream */}
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    Live Simulation Event Stream ({simEvents.length})
                  </div>
                  <div style={{ flex: 1, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {simEvents.slice().reverse().map(ev => (
                      <div key={ev.id} style={{
                        background: 'var(--bg-secondary)',
                        padding: '8px 10px',
                        borderRadius: 6,
                        borderLeft: `3px solid ${ev.type.includes('COLLISION') || ev.type.includes('FAILED') ? '#ef4444' : '#10b981'}`,
                        fontSize: 11
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 10 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ev.type}</span>
                          <span>{ev.timestamp}</span>
                        </div>
                        <div style={{ marginTop: 2, color: '#cbd5e1' }}>{ev.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CLASS DIAGRAM */}
        {/* =================================================================== */}
        {activeTab === 'diagram' && <ClassDiagram module="airline" />}

        {/* =================================================================== */}
        {/* TAB 5: SEQUENCE DIAGRAM */}
        {/* =================================================================== */}
        {activeTab === 'sequence' && <SequenceDiagram module="airline" />}

        {/* =================================================================== */}
        {/* TAB 6: DESIGN DETAILS */}
        {/* =================================================================== */}
        {activeTab === 'details' && <DesignDetails module="airline" />}
      </main>
    </div>
  );
}
