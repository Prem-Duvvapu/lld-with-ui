import { useState, useEffect, useCallback } from 'react';
import { getEstimate, requestRide, getAllRides, startTrip, completeTrip, cancelTrip, getDrivers, updateDriverStatus, getDriverRequests, acceptRide, declineRide } from './api';
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

.driver-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
.driver-card { border: 1px solid var(--border-primary); border-radius: var(--radius-md); padding: 16px; background: var(--bg-card); }

.uber-flow-scene { position: relative; width: 100%; height: 280px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-primary); margin-bottom: 16px; }
.uber-flow-map { position: relative; width: 100%; height: 100%; padding: 20px; }
.uber-flow-marker { padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: 700; color: white; position: absolute; box-shadow: var(--shadow-md); z-index: 2; }
.uber-flow-marker.pickup { background: var(--success); }
.uber-flow-marker.drop { background: var(--danger); }
.uber-flow-car { position: absolute; font-size: 32px; z-index: 3; transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1); }
`;

const USER_ID = 'RIDER-001';

const LOCATIONS = [
  { lat: 12.9716, lng: 77.5946, label: 'MG Road' },
  { lat: 12.9352, lng: 77.6245, label: 'Koramangala' },
  { lat: 12.9784, lng: 77.6408, label: 'Indiranagar' },
  { lat: 12.9141, lng: 77.6411, label: 'HSR Layout' },
  { lat: 12.9569, lng: 77.7011, label: 'Marathahalli' },
  { lat: 12.9698, lng: 77.7500, label: 'Whitefield' },
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
      const data = await getEstimate(p.lat, p.lng, p.label, d.lat, d.lng, d.label, vehicleType);
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
        setResult(data); if (onRideBooked) onRideBooked();
        toast.success(`Trip Requested (${data.id})! Available for nearby drivers to Accept/Decline.`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to book ride';
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      <Card>
        <CardHeader title="🚗 Passenger Trip Request" subtitle="Distance-based fare estimation & proximity driver matching" />
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
            Select Ride Type
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
              Calculate Fare & Check Available Drivers
            </Button>
          ) : (
            <div>
              <div className="estimate-card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>Trip Fare & Driver Proximity</h3>
                <div className="estimate-detail"><span>Distance</span><strong>{estimate.distanceKm?.toFixed(1)} km</strong></div>
                <div className="estimate-detail"><span>Estimated Fare</span><strong style={{ fontSize: 18, color: 'var(--success)' }}>₹{estimate.fare?.toFixed(2)}</strong></div>
                <div className="estimate-detail">
                  <span>Driver Availability</span>
                  <strong>{estimate.driversAvailable ? `Nearest Driver: ${estimate.nearestDriverName || 'Available'} (${estimate.driverDistanceKm} km away)` : 'No Drivers Nearby'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Button variant="primary" loading={loading} onClick={handleBook} style={{ flex: 1 }}>
                  Confirm & Send Request to Drivers
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
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Trip ID: <strong>{result.id}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                Status: <Badge variant={result.status === 'ACCEPTED' ? 'success' : 'info'}>{result.status}</Badge>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                Drivers can view this request in their Driver Dashboard and choose to <strong>Accept</strong> or <strong>Decline</strong>.
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DriverDashboard() {
  const toast = useToast();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [availableRequests, setAvailableRequests] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const fetchData = useCallback(async () => {
    try {
      const [dList, rList] = await Promise.all([getDrivers(), getAllRides()]);
      if (Array.isArray(dList)) {
        setDrivers(dList);
        if (!selectedDriverId && dList.length > 0) {
          setSelectedDriverId(dList[0].id);
        }
      }
      if (Array.isArray(rList)) setRides(rList);
    } catch {
      // silent polling
    } finally {
      setLoading(false);
    }
  }, [selectedDriverId]);

  const fetchDriverRequests = useCallback(async () => {
    if (!selectedDriverId) return;
    try {
      const reqs = await getDriverRequests(selectedDriverId);
      if (Array.isArray(reqs)) setAvailableRequests(reqs);
    } catch {
      // silent polling
    }
  }, [selectedDriverId]);

  usePolling(fetchData, 4000, []);
  usePolling(fetchDriverRequests, 3000, [selectedDriverId]);

  const handleStatusChange = async (driverId, status) => {
    try {
      await updateDriverStatus(driverId, status);
      toast.success(`Driver status updated to ${status}`);
      fetchData();
      fetchDriverRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to update driver status');
    }
  };

  const handleAcceptRide = async (rideId) => {
    try {
      const res = await acceptRide(rideId, selectedDriverId);
      toast.success(`✅ Ride #${res.id} ACCEPTED! Assigned to ${res.driverName}`);
      fetchData();
      fetchDriverRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to accept ride');
    }
  };

  const handleDeclineRide = async (rideId) => {
    try {
      await declineRide(rideId, selectedDriverId);
      toast.info(`❌ Ride #${rideId} DECLINED by driver.`);
      fetchData();
      fetchDriverRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to decline ride');
    }
  };

  const handleStartTrip = async (rideId) => {
    try {
      await startTrip(rideId);
      toast.success('Trip started! ONGOING');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to start trip');
    }
  };

  const handleCompleteTrip = async (rideId) => {
    try {
      const res = await completeTrip(rideId, paymentMethod);
      toast.success(`Trip completed! Payment of ₹${res.fare?.toFixed(2)} processed via ${paymentMethod}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to complete trip');
    }
  };

  const handleCancelTrip = async (rideId) => {
    try {
      await cancelTrip(rideId);
      toast.success('Trip cancelled');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel trip');
    }
  };

  const currentDriver = drivers.find((d) => d.id === selectedDriverId);

  if (loading && drivers.length === 0) return <Skeleton height={200} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
          👨‍✈️ Driver Control Dashboard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Select Active Driver:</span>
          <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600 }}>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.id} - {d.vehicleType})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="driver-grid">
        {drivers.map((d) => (
          <div key={d.id} className="driver-card" style={{ borderColor: d.id === selectedDriverId ? 'var(--accent)' : 'var(--border-primary)', borderWidth: d.id === selectedDriverId ? 2 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{d.name}</strong>
              <Badge variant={d.status === 'AVAILABLE' ? 'success' : d.status === 'ON_TRIP' ? 'warning' : 'neutral'}>
                {d.status}
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID: {d.id} | {d.vehicleType}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Reg: {d.vehicleNumber}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant={d.status === 'AVAILABLE' ? 'primary' : 'secondary'} onClick={() => handleStatusChange(d.id, 'AVAILABLE')}>
                AVAILABLE
              </Button>
              <Button size="sm" variant={d.status === 'OFFLINE' ? 'danger' : 'secondary'} onClick={() => handleStatusChange(d.id, 'OFFLINE')}>
                OFFLINE
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Driver Incoming / Available Ride Requests Section */}
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>
        🔔 Available Ride Requests Nearby for {currentDriver?.name || 'Driver'} ({availableRequests.length})
      </h3>

      {availableRequests.length === 0 ? (
        <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          No pending ride requests nearby for {currentDriver?.name || 'this driver'} ({currentDriver?.vehicleType}). Request a ride in the Passenger tab to see it pop up here!
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {availableRequests.map((req) => (
            <div key={req.id} className="ride-card" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div className="ride-header">
                <div>
                  <strong style={{ fontSize: 15 }}>Ride Request #{req.id}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>Type: {req.vehicleType}</span>
                </div>
                <Badge variant="info">REQUESTED</Badge>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', margin: '8px 0' }}>
                📍 <strong>Pickup:</strong> {req.pickup?.label || 'Pickup'} ➔ 🏁 <strong>Dropoff:</strong> {req.dropoff?.label || 'Dropoff'} ({req.distanceKm?.toFixed(1)} km)
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 12 }}>
                Estimated Fare: ₹{req.fare?.toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button size="sm" variant="success" onClick={() => handleAcceptRide(req.id)}>
                  ✅ Accept Ride Request
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeclineRide(req.id)}>
                  ❌ Decline Request
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ongoing / Active Trips */}
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
        🚕 Active Trip Operations & Payment Processing
      </h3>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Method on Completion:</span>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          <option value="UPI">UPI / GPay</option>
          <option value="CARD">Credit / Debit Card</option>
          <option value="CASH">Cash</option>
        </select>
      </div>

      {rides.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.status !== 'REQUESTED').length === 0 ? (
        <EmptyState icon="🚕" title="No active ongoing trips" description="Accept an available request above to begin a trip" />
      ) : (
        rides.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.status !== 'REQUESTED').map((r) => (
          <div key={r.id} className="ride-card">
            <div className="ride-header">
              <div>
                <strong>Trip #{r.id}</strong> — Passenger: <span>{r.rider?.name || r.userId}</span>
              </div>
              <Badge variant={r.status === 'ACCEPTED' ? 'info' : r.status === 'ONGOING' ? 'warning' : 'neutral'}>
                {r.status}
              </Badge>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0' }}>
              📍 {r.pickup?.label || 'Pickup'} ➔ 🏁 {r.dropoff?.label || 'Dropoff'} ({r.distanceKm?.toFixed(1)} km)
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Assigned Driver: <strong>{r.driverName || 'Unassigned'}</strong> ({r.vehicleType})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.status === 'ACCEPTED' && (
                <Button size="sm" variant="primary" onClick={() => handleStartTrip(r.id)}>
                  ▶️ Start Trip (ONGOING)
                </Button>
              )}
              {(r.status === 'ONGOING' || r.status === 'ACCEPTED') && (
                <Button size="sm" variant="success" onClick={() => handleCompleteTrip(r.id)}>
                  💳 Process Payment & Complete
                </Button>
              )}
              <Button size="sm" variant="danger" onClick={() => handleCancelTrip(r.id)}>
                ❌ Cancel Trip
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TripHistory() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = useCallback(async () => {
    try {
      const data = await getAllRides();
      if (Array.isArray(data)) setRides(data);
    } catch {
      // silent polling
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchRides, 4000, []);

  const getBadgeVariant = (status) => {
    switch (status) {
      case 'REQUESTED': return 'info';
      case 'ACCEPTED': return 'warning';
      case 'ONGOING': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'danger';
      default: return 'neutral';
    }
  };

  if (loading && rides.length === 0) return <Skeleton height={200} />;
  if (rides.length === 0) return <EmptyState icon="📜" title="No trip records found" />;

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
        📋 All Trip Records & Payment History
      </h3>
      {rides.map((r) => (
        <div key={r.id} className="ride-card">
          <div className="ride-header">
            <div>
              <span style={{ fontWeight: 700 }}>Trip #{r.id}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>({r.vehicleType})</span>
            </div>
            <Badge variant={getBadgeVariant(r.status)}>{r.status}</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>
            📍 {r.pickup?.label || 'Pickup'} ➔ 🏁 {r.dropoff?.label || 'Dropoff'} ({r.distanceKm?.toFixed(1)} km)
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
            Driver: <strong>{r.driverName || 'Unassigned'}</strong> {r.vehicleNumber && `(${r.vehicleNumber})`}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>Total Fare: ₹{r.fare?.toFixed(2)}</span>
            {r.payment && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Paid via <strong>{r.payment.method}</strong> ({r.payment.status})
              </span>
            )}
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

  const steps = ['Trip Requested', 'Driver Accept', 'Trip Started (ONGOING)', 'Payment Processed', 'Trip Completed'];

  const startSim = () => {
    setStep(1); setStatusMsg('Rider Alex requested ride from MG Road to Koramangala...'); setCarLeft(30);
    setTimeout(() => {
      setStep(2); setStatusMsg('Driver Rajesh (UBER_GO) saw request & clicked ACCEPT!'); setCarLeft(150);
    }, 1800);
    setTimeout(() => {
      setStep(3); setStatusMsg('Driver arrived & started trip (ONGOING)...'); setCarLeft(400);
    }, 3500);
    setTimeout(() => {
      setStep(4); setStatusMsg('Processing Payment ₹240.00 via UPI (PaymentProcessor.process)...'); setCarLeft(650);
    }, 5200);
    setTimeout(() => {
      setStep(5); setStatusMsg('✅ Trip COMPLETED! Driver status set to AVAILABLE & location updated to Koramangala'); setCarLeft(700);
    }, 7000);
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
      title="Uber Ride Sharing Service"
      icon="🚗"
      tabs={['book', 'drivers', 'history', 'demo', 'diagram', 'design']}
    >
      {(activeTab) => (
        <div className="uber-container">
          <style>{UBER_CSS}</style>
          {activeTab === 'book' && <BookRide onRideBooked={() => {}} />}
          {activeTab === 'drivers' && <DriverDashboard />}
          {activeTab === 'history' && <TripHistory />}
          {activeTab === 'demo' && <AnimatedFlow />}
        </div>
      )}
    </LldPage>
  );
}
