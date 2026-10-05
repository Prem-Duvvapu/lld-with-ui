import { useState, useEffect, useCallback } from 'react';
import { vehicleEntry, getGates, scanVehicleExit, payVehicleExit, getFloors, getActiveTickets } from './api';
import ParkingSimulation from './ParkingSimulation';
import LldPage from '../../components/LldPage';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/ToastContext';
import { usePolling } from '../../hooks/usePolling';

const PARKING_CSS = `
.parking-container { max-width: 1100px; margin: 0 auto; }
.form-card { max-width: 480px; margin: 0 auto; }
.result-card { margin-top: 16px; padding: 16px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-primary); box-shadow: var(--shadow-sm); }
.result-card h3 { margin-bottom: 10px; font-size: 15px; color: var(--info); font-weight: 700; }
.result-card .detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border-secondary); color: var(--text-primary); }
.result-card .detail:last-child { border-bottom: none; }
.result-card .label { color: var(--text-secondary); font-weight: 600; } 
.result-card .value { font-weight: 700; color: var(--text-primary); }
.error-msg { margin-top: 12px; padding: 10px 14px; background: var(--danger-bg); color: var(--danger); border-radius: var(--radius-sm); border: 1px solid rgba(220,38,38,0.2); font-size: 13px; font-weight: 600; }
.spots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.spot-card { padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-primary); text-align: center; transition: all var(--duration-fast); background: var(--bg-card); box-shadow: var(--shadow-sm); }
.spot-card.available { border-color: var(--success); background: var(--success-bg); }
.spot-card.occupied { border-color: var(--danger); background: var(--danger-bg); }
.spot-card .spot-id { font-weight: 700; font-size: 16px; color: var(--text-primary); }
.spot-card .spot-type { font-size: 11px; color: var(--text-secondary); font-weight: 600; margin: 2px 0; }
.spot-card .spot-status { font-size: 11px; font-weight: 700; margin-top: 4px; }
.spot-card.available .spot-status { color: var(--success); }
.spot-card.occupied .spot-status { color: var(--danger); }
.floor-section { margin-bottom: 24px; }
.floor-section h3 { margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-primary); font-size: 16px; color: var(--info); font-weight: 700; }

`;

