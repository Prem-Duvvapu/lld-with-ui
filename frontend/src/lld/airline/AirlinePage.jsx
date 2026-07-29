import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getFlights, searchFlights, getSeats, bookFlight, checkInBooking, getBooking } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const CSS = `
.airline-app { max-width: 1100px; margin: 0 auto; padding: 20px; }
.airline-header { text-align: center; margin-bottom: 20px; }
.airline-header h1 { font-size: 28px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.airline-header p { color: var(--text-muted); font-size: 14px; }
.airline-nav { display: flex; gap: 6px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }
.airline-nav button { padding: 8px 18px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.airline-nav button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.airline-nav button:hover:not(.active) { background: var(--border-primary); }
.airline-main { background: var(--bg-secondary); border-radius: 12px; padding: 24px; border: 1px solid var(--border-primary); }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-muted); text-decoration: none; font-size: 13px; transition: all 0.2s; }
.back-home:hover { border-color: var(--accent); color: var(--accent); }
.form-card { max-width: 500px; margin: 0 auto; }
.form-card h2 { margin-bottom: 16px; font-size: 18px; color: var(--info); }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary); transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
.btn-primary { width: 100%; padding: 12px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102,126,234,0.3); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-secondary { padding: 8px 16px; background: var(--accent); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; margin: 0 4px; }
.btn-secondary:hover { opacity: 0.9; }
.result-card { margin-top: 16px; padding: 16px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-primary); }
.result-card h3 { margin-bottom: 10px; font-size: 15px; color: var(--info); }
.result-card .detail { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid var(--border-secondary); }
.result-card .detail:last-child { border-bottom: none; }
.result-card .label { color: var(--text-muted); } .result-card .value { font-weight: 600; color: var(--text-primary); }
.error { margin-top: 12px; padding: 10px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; border: 1px solid var(--danger-bg); font-size: 13px; }
.flight-list { display: flex; flex-direction: column; gap: 12px; }
.flight-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; }
.flight-card:hover { border-color: var(--accent); }
.flight-card .flight-no { font-weight: 700; color: var(--text-primary); }
.flight-card .airline { color: var(--text-muted); font-size: 13px; }
.flight-card .route { font-size: 16px; margin: 6px 0; color: var(--info); }
.flight-card .time { font-size: 12px; color: var(--text-muted); }
.flight-card .fare { font-size: 20px; font-weight: 700; color: var(--accent); }
.seat-map { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 16px 0; }
.seat-row { display: flex; gap: 4px; align-items: center; }
.seat-row-label { width: 20px; font-size: 11px; color: var(--text-muted); text-align: center; }
.seat-cell { width: 34px; height: 34px; border-radius: 4px; border: 1px solid var(--border-primary); display: flex; align-items: center; justify-content: center; font-size: 9px; cursor: pointer; transition: all 0.2s; background: var(--bg-tertiary); color: var(--text-muted); }
.seat-cell.available { background: var(--success-bg); border-color: var(--success); color: var(--success); }
.seat-cell.available:hover { background: var(--success); color: #fff; }
.seat-cell.selected { background: var(--accent); border-color: var(--accent); color: #fff; }
.seat-cell.booked { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); cursor: not-allowed; }
.seat-cell.economy { border-color: #4ecdc4; } .seat-cell.business { border-color: #ffd700; } .seat-cell.first { border-color: #ff6b6b; }
.seat-gap { width: 12px; }
.flow-section { display: flex; flex-direction: column; align-items: center; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.step-dot.done { background: var(--success); }
.airport-scene { position: relative; width: 100%; height: 340px; background: linear-gradient(180deg, #0f0c29, #1a1a3e); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-primary); margin-bottom: 16px; }
.airport-terminal { position: absolute; left: 20px; top: 20px; width: 120px; height: 100px; background: #2a3a6a; border-radius: 8px; border: 1px solid #4a6a9a; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.8s; }
.airport-terminal .term-name { color: #ffd700; font-size: 10px; font-weight: 700; letter-spacing: 1px; }
.airport-terminal .term-label { color: #8899bb; font-size: 9px; }
.airport-terminal .flight-info { font-size: 9px; color: #4ecdc4; margin-top: 4px; }
.airplane { position: absolute; right: 30px; top: 30px; width: 200px; height: 100px; background: #2a3a5a; border-radius: 50px 50px 20px 20px; border: 2px solid #4a6a9a; transition: all 0.8s; overflow: hidden; }
.airplane .cockpit { position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 30px; height: 16px; background: #4a6a9a; border-radius: 50%; }
.airplane .tail { position: absolute; bottom: 0; right: -10px; width: 0; height: 0; border-left: 20px solid transparent; border-right: 20px solid transparent; border-bottom: 40px solid #4a6a9a; }
.airplane .engines { position: absolute; bottom: -6px; left: 30%; width: 12px; height: 8px; background: #888; border-radius: 0 0 6px 6px; } .airplane .engines.e2 { left: 60%; }
.airplane-windows { position: absolute; top: 30px; left: 20px; right: 20px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.airplane-window { width: 16px; height: 16px; background: #1a2a4a; border: 1px solid #4a6a9a; border-radius: 3px; transition: all 0.5s; }
.airplane-window.lit { background: #ffd700; box-shadow: 0 0 6px rgba(255,215,0,0.3); }
.airplane-window.booked { background: #ff6b6b; }
.runway { position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: #2d2d2d; border-top: 2px solid #555; }
.runway-line { position: absolute; bottom: 18px; left: 0; right: 0; height: 1px; background: repeating-linear-gradient(90deg, #fff 0px, #fff 15px, transparent 15px, transparent 30px); opacity: 0.2; }
.airport-departure { position: absolute; left: 50%; transform: translateX(-50%); top: 10px; font-size: 9px; color: #4ecdc4; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 4px; z-index: 3; transition: all 0.5s; }
.flow-btn { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; color: #fff; margin: 0 4px; }
.flow-btn:hover { transform: translateY(-2px); }
.flow-btn.primary { background: var(--accent-gradient); }
.flow-btn.success { background: var(--success); }
.flow-btn.danger { background: var(--danger); }
.flow-btn.warning { background: var(--warning); }
.flow-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.airport-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); border: 2px solid var(--accent); border-radius: 12px; padding: 20px; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 220px; text-align: center; animation: popIn 0.5s ease-out; }
@keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.airport-popup.done { border-color: var(--success); }
.airport-popup h3 { color: var(--info); margin-bottom: 8px; font-size: 16px; }
.airport-popup .detail { font-size: 12px; color: var(--text-secondary); padding: 3px 0; }
.passenger-icon { position: absolute; font-size: 26px; z-index: 5; transition: all 1s cubic-bezier(0.4, 0, 0.2, 1); }
`;

