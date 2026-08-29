import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getMovies, getShows, getSeats, holdSeats, bookSeats, cancelBooking, getUserBookings, getUsers,
  simReset, simGetSeats, simGetEvents, simHold, simBook, simExpire, simCancel
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import SequenceDiagram from '../../components/SequenceDiagram';
import DesignDetails from '../../components/DesignDetails';
import ThemeToggle from '../../components/ThemeToggle';

const MOVIE_POSTERS = {
  'Inception': { bg: 'linear-gradient(135deg, #2c3e50, #000000)', emoji: '🌀' },
  'The Dark Knight': { bg: 'linear-gradient(135deg, #1a1a2e, #16213e)', emoji: '🦇' },
  'Interstellar': { bg: 'linear-gradient(135deg, #0d1b2a, #1b263b)', emoji: '🚀' },
};

export default function MovieTicketPage() {
  const [activeTab, setActiveTab] = useState('booking');

  // Booking Flow State
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [heldHoldData, setHeldHoldData] = useState(null);
  const [holdTimeLeft, setHoldTimeLeft] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const [currentUser, setCurrentUser] = useState('user1');
  const [users, setUsers] = useState([]);

  // User History State
  const [userBookings, setUserBookings] = useState([]);

  // Status & Notifications
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Simulation State
  const [simStep, setSimStep] = useState(0);
  const [simSeats, setSimSeats] = useState([]);
  const [simEvents, setSimEvents] = useState([]);
  const [simAutoPlay, setSimAutoPlay] = useState(false);
  const simTimerRef = useRef(null);

  // Load initial movies and users
  useEffect(() => {
    getMovies().then(data => setMovies(data || [])).catch(() => {});
    getUsers().then(data => setUsers(data || [])).catch(() => {});
  }, []);

  // Poll seats when a show is selected in main booking flow
  useEffect(() => {
    if (!selectedShow) return;
    const fetchSeats = () => {
      getSeats(selectedShow.id)
        .then(data => setSeats(data || []))
        .catch(() => {});
    };
    fetchSeats();
    const interval = setInterval(fetchSeats, 3000);
    return () => clearInterval(interval);
  }, [selectedShow]);

  // Hold countdown timer
  useEffect(() => {
    if (!heldHoldData) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const expires = heldHoldData.expiresAt;
      const rem = Math.max(0, Math.floor((expires - now) / 1000));
      setHoldTimeLeft(rem);
      if (rem <= 0) {
        setHeldHoldData(null);
        setSelectedSeatIds([]);
        showToast('⚠️ Hold expired! Seats have been released.', 'error');
        if (selectedShow) getSeats(selectedShow.id).then(setSeats);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [heldHoldData, selectedShow]);

  // Fetch user bookings on history tab
  useEffect(() => {
    if (activeTab === 'history') {
      getUserBookings(currentUser).then(data => setUserBookings(data || []));
    }
  }, [activeTab, currentUser]);

  const showToast = (msg, type = 'info') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Select Movie -> fetch shows
  const handleSelectMovie = async (movie) => {
    setSelectedMovie(movie);
    setSelectedShow(null);
    setSeats([]);
    setSelectedSeatIds([]);
    setHeldHoldData(null);
    setBookingConfirmed(null);
    try {
      const data = await getShows(movie.id);
      setShows(data || []);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to load shows');
    }
  };

  // Select Show -> fetch seats
  const handleSelectShow = async (show) => {
    setSelectedShow(show);
    setSelectedSeatIds([]);
    setHeldHoldData(null);
    setBookingConfirmed(null);
    try {
      const data = await getSeats(show.id);
      setSeats(data || []);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to load seats');
    }
  };

  // Seat toggle selection
  const handleSeatClick = (seat) => {
    if (seat.status !== 'AVAILABLE' && !(seat.status === 'HELD' && seat.heldByUserId === currentUser)) {
      showToast(`Seat ${seat.row}${String.fromCharCode(64 + seat.col)} is ${seat.status.toLowerCase()} by another user`, 'error');
      return;
    }
    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(selectedSeatIds.filter(id => id !== seat.id));
    } else {
      setSelectedSeatIds([...selectedSeatIds, seat.id]);
    }
  };

  // Hold Seats Action
  const handleHoldSeats = async () => {
    if (!selectedShow || selectedSeatIds.length === 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await holdSeats(selectedShow.id, selectedSeatIds, currentUser);
      setHeldHoldData(res);
      setHoldTimeLeft(300);
      showToast(`⚡ ${selectedSeatIds.length} seat(s) held! Complete payment within 5 minutes.`, 'success');
      const updatedSeats = await getSeats(selectedShow.id);
      setSeats(updatedSeats);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to hold seats. Someone else may have grabbed them.');
      showToast(e.message || 'Hold failed', 'error');
      if (selectedShow) getSeats(selectedShow.id).then(setSeats);
    } finally {
      setLoading(false);
    }
  };

  // Confirm Booking Action
  const handleBookSeats = async () => {
    if (!selectedShow || selectedSeatIds.length === 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const idempotencyKey = `KEY-${currentUser}-${Date.now()}`;
      const res = await bookSeats(selectedShow.id, selectedSeatIds, currentUser, paymentMethod, idempotencyKey);
      setBookingConfirmed(res);
      setHeldHoldData(null);
      setSelectedSeatIds([]);
      showToast(`🎟️ Booking Confirmed! ID: #${res.id}`, 'success');
      const updatedSeats = await getSeats(selectedShow.id);
      setSeats(updatedSeats);
    } catch (e) {
      setErrorMsg(e.message || 'Booking failed');
      showToast(e.message || 'Booking failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel Booking Action
  const handleCancelBooking = async (bookingId) => {
    setLoading(true);
    try {
      await cancelBooking(bookingId);
      showToast(`Cancelled booking #${bookingId}. Seats returned to AVAILABLE.`, 'info');
      const list = await getUserBookings(currentUser);
      setUserBookings(list || []);
    } catch (e) {
      showToast(e.message || 'Cancellation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // SIMULATION CONTROLS & SCRIPTED STEPS
  // =========================================================================

  const runSimStep = async (stepNumber) => {
    setSimStep(stepNumber);
    try {
      if (stepNumber === 0) {
        await simReset();
        const s = await simGetSeats(1);
        setSimSeats(s || []);
      } else if (stepNumber === 1) {
        // Alice holds P1, P2 (seats 1, 2)
        await simHold(1, [1, 2], 'user1', 'Alice 👩');
      } else if (stepNumber === 2) {
        // Bob tries to hold P2, P3 (seats 2, 3) -> CONFLICT!
        try {
          await simHold(1, [2, 3], 'user2', 'Bob 👨');
        } catch (ignored) {}
      } else if (stepNumber === 3) {
        // Bob retries with G1, G2 (seats 7, 8) -> SUCCESS
        await simHold(1, [7, 8], 'user2', 'Bob 👨');
      } else if (stepNumber === 4) {
        // Alice confirms payment for P1, P2 -> BOOKED
        await simBook(1, [1, 2], 'user1', 'Alice 👩');
      } else if (stepNumber === 5) {
        // Charlie holds S1, S2 (seats 19, 20)
        await simHold(1, [19, 20], 'user3', 'Charlie 🧑');
      } else if (stepNumber === 6) {
        // System simulates Hold TTL Timeout on Charlie's hold
        await simExpire(1, [19, 20], 'System ⏱');
      } else if (stepNumber === 7) {
        // Diana holds & books S1 (19), Alice cancels booking P1, P2
        await simHold(1, [19], 'user4', 'Diana 👧');
        await simBook(1, [19], 'user4', 'Diana 👧');
        await simCancel(1, 'Alice 👩');
      }
      const updatedSeats = await simGetSeats(1);
      const updatedEvents = await simGetEvents();
      setSimSeats(updatedSeats || []);
      setSimEvents(updatedEvents || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulation') {
      runSimStep(0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (simAutoPlay) {
      simTimerRef.current = setInterval(() => {
        setSimStep(prev => {
          if (prev >= 7) {
            setSimAutoPlay(false);
            return prev;
          }
          const next = prev + 1;
          runSimStep(next);
          return next;
        });
      }, 3500);
    } else {
      clearInterval(simTimerRef.current);
    }
    return () => clearInterval(simTimerRef.current);
  }, [simAutoPlay]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '24px' }}>
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14,
          background: toastMsg.type === 'error' ? '#ef4444' : toastMsg.type === 'success' ? '#10b981' : '#3b82f6',
          color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', animation: 'slideIn 0.3s ease-out'
        }}>
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/" style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Back to Portfolio</Link>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '4px 0', background: 'linear-gradient(90deg, #a78bfa, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🎬 BookMyShow — Movie Ticket Booking LLD
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            Thread-Safe Cinema Reservations • Per-Seat Granularity Locks • Double-Booking Prevention & Hold TTL
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={currentUser}
            onChange={e => setCurrentUser(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: 8, fontSize: 13 }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>👤 User: {u.name} ({u.id})</option>
            ))}
          </select>
          <ThemeToggle />
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ maxWidth: 1200, margin: '0 auto 24px auto', display: 'flex', gap: 8, borderBottom: '1px solid #334155', paddingBottom: 12 }}>
        {[
          { id: 'booking', label: '🎬 Movies & Booking' },
          { id: 'history', label: '📊 Booking History' },
          { id: 'simulation', label: '🕹️ Concurrency Simulation' },
          { id: 'diagram', label: '📐 Class Diagram' },
          { id: 'sequence', label: '🔄 Sequence Diagram' },
          { id: 'design', label: '📋 Design Details' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              background: activeTab === tab.id ? '#8b5cf6' : '#1e293b',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ========================================================================= */}
        {/* TAB 1: MOVIES & BOOKING FLOW */}
        {/* ========================================================================= */}
        {activeTab === 'booking' && (
          <div>
            {!selectedMovie ? (
              // Step 1: Browse Movies Grid
              <div>
                <h2 style={{ fontSize: 20, marginBottom: 16, color: '#a78bfa' }}>Now Showing Movies</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {movies.map(movie => {
                    const poster = MOVIE_POSTERS[movie.title] || { bg: '#1e293b', emoji: '🎬' };
                    return (
                      <div
                        key={movie.id}
                        onClick={() => handleSelectMovie(movie)}
                        style={{
                          background: '#1e293b', borderRadius: 16, padding: 20, cursor: 'pointer', border: '1px solid #334155',
                          transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{
                          height: 140, background: poster.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 54, marginBottom: 16
                        }}>
                          {poster.emoji}
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px 0' }}>{movie.title}</h3>
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px 0' }}>{movie.genre} • {movie.duration} mins • {movie.language || 'English'}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ background: '#f59e0b', color: '#000', padding: '4px 10px', borderRadius: 6, fontWeight: 800, fontSize: 13 }}>⭐ {movie.rating}</span>
                          <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: 14 }}>Select Show →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !selectedShow ? (
              // Step 2: Select Show Timing
              <div>
                <button
                  onClick={() => setSelectedMovie(null)}
                  style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 16 }}
                >
                  ← Back to Movies
                </button>
                <div style={{ background: '#1e293b', padding: 24, borderRadius: 16, border: '1px solid #334155', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, color: '#a78bfa', margin: '0 0 8px 0' }}>{selectedMovie.title}</h2>
                  <p style={{ color: '#94a3b8', margin: 0 }}>{selectedMovie.genre} • {selectedMovie.duration} mins • Rated ⭐ {selectedMovie.rating}</p>
                </div>

                <h3 style={{ fontSize: 18, marginBottom: 16 }}>Available Showtimes</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {shows.map(show => (
                    <div
                      key={show.id}
                      onClick={() => handleSelectShow(show)}
                      style={{
                        background: '#1e293b', border: '2px solid #334155', borderRadius: 12, padding: 20, cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>{show.screen}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6', marginBottom: 8 }}>🕒 {show.showTime}</div>
                      <div style={{ fontSize: 13, color: show.availableSeats > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {show.availableSeats > 0 ? `🟢 ${show.availableSeats} / ${show.totalSeats} seats available` : '🔴 Sold Out'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Step 3: Live Seat Map Grid & Booking Controls
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <button
                    onClick={() => setSelectedShow(null)}
                    style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    ← Back to Shows
                  </button>
                  <div style={{ fontSize: 14, color: '#94a3b8' }}>
                    Show: <strong style={{ color: '#fff' }}>{selectedMovie.title} ({selectedShow.showTime})</strong>
                  </div>
                </div>

                {/* Seat Map Display Card */}
                <div style={{ background: '#1e293b', borderRadius: 20, padding: 28, border: '1px solid #334155' }}>
                  {/* Screen Header */}
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                      height: 12, background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)',
                      borderRadius: 6, marginBottom: 8, boxShadow: '0 0 20px #8b5cf6'
                    }} />
                    <span style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>🎬 CINEMA SCREEN THIS WAY</span>
                  </div>

                  {/* Seat Grid */}
                  <div style={{ maxWidth: 640, margin: '0 auto 32px auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                      {seats.map(seat => {
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const isHeldByMe = seat.status === 'HELD' && seat.heldByUserId === currentUser;
                        let bg = '#334155';
                        let border = '#475569';
                        let textColor = '#f8fafc';

                        if (isSelected) {
                          bg = '#3b82f6'; border = '#60a5fa'; textColor = '#fff';
                        } else if (seat.status === 'BOOKED') {
                          bg = '#ef4444'; border = '#dc2626'; textColor = '#fff';
                        } else if (seat.status === 'HELD') {
                          bg = isHeldByMe ? '#f59e0b' : '#64748b'; border = isHeldByMe ? '#d97706' : '#475569';
                        } else if (seat.status === 'AVAILABLE') {
                          border = seat.seatType === 'GOLD' ? '#eab308' : '#94a3b8';
                          bg = 'transparent';
                        }

                        const seatLabel = `${seat.row}${String.fromCharCode(64 + seat.col)}`;

                        return (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            disabled={seat.status === 'BOOKED' || (seat.status === 'HELD' && !isHeldByMe)}
                            style={{
                              aspectRatio: '1', borderRadius: 8, border: `2px solid ${border}`, background: bg, color: textColor,
                              cursor: (seat.status === 'BOOKED' || (seat.status === 'HELD' && !isHeldByMe)) ? 'not-allowed' : 'pointer',
                              fontWeight: 700, fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s', opacity: (seat.status === 'HELD' && !isHeldByMe) ? 0.4 : 1
                            }}
                          >
                            <span>{seatLabel}</span>
                            <span style={{ fontSize: 9, opacity: 0.8 }}>₹{seat.price}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid #eab308' }} /> Gold (₹350)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid #94a3b8' }} /> Silver (₹200)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: 3, background: '#3b82f6' }} /> Selected</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: 3, background: '#f59e0b' }} /> Held (You)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: 3, background: '#ef4444' }} /> Booked</div>
                  </div>

                  {/* Action Panel */}
                  <div style={{ marginTop: 24, padding: 20, background: '#0f172a', borderRadius: 12, border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, color: '#94a3b8' }}>Selected Seats: <strong style={{ color: '#fff' }}>{selectedSeatIds.length}</strong></div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>
                        Total: ₹{seats.filter(s => selectedSeatIds.includes(s.id)).reduce((acc, s) => acc + s.price, 0).toFixed(2)}
                      </div>
                    </div>

                    {!heldHoldData ? (
                      <button
                        onClick={handleHoldSeats}
                        disabled={loading || selectedSeatIds.length === 0}
                        style={{
                          padding: '12px 32px', background: selectedSeatIds.length > 0 ? '#f59e0b' : '#475569', color: '#000',
                          fontWeight: 700, fontSize: 15, borderRadius: 10, border: 'none', cursor: selectedSeatIds.length > 0 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {loading ? 'Holding Seats...' : '⚡ Hold Seats (5m TTL)'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>⏱ Hold Expires In:</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: holdTimeLeft < 60 ? '#ef4444' : '#f59e0b' }}>
                            {Math.floor(holdTimeLeft / 60)}:{(holdTimeLeft % 60).toString().padStart(2, '0')}
                          </div>
                        </div>

                        <select
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                          style={{ padding: '10px 14px', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: 8, fontSize: 13 }}
                        >
                          <option value="UPI">Pay via UPI</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                          <option value="DEBIT_CARD">Debit Card</option>
                          <option value="NET_BANKING">Net Banking</option>
                        </select>

                        <button
                          onClick={handleBookSeats}
                          disabled={loading}
                          style={{
                            padding: '12px 28px', background: '#10b981', color: '#fff',
                            fontWeight: 700, fontSize: 15, borderRadius: 10, border: 'none', cursor: 'pointer'
                          }}
                        >
                          {loading ? 'Confirming...' : '🎟️ Pay & Book Now'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Confirmation Ticket Modal */}
                {bookingConfirmed && (
                  <div style={{
                    marginTop: 24, padding: 24, background: 'linear-gradient(135deg, #065f46, #047857)', borderRadius: 16,
                    color: '#fff', border: '2px solid #34d399', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                    <h2 style={{ fontSize: 22, margin: '0 0 4px 0' }}>Booking Confirmed!</h2>
                    <p style={{ opacity: 0.9, fontSize: 14 }}>Booking ID: #{bookingConfirmed.id} • User: {bookingConfirmed.userId}</p>
                    <div style={{ fontSize: 28, fontWeight: 900, margin: '12px 0' }}>₹{bookingConfirmed.totalAmount.toFixed(2)}</div>
                    <p style={{ fontSize: 13, opacity: 0.9 }}>Payment: {bookingConfirmed.paymentMethod} • Status: CONFIRMED</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BOOKING HISTORY */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 16, color: '#a78bfa' }}>Booking History ({currentUser})</h2>
            {userBookings.length === 0 ? (
              <div style={{ background: '#1e293b', padding: 40, borderRadius: 16, textAlign: 'center', color: '#94a3b8' }}>
                No active bookings found for user {currentUser}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {userBookings.map(b => (
                  <div key={b.id} style={{
                    background: '#1e293b', padding: 20, borderRadius: 12, border: '1px solid #334155',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>Booking #{b.id}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                        Seats: {b.seatIds?.join(', ')} • Amount: ₹{b.totalAmount.toFixed(2)} • Time: {new Date(b.bookingTime).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{
                        padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 12,
                        background: b.bookingStatus === 'CONFIRMED' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                        color: b.bookingStatus === 'CONFIRMED' ? '#10b981' : '#ef4444'
                      }}>
                        {b.bookingStatus}
                      </span>

                      {b.bookingStatus === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: INTERACTIVE 2D CONCURRENCY SIMULATION */}
        {/* ========================================================================= */}
        {activeTab === 'simulation' && (
          <div>
            {/* Control Bar */}
            <div style={{ background: '#1e293b', padding: 20, borderRadius: 16, border: '1px solid #334155', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#a78bfa' }}>8-Step Concurrency & Double-Booking Simulation</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
                  Watch simulated users (Alice 👩, Bob 👨, Charlie 🧑, Diana 👧) compete for seats concurrently.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => runSimStep(0)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                  ⏮ Reset Sim
                </button>
                <button
                  onClick={() => setSimAutoPlay(!simAutoPlay)}
                  style={{ background: simAutoPlay ? '#ef4444' : '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                  {simAutoPlay ? '⏸ Pause' : '▶ Auto-Play'}
                </button>
                <button
                  onClick={() => runSimStep(Math.min(7, simStep + 1))}
                  disabled={simStep >= 7}
                  style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, cursor: simStep < 7 ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                >
                  Next Step ({simStep}/7) →
                </button>
              </div>
            </div>

            {/* Stage Grid & Event Timeline Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
              {/* Left: Theatre Seat Canvas */}
              <div style={{ background: '#0f172a', borderRadius: 16, padding: 24, border: '1px solid #334155' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ height: 10, background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)', borderRadius: 5, marginBottom: 6 }} />
                  <span style={{ fontSize: 11, letterSpacing: 2, color: '#94a3b8', fontWeight: 700 }}>🎬 SIMULATION STAGE</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, maxWidth: 480, margin: '0 auto 24px auto' }}>
                  {simSeats.map(seat => {
                    let bg = '#1e293b';
                    let border = '#334155';
                    let textColor = '#94a3b8';

                    if (seat.status === 'BOOKED') {
                      bg = '#ef4444'; border = '#dc2626'; textColor = '#fff';
                    } else if (seat.status === 'HELD') {
                      bg = '#f59e0b'; border = '#d97706'; textColor = '#000';
                    } else {
                      border = seat.seatType === 'GOLD' ? '#eab308' : '#475569';
                    }

                    const label = `${seat.row}${String.fromCharCode(64 + seat.col)}`;

                    return (
                      <div
                        key={seat.id}
                        style={{
                          aspectRatio: '1', borderRadius: 8, border: `2px solid ${border}`, background: bg, color: textColor,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12, transition: 'all 0.3s'
                        }}
                      >
                        <span>{label}</span>
                        {seat.heldByUserId && (
                          <span style={{ fontSize: 8, marginTop: 2, opacity: 0.9 }}>
                            {seat.heldByUserId === 'user1' ? '👩' : seat.heldByUserId === 'user2' ? '👨' : seat.heldByUserId === 'user3' ? '🧑' : '👧'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* HUD Stats */}
                <div style={{ display: 'flex', justifyContent: 'space-around', background: '#1e293b', padding: 12, borderRadius: 10, fontSize: 13 }}>
                  <div>🟢 Available: <strong style={{ color: '#10b981' }}>{simSeats.filter(s => s.status === 'AVAILABLE').length}</strong></div>
                  <div>🟡 Held: <strong style={{ color: '#f59e0b' }}>{simSeats.filter(s => s.status === 'HELD').length}</strong></div>
                  <div>🔴 Booked: <strong style={{ color: '#ef4444' }}>{simSeats.filter(s => s.status === 'BOOKED').length}</strong></div>
                </div>
              </div>

              {/* Right: Simulation Event Log */}
              <div style={{ background: '#1e293b', borderRadius: 16, padding: 20, border: '1px solid #334155', maxHeight: 520, overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#a78bfa' }}>📜 Event Log Timeline</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {simEvents.slice().reverse().map(e => (
                    <div key={e.id} style={{
                      padding: 12, borderRadius: 8, background: '#0f172a', borderLeft: `4px solid ${
                        e.eventType.includes('SUCCESS') || e.eventType.includes('CONFIRMED') ? '#10b981' :
                        e.eventType.includes('FAILED') ? '#ef4444' : '#f59e0b'
                      }`
                    }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{e.actorName}</strong>
                        <span>{e.eventType}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#f8fafc', marginTop: 4 }}>{e.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CLASS DIAGRAM */}
        {/* ========================================================================= */}
        {activeTab === 'diagram' && <ClassDiagram module="movieticket" />}

        {/* ========================================================================= */}
        {/* TAB 5: SEQUENCE DIAGRAM */}
        {/* ========================================================================= */}
        {activeTab === 'sequence' && <SequenceDiagram module="movieticket" />}

        {/* ========================================================================= */}
        {/* TAB 6: DESIGN DETAILS */}
        {/* ========================================================================= */}
        {activeTab === 'design' && <DesignDetails module="movieticket" />}
      </div>
    </div>
  );
}
