import { useState, useEffect, useCallback } from 'react';
import { getEstimate, requestRide, getUserRides, updateRideStatus } from './api';
import LldPage from '../../components/LldPage';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StepIndicator from '../../components/ui/StepIndicator';
import { useToast } from '../../components/ui/ToastContext';
import { usePolling } from '../../hooks/usePolling';

const UBER_CSS = `
.uber-container { max-width: 1000px; margin: 0 auto; }
.form-row { display: flex; gap: 16px; margin-bottom: 16px; }
.vehicle-types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.vehicle-card { border: 2px solid var(--border-primary); border-radius: var(--radius-lg); padding: 16px; text-align: center; cursor: pointer; transition: all var(--duration-fast); background: var(--bg-card); color: var(--text-primary); }
.vehicle-card.selected { border-color: var(--accent); background: var(--bg-tertiary); }
.vehicle-card:hover:not(.selected) { border-color: var(--text-muted); }
.vehicle-card .v-icon { font-size: 28px; margin-bottom: 8px; }
.vehicle-card .v-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
.vehicle-card .v-rate { font-size: 12px; color: var(--text-secondary); }

.estimate-card { margin-top: 16px; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md); border-left: 4px solid var(--accent); color: var(--text-primary); }
.estimate-detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid var(--border-secondary); }
.estimate-detail:last-child { border-bottom: none; }

.ride-card { border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px; background: var(--bg-card); color: var(--text-primary); }
.ride-header { display: flex; justify-content: space-between; margin-bottom: 8px; }

.uber-flow-scene { position: relative; width: 100%; height: 280px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-primary); margin-bottom: 16px; }
.uber-flow-map { position: relative; width: 100%; height: 100%; padding: 20px; }
.uber-flow-marker { padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: 700; color: white; position: absolute; box-shadow: var(--shadow-md); z-index: 2; }
.uber-flow-marker.pickup { background: var(--success); }
.uber-flow-marker.drop { background: var(--danger); }
.uber-flow-car { position: absolute; font-size: 32px; z-index: 3; transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1); }
`;

const USER_ID = 'user1';

const LOCATIONS = [
  { lat: 12.9716, lng: 77.5946, label: 'MG Road' },
  { lat: 12.9344, lng: 77.6101, label: 'Koramangala' },
  { lat: 12.9815, lng: 77.6365, label: 'Indiranagar' },
  { lat: 12.9279, lng: 77.6271, label: 'JP Nagar' },
  { lat: 12.9586, lng: 77.6500, label: 'Whitefield' },
  { lat: 12.9698, lng: 77.5500, label: 'Malleswaram' },
];

const VEHICLES = [
  { type: 'UBER_GO', label: 'Uber Go', icon: '🚗', rate: '₹12/km' },
  { type: 'UBER_XL', label: 'Uber XL', icon: '🚙', rate: '₹18/km' },
  { type: 'UBER_PREMIUM', label: 'Premium', icon: '🚘', rate: '₹25/km' },
];

