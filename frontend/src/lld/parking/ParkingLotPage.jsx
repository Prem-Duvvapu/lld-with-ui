import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { vehicleEntry, getGates, scanVehicleExit, payVehicleExit, vehicleExit, getFloors, getActiveTickets, getParkingClassDiagram, getParkingDesignDetails } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const PARKING_CSS = `
.parking-app { max-width: 1100px; margin: 0 auto; padding: 20px; }
.parking-header { text-align: center; margin-bottom: 20px; }
.parking-header h1 { font-size: 28px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; }
.parking-header p { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
.parking-nav { display: flex; gap: 6px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }
.parking-nav button { padding: 8px 18px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.parking-nav button.active { background: var(--accent); color: #ffffff; border-color: var(--accent); }
.parking-nav button:hover:not(.active) { background: var(--border-primary); color: var(--text-primary); }
.parking-main { background: var(--bg-secondary); border-radius: 12px; padding: 24px; border: 1px solid var(--border-primary); box-shadow: var(--shadow-sm); }
.form-card { max-width: 440px; margin: 0 auto; }
.form-card h2 { margin-bottom: 16px; font-size: 18px; color: var(--info); font-weight: 700; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 700; font-size: 12px; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; }
.form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary); font-weight: 500; transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
.btn-primary { width: 100%; padding: 12px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102,126,234,0.3); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.result-card { margin-top: 16px; padding: 16px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-primary); box-shadow: var(--shadow-sm); }
.result-card h3 { margin-bottom: 10px; font-size: 15px; color: var(--info); font-weight: 700; }
.result-card .detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border-secondary); color: var(--text-primary); }
.result-card .detail:last-child { border-bottom: none; }
.result-card .label { color: var(--text-secondary); font-weight: 600; } .result-card .value { font-weight: 700; color: var(--text-primary); }
.error { margin-top: 12px; padding: 10px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; border: 1px solid var(--danger-bg); font-size: 13px; font-weight: 600; }
.spots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.spot-card { padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); text-align: center; transition: all 0.3s; background: var(--bg-card); box-shadow: var(--shadow-sm); }
.spot-card.available { border-color: var(--success); background: var(--success-bg); }
.spot-card.occupied { border-color: var(--danger); background: var(--danger-bg); }
.spot-card .spot-id { font-weight: 700; font-size: 16px; color: var(--text-primary); }
.spot-card .spot-type { font-size: 11px; color: var(--text-secondary); font-weight: 600; }
.spot-card .spot-status { font-size: 11px; font-weight: 700; margin-top: 4px; }
.spot-card.available .spot-status { color: var(--success); }
.spot-card.occupied .spot-status { color: var(--danger); }
.floor-section { margin-bottom: 20px; }
.floor-section h3 { margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border-primary); font-size: 16px; color: var(--info); font-weight: 700; }
.alert { text-align: center; padding: 24px; color: var(--text-primary); font-size: 14px; font-weight: 500; }
.ticket-table { width: 100%; border-collapse: collapse; font-size: 13px; color: var(--text-primary); }
.ticket-table th { background: var(--bg-tertiary); color: var(--text-primary); padding: 10px; text-align: left; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-primary); }
.ticket-table td { padding: 10px; border-bottom: 1px solid var(--border-secondary); color: var(--text-primary); font-weight: 500; }
.ticket-table tr:hover { background: var(--bg-tertiary); }
.ticket-table .status-active { color: var(--success); font-weight: 700; }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-primary); text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; background: var(--bg-tertiary); }
.back-home:hover { border-color: var(--accent); color: var(--accent); }

.flow-section { display: flex; flex-direction: column; align-items: center; }
.scene { position: relative; width: 100%; height: 320px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-primary); margin-bottom: 16px; }
.road { position: absolute; bottom: 30px; left: 0; right: 0; height: 60px; background: #2d2d2d; border-top: 3px solid #555; border-bottom: 3px solid #555; }
.road-line { position: absolute; bottom: 57px; left: 0; right: 0; height: 1px; background: repeating-linear-gradient(90deg, #fff 0px, #fff 20px, transparent 20px, transparent 40px); opacity: 0.3; }
.entry-gate { position: absolute; left: 30px; bottom: 18px; width: 20px; height: 80px; background: var(--accent); border-radius: 4px; z-index: 3; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white; }
.entry-gate .bar { position: absolute; top: 20px; left: 18px; width: 50px; height: 6px; background: #f0c040; border-radius: 3px; transform-origin: left center; transition: transform 0.5s; }
.entry-gate .bar.up { transform: rotate(-90deg); }
.exit-gate { position: absolute; right: 30px; bottom: 18px; width: 20px; height: 80px; background: var(--danger); border-radius: 4px; z-index: 3; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white; }
.exit-gate .bar { position: absolute; top: 20px; left: 18px; width: 50px; height: 6px; background: #f0c040; border-radius: 3px; transform-origin: left center; transition: transform 0.5s; }
.exit-gate .bar.up { transform: rotate(-90deg); }
.parking-area { position: absolute; left: 80px; right: 80px; bottom: 90px; top: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 8px; }
.parking-cell { background: rgba(128,128,128,0.08); border: 1px dashed var(--border-primary); border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-primary); transition: all 0.5s; position: relative; min-height: 40px; }
.parking-cell.occupied-sim { background: var(--danger-bg); border-color: var(--danger); border-style: solid; color: var(--danger); }
.parking-cell .car-icon { font-size: 20px; transition: all 0.3s; }
.car-animated { position: absolute; bottom: 40px; font-size: 28px; z-index: 5; transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1); }
.person-animated { position: absolute; font-size: 26px; z-index: 6; transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
.ticket-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); border: 2px solid var(--accent); border-radius: 12px; padding: 20px; z-index: 10; box-shadow: var(--shadow-lg); min-width: 220px; text-align: center; animation: ticketIn 0.5s ease-out; color: var(--text-primary); }
@keyframes ticketIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.ticket-popup h3 { color: var(--info); margin-bottom: 8px; font-size: 16px; font-weight: 700; }
.ticket-popup .ticket-detail { font-size: 12px; color: var(--text-primary); padding: 3px 0; font-weight: 500; }
.away-timer { text-align: center; padding: 16px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-primary); margin: 8px 0; color: var(--text-primary); }
.away-timer .timer { font-size: 36px; font-weight: 700; color: var(--info); font-family: var(--code-font); }
.away-timer .activity { font-size: 14px; color: var(--text-primary); margin: 8px 0; font-weight: 600; }
.flow-controls { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
.flow-btn { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.flow-btn:hover { transform: translateY(-2px); }
.flow-btn.primary { background: var(--accent-gradient); color: #fff; }
.flow-btn.success { background: var(--success); color: #fff; }
.flow-btn.danger { background: var(--danger); color: #fff; }
.flow-btn.warning { background: var(--warning); color: #fff; }
.flow-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.receipt-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); border: 2px solid var(--success); border-radius: 12px; padding: 20px; z-index: 10; box-shadow: var(--shadow-lg); min-width: 250px; text-align: center; animation: ticketIn 0.5s ease-out; color: var(--text-primary); }
.receipt-popup h3 { color: var(--success); margin-bottom: 8px; font-size: 16px; font-weight: 700; }
.activity-selector { display: flex; gap: 8px; justify-content: center; margin: 8px 0; }
.activity-selector button { padding: 8px 16px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.activity-selector button:hover { border-color: var(--accent); }
.activity-selector button.active { border-color: var(--info); background: var(--info-bg); color: var(--info); }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.step-dot.done { background: var(--success); }
`;

