import { useState, useEffect } from 'react';
import { vehicleEntry, getGates } from '../api';

export default function EntryForm() {
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
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await vehicleEntry(gateId, vehicleNumber, vehicleType);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setVehicleNumber('');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <h2>Vehicle Entry</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Entry Gate</label>
          <select value={gateId} onChange={(e) => setGateId(e.target.value)} required>
            {gates.map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.id})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Vehicle Number</label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="e.g. KA-01-AB-1234"
            required
          />
        </div>
        <div className="form-group">
          <label>Vehicle Type</label>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="CAR">Car</option>
            <option value="BIKE">Bike</option>
            <option value="TRUCK">Truck</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Park Vehicle'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result-card">
          <h3>Ticket Issued</h3>
          <div className="detail">
            <span className="label">Ticket #</span>
            <span className="value">{result.ticketNumber}</span>
          </div>
          <div className="detail">
            <span className="label">Vehicle</span>
            <span className="value">{result.vehicleNumber}</span>
          </div>
          <div className="detail">
            <span className="label">Type</span>
            <span className="value">{result.vehicleType}</span>
          </div>
          <div className="detail">
            <span className="label">Spot</span>
            <span className="value">{result.spotId}</span>
          </div>
          <div className="detail">
            <span className="label">Entry Time</span>
            <span className="value">{new Date(result.entryTime).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
