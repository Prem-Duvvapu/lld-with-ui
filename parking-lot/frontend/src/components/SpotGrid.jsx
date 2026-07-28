import { useState, useEffect } from 'react';
import { getFloors, getAvailableSpots } from '../api';

export default function SpotGrid() {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getFloors();
      setFloors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && floors.length === 0) {
    return <div className="alert">Loading parking lot...</div>;
  }

  const getFilteredSpots = (spots) => {
    if (filter === 'ALL') return spots;
    if (filter === 'AVAILABLE') return spots.filter((s) => !s.occupied);
    return spots;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Parking Lot Layout</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '2px solid #ddd', fontSize: 14 }}
        >
          <option value="ALL">All Spots</option>
          <option value="AVAILABLE">Available Only</option>
        </select>
      </div>

      {floors.map((floor) => (
        <div key={floor.floorNumber} className="floor-section">
          <h3>Floor {floor.floorNumber}</h3>
          <div className="spots-grid">
            {getFilteredSpots(floor.spots).map((spot) => (
              <div key={spot.id} className={`spot-card ${spot.occupied ? 'occupied' : 'available'}`}>
                <div className="spot-id">{spot.id}</div>
                <div className="spot-type">{spot.vehicleType}</div>
                <div className="spot-status">
                  {spot.occupied ? 'Occupied' : 'Available'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16, fontSize: 14 }}>
        <span>🟢 Available</span>
        <span>🔴 Occupied</span>
      </div>
    </div>
  );
}