function BookRide({ onRideBooked }) {
  const toast = useToast();
  const [pickup, setPickup] = useState(LOCATIONS[0].label);
  const [dropoff, setDropoff] = useState(LOCATIONS[1].label);
  const [vehicleType, setVehicleType] = useState('UBER_GO');
  const [estimate, setEstimate] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const locMap = Object.fromEntries(LOCATIONS.map((l) => [l.label, l]));

  const handleEstimate = async () => {
    setError('');
    const p = locMap[pickup]; const d = locMap[dropoff];
    if (!p || !d || pickup === dropoff) {
      const msg = 'Pickup and dropoff locations must be different';
      setError(msg); toast.error(msg); return;
    }
    try {
      const data = await getEstimate(p.lat, p.lng, d.lat, d.lng, vehicleType);
      setEstimate(data);
    } catch (err) {
      const msg = err.message || 'Failed to get fare estimate';
      setError(msg); toast.error(msg);
    }
  };

  const handleBook = async () => {
    setError(''); setResult(null); setLoading(true);
    const p = locMap[pickup]; const d = locMap[dropoff];
    try {
      const data = await requestRide(USER_ID, p.lat, p.lng, p.label, d.lat, d.lng, d.label, vehicleType);
      if (data.error) {
        setError(data.error); toast.error(data.error);
      } else {
        setResult(data); onRideBooked();
        toast.success(`Ride requested! Driver: ${data.driverName || 'Assigning...'}`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to book ride';
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <CardHeader title="🚗 Book a Ride" subtitle="Instant distance calculation via Haversine strategy" />
        <CardBody>
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <Select label="Pickup Location" value={pickup} onChange={(e) => { setPickup(e.target.value); setEstimate(null); }}>
                {LOCATIONS.map((l) => <option key={l.label}>{l.label}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Dropoff Location" value={dropoff} onChange={(e) => { setDropoff(e.target.value); setEstimate(null); }}>
                {LOCATIONS.map((l) => <option key={l.label}>{l.label}</option>)}
              </Select>
            </div>
          </div>

          <label style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>
            Select Vehicle Type
          </label>

          <div className="vehicle-types">
            {VEHICLES.map((v) => (
              <div key={v.type} className={`vehicle-card ${vehicleType === v.type ? 'selected' : ''}`} onClick={() => { setVehicleType(v.type); setEstimate(null); }}>
                <div className="v-icon">{v.icon}</div>
                <div className="v-name">{v.label}</div>
                <div className="v-rate">{v.rate}</div>
              </div>
            ))}
          </div>

          {!estimate ? (
            <Button variant="secondary" onClick={handleEstimate} style={{ width: '100%' }}>
              Calculate Fare Estimate
            </Button>
          ) : (
            <div>
              <div className="estimate-card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>Estimated Trip Summary</h3>
                <div className="estimate-detail"><span>Distance</span><strong>{estimate.distanceKm?.toFixed(1)} km</strong></div>
                <div className="estimate-detail"><span>Estimated Time</span><strong>{estimate.estimatedMinutes} mins</strong></div>
                <div className="estimate-detail"><span>Estimated Fare</span><strong style={{ fontSize: 18, color: 'var(--success)' }}>₹{estimate.estimatedFare?.toFixed(2)}</strong></div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Button variant="primary" loading={loading} onClick={handleBook} style={{ flex: 1 }}>
                  Confirm & Request Ride
                </Button>
                <Button variant="secondary" onClick={() => setEstimate(null)}>
                  Recalculate
                </Button>
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: 12, padding: 10, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 6 }}>{error}</div>}

          {result && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
              <h3 style={{ color: 'var(--success)', marginBottom: 8 }}>✅ Ride Requested Successfully!</h3>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Ride ID: <strong>{result.id || result.rideId}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Status: <Badge variant="info">{result.status}</Badge></div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Driver Assigned: <strong>{result.driverName || 'Searching nearby drivers...'}</strong></div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MyRides() {
  const toast = useToast();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = useCallback(async () => {
    try {
      const data = await getUserRides(USER_ID);
      if (Array.isArray(data)) setRides(data);
    } catch {
      // silent polling
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchRides, 4000, []);

  const handleStatusChange = async (rideId, status) => {
    try {
      await updateRideStatus(rideId, status);
      toast.success(`Ride status updated to ${status}`);
      fetchRides();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const getBadgeVariant = (status) => {
    switch (status) {
      case 'REQUESTED': return 'info';
      case 'ACCEPTED': return 'warning';
      case 'ARRIVED': return 'accent';
      case 'STARTED': return 'warning';
      case 'COMPLETED': return 'success';
      default: return 'neutral';
    }
  };

  if (loading && rides.length === 0) return <Skeleton height={200} />;
  if (rides.length === 0) return <EmptyState icon="🚕" title="No active or past rides" />;

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 18, color: 'var(--text-primary)' }}>Your Ride History & Active Trips</h2>
      {rides.map((r) => (
        <div key={r.id || r.rideId} className="ride-card">
          <div className="ride-header">
            <div>
              <span style={{ fontWeight: 700 }}>Ride #{r.id || r.rideId}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>({r.vehicleType})</span>
            </div>
            <Badge variant={getBadgeVariant(r.status)}>{r.status}</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>
            📍 {r.pickupLabel} ➔ 🏁 {r.dropoffLabel}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>
            Fare: ₹{r.fare ? r.fare.toFixed(2) : r.estimatedFare?.toFixed(2)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {r.status === 'REQUESTED' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(r.id || r.rideId, 'ACCEPTED')}>Driver Accept</Button>}
            {r.status === 'ACCEPTED' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(r.id || r.rideId, 'ARRIVED')}>Driver Arrived</Button>}
            {r.status === 'ARRIVED' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(r.id || r.rideId, 'STARTED')}>Start Trip</Button>}
            {r.status === 'STARTED' && <Button size="sm" variant="success" onClick={() => handleStatusChange(r.id || r.rideId, 'COMPLETED')}>Complete Trip</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [carLeft, setCarLeft] = useState(30);
  const [statusMsg, setStatusMsg] = useState('');

  const steps = ['Request', 'Driver Accept', 'Arrived', 'Trip Started', 'Completed'];

  const startSim = () => {
    setStep(1); setStatusMsg('Finding nearby driver...'); setCarLeft(30);
    setTimeout(() => {
      setStep(2); setStatusMsg('Driver Alex accepted! On the way...'); setCarLeft(150);
    }, 1500);
    setTimeout(() => {
      setStep(3); setStatusMsg('Driver arrived at pickup location!'); setCarLeft(300);
    }, 3000);
    setTimeout(() => {
      setStep(4); setStatusMsg('Trip in progress ➔ Heading to destination'); setCarLeft(600);
    }, 4500);
    setTimeout(() => {
      setStep(5); setStatusMsg('Trip Completed! Total Fare: ₹240.00'); setCarLeft(750);
    }, 6500);
  };

  const resetSim = () => {
    setStep(0); setCarLeft(30); setStatusMsg('');
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <StepIndicator steps={steps} currentStep={step} />

      <div className="uber-flow-scene">
        <div className="uber-flow-map">
          <div className="uber-flow-marker pickup" style={{ left: 300, top: 120 }}>📍 Pickup (MG Road)</div>
          <div className="uber-flow-marker drop" style={{ left: 750, top: 120 }}>🏁 Dropoff (Koramangala)</div>
          <div className="uber-flow-car" style={{ left: carLeft, top: 110 }}>🚘</div>
        </div>
      </div>

      {statusMsg && (
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          {statusMsg}
        </div>
      )}

      {step === 0 ? (
        <Button variant="primary" size="lg" onClick={startSim}>
          ▶️ Start Ride Simulation
        </Button>
      ) : (
        <Button variant="secondary" onClick={resetSim}>
          🔄 Reset Simulation
        </Button>
      )}
    </div>
  );
}

export default function UberPage() {
  return (
    <LldPage
      module="uber"
      title="Uber Cab Booking"
      icon="🚗"
      tabs={['book', 'my-rides', 'demo', 'diagram', 'design']}
    >
      {(activeTab) => (
        <div className="uber-container">
          <style>{UBER_CSS}</style>
          {activeTab === 'book' && <BookRide onRideBooked={() => {}} />}
          {activeTab === 'my-rides' && <MyRides />}
          {activeTab === 'demo' && <AnimatedFlow />}
        </div>
      )}
    </LldPage>
  );
}