function EntryForm() {
  const [gates, setGates] = useState([]);
  const [gateId, setGateId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGates().then((all) => {
      const entryGates = all.filter((g) => g.type === 'ENTRY');
      setGates(entryGates);
      if (entryGates.length > 0) setGateId(entryGates[0].id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const data = await vehicleEntry(gateId, vehicleNumber, vehicleType);
      if (data.error) setError(data.error);
      else { setResult(data); setVehicleNumber(''); }
    } catch { setError('Failed to connect to server'); }
    finally { setLoading(false); }
  };

  return (
    <div className="form-card">
      <h2>Vehicle Entry</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Entry Gate</label>
          <select value={gateId} onChange={(e) => setGateId(e.target.value)} required>
            {gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Vehicle Number</label>
          <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. KA-01-AB-1234" required />
        </div>
        <div className="form-group"><label>Vehicle Type</label>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="CAR">Car</option><option value="BIKE">Bike</option><option value="TRUCK">Truck</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Processing...' : 'Park Vehicle'}</button>
      </form>
      {error && <div className="error">{error}</div>}
      {result && (
        <div className="result-card">
          <h3>Ticket Issued</h3>
          <div className="detail"><span className="label">Ticket #</span><span className="value">{result.ticketNumber}</span></div>
          <div className="detail"><span className="label">Vehicle</span><span className="value">{result.vehicleNumber}</span></div>
          <div className="detail"><span className="label">Type</span><span className="value">{result.vehicleType}</span></div>
          <div className="detail"><span className="label">Spot</span><span className="value">{result.spotId}</span></div>
          <div className="detail"><span className="label">Entry Time</span><span className="value">{new Date(result.entryTime).toLocaleTimeString()}</span></div>
        </div>
      )}
    </div>
  );
}

function ExitForm() {
  const [gates, setGates] = useState([]);
  const [gateId, setGateId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [pricingStrategy, setPricingStrategy] = useState('HOURLY');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const [step, setStep] = useState('SCAN'); // SCAN | PREVIEW | COMPLETED
  const [previewTicket, setPreviewTicket] = useState(null);
  const [paidReceipt, setPaidReceipt] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGates().then((all) => {
      const exitGates = all.filter((g) => g.type === 'EXIT');
      setGates(exitGates);
      if (exitGates.length > 0) setGateId(exitGates[0].id);
    });
  }, []);

  const handleScanTicket = async (e) => {
    e.preventDefault();
    setError(''); setPreviewTicket(null); setLoading(true);
    try {
      const data = await scanVehicleExit(gateId, ticketNumber, pricingStrategy);
      if (data.error) setError(data.error);
      else {
        setPreviewTicket(data);
        setStep('PREVIEW');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handlePayAndExit = async () => {
    setError(''); setLoading(true);
    try {
      const data = await payVehicleExit(gateId, ticketNumber, pricingStrategy, paymentMethod);
      if (data.error) setError(data.error);
      else {
        setPaidReceipt(data);
        setStep('COMPLETED');
      }
    } catch {
      setError('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('SCAN');
    setPreviewTicket(null);
    setPaidReceipt(null);
    setTicketNumber('');
    setError('');
  };

  return (
    <div className="form-card">
      <h2>Vehicle Exit & Payment</h2>

      {step === 'SCAN' && (
        <form onSubmit={handleScanTicket}>
          <div className="form-group">
            <label>Exit Gate</label>
            <select value={gateId} onChange={(e) => setGateId(e.target.value)} required>
              {gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Ticket Number</label>
            <input type="text" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="e.g. TKT-00001" required />
          </div>
          <div className="form-group">
            <label>Pricing Strategy</label>
            <select value={pricingStrategy} onChange={(e) => setPricingStrategy(e.target.value)}>
              <option value="HOURLY">Hourly Pricing (Standard)</option>
              <option value="FLAT">Flat Rate Pricing</option>
              <option value="DYNAMIC">Dynamic Surge Pricing (1.5x)</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Scanning Ticket...' : 'Go to Exit / Calculate Price'}
          </button>
        </form>
      )}

      {step === 'PREVIEW' && previewTicket && (
        <div className="result-card" style={{ marginTop: 0 }}>
          <h3 style={{ color: 'var(--accent)' }}>🎟️ Ticket Details & Calculated Amount</h3>
          <div className="detail"><span className="label">Ticket #</span><span className="value">{previewTicket.ticketNumber}</span></div>
          <div className="detail"><span className="label">Vehicle</span><span className="value">{previewTicket.vehicleNumber}</span></div>
          <div className="detail"><span className="label">Vehicle Type</span><span className="value">{previewTicket.vehicleType}</span></div>
          <div className="detail"><span className="label">Assigned Spot</span><span className="value">{previewTicket.spotId}</span></div>
          <div className="detail"><span className="label">Entry Time</span><span className="value">{new Date(previewTicket.entryTime).toLocaleString()}</span></div>
          <div className="detail"><span className="label">Pricing Applied</span><span className="value">{pricingStrategy}</span></div>
          <div className="detail" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 8 }}>
            <span className="label" style={{ fontWeight: 700, fontSize: 16 }}>Total Amount Due</span>
            <span className="value" style={{ fontWeight: 700, fontSize: 18, color: '#e5c07b' }}>₹{previewTicket.amount.toFixed(2)}</span>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Select Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="UPI">UPI / QR Code</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={handlePayAndExit} className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Processing Payment...' : `Pay ₹${previewTicket.amount.toFixed(2)} & Exit`}
            </button>
            <button onClick={handleReset} className="btn-secondary" style={{ padding: '8px 16px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'COMPLETED' && paidReceipt && (
        <div className="result-card" style={{ marginTop: 0 }}>
          <h3 style={{ color: '#98c379' }}>✅ Payment Successful! Exit Gate Opened</h3>
          <div className="detail"><span className="label">Ticket #</span><span className="value">{paidReceipt.ticketNumber}</span></div>
          <div className="detail"><span className="label">Vehicle</span><span className="value">{paidReceipt.vehicleNumber}</span></div>
          <div className="detail"><span className="label">Spot Released</span><span className="value">{paidReceipt.spotId}</span></div>
          <div className="detail"><span className="label">Exit Time</span><span className="value">{new Date(paidReceipt.exitTime).toLocaleString()}</span></div>
          <div className="detail"><span className="label">Amount Paid</span><span className="value">₹{paidReceipt.amount.toFixed(2)} ({paidReceipt.paymentMethod})</span></div>
          <div className="detail"><span className="label">Payment Status</span><span className="value" style={{ color: '#98c379', fontWeight: 700 }}>{paidReceipt.paymentStatus}</span></div>

          <button onClick={handleReset} className="btn-primary" style={{ marginTop: 16, width: '100%' }}>
            Process Another Vehicle Exit
          </button>
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}

function SpotGrid() {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const fetchData = async () => {
    try { const data = await getFloors(); setFloors(data); setFetchError(''); }
    catch { setFetchError('Failed to load spot data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, []);

  if (loading && floors.length === 0) return <div className="alert">Loading...</div>;
  if (fetchError && floors.length === 0) return <div className="alert">{fetchError}</div>;

  const total = floors.reduce((s, f) => s + f.spots.length, 0);
  const occupied = floors.reduce((s, f) => s + f.spots.filter(sp => sp.occupied).length, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#4ecdc4', fontSize: 18 }}>Parking Lot Layout</h2>
        <span style={{ fontSize: 13, color: '#888' }}>{occupied}/{total} occupied</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #2a2a4a', fontSize: 13, background: '#0d1117', color: '#eee' }}>
          <option value="ALL">All Spots</option><option value="AVAILABLE">Available Only</option>
        </select>
      </div>
      {floors.map((floor) => (
        <div key={floor.floorNumber} className="floor-section">
          <h3>Floor {floor.floorNumber}</h3>
          <div className="spots-grid">
            {(filter === 'ALL' ? floor.spots : floor.spots.filter((s) => !s.occupied)).map((spot) => (
              <div key={spot.id} className={`spot-card ${spot.occupied ? 'occupied' : 'available'}`}>
                <div className="spot-id">{spot.id}</div>
                <div className="spot-type">{spot.vehicleType}</div>
                <div className="spot-status">{spot.occupied ? 'Occupied' : 'Available'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12, fontSize: 13, color: '#888' }}>
        <span style={{ color: '#3fb950' }}>● Available</span><span style={{ color: '#f85149' }}>● Occupied</span>
      </div>
    </div>
  );
}

function ActiveTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchTickets = async () => {
    try { const data = await getActiveTickets(); setTickets(data); setFetchError(''); }
    catch { setFetchError('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); const i = setInterval(fetchTickets, 5000); return () => clearInterval(i); }, []);

  if (loading) return <div className="alert">Loading...</div>;
  if (fetchError) return <div className="alert">{fetchError}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#4ecdc4', fontSize: 18 }}>Active Tickets ({tickets.length})</h2>
      </div>
      {tickets.length === 0 ? <div className="alert">No active tickets.</div> : (
        <table className="ticket-table">
          <thead><tr><th>Ticket</th><th>Vehicle</th><th>Type</th><th>Spot</th><th>Entry</th><th>Duration</th></tr></thead>
          <tbody>
            {tickets.map((t) => {
              const entry = new Date(t.entryTime);
              const mins = Math.floor((Date.now() - entry.getTime()) / 60000);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
              return (
                <tr key={t.ticketNumber}>
                  <td><strong style={{ color: '#eee' }}>{t.ticketNumber}</strong></td>
                  <td>{t.vehicleNumber}</td>
                  <td>{t.vehicleType}</td>
                  <td style={{ fontFamily: 'monospace' }}>{t.spotId}</td>
                  <td>{entry.toLocaleString()}</td>
                  <td className="status-active">{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const ACTIVITIES = [
  { icon: '🛍️', label: 'Shopping', emoji: '🛒' },
  { icon: '🎬', label: 'Movie', emoji: '🍿' },
  { icon: '🍕', label: 'Eating', emoji: '🍕' },
];

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [carLeft, setCarLeft] = useState(-60);
  const [carBottom, setCarBottom] = useState(40);
  const [sceneWidth, setSceneWidth] = useState(900);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [occupiedCells, setOccupiedCells] = useState([]);
  const [timer, setTimer] = useState(0);
  const [away, setAway] = useState(false);
  const [activity, setActivity] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [gateBarUp, setGateBarUp] = useState(false);
  const [exitGateBarUp, setExitGateBarUp] = useState(false);
  const [entryLoading, setEntryLoading] = useState(false);
  const [simError, setSimError] = useState('');
  const [personLeft, setPersonLeft] = useState(-60);
  const [personBottom, setPersonBottom] = useState(40);
  const [personVisible, setPersonVisible] = useState(false);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const sceneRef = useRef(null);
  const entryGateRef = useRef('');
  const exitGateRef = useRef('');

  useEffect(() => {
    getGates()
      .then((all) => {
        if (!Array.isArray(all)) return;
        const eg = all.find((g) => g.type === 'ENTRY');
        const xg = all.find((g) => g.type === 'EXIT');
        if (eg) entryGateRef.current = eg.id;
        if (xg) exitGateRef.current = xg.id;
        setSimError('');
      })
      .catch(() => {
        setSimError('⚠️ Backend not reachable — start the server on port 9090');
      });
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      setSceneWidth(sceneRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (intervalRef.current) clearInterval(intervalRef.current); if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const PARK_LEFT = 80;
  const PARK_RIGHT = 80;
  const PARK_PAD = 8;
  const PARK_GAP = 6;
  const COLS = 4;
  const ROWS = 3;
  const CELL_MIN_W = (sceneWidth - PARK_LEFT - PARK_RIGHT - PARK_PAD * 2 - PARK_GAP * (COLS - 1)) / COLS;
  const CELL_H = 50;

  const cellCenter = (cellIdx) => {
    const col = cellIdx % COLS;
    const row = Math.floor(cellIdx / COLS);
    return {
      left: PARK_LEFT + PARK_PAD + col * (CELL_MIN_W + PARK_GAP) + CELL_MIN_W / 2,
      bottom: 90 + PARK_PAD + (ROWS - 1 - row) * (CELL_H + PARK_GAP) + CELL_H / 2,
    };
  };

  const resetFlow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep(0);
    setCarLeft(-60);
    setCarBottom(40);
    setShowTicket(false);
    setTicketData(null);
    setOccupiedCells([]);
    setTimer(0);
    setAway(false);
    setActivity(null);
    setShowReceipt(false);
    setReceiptData(null);
    setGateBarUp(false);
    setExitGateBarUp(false);
    setEntryLoading(false);
    setSimError('');
    setPersonVisible(false);
  };

  const steps = ['Entry', 'Ticket', 'Park', 'Away', 'Return', 'At Exit', 'Scan Ticket', 'Payment', 'Done'];

  const [scanPreview, setScanPreview] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('UPI');
  const [selectedStrategy, setSelectedStrategy] = useState('HOURLY');

  const findEmptyCell = () => {
    const used = new Set(occupiedCells);
    for (let i = 0; i < 12; i++) {
      if (!used.has(i)) return i;
    }
    return -1;
  };

  const loadGates = async () => {
    if (entryGateRef.current) return entryGateRef.current;
    const all = await getGates();
    if (!Array.isArray(all)) throw new Error('Invalid response');
    const eg = all.find((g) => g.type === 'ENTRY');
    const xg = all.find((g) => g.type === 'EXIT');
    if (!eg) throw new Error('No entry gate in response');
    entryGateRef.current = eg.id;
    if (xg) exitGateRef.current = xg.id;
    return eg.id;
  };

  const startFlow = async () => {
    let eid;
    try {
      eid = await loadGates();
    } catch (e) {
      setSimError('⚠️ ' + e.message);
      return;
    }
    setSimError('');
    setStep(1);
    setGateBarUp(true);
    setShowTicket(false);
    setShowReceipt(false);
    setScanPreview(null);
    setAway(false);
    setTimer(0);
    setActivity(null);

    setTimeout(() => setCarLeft(50), 500);
    setTimeout(() => setGateBarUp(false), 1500);

    setTimeout(() => {
      setEntryLoading(true);
      vehicleEntry(eid, 'KA-01-AB-1234', 'CAR').then((data) => {
        if (!mountedRef.current) return;
        setEntryLoading(false);
        if (data.error) {
          setSimError(data.error);
        } else {
          setTicketData(data);
          setShowTicket(true);
          setStep(2);
        }
      }).catch(() => {
        if (mountedRef.current) { setEntryLoading(false); setSimError('API call failed'); }
      });
    }, 2000);
  };

  const parkVehicle = () => {
    setShowTicket(false);
    const cellIdx = findEmptyCell();
    if (cellIdx === -1) return;
    const pos = cellCenter(cellIdx);
    setCarLeft(pos.left);
    setCarBottom(pos.bottom);

    setTimeout(() => {
      setOccupiedCells([...occupiedCells, cellIdx]);
      setStep(3);
      setAway(true);
      let secs = 0;
      timerRef.current = setInterval(() => {
        secs++;
        setTimer(secs);
      }, 1000);
    }, 1500);
  };

  const startAway = (act) => {
    setActivity(act);
    const cellIdx = occupiedCells.length > 0 ? occupiedCells[occupiedCells.length - 1] : -1;
    if (cellIdx >= 0) {
      const pos = cellCenter(cellIdx);
      setPersonLeft(pos.left);
      setPersonBottom(pos.bottom);
    } else {
      setPersonLeft(carLeft);
      setPersonBottom(carBottom);
    }
    setPersonVisible(true);
    setTimeout(() => {
      setPersonLeft(-40);
      setPersonBottom(40);
    }, 800);
    setStep(4);
  };

  const returnToCar = () => {
    setAway(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const cellIdx = occupiedCells.length > 0 ? occupiedCells[occupiedCells.length - 1] : -1;
    const pos = cellIdx >= 0 ? cellCenter(cellIdx) : { left: 50, bottom: 40 };
    setPersonLeft(-40);
    setPersonBottom(40);
    setPersonVisible(true);
    setTimeout(() => {
      setPersonLeft(pos.left);
      setPersonBottom(pos.bottom);
    }, 100);
    setTimeout(() => {
      setPersonVisible(false);
      setStep(5);
    }, 1200);
  };

  const driveToExitGate = () => {
    setStep(5);
    const cellIdx = occupiedCells.length > 0 ? occupiedCells[occupiedCells.length - 1] : -1;
    const pos = cellIdx >= 0 ? cellCenter(cellIdx) : { left: 50, bottom: 40 };
    setCarLeft(pos.left);
    setCarBottom(40);

    setTimeout(() => {
      setCarLeft(sceneWidth - 120);
      setCarBottom(40);
      setStep(6);
    }, 1200);
  };

  const scanTicketAtExit = () => {
    setSimError('');
    if (!exitGateRef.current) { setSimError('No exit gate found'); return; }
    setEntryLoading(true);
    const tktNo = ticketData?.ticketNumber || 'TKT-00001';

    scanVehicleExit(exitGateRef.current, tktNo, selectedStrategy).then((data) => {
      if (!mountedRef.current) return;
      setEntryLoading(false);
      if (data.error) {
        setSimError(data.error);
      } else {
        setScanPreview(data);
        setStep(7);
      }
    }).catch(() => {
      if (mountedRef.current) { setEntryLoading(false); setSimError('Failed to scan ticket'); }
    });
  };

  const payAndExitVehicle = () => {
    setSimError('');
    if (!exitGateRef.current) { setSimError('No exit gate found'); return; }
    setEntryLoading(true);
    const tktNo = ticketData?.ticketNumber || 'TKT-00001';

    payVehicleExit(exitGateRef.current, tktNo, selectedStrategy, selectedPayMethod).then((data) => {
      if (!mountedRef.current) return;
      setEntryLoading(false);
      if (data.error) {
        setSimError(data.error);
      } else {
        setScanPreview(null);
        setReceiptData(data);
        setShowReceipt(true);
        setExitGateBarUp(true);
        setStep(8);

        setTimeout(() => {
          if (!mountedRef.current) return;
          setExitGateBarUp(false);
          setCarLeft(sceneWidth + 60);
          setTimeout(() => {
            if (!mountedRef.current) return;
            setShowReceipt(false);
            setOccupiedCells([]);
            resetFlow();
          }, 1500);
        }, 2000);
      }
    }).catch(() => {
      if (mountedRef.current) { setEntryLoading(false); setSimError('Payment failed'); }
    });
  };

  const fmtTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="flow-section">
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
          {steps[step] || 'Idle'}
        </span>
      </div>

      <div className="scene" ref={sceneRef}>
        <div className="road" />
        <div className="road-line" />

        <div className="entry-gate">
          🚧
          <div className={`bar ${gateBarUp ? 'up' : ''}`} />
        </div>

        <div className="exit-gate">
          🚧
          <div className={`bar ${exitGateBarUp ? 'up' : ''}`} />
        </div>

        <div className="parking-area">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`parking-cell ${occupiedCells.includes(i) ? 'occupied-sim' : ''}`}>
              <span>P{i + 1}</span>
            </div>
          ))}
        </div>

        <div className="car-animated" style={{ left: carLeft, bottom: carBottom }}>🚗</div>

        {personVisible && <div className="person-animated" style={{ left: personLeft, bottom: personBottom }}>🧑</div>}

        {showTicket && ticketData && (
          <div className="ticket-popup">
            <h3>🎟️ Ticket Issued</h3>
            <div className="ticket-detail"><strong>{ticketData.ticketNumber}</strong></div>
            <div className="ticket-detail">{ticketData.vehicleNumber}</div>
            <div className="ticket-detail">Spot: {ticketData.spotId}</div>
            <div className="ticket-detail">{new Date(ticketData.entryTime).toLocaleTimeString()}</div>
          </div>
        )}

        {scanPreview && (
          <div className="ticket-popup" style={{ background: 'rgba(20, 24, 38, 0.95)', border: '1px solid var(--accent)', width: 220 }}>
            <h3>🎟️ Ticket Scanned</h3>
            <div className="ticket-detail"><strong>{scanPreview.ticketNumber}</strong></div>
            <div className="ticket-detail">Spot: {scanPreview.spotId}</div>
            <div className="ticket-detail">Duration: {fmtTimer(timer)}</div>
            <div className="ticket-detail" style={{ fontSize: 16, color: '#e5c07b', fontWeight: 700, marginTop: 4 }}>
              Due: ₹{scanPreview.amount?.toFixed(2)}
            </div>
            <div className="ticket-detail" style={{ color: '#ff6b6b', fontSize: 11, fontWeight: 700 }}>
              Status: {scanPreview.paymentStatus}
            </div>
          </div>
        )}

        {showReceipt && receiptData && (
          <div className="receipt-popup">
            <h3>🧾 Payment Receipt ({receiptData.paymentMethod || 'PAID'})</h3>
            <div className="ticket-detail">{receiptData.ticketNumber}</div>
            <div className="ticket-detail">Duration: {fmtTimer(timer)}</div>
            <div className="ticket-detail" style={{ fontSize: 18, color: '#98c379', fontWeight: 700 }}>Paid ₹{receiptData.amount?.toFixed(2) || '0.00'}</div>
          </div>
        )}
      </div>

      {simError && (
        <div style={{ color: '#ff6b6b', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
          {simError}
          <button className="flow-btn" style={{ marginLeft: 12, padding: '4px 12px', background: '#2a2a4a', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={resetFlow}>↺ Reset</button>
        </div>
      )}

      {(step === 0 || (simError && step > 0)) && (
        <button className="flow-btn primary" onClick={startFlow}>▶ Start Simulation</button>
      )}

      {step === 2 && (
        <button className="flow-btn success" onClick={parkVehicle}>🅿 Park Vehicle</button>
      )}

      {(step === 3 || step === 4) && away && (
        <div className="away-timer">
          {!activity ? (
            <div className="activity-selector">
              {ACTIVITIES.map((a) => (
                <button key={a.label} className={activity?.label === a.label ? 'active' : ''} onClick={() => startAway(a)}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="activity">{activity.emoji} {activity.label} in progress...</div>
              <div className="timer">{fmtTimer(timer)}</div>
              <button className="flow-btn warning" onClick={returnToCar}>🔑 Return to Vehicle</button>
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div style={{ textAlign: 'center' }}>
          <button className="flow-btn danger" onClick={driveToExitGate}>
            🚗 Drive to Exit Gate
          </button>
        </div>
      )}

      {step === 6 && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pricing Strategy:</label>
            <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-primary)' }}>
              <option value="HOURLY">Hourly (Standard)</option>
              <option value="FLAT">Flat Rate</option>
              <option value="DYNAMIC">Dynamic Surge (1.5x)</option>
            </select>
          </div>
          <button className="flow-btn warning" onClick={scanTicketAtExit} disabled={entryLoading}>
            🎟️ 1. Scan Ticket & Calculate Price
          </button>
        </div>
      )}

      {step === 7 && scanPreview && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payment Method:</label>
            <select value={selectedPayMethod} onChange={(e) => setSelectedPayMethod(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-primary)' }}>
              <option value="UPI">UPI / QR Code</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash</option>
            </select>
          </div>
          <button className="flow-btn success" onClick={payAndExitVehicle} disabled={entryLoading}>
            💳 2. Pay ₹{scanPreview.amount?.toFixed(2)} & Open Gate
          </button>
        </div>
      )}
    </div>
  );
}

export default function ParkingLotPage() {
  const [activeTab, setActiveTab] = useState('entry');
  const [classDiagramData, setClassDiagramData] = useState(null);
  const [designDetailsData, setDesignDetailsData] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  useEffect(() => {
    if (activeTab === 'diagram' && !classDiagramData) {
      setLoadingDoc(true);
      getParkingClassDiagram()
        .then((data) => setClassDiagramData(data))
        .catch((err) => console.error('Failed to load class diagram from backend API', err))
        .finally(() => setLoadingDoc(false));
    } else if (activeTab === 'design' && !designDetailsData) {
      setLoadingDoc(true);
      getParkingDesignDetails()
        .then((data) => setDesignDetailsData(data))
        .catch((err) => console.error('Failed to load design details from backend API', err))
        .finally(() => setLoadingDoc(false));
    }
  }, [activeTab, classDiagramData, designDetailsData]);

  const tabs = [
    { key: 'entry', label: 'Entry' },
    { key: 'exit', label: 'Exit' },
    { key: 'spots', label: 'Spots' },
    { key: 'tickets', label: 'Tickets' },
    { key: 'demo', label: 'Animated Demo' },
    { key: 'diagram', label: 'Class Diagram' },
    { key: 'design', label: 'Design Details' },
  ];

  return (
    <div className="parking-app">
      <style>{PARKING_CSS}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="parking-header">
        <h1>Parking Lot System</h1>
        <p>Multi-level parking with entry/exit gates, spot tracking, and ticket-based pricing</p>
      </header>
      <nav className="parking-nav">
        {tabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="parking-main">
        {activeTab === 'entry' && <EntryForm />}
        {activeTab === 'exit' && <ExitForm />}
        {activeTab === 'spots' && <SpotGrid />}
        {activeTab === 'tickets' && <ActiveTickets />}
        {activeTab === 'demo' && <AnimatedFlow />}
        {activeTab === 'diagram' && (
          loadingDoc && !classDiagramData ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--info)', fontWeight: 600 }}>🔄 Loading Class Diagram from Backend API...</div>
          ) : (
            <ClassDiagram module="parking" customData={classDiagramData} />
          )
        )}
        {activeTab === 'design' && (
          loadingDoc && !designDetailsData ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--info)', fontWeight: 600 }}>🔄 Loading Design Details from Backend API...</div>
          ) : (
            <DesignDetails module="parking" customData={designDetailsData} />
          )
        )}
      </main>
    </div>
  );
}
