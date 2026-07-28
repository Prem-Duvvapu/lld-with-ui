import { useState } from 'react';
import { getEstimate, requestRide } from '../api';

const VEHICLES = [
  { type: 'UBER_GO', label: 'Uber Go', icon: '🚗', rate: '₹12/km' },
  { type: 'UBER_XL', label: 'Uber XL', icon: '🚙', rate: '₹18/km' },
  { type: 'UBER_PREMIUM', label: 'Premium', icon: '🚘', rate: '₹25/km' },
];

export default function BookRide({ userId, locations, onRideBooked }) {
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
    const p = locMap[pickup];
    const d = locMap[dropoff];
    if (!p || !d) { setError('Please select both locations'); return; }
    if (pickup === dropoff) { setError('Pickup and dropoff must be different'); return; }
    try {
      const data = await getEstimate(p.lat, p.lng, d.lat, d.lng, vehicleType);
      setEstimate(data);
    } catch { setError('Failed to get estimate'); }
  };

  const handleBook = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    const p = locMap[pickup];
    const d = locMap[dropoff];
    try {
      const data = await requestRide(userId, p.lat, p.lng, p.label, d.lat, d.lng, d.label, vehicleType);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        onRideBooked();
      }
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
          <div key={v.type} className={`vehicle-card ${vehicleType === v.type ? 'selected' : ''}`}
               onClick={() => setVehicleType(v.type)}>
            <div className="v-icon">{v.icon}</div>
            <div className="v-name">{v.label}</div>
            <div className="v-rate">{v.rate}</div>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={handleEstimate} style={{ marginBottom: 12 }}>
        Get Fare Estimate
      </button>

      {estimate && (
        <div className="estimate-card">
          <h3>Fare Estimate</h3>
          <div className="estimate-detail">
            <span className="label">Distance</span>
            <span className="value">{estimate.distanceKm.toFixed(1)} km</span>
          </div>
          <div className="estimate-detail">
            <span className="label">Vehicle</span>
            <span className="value">{vehicleType.replace(/_/g, ' ')}</span>
          </div>
          <div className="estimate-detail">
            <span className="label">Drivers Available</span>
            <span className="value">{estimate.driversAvailable ? 'Yes' : 'No'}</span>
          </div>
          <div className="estimate-detail">
            <span className="label">Estimated Fare</span>
            <span className="value" style={{ fontSize: 18 }}>₹{estimate.fare.toFixed(2)}</span>
          </div>
        </div>
      )}

      <button className="btn-primary" onClick={handleBook} disabled={loading}
              style={{ marginTop: 16 }}>
        {loading ? 'Booking...' : 'Confirm Ride'}
      </button>

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
