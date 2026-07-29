import { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.ct-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.ct-stage-box { position: relative; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; text-align: center; }

.stage-banner { background: var(--accent-gradient); color: #fff; padding: 10px; border-radius: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }

.seat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; max-width: 500px; margin: 0 auto; }
.seat-item { padding: 10px 4px; background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: center; }
.seat-item.vip { border-color: var(--warning); color: var(--warning); }
.seat-item.executive { border-color: var(--accent); color: var(--accent); }
.seat-item.selected { border-color: var(--success); background: var(--success); color: #fff; transform: scale(1.08); }
.seat-item.held { border-color: var(--danger); background: rgba(248,81,73,0.15); color: var(--danger); }
.seat-item.booked { background: var(--border-primary); color: var(--text-muted); cursor: not-allowed; border-color: transparent; }

.ticket-card { background: var(--bg-card); border: 2px dashed var(--accent); border-radius: 12px; padding: 16px; width: 280px; margin: 0 auto; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
`;

function AnimatedFlow() {
  const [seats, setSeats] = useState([
    { id: 'A1', type: 'VIP', price: 250, status: 'AVAILABLE' },
    { id: 'A2', type: 'VIP', price: 250, status: 'AVAILABLE' },
    { id: 'A3', type: 'VIP', price: 250, status: 'AVAILABLE' },
    { id: 'A4', type: 'VIP', price: 250, status: 'AVAILABLE' },
    { id: 'A5', type: 'VIP', price: 250, status: 'BOOKED' },
    { id: 'A6', type: 'VIP', price: 250, status: 'AVAILABLE' },

    { id: 'B1', type: 'EXEC', price: 150, status: 'AVAILABLE' },
    { id: 'B2', type: 'EXEC', price: 150, status: 'AVAILABLE' },
    { id: 'B3', type: 'EXEC', price: 150, status: 'AVAILABLE' },
    { id: 'B4', type: 'EXEC', price: 150, status: 'AVAILABLE' },
    { id: 'B5', type: 'EXEC', price: 150, status: 'AVAILABLE' },
    { id: 'B6', type: 'EXEC', price: 150, status: 'AVAILABLE' },

    { id: 'C1', type: 'GEN', price: 80, status: 'AVAILABLE' },
    { id: 'C2', type: 'GEN', price: 80, status: 'AVAILABLE' },
    { id: 'C3', type: 'GEN', price: 80, status: 'AVAILABLE' },
    { id: 'C4', type: 'GEN', price: 80, status: 'AVAILABLE' },
    { id: 'C5', type: 'GEN', price: 80, status: 'AVAILABLE' },
    { id: 'C6', type: 'GEN', price: 80, status: 'AVAILABLE' },
  ]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [holdTimer, setHoldTimer] = useState(0);
  const [bookedTicket, setBookedTicket] = useState(null);
  const [statusMsg, setStatusMsg] = useState('Select an available seat on the venue map.');

  useEffect(() => {
    let t;
    if (holdTimer > 0) {
      t = setInterval(() => setHoldTimer(s => s - 1), 1000);
    } else if (holdTimer === 0 && selectedSeat && !bookedTicket) {
      // Hold lock expired
      setSeats(prev => prev.map(s => s.id === selectedSeat.id ? { ...s, status: 'AVAILABLE' } : s));
      setSelectedSeat(null);
      setStatusMsg('⏳ Lock TTL expired! Seat released back to pool.');
    }
    return () => clearInterval(t);
  }, [holdTimer, selectedSeat, bookedTicket]);

  const handleSelectSeat = (s) => {
    if (s.status === 'BOOKED') return;
    setSelectedSeat(s);
    setSeats(prev => prev.map(item => item.id === s.id ? { ...item, status: 'HELD' } : item.status === 'HELD' ? { ...item, status: 'AVAILABLE' } : item));
    setHoldTimer(10); // 10s TTL lock
    setStatusMsg(`🔒 Seat ${s.id} held under Redis TTL Lock for 10 seconds. Complete payment!`);
  };

  const handleCheckout = () => {
    if (!selectedSeat) return;
    const ticket = {
      tktId: `TKT-${Math.floor(Math.random() * 90000 + 10000)}`,
      seat: selectedSeat,
      qr: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=TKT-VALID',
    };
    setBookedTicket(ticket);
    setSeats(prev => prev.map(s => s.id === selectedSeat.id ? { ...s, status: 'BOOKED' } : s));
    setHoldTimer(0);
    setStatusMsg(`🎉 Payment Successful! Ticket #${ticket.tktId} issued for Seat ${selectedSeat.id}.`);
  };

  const reset = () => {
    setSelectedSeat(null);
    setBookedTicket(null);
    setHoldTimer(0);
    setStatusMsg('Select an available seat on the venue map.');
  };

  return (
    <div className="ct-container">
      <style>{CSS}</style>

      <div className="ct-stage-box">
        <div className="stage-banner">🎤 MAIN CONCERT STAGE 🎸</div>

        <div className="seat-grid">
          {seats.map(s => {
            const isSelected = selectedSeat?.id === s.id;
            return (
              <div key={s.id} className={`seat-item ${s.type.toLowerCase()} ${s.status.toLowerCase()} ${isSelected ? 'selected' : ''}`} onClick={() => handleSelectSeat(s)}>
                <div>{s.id}</div>
                <div style={{ fontSize: 9 }}>${s.price}</div>
              </div>
            );
          })}
        </div>

        {selectedSeat && holdTimer > 0 && !bookedTicket && (
          <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
            ⏱️ TTL Lock Expiring in: {holdTimer}s
          </div>
        )}

        {bookedTicket && (
          <div style={{ marginTop: 20 }}>
            <div className="ticket-card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>WORLD TOUR CONCERT PASS</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', margin: '4px 0' }}>{bookedTicket.tktId}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Seat {bookedTicket.seat.id} ({bookedTicket.seat.type})</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>${bookedTicket.seat.price}.00 PAID</div>
              <div style={{ marginTop: 10 }}>[ QR CODE ]</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {selectedSeat && !bookedTicket && (
          <button onClick={handleCheckout} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            💳 Pay ${selectedSeat.price}.00 & Confirm Ticket
          </button>
        )}

        {bookedTicket && (
          <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            🔄 Book Another Ticket
          </button>
        )}
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {statusMsg}
      </div>
    </div>
  );
}

export default function ConcertTicketPage() {
  return (
    <LldPage module="concert-ticket" title="Concert Ticket Booking" icon="🎫" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
