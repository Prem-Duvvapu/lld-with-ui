import { useState, useEffect } from 'react';
import { getActiveTickets } from '../api';

export default function ActiveTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const data = await getActiveTickets();
      setTickets(data);
    } catch {
      console.error('Failed to fetch active tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="alert">Loading active tickets...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Active Tickets ({tickets.length})</h2>
        <button className="btn-back" onClick={fetchTickets}>Refresh</button>
      </div>

      {tickets.length === 0 ? (
        <div className="alert">No active tickets. All spots are available.</div>
      ) : (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Spot</th>
              <th>Entry Time</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const entry = new Date(t.entryTime);
              const duration = Math.floor((Date.now() - entry.getTime()) / 60000);
              const mins = duration % 60;
              const hrs = Math.floor(duration / 60);

              return (
                <tr key={t.ticketNumber}>
                  <td><strong>{t.ticketNumber}</strong></td>
                  <td>{t.vehicleNumber}</td>
                  <td>{t.vehicleType}</td>
                  <td className="spot-id">{t.spotId}</td>
                  <td>{entry.toLocaleString()}</td>
                  <td className="status-active">{hrs}h {mins}m</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
