import { useState, useEffect } from 'react';
import { getUserRides, updateRideStatus } from '../api';

const STATUS_FLOW = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED'];

export default function RideHistory({ userId }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = () => {
    getUserRides(userId).then(setRides).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const advanceStatus = async (rideId, currentStatus) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < STATUS_FLOW.length - 1) {
      await updateRideStatus(rideId, STATUS_FLOW[idx + 1]);
      fetchRides();
    }
  };

  const cancelRide = async (rideId) => {
    await updateRideStatus(rideId, 'CANCELLED');
    fetchRides();
  };

  if (loading) return <div className="alert">Loading rides...</div>;

  if (rides.length === 0) {
    return <div className="alert">No rides yet. Book one now!</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>My Rides</h2>

      {rides.map((ride) => {
        const idx = STATUS_FLOW.indexOf(ride.status);
        const canAdvance = ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED'
                           && idx < STATUS_FLOW.length - 1;
        const canCancel = ride.status === 'REQUESTED' || ride.status === 'ACCEPTED';

        return (
          <div key={ride.id} className="ride-card">
            <div className="ride-header">
              <div>
                <span className="ride-id">{ride.id}</span>
                <span className="ride-type"> — {ride.vehicleType?.replace(/_/g, ' ')}</span>
              </div>
              <span className={`status-badge status-${ride.status}`}>
                {ride.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="ride-route">
              <div className="point"><span className="dot green"></span> {ride.pickup?.label}</div>
              <div className="point"><span className="dot red"></span> {ride.dropoff?.label}</div>
            </div>

            {ride.driverName && (
              <div className="ride-info">Driver: {ride.driverName} ({ride.vehicleNumber})</div>
            )}

            <div className="ride-info">Distance: {ride.distanceKm?.toFixed(1)} km</div>
            <div className="ride-fare">₹{ride.fare?.toFixed(2)}</div>

            <div className="ride-actions">
              {canAdvance && (
                <button onClick={() => advanceStatus(ride.id, ride.status)}>
                  Next: {STATUS_FLOW[idx + 1].replace(/_/g, ' ')}
                </button>
              )}
              {canCancel && (
                <button className="btn-cancel" onClick={() => cancelRide(ride.id)}>Cancel Ride</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
