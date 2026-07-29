import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getEstimate, requestRide, getUserRides, updateRideStatus } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; }
.app { max-width: 1000px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { font-size: 28px; color: #000; }
header p { color: #666; font-size: 14px; margin-top: 4px; }
nav { display: flex; gap: 8px; margin-bottom: 24px; justify-content: center; }
nav button { padding: 10px 24px; border: 2px solid #000; background: white; color: #000; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
nav button.active { background: #000; color: white; }
nav button:hover:not(.active) { background: #f0f0f0; }
main { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.booking-form h2 { margin-bottom: 20px; font-size: 20px; }
.form-row { display: flex; gap: 16px; margin-bottom: 16px; }
.form-group { flex: 1; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
.form-group select, .form-group input { width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
.form-group select:focus, .form-group input:focus { outline: none; border-color: #000; }
.btn-primary { width: 100%; padding: 14px; background: #000; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #333; }
.btn-primary:disabled { background: #999; cursor: not-allowed; }
.estimate-card { margin-top: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #000; }
.estimate-card h3 { margin-bottom: 12px; font-size: 16px; }
.estimate-detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #eee; }
.estimate-detail:last-child { border-bottom: none; }
.estimate-detail .label { color: #666; }
.estimate-detail .value { font-weight: 600; }
.result-card { margin-top: 20px; padding: 16px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50; }
.result-card h3 { margin-bottom: 12px; color: #2e7d32; }
.result-card .detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #c8e6c9; }
.result-card .detail:last-child { border-bottom: none; }
.result-card .label { color: #555; }
.result-card .value { font-weight: 600; }
.error { margin-top: 16px; padding: 12px; background: #fff0f0; color: #d32f2f; border-radius: 8px; font-size: 14px; }
.alert { text-align: center; padding: 32px; color: #666; font-size: 16px; }
.ride-card { border: 2px solid #eee; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.ride-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.ride-header .ride-id { font-weight: 700; }
.ride-header .ride-type { font-size: 12px; color: #999; }
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.status-REQUESTED { background: #e3f2fd; color: #1565c0; }
.status-ACCEPTED { background: #fff3e0; color: #e65100; }
.status-ARRIVED { background: #fce4ec; color: #c62828; }
.status-STARTED { background: #e8f5e9; color: #2e7d32; }
.status-COMPLETED { background: #f1f8e9; color: #558b2f; }
.status-CANCELLED { background: #fafafa; color: #9e9e9e; }
.ride-route { margin: 8px 0; font-size: 13px; color: #555; }
.ride-route .point { display: flex; align-items: center; gap: 6px; margin: 2px 0; }
.ride-route .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.ride-route .dot.green { background: #4caf50; }
.ride-route .dot.red { background: #f44336; }
.ride-info { font-size: 13px; color: #666; margin: 4px 0; }
.ride-fare { font-weight: 700; font-size: 16px; margin: 8px 0; }
.ride-actions { margin-top: 8px; display: flex; gap: 8px; }
.ride-actions button { padding: 6px 14px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 12px; background: white; }
.ride-actions button:hover { background: #f5f5f5; }
.ride-actions .btn-cancel { color: #d32f2f; }
.vehicle-types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.vehicle-card { border: 2px solid #ddd; border-radius: 10px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s; }
.vehicle-card.selected { border-color: #000; background: #f8f9fa; }
.vehicle-card:hover { border-color: #999; }
.vehicle-card .v-icon { font-size: 28px; margin-bottom: 8px; }
.vehicle-card .v-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
.vehicle-card .v-rate { font-size: 12px; color: #666; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #000; border-radius: 6px; color: #000; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #000; color: white; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
.step-dot.active { background: #2196f3; box-shadow: 0 0 8px rgba(33,150,243,0.5); }
.step-dot.done { background: #3fb950; }
.uber-flow-scene {
  position: relative; width: 100%; height: 280px;
  background: linear-gradient(180deg, #e8f4fd 0%, #b3d9f2 100%);
  border-radius: 12px; overflow: hidden; border: 1px solid #ddd;
  margin-bottom: 16px;
}
.uber-flow-map {
  position: relative; width: 100%; height: 100%; padding: 20px;
}
.uber-flow-marker {
  padding: 6px 12px; border-radius: 16px; font-size: 11px;
  font-weight: 700; color: white; position: absolute;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 2;
}
.uber-flow-marker.pickup { background: #4caf50; }
.uber-flow-marker.drop { background: #f44336; }
.uber-flow-route {
  position: absolute; height: 3px; background: #2196f3;
  border-radius: 2px; z-index: 1; transition: width 1s ease;
  box-shadow: 0 0 8px rgba(33,150,243,0.4);
}
.uber-flow-car {
  position: absolute; font-size: 32px; z-index: 3;
  transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}
.uber-flow-driver-card {
  background: white; border-radius: 12px; padding: 12px 16px;
  margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex; align-items: center; gap: 12px;
  max-width: 320px; margin: 0 auto 12px auto;
}
.uber-flow-status {
  text-align: center; margin-bottom: 8px;
}
.uber-flow-status .status-text {
  padding: 4px 14px; border-radius: 12px; font-size: 11px;
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
}
.uber-flow-eta {
  text-align: center; font-size: 12px; color: #666; margin: 4px 0;
}
.uber-flow-fare-popup {
  background: white; border: 2px solid #4CAF50; border-radius: 12px;
  padding: 16px 24px; text-align: center; margin: 0 auto 12px auto;
  max-width: 300px; animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.uber-flow-fare-popup .fare-amount {
  font-size: 28px; font-weight: 800; color: #4CAF50; margin: 4px 0;
}
`;

const USER_ID = 'user1';

const locations = [
  { lat: 12.9716, lng: 77.5946, label: 'MG Road' },
  { lat: 12.9344, lng: 77.6101, label: 'Koramangala' },
  { lat: 12.9815, lng: 77.6365, label: 'Indiranagar' },
  { lat: 12.9279, lng: 77.6271, label: 'JP Nagar' },
  { lat: 12.9586, lng: 77.6500, label: 'Whitefield' },
  { lat: 12.9698, lng: 77.5500, label: 'Malleswaram' },
  { lat: 12.9767, lng: 77.5713, label: 'Vijayanagar' },
  { lat: 12.9116, lng: 77.6839, label: 'HSR Layout' },
];

const VEHICLES = [
  { type: 'UBER_GO', label: 'Uber Go', icon: '🚗', rate: '₹12/km' },
  { type: 'UBER_XL', label: 'Uber XL', icon: '🚙', rate: '₹18/km' },
  { type: 'UBER_PREMIUM', label: 'Premium', icon: '🚘', rate: '₹25/km' },
];

function BookRide({ onRideBooked }) {
  const [pickup, setPickup] = useState(locations[0].label);
  const [dropoff, setDropoff] = useState(locations[1].label);
  const [vehicleType, setVehicleType] = useState('UBER_GO');
  const [estimate, setEstimate] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const locMap = Object.fromEntries(locations.map((l) => [l.label, l]));

  const handleEstimate = async () => {
    setError('');
    const p = locMap[pickup]; const d = locMap[dropoff];
    if (!p || !d) { setError('Please select both locations'); return; }
    if (pickup === dropoff) { setError('Pickup and dropoff must be different'); return; }
    try { const data = await getEstimate(p.lat, p.lng, d.lat, d.lng, vehicleType); setEstimate(data); }
    catch { setError('Failed to get estimate'); }
  };

  const handleBook = async () => {
    setError(''); setResult(null); setLoading(true);
    const p = locMap[pickup]; const d = locMap[dropoff];
    try {
      const data = await requestRide(USER_ID, p.lat, p.lng, p.label, d.lat, d.lng, d.label, vehicleType);
      if (data.error) { setError(data.error); }
      else { setResult(data); onRideBooked(); }
    } catch { setError('Failed to book ride'); }
    finally { setLoading(false); }
  };

  return (
    <div className="booking-form">
      <h2>Book a Ride</h2>
      <div className="form-row">
        <div className="form-group">
          <label>Pickup Location</label>
          <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
            {locations.map((l) => <option key={l.label}>{l.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Dropoff Location</label>
          <select value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
            {locations.map((l) => <option key={l.label}>{l.label}</option>)}
          </select>
        </div>
      </div>
      <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>Vehicle Type</label>
      <div className="vehicle-types">
        {VEHICLES.map((v) => (
          <div key={v.type} className={`vehicle-card ${vehicleType === v.type ? 'selected' : ''}`} onClick={() => setVehicleType(v.type)}>
            <div className="v-icon">{v.icon}</div>
            <div className="v-name">{v.label}</div>
            <div className="v-rate">{v.rate}</div>
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={handleEstimate} style={{ marginBottom: 12 }}>Get Fare Estimate</button>
      {estimate && (
        <div className="estimate-card">
          <h3>Fare Estimate</h3>
          <div className="estimate-detail"><span className="label">Distance</span><span className="value">{estimate.distanceKm.toFixed(1)} km</span></div>
          <div className="estimate-detail"><span className="label">Vehicle</span><span className="value">{vehicleType.replace(/_/g, ' ')}</span></div>
          <div className="estimate-detail"><span className="label">Drivers Available</span><span className="value">{estimate.driversAvailable ? 'Yes' : 'No'}</span></div>
          <div className="estimate-detail"><span className="label">Estimated Fare</span><span className="value" style={{ fontSize: 18 }}>₹{estimate.fare.toFixed(2)}</span></div>
        </div>
      )}
      <button className="btn-primary" onClick={handleBook} disabled={loading} style={{ marginTop: 16 }}>{loading ? 'Booking...' : 'Confirm Ride'}</button>
      {error && <div className="error">{error}</div>}
      {result && (
        <div className="result-card">
          <h3>Ride Booked!</h3>
          <div className="detail"><span className="label">Ride ID</span><span className="value">{result.id}</span></div>
          <div className="detail"><span className="label">Driver</span><span className="value">{result.driverName || 'Searching...'}</span></div>
          <div className="detail"><span className="label">Vehicle</span><span className="value">{result.vehicleNumber || '—'}</span></div>
          <div className="detail"><span className="label">Pickup</span><span className="value">{result.pickup?.label}</span></div>
          <div className="detail"><span className="label">Dropoff</span><span className="value">{result.dropoff?.label}</span></div>
          <div className="detail"><span className="label">Fare</span><span className="value">₹{result.fare?.toFixed(2)}</span></div>
          <div className="detail"><span className="label">Status</span><span className="value">{result.status}</span></div>
        </div>
      )}
    </div>
  );
}

const STATUS_FLOW = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED'];

function RideHistory() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = () => { getUserRides(USER_ID).then(setRides).finally(() => setLoading(false)); };

  useEffect(() => { fetchRides(); const interval = setInterval(fetchRides, 5000); return () => clearInterval(interval); }, []);

  const advanceStatus = async (rideId, currentStatus) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < STATUS_FLOW.length - 1) { await updateRideStatus(rideId, STATUS_FLOW[idx + 1]); fetchRides(); }
  };

  const cancelRide = async (rideId) => { await updateRideStatus(rideId, 'CANCELLED'); fetchRides(); };

  if (loading) return <div className="alert">Loading rides...</div>;
  if (rides.length === 0) return <div className="alert">No rides yet. Book one now!</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>My Rides</h2>
      {rides.map((ride) => {
        const idx = STATUS_FLOW.indexOf(ride.status);
        const canAdvance = ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED' && idx < STATUS_FLOW.length - 1;
        const canCancel = ride.status === 'REQUESTED' || ride.status === 'ACCEPTED';
        return (
          <div key={ride.id} className="ride-card">
            <div className="ride-header">
              <div><span className="ride-id">{ride.id}</span><span className="ride-type"> — {ride.vehicleType?.replace(/_/g, ' ')}</span></div>
              <span className={`status-badge status-${ride.status}`}>{ride.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="ride-route">
              <div className="point"><span className="dot green"></span> {ride.pickup?.label}</div>
              <div className="point"><span className="dot red"></span> {ride.dropoff?.label}</div>
            </div>
            {ride.driverName && <div className="ride-info">Driver: {ride.driverName} ({ride.vehicleNumber})</div>}
            <div className="ride-info">Distance: {ride.distanceKm?.toFixed(1)} km</div>
            <div className="ride-fare">₹{ride.fare?.toFixed(2)}</div>
            <div className="ride-actions">
              {canAdvance && <button onClick={() => advanceStatus(ride.id, ride.status)}>Next: {STATUS_FLOW[idx + 1].replace(/_/g, ' ')}</button>}
              {canCancel && <button className="btn-cancel" onClick={() => cancelRide(ride.id)}>Cancel Ride</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  const steps = ['Request', 'Booked', 'Arrived', 'Riding', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => { setStep(0); setRide(null); setLoading(false); setError(''); };

  const startSim = () => { setStep(1); };

  const requestRideAction = async () => {
    setError(''); setLoading(true);
    try {
      const data = await requestRide('user1', 12.9716, 77.5946, 'MG Road', 12.9344, 77.6101, 'Koramangala', 'UBER_GO');
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setRide(data);
      setStep(2);
    } catch { if (mountedRef.current) setError('Failed to request ride'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const driverArrivedAction = async () => {
    if (!ride) return;
    setError(''); setLoading(true);
    try {
      await updateRideStatus(ride.id, 'ACCEPTED');
      if (!mountedRef.current) return;
      await updateRideStatus(ride.id, 'ARRIVED');
      if (!mountedRef.current) return;
      setStep(3);
    } catch { if (mountedRef.current) setError('Failed to update status'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const startRideAction = async () => {
    if (!ride) return;
    setError(''); setLoading(true);
    try {
      await updateRideStatus(ride.id, 'STARTED');
      if (!mountedRef.current) return;
      setStep(4);
    } catch { if (mountedRef.current) setError('Failed to start ride'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const completeRideAction = async () => {
    if (!ride) return;
    setError(''); setLoading(true);
    try {
      await updateRideStatus(ride.id, 'COMPLETED');
      if (!mountedRef.current) return;
      setStep(5);
    } catch { if (mountedRef.current) setError('Failed to complete ride'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      {error && <div className="error" style={{ color: '#d32f2f', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}<button style={{ marginLeft: 12 }} onClick={reset}>↺ Reset</button></div>}

      {step === 0 && <button className="btn-primary" onClick={startSim}>▶ Start Simulation</button>}

      {step >= 1 && !error && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div className="uber-flow-scene">
            <div className="uber-flow-map">
              <div className="uber-flow-marker pickup" style={{ top: '30%', left: '20%' }}>📍 MG Road</div>
              <div className="uber-flow-marker drop" style={{ top: '60%', left: '70%' }}>🏁 Koramangala</div>
              <div className="uber-flow-route" style={{ top: '45%', left: '25%', width: step >= 3 ? '65%' : '20%' }}></div>
              <div className="uber-flow-car" style={{ top: step >= 3 ? '55%' : '35%', left: step >= 3 ? '60%' : '25%' }}>🚗</div>
            </div>
          </div>

          {ride && (
            <div className="uber-flow-driver-card">
              <div style={{ fontSize: 32 }}>👨‍✈️</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ride.driverName || 'Rahul'}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{ride.vehicleNumber || 'KA-01-1234'} • {ride.vehicleType?.replace(/_/g, ' ')}</div>
              </div>
            </div>
          )}

          <div className="uber-flow-status">
            <span className="status-text" style={{ background: step === 5 ? '#e8f5e9' : step === 4 ? '#fff3e0' : step === 3 ? '#e3f2fd' : '#fce4ec', color: step === 5 ? '#2e7d32' : step === 4 ? '#e65100' : step === 3 ? '#1565c0' : '#c62828' }}>
              {step === 1 ? 'REQUESTING' : step === 2 ? 'DRIVER ARRIVING' : step === 3 ? 'ON THE WAY' : step === 4 ? 'ARRIVING NOW' : 'COMPLETED'}
            </span>
          </div>

          {step >= 2 && step <= 4 && (
            <div className="uber-flow-eta">
              ⏱ {step === 2 ? '2 min away' : step === 3 ? '5 min away' : 'Arriving now'}
            </div>
          )}

          {step === 1 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📍</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>MG Road → Koramangala</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Uber Go • ~6.2 km</div>
            </div>
          )}

          {step === 1 && <button onClick={requestRideAction} disabled={loading} style={{ padding: '8px 20px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📱 Request Ride {loading ? '...' : ''}</button>}
          {step === 2 && <button onClick={driverArrivedAction} disabled={loading} style={{ padding: '8px 20px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🚗 Driver Arrived {loading ? '...' : ''}</button>}
          {step === 3 && <button onClick={startRideAction} disabled={loading} style={{ padding: '8px 20px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🏁 Start Ride {loading ? '...' : ''}</button>}
          {step === 4 && <button onClick={completeRideAction} disabled={loading} style={{ padding: '8px 20px', background: '#9c27b0', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✅ Complete Ride {loading ? '...' : ''}</button>}
          {step === 5 && (
            <div className="uber-flow-fare-popup">
              <div style={{ fontSize: 32, marginBottom: 4 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Ride Complete!</div>
              <div className="fare-amount">₹{ride?.fare?.toFixed(2)}</div>
              <div style={{ fontSize: 13, color: '#666', margin: '4px 0' }}>{ride?.distanceKm?.toFixed(1)} km • {ride?.driverName || 'Rahul'}</div>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{ride?.vehicleNumber || 'KA-01-1234'} • {ride?.vehicleType?.replace(/_/g, ' ')}</div>
              <button className="btn-primary" style={{ marginTop: 8, padding: '8px 20px', fontSize: 13 }} onClick={reset}>🔄 New Ride</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UberPage() {
  const [page, setPage] = useState('bookRide');
  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header><h1>Uber</h1><p>Ride-Hailing - Low-Level Design</p></header>
      <nav>
        <button className={page === 'bookRide' ? 'active' : ''} onClick={() => setPage('bookRide')}>Book a Ride</button>
        <button className={page === 'rides' ? 'active' : ''} onClick={() => setPage('rides')}>My Rides</button>
        <button className={page === 'simulation' ? 'active' : ''} onClick={() => setPage('simulation')}>Simulation</button>
        <button className={page === 'diagram' ? 'active' : ''} onClick={() => setPage('diagram')}>Class Diagram</button>
        <button className={page === 'design' ? 'active' : ''} onClick={() => setPage('design')}>Design Details</button>
      </nav>
      <main>
        {page === 'bookRide' && <BookRide onRideBooked={() => setPage('rides')} />}
        {page === 'rides' && <RideHistory />}
        {page === 'simulation' && <AnimatedFlow />}
        {page === 'diagram' && <ClassDiagram module="uber" />}
        {page === 'design' && <DesignDetails module="uber" />}
      </main>
    </div>
  );
}