function FlightsTab() {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerName, setPassengerName] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');

  useEffect(() => {
    getFlights().then(setFlights).catch(() => setError('Failed to load flights'));
  }, []);

  const doSearch = async () => {
    if (!source || !dest) return;
    setError('');
    try {
      const data = await searchFlights(source, dest);
      setFlights(data);
    } catch { setError('Search failed'); }
  };

  const selectFlight = async (flight) => {
    setSelectedFlight(flight);
    setSelectedSeats([]);
    setBookingResult(null);
    setError('');
    try {
      const data = await getSeats(flight.id);
      setSeats(data);
    } catch { setError('Failed to load seats'); }
  };

  const toggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE') return;
    setSelectedSeats((prev) => {
      if (prev.find((s) => s.id === seat.id)) return prev.filter((s) => s.id !== seat.id);
      return [...prev, seat];
    });
  };

  const doBook = async () => {
    if (!passengerName || selectedSeats.length === 0) { setError('Fill name and select seats'); return; }
    setError(''); setLoading(true);
    try {
      const data = await bookFlight(selectedFlight.id, selectedSeats.map(s => s.id), 'user1', passengerName);
      if (data.error) setError(data.error);
      else { setBookingResult(data); setPassengerName(''); }
    } catch { setError('Booking failed'); }
    finally { setLoading(false); }
  };

  const seatClassColor = { ECONOMY: '#4ecdc4', BUSINESS: '#ffd700', FIRST: '#ff6b6b' };

  const rows = {};
  seats.forEach(s => {
    if (!rows[s.row]) rows[s.row] = [];
    rows[s.row].push(s);
  });

  return (
    <div>
      {!selectedFlight ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Source (e.g. Mumbai)" value={source} onChange={(e) => setSource(e.target.value)}
              style={{ flex: 1, minWidth: 120, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
            <input type="text" placeholder="Destination (e.g. Delhi)" value={dest} onChange={(e) => setDest(e.target.value)}
              style={{ flex: 1, minWidth: 120, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
            <button onClick={doSearch} className="btn-secondary">✈️ Search</button>
          </div>
          <div className="flight-list">
            {flights.map((f) => (
              <div key={f.id} className="flight-card" onClick={() => selectFlight(f)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><span className="flight-no">{f.flightNumber}</span> <span className="airline">{f.airline}</span></div>
                  <div className="fare">₹{f.fare.toLocaleString()}</div>
                </div>
                <div className="route">{f.source} <span style={{ color: 'var(--text-muted)' }}>→</span> {f.destination}</div>
                <div className="time">{new Date(f.departureTime).toLocaleString()} - {new Date(f.arrivalTime).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{f.availableSeats}/{f.totalSeats} seats available</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button onClick={() => { setSelectedFlight(null); setBookingResult(null); setSelectedSeats([]); }} style={{ padding: '8px 16px', border: '1px solid var(--border-primary)', borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Back to Flights</button>
          <h2 style={{ color: 'var(--info)', fontSize: 18 }}>{selectedFlight.airline} {selectedFlight.flightNumber}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{selectedFlight.source} → {selectedFlight.destination}</p>

          <h3 style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>Select Seats</h3>
          <div className="seat-map">
            {Object.entries(rows).map(([row, rowSeats]) => (
              <div key={row} className="seat-row">
                <div className="seat-row-label">{row}</div>
                {rowSeats.map((s, i) => (
                  <>
                    {i === 3 && <div className="seat-gap" />}
                    <div key={s.id}
                      className={`seat-cell ${s.classType.toLowerCase()} ${s.status === 'AVAILABLE' ? 'available' : 'booked'} ${selectedSeats.find(ss => ss.id === s.id) ? 'selected' : ''}`}
                      onClick={() => toggleSeat(s)}
                      title={`${s.classType} - ₹${s.price}`}>
                      {s.col}
                    </div>
                  </>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            <span style={{ color: 'var(--success)' }}>■ Available</span>
            <span style={{ color: 'var(--accent)' }}>■ Selected</span>
            <span style={{ color: 'var(--danger)' }}>■ Booked</span>
          </div>

          <div className="form-card">
            <div className="form-group"><label>Passenger Name</label><input type="text" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="e.g. Alice" /></div>
            {selectedSeats.length > 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{selectedSeats.length} seat(s) selected: ₹{selectedSeats.reduce((s, x) => s + x.price, 0).toLocaleString()}</div>}
            <button onClick={doBook} className="btn-primary" disabled={loading}>{loading ? 'Booking...' : '🎫 Book Flight'}</button>
          </div>

          {error && <div className="error">{error}</div>}
          {bookingResult && (
            <div className="result-card">
              <h3>Flight Booked!</h3>
              <div className="detail"><span className="label">Booking ID</span><span className="value">{bookingResult.id}</span></div>
              <div className="detail"><span className="label">Passenger</span><span className="value">{bookingResult.passengerName}</span></div>
              <div className="detail"><span className="label">Seats</span><span className="value">{bookingResult.seatIds?.join(', ')}</span></div>
              <div className="detail"><span className="label">Total</span><span className="value">₹{bookingResult.totalAmount?.toFixed(2)}</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [windowsLit, setWindowsLit] = useState(0);
  const [passengerX, setPassengerX] = useState(-60);
  const [boarded, setBoarded] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const mountedRef = useRef(true);

  const steps = ['Search', 'Select', 'Book', 'CheckIn', 'Board', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => {
    setStep(0); setBooking(null); setLoading(false); setError('');
    setWindowsLit(0); setPassengerX(-60); setBoarded(false); setShowTicket(false);
  };

  const startSim = async () => {
    setError(''); setStep(1);
    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (!mountedRef.current) return;
      setWindowsLit(i);
    }
  };

  const doSelect = async () => {
    setError('');
    setStep(2);
    setTimeout(() => { if (mountedRef.current) setShowTicket(true); }, 400);
  };

  const doBook = async () => {
    setError(''); setLoading(true);
    try {
      const data = await bookFlight('F1', ['S8'], 'user1', 'Alice');
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setBooking(data);
      setShowTicket(false);
      setPassengerX(60);
      setLoading(false); setStep(3);
    } catch { if (mountedRef.current) { setError('Booking failed'); setLoading(false); } }
  };

  const doCheckIn = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const data = await checkInBooking(booking.id);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setBooking(data);
      setPassengerX(120);
      setLoading(false); setStep(4);
    } catch { if (mountedRef.current) { setError('Check-in failed'); setLoading(false); } }
  };

  const doBoard = async () => {
    setError('');
    setBoarded(true);
    setPassengerX(220);
    setTimeout(() => { if (mountedRef.current) { setPassengerX(-60); setBoarded(false); setStep(5); } }, 1500);
  };

  return (
    <div className="flow-section">
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="airport-scene">
        <div className="airport-terminal">
          <div className="term-name">TERMINAL 1</div>
          <div className="term-label">{step > 0 ? 'Departures' : 'Airport'}</div>
          {step > 1 && <div className="flight-info">6E-201 → DEL</div>}
        </div>

        <div className="airplane">
          <div className="cockpit" />
          <div className="tail" />
          <div className="engines" />
          <div className="engines e2" />
          <div className="airplane-windows">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`airplane-window ${windowsLit > i ? 'lit' : ''} ${step >= 4 && i < 3 ? 'booked' : ''}`} />
            ))}
          </div>
        </div>

        {step > 0 && <div className="airport-departure">✈️ {step >= 4 ? 'Now Boarding' : step >= 3 ? 'Check-in Open' : 'Scheduled'}</div>}

        <div className="runway" />
        <div className="runway-line" />

        <div className="passenger-icon" style={{ left: passengerX, bottom: 10 }}>🧑</div>

        {showTicket && (
          <div className="airport-popup">
            <h3>💺 Seats Available</h3>
            <div className="detail">6E-201 Mumbai → Delhi</div>
            <div className="detail">Economy: ₹5,000 | Business: ₹12,000</div>
          </div>
        )}

        {step === 3 && booking && (
          <div className="airport-popup">
            <h3>🎫 Booked!</h3>
            <div className="detail"><strong>{booking.id}</strong></div>
            <div className="detail">{booking.passengerName}</div>
            <div className="detail">₹{booking.totalAmount?.toFixed(2)}</div>
          </div>
        )}

        {step === 5 && (
          <div className="airport-popup done">
            <h3>✅ Done!</h3>
            <div className="detail">Flight boarded successfully</div>
            <div className="detail" style={{ fontSize: 20 }}>✈️ Have a safe flight!</div>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#ff6b6b', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#2a2a4a', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>↺ Reset</button></div>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {step === 0 && <button onClick={startSim} className="flow-btn primary">✈️ Search Flights</button>}
        {step === 1 && <button onClick={doSelect} className="flow-btn success">💺 Select Seats</button>}
        {step === 2 && <button onClick={doBook} disabled={loading} className="flow-btn warning">🎫 Book Flight {loading ? '...' : ''}</button>}
        {step === 3 && <button onClick={doCheckIn} disabled={loading} className="flow-btn primary">✅ Check In {loading ? '...' : ''}</button>}
        {step === 4 && !boarded && <button onClick={doBoard} className="flow-btn danger">🛫 Boarding</button>}
        {step === 4 && boarded && <span style={{ fontSize: 13, color: '#888' }}>🛫 Boarding...</span>}
        {step === 5 && <button onClick={reset} className="flow-btn primary">🔄 New Simulation</button>}
      </div>
    </div>
  );
}

export default function AirlinePage() {
  const [activeTab, setActiveTab] = useState('flights');

  const tabs = [
    { key: 'flights', label: 'Flights' },
    { key: 'simulation', label: 'Simulation' },
    { key: 'diagram', label: 'Class Diagram' },
    { key: 'design', label: 'Design Details' },
  ];

  return (
    <div className="airline-app">
      <style>{CSS}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="airline-header">
        <h1>Airline Reservation System</h1>
        <p>Search flights, select seats, book and check-in with interactive simulation</p>
      </header>
      <nav className="airline-nav">
        {tabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="airline-main">
        {activeTab === 'flights' && <FlightsTab />}
        {activeTab === 'simulation' && <AnimatedFlow />}
        {activeTab === 'diagram' && <ClassDiagram module="airline" />}
        {activeTab === 'design' && <DesignDetails module="airline" />}
      </main>
    </div>
  );
}
