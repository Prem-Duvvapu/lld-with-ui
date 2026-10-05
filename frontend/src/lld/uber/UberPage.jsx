import { useState, useEffect, useCallback } from 'react';
import { getEstimate, requestRide, getAllRides, startTrip, arriveAtDestination, completeTrip, cancelTrip, getDrivers, updateDriverStatus, getDriverRequests, acceptRide, declineRide, verifyOtp, getUserRides } from './api';
import UberSimulation from './UberSimulation';
import LldPage from '../../components/LldPage';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
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

/* Enhanced City Map Graphic Scene */
.uber-flow-scene {
  position: relative;
  width: 100%;
  height: 320px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 60%, #0f172a 100%);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-primary);
  margin-bottom: 16px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
}
.uber-city-skyline {
  position: absolute;
  top: 15px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  font-size: 34px;
  opacity: 0.85;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
  user-select: none;
  z-index: 1;
}
.uber-road {
  position: absolute;
  top: 140px;
  left: 0;
  width: 100%;
  height: 75px;
  background: #334155;
  border-top: 3px solid #64748b;
  border-bottom: 3px solid #64748b;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.6);
  z-index: 2;
}
.uber-road-line {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 0;
  border-top: 3px dashed #f59e0b;
  transform: translateY(-50%);
}
.uber-zebra-crossing {
  position: absolute;
  top: 0;
  width: 36px;
  height: 100%;
  background: repeating-linear-gradient(90deg, #ffffff, #ffffff 6px, transparent 6px, transparent 12px);
  opacity: 0.8;
}
.uber-street-lamps {
  position: absolute;
  top: 110px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  font-size: 20px;
  z-index: 2;
  user-select: none;
}
.uber-suburbs-bottom {
  position: absolute;
  bottom: 12px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 24px;
  font-size: 28px;
  z-index: 1;
  user-select: none;
}
.uber-flow-marker {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  position: absolute;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 4;
  backdrop-filter: blur(4px);
}
.uber-flow-marker.pickup { background: rgba(34, 197, 94, 0.9); border: 1px solid #4ade80; }
.uber-flow-marker.drop { background: rgba(239, 68, 68, 0.9); border: 1px solid #f87171; }
.uber-flow-marker.driver-start { background: rgba(59, 130, 246, 0.9); border: 1px solid #60a5fa; }

.uber-flow-car {
  position: absolute;
  top: 155px;
  font-size: 36px;
  z-index: 5;
  transition: all 1.8s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
}
.uber-car-beam {
  position: absolute;
  right: -24px;
  top: 12px;
  width: 30px;
  height: 16px;
  background: radial-gradient(ellipse at left, rgba(254, 240, 138, 0.8), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.uber-hud-overlay {
  position: absolute;
  top: 12px;
  right: 16px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255,255,255,0.15);
  padding: 8px 14px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  z-index: 10;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.uber-flow-marker.driver-nearby { background: rgba(99, 102, 241, 0.9); border: 1px solid #818cf8; }
.uber-flow-marker.driver-won { background: rgba(34, 197, 94, 0.95); border: 1px solid #4ade80; box-shadow: 0 0 0 3px rgba(74,222,128,0.35); }
.uber-flow-marker.driver-lost { background: rgba(239, 68, 68, 0.55); border: 1px solid #f87171; text-decoration: line-through; opacity: 0.8; }
.uber-sim-panel { padding: 16px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-primary); color: var(--text-primary); }
.uber-otp-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.uber-event-log { max-height: 150px; overflow-y: auto; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; font-size: 11.5px; margin-top: 12px; }
.uber-event-row { padding: 4px 0; border-bottom: 1px dashed var(--border-primary); color: var(--text-secondary); }
.uber-event-row:last-child { border-bottom: none; }
.uber-event-row.status-WARNING { color: #b45309; font-weight: 600; }
.uber-event-row.status-ERROR { color: #dc2626; font-weight: 600; }
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
  const [activeRide, setActiveRide] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const locMap = Object.fromEntries(LOCATIONS.map((l) => [l.label, l]));

  // Poll active rides for rider
  const fetchActiveRide = useCallback(async () => {
    try {
      const rides = await getUserRides(USER_ID);
      if (Array.isArray(rides) && rides.length > 0) {
        const ongoing = rides.find((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
        if (ongoing) setActiveRide(ongoing);
      }
    } catch {
      // silent polling
    }
  }, []);

  usePolling(fetchActiveRide, 3000, []);

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
    setError(''); setLoading(true);
    const p = locMap[pickup]; const d = locMap[dropoff];
    try {
      const data = await requestRide(USER_ID, p.lat, p.lng, p.label, d.lat, d.lng, d.label, vehicleType, estimate?.fare, estimate?.distanceKm);
      if (data.error) {
        setError(data.error); toast.error(data.error);
      } else {
        setActiveRide(data);
        if (onRideBooked) onRideBooked();
        toast.success(`Trip Requested (${data.id})! Sent to nearby drivers.`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to book ride';
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!activeRide) return;
    try {
      const res = await completeTrip(activeRide.id, paymentMethod);
      setActiveRide(null);
      setEstimate(null);
      toast.success(`🎉 Payment of ₹${res.fare?.toFixed(2)} successful via ${paymentMethod}! Trip completed.`);
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    }
  };

  const getCarPos = (status) => {
    switch (status) {
      case 'REQUESTED': return 50;
      case 'ACCEPTED': return 290;
      case 'ONGOING': return 520;
      case 'COMPLETED': return 740;
      default: return 50;
    }
  };

  return (
    <div style={{ maxWidth: 750, margin: '0 auto' }}>
      {/* Live Map Scene if Active Ride exists */}
      {activeRide && (
        <div className="uber-flow-scene">
          <div className="uber-city-skyline">
            <span>🏢</span><span>🏬</span><span>🏫</span><span>🏦</span><span>🏪</span><span>🏢</span><span>🏥</span>
          </div>
          <div className="uber-street-lamps">
            <span>💡</span><span>💡</span><span>💡</span><span>💡</span><span>💡</span><span>💡</span>
          </div>
          <div className="uber-road">
            <div className="uber-road-line"></div>
            <div className="uber-zebra-crossing" style={{ left: 290 }}></div>
            <div className="uber-zebra-crossing" style={{ left: 740 }}></div>
          </div>
          <div className="uber-suburbs-bottom">
            <span>🏡</span><span>🌳</span><span>🏠</span><span>🌲</span><span>🏡</span><span>🌳</span><span>🏢</span>
          </div>

          <div className="uber-flow-map">
            <div className="uber-flow-marker pickup" style={{ left: 280, top: 95 }}>
              📍 Pickup ({activeRide.pickup?.label || pickup})
            </div>
            <div className="uber-flow-marker drop" style={{ left: 730, top: 95 }}>
              🏁 Dropoff ({activeRide.dropoff?.label || dropoff})
            </div>
            <div className="uber-flow-car" style={{ left: getCarPos(activeRide.status) }}>
              🚘<div className="uber-car-beam"></div>
            </div>
          </div>

          <div className="uber-hud-overlay">
            <div style={{ fontWeight: 800, color: '#f59e0b', marginBottom: 2 }}>
              TRIP #{activeRide.id} - {activeRide.status}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>
              Driver: <strong>{activeRide.driverName || 'Finding Driver...'}</strong> | Fare: <strong>₹{activeRide.fare?.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader title="🚗 Passenger Trip Booking & Real-time Tracking" subtitle="Request ride ➔ Wait for driver ➔ Share OTP ➔ Trip ➔ Payment" />
        <CardBody>
          {!activeRide ? (
            <div>
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
                  <div
                    key={v.type}
                    className={`vehicle-card ${vehicleType === v.type ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={vehicleType === v.type}
                    onClick={() => { setVehicleType(v.type); setEstimate(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVehicleType(v.type); setEstimate(null); } }}
                  >
                    <div className="v-icon">{v.icon}</div>
                    <div className="v-name">{v.label}</div>
                    <div className="v-rate">{v.rate}</div>
                  </div>
                ))}
              </div>

              {!estimate ? (
                <Button variant="secondary" onClick={handleEstimate} style={{ width: '100%' }}>
                  1. Calculate Fare & Duration
                </Button>
              ) : (
                <div>
                  <div className="estimate-card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>Fare & Duration Estimate</h3>
                    <div className="estimate-detail"><span>Distance</span><strong>{estimate.distanceKm?.toFixed(1)} km</strong></div>
                    <div className="estimate-detail"><span>Estimated Duration</span><strong>~{estimate.estimatedMinutes || Math.round(estimate.distanceKm * 3)} mins</strong></div>
                    <div className="estimate-detail"><span>Estimated Fare</span><strong style={{ fontSize: 18, color: 'var(--success)' }}>₹{estimate.fare?.toFixed(2)}</strong></div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <Button variant="primary" loading={loading} onClick={handleBook} style={{ flex: 1 }}>
                      2. Confirm & Request Ride
                    </Button>
                    <Button variant="secondary" onClick={() => setEstimate(null)}>
                      Recalculate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Active Trip Tracker Card */}
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-primary)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Trip #{activeRide.id}</span>
                  <Badge variant={activeRide.status === 'ACCEPTED' ? 'success' : activeRide.status === 'ONGOING' ? 'warning' : 'info'}>
                    {activeRide.status}
                  </Badge>
                </div>

                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
                  📍 <strong>Pickup:</strong> {activeRide.pickup?.label} ➔ 🏁 <strong>Dropoff:</strong> {activeRide.dropoff?.label} ({activeRide.distanceKm?.toFixed(1)} km)
                </div>

                {activeRide.status === 'REQUESTED' && (
                  <div style={{ padding: 14, background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning)', fontSize: 13, color: 'var(--warning)', marginTop: 8 }}>
                    ⏳ <strong>REQUEST SENT — Finding & Waiting for Nearby Drivers to Accept...</strong>
                    <div style={{ marginTop: 6, color: 'var(--text-primary)' }}>Your ride request is available in the <strong>Driver Dashboard</strong> for drivers to Accept or Decline.</div>
                    {activeRide.otp && <div style={{ fontSize: 14, marginTop: 8, fontWeight: 700, color: 'var(--text-primary)' }}>🔑 Your Secret OTP: <span style={{ fontSize: 20, color: 'var(--accent)' }}>{activeRide.otp}</span></div>}
                  </div>
                )}

                {activeRide.status === 'ACCEPTED' && (
                  <div style={{ padding: 14, background: 'var(--success-bg)', borderRadius: 8, border: '1px solid var(--success)', fontSize: 13, color: 'var(--success)', marginTop: 8 }}>
                    ✅ <strong>Driver Assigned:</strong> {activeRide.driverName} ({activeRide.vehicleNumber || 'KA-01-AB-1234'}). Driver is en route to pickup!
                    {activeRide.otp && <div style={{ fontSize: 14, marginTop: 8, fontWeight: 700, color: 'var(--text-primary)' }}>🔑 Share Secret OTP with Driver: <span style={{ fontSize: 20, color: 'var(--accent)' }}>{activeRide.otp}</span></div>}
                  </div>
                )}

                {activeRide.status === 'ONGOING' && (
                  <div style={{ padding: 14, background: 'var(--info-bg)', borderRadius: 8, border: '1px solid var(--info)', fontSize: 13, color: 'var(--info)', marginTop: 8 }}>
                    🚕 <strong>Trip Ongoing:</strong> En route to {activeRide.dropoff?.label}. Driver: {activeRide.driverName}.
                  </div>
                )}

                {/* Rider Checkout / Payment Section when Completed */}
                {(activeRide.status === 'PAYMENT_PENDING' || activeRide.status === 'DESTINATION_REACHED' || activeRide.status === 'PAYMENT_FAILED' || activeRide.status === 'COMPLETED') && (
                  <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-card)', borderRadius: 8, border: '2px solid var(--success)' }}>
                    <h4 style={{ color: 'var(--success)', marginBottom: 8 }}>🏁 Arrived at Destination! Please Complete Payment</h4>
                    {activeRide.status === 'PAYMENT_FAILED' && (
                      <div style={{ padding: 10, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
                        ⚠️ Payment failed. Please select another payment method and try again.
                      </div>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)', marginBottom: 12 }}>
                      Total Fare Bill: ₹{activeRide.fare?.toFixed(2)}
                    </div>
                    <div className="form-row" style={{ alignItems: 'center' }}>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <option value="UPI">UPI / Google Pay</option>
                        <option value="CARD">Credit / Debit Card</option>
                        <option value="CASH">Cash</option>
                      </select>
                      <Button variant="success" style={{ flex: 1 }} onClick={handlePay}>
                        💳 Pay ₹{activeRide.fare?.toFixed(2)} & Finish
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <div role="alert" style={{ marginTop: 12, padding: 10, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 6 }}>{error}</div>}
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
  const [driverOtpInput, setDriverOtpInput] = useState({});
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

  usePolling(fetchData, 3000, []);
  usePolling(fetchDriverRequests, 2500, [selectedDriverId]);

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

  const handleVerifyDriverOtp = async (rideId) => {
    const input = (driverOtpInput[rideId] || '').trim();
    if (!input) {
      toast.error('Please enter the 4-digit OTP shared by rider');
      return;
    }
    try {
      const res = await verifyOtp(rideId, input);
      toast.success(`✅ OTP Verified! Trip #${res.id} is now ONGOING`);
      fetchData();
    } catch (err) {
      const msg = typeof err === 'object' && err !== null ? (err.message || 'Invalid OTP verification') : String(err);
      toast.error(`❌ ${msg}`);
    }
  };

  const handleArriveTrip = async (rideId) => {
    try {
      await arriveAtDestination(rideId);
      toast.success('🏁 Arrived at destination! Requesting payment from rider.');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update trip status');
    }
  };

  const handleCompleteTrip = async (rideId) => {
    try {
      const res = await completeTrip(rideId, paymentMethod);
      toast.success(`Trip #${res.id} marked COMPLETED! Payment of ₹${res.fare?.toFixed(2)} requested.`);
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
        🚕 Active Trip Operations & OTP Verification
      </h3>

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

            {/* OTP Verification Box for Driver when ACCEPTED */}
            {r.status === 'ACCEPTED' && (
              <div style={{ margin: '10px 0', padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>🔑 Verify Rider 4-Digit OTP to Start Ride:</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter 4-digit OTP"
                    value={driverOtpInput[r.id] || ''}
                    onChange={(e) => setDriverOtpInput({ ...driverOtpInput, [r.id]: e.target.value })}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-primary)', fontSize: 14, fontWeight: 700, width: 150, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  />
                  <Button size="sm" variant="success" onClick={() => handleVerifyDriverOtp(r.id)}>
                    Verify OTP & Start Trip
                  </Button>
                </div>
              </div>
            )}

            {(r.status === 'PAYMENT_PENDING' || r.status === 'DESTINATION_REACHED') && (
              <div style={{ margin: '10px 0', padding: 12, background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning)', fontSize: 13, color: 'var(--warning)' }}>
                ⏳ <strong>Destination Reached:</strong> Payment request sent to Rider (₹{r.fare?.toFixed(2)})...
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {r.status === 'ONGOING' && (
                <Button size="sm" variant="success" onClick={() => handleArriveTrip(r.id)}>
                  🏁 Reached Destination (Request Payment)
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
      case 'DESTINATION_REACHED': return 'warning';
      case 'PAYMENT_PENDING': return 'warning';
      case 'COMPLETED': return 'success';
      case 'PAYMENT_FAILED': return 'danger';
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


export default function UberPage() {
  return (
    <LldPage
      module="uber"
      title="Uber Ride Sharing Service"
      icon="🚗"
      tabs={['book', 'drivers', 'history', 'demo', 'diagram', 'sequence', 'design']}
    >
      {(activeTab) => (
        <div className="uber-container">
          <style>{UBER_CSS}</style>
          {activeTab === 'book' && <BookRide onRideBooked={() => {}} />}
          {activeTab === 'drivers' && <DriverDashboard />}
          {activeTab === 'history' && <TripHistory />}
          {activeTab === 'demo' && <UberSimulation />}
        </div>
      )}
    </LldPage>
  );
}
