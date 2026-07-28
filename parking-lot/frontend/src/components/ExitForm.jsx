import { useState, useEffect } from 'react';
import { vehicleExit, getGates } from '../api';

export default function ExitForm() {
  const [gates, setGates] = useState([]);
  const [gateId, setGateId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGates().then((all) => {
      const exitGates = all.filter((g) => g.type === 'EXIT');
      setGates(exitGates);
      if (exitGates.length > 0) setGateId(exitGates[0].id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await vehicleExit(gateId, ticketNumber);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setTicketNumber('');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <h2>Vehicle Exit</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Exit Gate</label>
          <select value={gateId} onChange={(e) => setGateId(e.target.value)} required>
            {gates.map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.id})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Ticket Number</label>
          <input
            type="text"
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            placeholder="e.g. TKT-00001"
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Exit Vehicle'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result-card">
          <h3>Payment Receipt</h3>
          <div className="detail">
            <span className="label">Ticket #</span>
            <span className="value">{result.ticketNumber}</span>
          </div>
          <div className="detail">
            <span className="label">Vehicle</span>
            <span className="value">{result.vehicleNumber}</span>
          </div>
          <div className="detail">
            <span className="label">Entry Time</span>
            <span className="value">{new Date(result.entryTime).toLocaleString()}</span>
          </div>
          <div className="detail">
            <span className="label">Exit Time</span>
            <span className="value">{new Date(result.exitTime).toLocaleString()}</span>
          </div>
          <div className="detail">
            <span className="label">Spot</span>
            <span className="value">{result.spotId}</span>
          </div>
          <div className="detail">
            <span className="label">Amount</span>
            <span className="value">₹{result.amount.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