function EntryForm() {
  const toast = useToast();
  const [gates, setGates] = useState([]);
  const [gateId, setGateId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [strategy, setStrategy] = useState('NEAREST');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGates().then((all) => {
      if (Array.isArray(all)) {
        const entryGates = all.filter((g) => g.type === 'ENTRY');
        setGates(entryGates);
        if (entryGates.length > 0) setGateId(entryGates[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const data = await vehicleEntry(gateId, vehicleNumber, vehicleType, strategy);
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setResult(data);
        setVehicleNumber('');
        toast.success(`Vehicle parked at spot ${data.spotId}`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to connect to server';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <Card>
        <CardHeader title="🚗 Vehicle Entry" subtitle="Issue parking ticket and assign spot" />
        <CardBody>
          <form onSubmit={handleSubmit}>
            <Select
              label="Entry Gate"
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
              required
            >
              {gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>

            <Input
              label="Vehicle Number"
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. KA-01-AB-1234"
              required
            />

            <Select
              label="Vehicle Type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="CAR">Car (₹20/hr)</option>
              <option value="BIKE">Bike (₹10/hr)</option>
              <option value="TRUCK">Truck (₹40/hr)</option>
            </Select>

            <Select
              label="Spot Strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="NEAREST">Nearest Spot First</option>
              <option value="FARTHEST">Farthest Spot First</option>
            </Select>

            <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              Park Vehicle & Issue Ticket
            </Button>
          </form>

          {error && <div role="alert" className="error-msg">{error}</div>}

          {result && (
            <div className="result-card">
              <h3>🎟️ Ticket Issued</h3>
              <div className="detail"><span className="label">Ticket #</span><span className="value">{result.ticketNumber}</span></div>
              <div className="detail"><span className="label">Vehicle</span><span className="value">{result.vehicleNumber}</span></div>
              <div className="detail"><span className="label">Type</span><span className="value">{result.vehicleType}</span></div>
              <div className="detail"><span className="label">Assigned Spot</span><span className="value">{result.spotId}</span></div>
              <div className="detail"><span className="label">Entry Time</span><span className="value">{new Date(result.entryTime).toLocaleTimeString()}</span></div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ExitForm() {
  const toast = useToast();
  const [gates, setGates] = useState([]);
  const [gateId, setGateId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [pricingStrategy, setPricingStrategy] = useState('HOURLY');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const [step, setStep] = useState('SCAN'); // SCAN | PREVIEW | COMPLETED
  const [previewTicket, setPreviewTicket] = useState(null);
  const [paidReceipt, setPaidReceipt] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGates().then((all) => {
      if (Array.isArray(all)) {
        const exitGates = all.filter((g) => g.type === 'EXIT');
        setGates(exitGates);
        if (exitGates.length > 0) setGateId(exitGates[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleScanTicket = async (e) => {
    e.preventDefault();
    setError(''); setPreviewTicket(null); setLoading(true);
    try {
      const data = await scanVehicleExit(gateId, ticketNumber, pricingStrategy);
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setPreviewTicket(data);
        setStep('PREVIEW');
      }
    } catch (err) {
      const msg = err.message || 'Failed to connect to server';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePayAndExit = async () => {
    setError(''); setLoading(true);
    try {
      const data = await payVehicleExit(gateId, ticketNumber, pricingStrategy, paymentMethod);
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setPaidReceipt(data);
        setStep('COMPLETED');
        toast.success(`Payment processed! Exit gate opened.`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to process payment';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('SCAN');
    setPreviewTicket(null);
    setPaidReceipt(null);
    setTicketNumber('');
    setError('');
  };

  return (
    <div className="form-card">
      <Card>
        <CardHeader title="💳 Vehicle Exit & Payment" subtitle="Scan ticket, preview price, pay & exit" />
        <CardBody>
          {step === 'SCAN' && (
            <form onSubmit={handleScanTicket}>
              <Select
                label="Exit Gate"
                value={gateId}
                onChange={(e) => setGateId(e.target.value)}
                required
              >
                {gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>

              <Input
                label="Ticket Number"
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="e.g. TKT-00001"
                required
              />

              <Select
                label="Pricing Strategy"
                value={pricingStrategy}
                onChange={(e) => setPricingStrategy(e.target.value)}
              >
                <option value="HOURLY">Hourly Pricing (Standard)</option>
                <option value="FLAT">Flat Rate Pricing</option>
                <option value="DYNAMIC">Dynamic Surge Pricing (1.5x)</option>
              </Select>

              <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                Scan Ticket & Calculate Price
              </Button>
            </form>
          )}

          {step === 'PREVIEW' && previewTicket && (
            <div className="result-card" style={{ marginTop: 0 }}>
              <h3 style={{ color: 'var(--accent)' }}>🎟️ Ticket Details & Price Preview</h3>
              <div className="detail"><span className="label">Ticket #</span><span className="value">{previewTicket.ticketNumber}</span></div>
              <div className="detail"><span className="label">Vehicle</span><span className="value">{previewTicket.vehicleNumber}</span></div>
              <div className="detail"><span className="label">Vehicle Type</span><span className="value">{previewTicket.vehicleType}</span></div>
              <div className="detail"><span className="label">Assigned Spot</span><span className="value">{previewTicket.spotId}</span></div>
              <div className="detail"><span className="label">Pricing Applied</span><span className="value">{pricingStrategy}</span></div>
              <div className="detail" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 8, marginTop: 4 }}>
                <span className="label" style={{ fontWeight: 700, fontSize: 16 }}>Total Due</span>
                <span className="value" style={{ fontWeight: 700, fontSize: 18, color: 'var(--warning)' }}>₹{previewTicket.amount.toFixed(2)}</span>
              </div>

              <Select
                label="Select Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ marginTop: 12 }}
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Cash</option>
              </Select>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Button onClick={handlePayAndExit} variant="primary" loading={loading} style={{ flex: 1 }}>
                  Pay ₹{previewTicket.amount.toFixed(2)} & Exit
                </Button>
                <Button onClick={handleReset} variant="secondary">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'COMPLETED' && paidReceipt && (
            <div className="result-card" style={{ marginTop: 0 }}>
              <h3 style={{ color: 'var(--success)' }}>✅ Payment Successful! Exit Gate Opened</h3>
              <div className="detail"><span className="label">Ticket #</span><span className="value">{paidReceipt.ticketNumber}</span></div>
              <div className="detail"><span className="label">Vehicle</span><span className="value">{paidReceipt.vehicleNumber}</span></div>
              <div className="detail"><span className="label">Spot Released</span><span className="value">{paidReceipt.spotId}</span></div>
              <div className="detail"><span className="label">Amount Paid</span><span className="value">₹{paidReceipt.amount.toFixed(2)} ({paidReceipt.paymentMethod})</span></div>

              <Button onClick={handleReset} variant="primary" style={{ marginTop: 16, width: '100%' }}>
                Process Another Vehicle Exit
              </Button>
            </div>
          )}

          {error && <div role="alert" className="error-msg">{error}</div>}
        </CardBody>
      </Card>
    </div>
  );
}

function SpotGrid() {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const fetchSpots = useCallback(async () => {
    try {
      const data = await getFloors();
      if (Array.isArray(data)) setFloors(data);
      setFetchError('');
    } catch {
      setFetchError('Failed to load spot data from server');
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchSpots, 5000, []);

  if (loading && floors.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={40} />
        <Skeleton height={180} />
      </div>
    );
  }

  if (fetchError && floors.length === 0) {
    return <EmptyState icon="⚠️" title="Failed to load parking lot layout" description={fetchError} />;
  }

  const total = floors.reduce((s, f) => s + f.spots.length, 0);
  const occupied = floors.reduce((s, f) => s + f.spots.filter((sp) => sp.occupied).length, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: 'var(--info)', fontSize: 18, fontWeight: 700 }}>Parking Lot Real-Time Layout</h2>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{occupied}/{total} spots occupied</span>
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="ALL">All Spots ({total})</option>
          <option value="AVAILABLE">Available Only ({total - occupied})</option>
        </Select>
      </div>

      {floors.map((floor) => (
        <div key={floor.floorNumber} className="floor-section">
          <h3>Floor {floor.floorNumber}</h3>
          <div className="spots-grid">
            {(filter === 'ALL' ? floor.spots : floor.spots.filter((s) => !s.occupied)).map((spot) => (
              <div key={spot.id} className={`spot-card ${spot.occupied ? 'occupied' : 'available'}`}>
                <div className="spot-id">{spot.id}</div>
                <div className="spot-type">{spot.vehicleType}</div>
                <div className="spot-status">{spot.occupied ? 'Occupied' : 'Available'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16, fontSize: 13 }}>
        <Badge variant="success">● Available</Badge>
        <Badge variant="danger">● Occupied</Badge>
      </div>
    </div>
  );
}

function ActiveTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchTickets = useCallback(async () => {
    try {
      const data = await getActiveTickets();
      if (Array.isArray(data)) setTickets(data);
      setFetchError('');
    } catch {
      setFetchError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchTickets, 5000, []);

  if (loading && tickets.length === 0) {
    return <Skeleton height={200} />;
  }

  if (fetchError) {
    return <EmptyState icon="⚠️" title="Error loading tickets" description={fetchError} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--info)', fontSize: 18, fontWeight: 700 }}>Active Parking Tickets</h2>
        <Badge variant="info">{tickets.length} Active</Badge>
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon="🎟️" title="No active tickets" description="Park a vehicle in the Entry tab to see active tickets here." />
      ) : (
        <Table
          headers={['Ticket #', 'Vehicle Number', 'Vehicle Type', 'Spot ID', 'Entry Time', 'Duration']}
          data={tickets}
          renderRow={(t) => {
            const entry = new Date(t.entryTime);
            const mins = Math.floor((Date.now() - entry.getTime()) / 60000);
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
            return (
              <tr key={t.ticketNumber}>
                <td><strong>{t.ticketNumber}</strong></td>
                <td>{t.vehicleNumber}</td>
                <td><Badge variant="neutral">{t.vehicleType}</Badge></td>
                <td style={{ fontFamily: 'var(--code-font)' }}>{t.spotId}</td>
                <td>{entry.toLocaleTimeString()}</td>
                <td><Badge variant="success">{label}</Badge></td>
              </tr>
            );
          }}
        />
      )}
    </div>
  );
}


export default function ParkingLotPage() {
  return (
    <LldPage
      module="parking"
      title="Parking Lot System"
      icon="🅿️"
      tabs={['entry', 'exit', 'spots', 'tickets', 'simulation', 'diagram', 'sequence', 'design']}
    >
      {(activeTab) => (
        <div className="parking-container">
          <style>{PARKING_CSS}</style>
          {activeTab === 'entry' && <EntryForm />}
          {activeTab === 'exit' && <ExitForm />}
          {activeTab === 'spots' && <SpotGrid />}
          {activeTab === 'tickets' && <ActiveTickets />}
          {activeTab === 'simulation' && <ParkingSimulation />}
        </div>
      )}
    </LldPage>
  );
}
