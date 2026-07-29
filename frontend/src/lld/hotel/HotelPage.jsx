import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getHotels, getRooms, bookRoom, checkInBooking, checkOutBooking, cancelBooking } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const CSS = `
.hotel-app { max-width: 1100px; margin: 0 auto; padding: 20px; }
.hotel-header { text-align: center; margin-bottom: 20px; }
.hotel-header h1 { font-size: 28px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hotel-header p { color: var(--text-muted); font-size: 14px; }
.hotel-nav { display: flex; gap: 6px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }
.hotel-nav button { padding: 8px 18px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.hotel-nav button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.hotel-nav button:hover:not(.active) { background: var(--border-primary); }
.hotel-main { background: var(--bg-secondary); border-radius: 12px; padding: 24px; border: 1px solid var(--border-primary); }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-muted); text-decoration: none; font-size: 13px; transition: all 0.2s; }
.back-home:hover { border-color: var(--accent); color: var(--accent); }
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
.flow-section { display: flex; flex-direction: column; align-items: center; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.step-dot.done { background: var(--success); }
.hotel-scene { position: relative; width: 100%; height: 340px; background: linear-gradient(180deg, #1a1a2e, #16213e); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-primary); margin-bottom: 16px; }
.hotel-building { position: absolute; left: 50%; top: 30px; transform: translateX(-50%); width: 320px; height: 220px; background: linear-gradient(180deg, #2d3a5e, #1a2444); border-radius: 8px; border: 2px solid #4a6fa5; transition: all 0.8s; }
.hotel-building .hotel-name-sign { text-align: center; padding: 8px; color: #ffd700; font-weight: 700; font-size: 14px; letter-spacing: 2px; text-shadow: 0 0 10px rgba(255,215,0,0.5); }
.hotel-floor { position: absolute; left: 10px; right: 10px; height: 35px; display: flex; gap: 6px; align-items: center; justify-content: center; }
.hotel-floor.f1 { bottom: 10px; } .hotel-floor.f2 { bottom: 50px; } .hotel-floor.f3 { bottom: 90px; }
.hotel-window { width: 28px; height: 28px; background: #2a3a5a; border: 1px solid #4a6fa5; border-radius: 3px; transition: all 0.5s; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #8899bb; }
.hotel-window.lit { background: #ffd700; box-shadow: 0 0 12px rgba(255,215,0,0.4); border-color: #ffd700; color: #333; }
.hotel-window.occupied { background: #ff6b6b; box-shadow: 0 0 12px rgba(255,107,107,0.3); border-color: #ff6b6b; color: #fff; }
.hotel-reception { position: absolute; left: 50%; bottom: 230px; transform: translateX(-50%); width: 100px; height: 40px; background: #8B4513; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ffd700; font-size: 11px; font-weight: 600; border: 1px solid #a0522d; transition: all 0.5s; }
.hotel-reception.active { background: #a0522d; box-shadow: 0 0 15px rgba(139,69,19,0.5); }
.hotel-ground { position: absolute; bottom: 0; left: 0; right: 0; height: 30px; background: #2d4a2d; }
.hotel-guest { position: absolute; font-size: 26px; z-index: 5; transition: all 1s cubic-bezier(0.4, 0, 0.2, 1); }
.hotel-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); border: 2px solid var(--accent); border-radius: 12px; padding: 20px; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 220px; text-align: center; animation: popIn 0.5s ease-out; }
@keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.hotel-popup.done { border-color: var(--success); }
.hotel-popup h3 { color: var(--info); margin-bottom: 8px; font-size: 16px; }
.hotel-popup .detail { font-size: 12px; color: var(--text-secondary); padding: 3px 0; }
.flow-btn { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; color: #fff; margin: 0 4px; }
.flow-btn:hover { transform: translateY(-2px); }
.flow-btn.primary { background: var(--accent-gradient); }
.flow-btn.success { background: var(--success); }
.flow-btn.danger { background: var(--danger); }
.flow-btn.warning { background: var(--warning); }
.flow-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
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

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [windowsLit, setWindowsLit] = useState(0);
  const [guestX, setGuestX] = useState(-60);
  const [doorOpen, setDoorOpen] = useState(false);
  const [showStay, setShowStay] = useState(false);
  const [stayTimer, setStayTimer] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const mountedRef = useRef(true);
  const timerRef = useRef(null);

  const steps = ['Browse', 'Book', 'CheckIn', 'Stay', 'CheckOut', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep(0); setBooking(null); setLoading(false); setError('');
    setWindowsLit(0); setGuestX(-60); setDoorOpen(false);
    setShowStay(false); setStayTimer(0); setShowReceipt(false);
  };

  const startSim = async () => {
    setError(''); setStep(1);
    for (let i = 1; i <= 8; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (!mountedRef.current) return;
      setWindowsLit(i);
    }
  };

  const doBook = async () => {
    setError(''); setLoading(true);
    try {
      const data = await bookRoom('R3', 'user1', 'Alice', '2025-06-01', '2025-06-03');
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setBooking(data);
      setDoorOpen(true);
      setGuestX(170);
      setTimeout(() => { if (mountedRef.current) setGuestX(200); }, 800);
      setLoading(false); setStep(2);
    } catch { if (mountedRef.current) { setError('Failed to book'); setLoading(false); } }
  };

  const doCheckIn = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const data = await checkInBooking(booking.id);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setBooking(data);
      setGuestX(220);
      setDoorOpen(false);
      setLoading(false); setStep(3);
      let secs = 0;
      timerRef.current = setInterval(() => {
        secs++; setStayTimer(secs);
      }, 1000);
      setTimeout(() => { if (mountedRef.current) setShowStay(true); }, 500);
    } catch { if (mountedRef.current) { setError('Check-in failed'); setLoading(false); } }
  };

  const doCheckOut = async () => {
    if (!booking) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    try {
      const data = await checkOutBooking(booking.id);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setBooking(data);
      setDoorOpen(true);
      setGuestX(-60);
      setShowStay(false);
      setLoading(false); setStep(4);
      setTimeout(() => { if (mountedRef.current) { setShowReceipt(true); setTimeout(() => { if (mountedRef.current) setStep(5); }, 1500); } }, 1200);
    } catch { if (mountedRef.current) { setError('Check-out failed'); setLoading(false); } }
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="flow-section">
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="hotel-scene">
        <div className="hotel-building">
          <div className="hotel-name-sign">{step > 0 ? 'GRAND PALACE' : '✦ HOTEL ✦'}</div>
          <div className="hotel-floor f3">
            {[1,2,3,4].map(i => <div key={i} className={`hotel-window ${windowsLit >= i+4 ? 'lit' : ''} ${step >= 3 && i === 3 ? 'occupied' : ''}`}>{step >= 3 && i === 3 ? '👤' : ''}</div>)}
          </div>
          <div className="hotel-floor f2">
            {[1,2,3,4].map(i => <div key={i} className={`hotel-window ${windowsLit >= i ? 'lit' : ''}`} />)}
          </div>
          <div className="hotel-floor f1">
            {[1,2,3,4].map(i => <div key={i} className={`hotel-window ${windowsLit >= i ? 'lit' : ''}`} />)}
          </div>
        </div>
        <div className={`hotel-reception ${step >= 2 ? 'active' : ''}`}>RECEPTION</div>
        <div className="hotel-ground" />
        <div className="hotel-guest" style={{ left: guestX, bottom: 30 }}>🧑</div>

        {step === 2 && booking && (
          <div className="hotel-popup">
            <h3>📅 Booked!</h3>
            <div className="detail"><strong>{booking.id}</strong></div>
            <div className="detail">{booking.guestName} • Room {booking.roomId}</div>
            <div className="detail">₹{booking.totalAmount.toFixed(2)}</div>
          </div>
        )}

        {showStay && (
          <div className="hotel-popup" style={{ top: '30%', minWidth: 160 }}>
            <div style={{ fontSize: 36 }}>😴</div>
            <div className="detail">Enjoying Stay...</div>
            <div className="detail" style={{ fontSize: 20, fontWeight: 700, color: 'var(--info)' }}>{fmtTime(stayTimer)}</div>
          </div>
        )}

        {showReceipt && booking && (
          <div className="hotel-popup done">
            <h3>🧾 Checked Out!</h3>
            <div className="detail">Stay: {fmtTime(stayTimer)}</div>
            <div className="detail" style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>₹{booking.totalAmount?.toFixed(2)}</div>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#ff6b6b', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#2a2a4a', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>↺ Reset</button></div>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {step === 0 && <button onClick={startSim} className="flow-btn primary">🏨 Browse Hotels</button>}
        {step === 1 && <button onClick={doBook} disabled={loading} className="flow-btn success">📅 Book Room {loading ? '...' : ''}</button>}
        {step === 2 && <button onClick={doCheckIn} disabled={loading} className="flow-btn warning">🔑 Check In {loading ? '...' : ''}</button>}
        {step === 3 && !showStay && <span style={{ fontSize: 13, color: '#888' }}>😴 Enjoying Stay...</span>}
        {step === 3 && showStay && <button onClick={doCheckOut} disabled={loading} className="flow-btn danger">🧾 Check Out {loading ? '...' : ''}</button>}
        {step === 4 && <span style={{ fontSize: 13, color: '#888' }}>🧾 Processing...</span>}
        {step === 5 && <button onClick={reset} className="flow-btn primary">🔄 New Simulation</button>}
      </div>
    </div>
  );
}

export default function HotelPage() {
  const [activeTab, setActiveTab] = useState('hotels');

  const tabs = [
    { key: 'hotels', label: 'Hotels' },
    { key: 'simulation', label: 'Simulation' },
    { key: 'diagram', label: 'Class Diagram' },
    { key: 'design', label: 'Design Details' },
  ];

  return (
    <div className="hotel-app">
      <style>{CSS}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="hotel-header">
        <h1>Hotel Management System</h1>
        <p>Browse hotels, book rooms, check in/out with interactive simulation</p>
      </header>
      <nav className="hotel-nav">
        {tabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="hotel-main">
        {activeTab === 'hotels' && <HotelsTab />}
        {activeTab === 'simulation' && <AnimatedFlow />}
        {activeTab === 'diagram' && <ClassDiagram module="hotel" />}
        {activeTab === 'design' && <DesignDetails module="hotel" />}
      </main>
    </div>
  );
}
