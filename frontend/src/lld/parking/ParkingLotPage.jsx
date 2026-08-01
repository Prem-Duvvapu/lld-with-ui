import { useState, useEffect, useRef, useCallback } from 'react';
import { vehicleEntry, getGates, scanVehicleExit, payVehicleExit, vehicleExit, getFloors, getActiveTickets, getParkingClassDiagram, getParkingDesignDetails } from './api';
import LldPage from '../../components/LldPage';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StepIndicator from '../../components/ui/StepIndicator';
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

.scene { position: relative; width: 100%; height: 320px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-primary); margin-bottom: 16px; }
.road { position: absolute; bottom: 30px; left: 0; right: 0; height: 60px; background: #2d2d2d; border-top: 3px solid #555; border-bottom: 3px solid #555; }
.road-line { position: absolute; bottom: 57px; left: 0; right: 0; height: 1px; background: repeating-linear-gradient(90deg, #fff 0px, #fff 20px, transparent 20px, transparent 40px); opacity: 0.3; }
.entry-gate { position: absolute; left: 30px; bottom: 18px; width: 20px; height: 80px; background: var(--accent); border-radius: 4px; z-index: 3; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white; }
.entry-gate .bar { position: absolute; top: 20px; left: 18px; width: 50px; height: 6px; background: #f0c040; border-radius: 3px; transform-origin: left center; transition: transform var(--duration-slow) var(--ease-spring); }
.entry-gate .bar.up { transform: rotate(-90deg); }
.exit-gate { position: absolute; right: 30px; bottom: 18px; width: 20px; height: 80px; background: var(--danger); border-radius: 4px; z-index: 3; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white; }
.exit-gate .bar { position: absolute; top: 20px; left: 18px; width: 50px; height: 6px; background: #f0c040; border-radius: 3px; transform-origin: left center; transition: transform var(--duration-slow) var(--ease-spring); }
.exit-gate .bar.up { transform: rotate(-90deg); }
.parking-area { position: absolute; left: 80px; right: 80px; bottom: 90px; top: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 8px; }
.parking-cell { background: rgba(128,128,128,0.08); border: 1px dashed var(--border-primary); border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-primary); transition: all 0.5s; position: relative; min-height: 40px; }
.parking-cell.occupied-sim { background: var(--danger-bg); border-color: var(--danger); border-style: solid; color: var(--danger); }
.car-animated { position: absolute; bottom: 40px; font-size: 28px; z-index: 5; transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1); }
.person-animated { position: absolute; font-size: 26px; z-index: 6; transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
.ticket-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); border: 2px solid var(--accent); border-radius: var(--radius-lg); padding: 20px; z-index: 10; box-shadow: var(--shadow-lg); min-width: 240px; text-align: center; animation: ticketIn 0.4s var(--ease-spring); color: var(--text-primary); }
@keyframes ticketIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.ticket-popup h3 { color: var(--info); margin-bottom: 8px; font-size: 16px; font-weight: 700; }
.ticket-popup .ticket-detail { font-size: 12px; color: var(--text-primary); padding: 3px 0; font-weight: 500; }
.away-timer { text-align: center; padding: 16px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-primary); margin: 8px 0; color: var(--text-primary); }
.away-timer .timer { font-size: 36px; font-weight: 700; color: var(--info); font-family: var(--code-font); }
.away-timer .activity { font-size: 14px; color: var(--text-primary); margin: 8px 0; font-weight: 600; }
.flow-controls { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
.activity-selector { display: flex; gap: 8px; justify-content: center; margin: 8px 0; }
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

          {error && <div className="error-msg">{error}</div>}

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

          {error && <div className="error-msg">{error}</div>}
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

const ACTIVITIES = [
  { icon: '🛍️', label: 'Shopping', emoji: '🛒' },
  { icon: '🎬', label: 'Movie', emoji: '🍿' },
  { icon: '🍕', label: 'Eating', emoji: '🍕' },
];

function AnimatedFlow() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [carLeft, setCarLeft] = useState(-60);
  const [carBottom, setCarBottom] = useState(40);
  const [sceneWidth, setSceneWidth] = useState(900);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [occupiedCells, setOccupiedCells] = useState([]);
  const [timer, setTimer] = useState(0);
  const [away, setAway] = useState(false);
  const [activity, setActivity] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [gateBarUp, setGateBarUp] = useState(false);
  const [exitGateBarUp, setExitGateBarUp] = useState(false);
  const [entryLoading, setEntryLoading] = useState(false);
  const [simError, setSimError] = useState('');
  const [personLeft, setPersonLeft] = useState(-60);
  const [personBottom, setPersonBottom] = useState(40);
  const [personVisible, setPersonVisible] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const sceneRef = useRef(null);
  const entryGateRef = useRef('');
  const exitGateRef = useRef('');

  useEffect(() => {
    getGates()
      .then((all) => {
        if (!Array.isArray(all)) return;
        const eg = all.find((g) => g.type === 'ENTRY');
        const xg = all.find((g) => g.type === 'EXIT');
        if (eg) entryGateRef.current = eg.id;
        if (xg) exitGateRef.current = xg.id;
        setSimError('');
      })
      .catch(() => {
        setSimError('⚠️ Backend server not reachable on port 9090');
      });
  }, []);

  useEffect(() => {
    if (sceneRef.current) setSceneWidth(sceneRef.current.offsetWidth);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const PARK_LEFT = 80;
  const PARK_RIGHT = 80;
  const PARK_PAD = 8;
  const PARK_GAP = 6;
  const COLS = 4;
  const ROWS = 3;
  const CELL_MIN_W = (sceneWidth - PARK_LEFT - PARK_RIGHT - PARK_PAD * 2 - PARK_GAP * (COLS - 1)) / COLS;
  const CELL_H = 50;

  const cellCenter = (cellIdx) => {
    const col = cellIdx % COLS;
    const row = Math.floor(cellIdx / COLS);
    return {
      left: PARK_LEFT + PARK_PAD + col * (CELL_MIN_W + PARK_GAP) + CELL_MIN_W / 2,
      bottom: 90 + PARK_PAD + (ROWS - 1 - row) * (CELL_H + PARK_GAP) + CELL_H / 2,
    };
  };

  const resetFlow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep(0); setCarLeft(-60); setCarBottom(40); setShowTicket(false);
    setTicketData(null); setOccupiedCells([]); setTimer(0); setAway(false);
    setActivity(null); setShowReceipt(false); setReceiptData(null);
    setGateBarUp(false); setExitGateBarUp(false); setEntryLoading(false);
    setSimError(''); setPersonVisible(false);
  };

  const steps = ['Entry', 'Ticket', 'Park', 'Away', 'Return', 'At Exit', 'Scan Ticket', 'Payment', 'Done'];

  const [scanPreview, setScanPreview] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('UPI');
  const [selectedStrategy, setSelectedStrategy] = useState('HOURLY');

  const findEmptyCell = () => {
    const used = new Set(occupiedCells);
    for (let i = 0; i < 12; i++) {
      if (!used.has(i)) return i;
    }
    return -1;
  };

  const startFlow = async () => {
    setSimError(''); setStep(1); setGateBarUp(true); setShowTicket(false);
    setShowReceipt(false); setScanPreview(null); setAway(false); setTimer(0); setActivity(null);

    setTimeout(() => setCarLeft(50), 500);
    setTimeout(() => setGateBarUp(false), 1500);

    setTimeout(() => {
      setEntryLoading(true);
      vehicleEntry(entryGateRef.current || 'G1', 'KA-01-AB-1234', 'CAR').then((data) => {
        if (!mountedRef.current) return;
        setEntryLoading(false);
        if (data.error) {
          setSimError(data.error);
        } else {
          setTicketData(data); setShowTicket(true); setStep(2);
        }
      }).catch((err) => {
        if (mountedRef.current) { setEntryLoading(false); setSimError(err.message || 'API call failed'); }
      });
    }, 2000);
  };

  const parkVehicle = () => {
    setShowTicket(false);
    const cellIdx = findEmptyCell();
    if (cellIdx === -1) return;
    const pos = cellCenter(cellIdx);
    setCarLeft(pos.left); setCarBottom(pos.bottom);

    setTimeout(() => {
      setOccupiedCells([...occupiedCells, cellIdx]);
      setStep(3); setAway(true);
      let secs = 0;
      timerRef.current = setInterval(() => {
        secs++;
        setTimer(secs);
      }, 1000);
    }, 1500);
  };

  const startAway = (act) => {
    setActivity(act);
    const cellIdx = occupiedCells.length > 0 ? occupiedCells[occupiedCells.length - 1] : -1;
    if (cellIdx >= 0) {
      const pos = cellCenter(cellIdx);
      setPersonLeft(pos.left); setPersonBottom(pos.bottom);
    } else {
      setPersonLeft(carLeft); setPersonBottom(carBottom);
    }
    setPersonVisible(true);
    setTimeout(() => {
      setPersonLeft(-40); setPersonBottom(40);
    }, 800);
  };

  const returnToCar = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep(4); setPersonLeft(-40); setPersonBottom(40); setPersonVisible(true);

    const cellIdx = occupiedCells.length > 0 ? occupiedCells[occupiedCells.length - 1] : -1;
    const pos = cellIdx >= 0 ? cellCenter(cellIdx) : { left: carLeft, bottom: carBottom };

    setTimeout(() => {
      setPersonLeft(pos.left); setPersonBottom(pos.bottom);
    }, 300);

    setTimeout(() => {
      setPersonVisible(false); setAway(false); setStep(5);
    }, 1500);
  };

  const driveToExitGate = () => {
    const cellIdx = occupiedCells.length > 0 ? occupiedCells[occupiedCells.length - 1] : -1;
    if (cellIdx >= 0) {
      setOccupiedCells(occupiedCells.filter((c) => c !== cellIdx));
    }
    setCarLeft(sceneWidth - 110); setCarBottom(40); setStep(6);
  };

  const scanTicketAtExit = async () => {
    if (!ticketData) return;
    setEntryLoading(true); setSimError('');
    try {
      const res = await scanVehicleExit(exitGateRef.current || 'G3', ticketData.ticketNumber, selectedStrategy);
      if (res.error) setSimError(res.error);
      else { setScanPreview(res); setStep(7); }
    } catch (err) {
      setSimError(err.message || 'Scan failed');
    } finally {
      setEntryLoading(false);
    }
  };

  const payAndExitVehicle = async () => {
    if (!ticketData) return;
    setEntryLoading(true); setSimError('');
    try {
      const res = await payVehicleExit(exitGateRef.current || 'G3', ticketData.ticketNumber, selectedStrategy, selectedPayMethod);
      if (res.error) setSimError(res.error);
      else {
        setReceiptData(res); setStep(8); setExitGateBarUp(true); setShowReceipt(true);
        setTimeout(() => { setCarLeft(sceneWidth + 60); }, 800);
        setTimeout(() => { setExitGateBarUp(false); }, 2500);
      }
    } catch (err) {
      setSimError(err.message || 'Payment failed');
    } finally {
      setEntryLoading(false);
    }
  };

  return (
    <div className="flow-section">
      <StepIndicator steps={steps} currentStep={step} />

      <div className="scene" ref={sceneRef}>
        <div className="entry-gate">
          <span>G1</span>
          <div className={`bar ${gateBarUp ? 'up' : ''}`} />
        </div>

        <div className="exit-gate">
          <span>G3</span>
          <div className={`bar ${exitGateBarUp ? 'up' : ''}`} />
        </div>

        <div className="parking-area">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`parking-cell ${occupiedCells.includes(i) ? 'occupied-sim' : ''}`}>
              <span>Spot {i + 1}</span>
              {occupiedCells.includes(i) && <span className="car-icon">🚗</span>}
            </div>
          ))}
        </div>

        <div className="road"><div className="road-line" /></div>

        <div className="car-animated" style={{ left: carLeft, bottom: carBottom }}>🚗</div>
        {personVisible && <div className="person-animated" style={{ left: personLeft, bottom: personBottom }}>🚶‍♂️</div>}

        {showTicket && ticketData && (
          <div className="ticket-popup">
            <h3>🎟️ Ticket Issued</h3>
            <div className="ticket-detail">Ticket #: <strong>{ticketData.ticketNumber}</strong></div>
            <div className="ticket-detail">Vehicle: <strong>{ticketData.vehicleNumber}</strong></div>
            <div className="ticket-detail">Spot: <strong>{ticketData.spotId}</strong></div>
            <Button onClick={parkVehicle} variant="primary" style={{ marginTop: 12, width: '100%' }}>
              Park Vehicle
            </Button>
          </div>
        )}

        {showReceipt && receiptData && (
          <div className="ticket-popup" style={{ borderColor: 'var(--success)' }}>
            <h3 style={{ color: 'var(--success)' }}>✅ Paid & Gate Open</h3>
            <div className="ticket-detail">Paid: <strong>₹{receiptData.amount.toFixed(2)}</strong></div>
            <div className="ticket-detail">Method: <strong>{receiptData.paymentMethod}</strong></div>
            <Button onClick={resetFlow} variant="primary" style={{ marginTop: 12, width: '100%' }}>
              Reset Simulation
            </Button>
          </div>
        )}
      </div>

      {simError && <div className="error-msg">{simError}</div>}

      {step === 0 && (
        <Button onClick={startFlow} variant="primary" size="lg">
          ▶️ Start Parking Simulation
        </Button>
      )}

      {step === 3 && away && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div className="away-timer">
            <div className="timer">{timer}s</div>
            <div className="activity">
              {activity ? `${activity.emoji} ${activity.label}...` : 'Select an activity while away:'}
            </div>
            {!activity && (
              <div className="activity-selector">
                {ACTIVITIES.map((act) => (
                  <Button key={act.label} variant="secondary" size="sm" onClick={() => startAway(act)}>
                    {act.icon} {act.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {activity && (
            <Button onClick={returnToCar} variant="success">
              🏃 Return to Vehicle
            </Button>
          )}
        </div>
      )}

      {step === 5 && (
        <Button onClick={driveToExitGate} variant="danger">
          🚗 Drive to Exit Gate
        </Button>
      )}

      {step === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Pricing Strategy:</label>
            <Select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
              <option value="HOURLY">Hourly (Standard)</option>
              <option value="FLAT">Flat Rate</option>
              <option value="DYNAMIC">Dynamic Surge (1.5x)</option>
            </Select>
          </div>
          <Button onClick={scanTicketAtExit} variant="warning" loading={entryLoading}>
            🎟️ Scan Ticket & Calculate Price
          </Button>
        </div>
      )}

      {step === 7 && scanPreview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Payment Method:</label>
            <Select value={selectedPayMethod} onChange={(e) => setSelectedPayMethod(e.target.value)}>
              <option value="UPI">UPI / QR Code</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash</option>
            </Select>
          </div>
          <Button onClick={payAndExitVehicle} variant="success" loading={entryLoading}>
            💳 Pay ₹{scanPreview.amount?.toFixed(2)} & Open Exit Gate
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ParkingLotPage() {
  const [classDiagramData, setClassDiagramData] = useState(null);
  const [designDetailsData, setDesignDetailsData] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  return (
    <LldPage
      module="parking"
      title="Parking Lot System"
      icon="🅿️"
      tabs={['entry', 'exit', 'spots', 'tickets', 'demo', 'diagram', 'design']}
    >
      {(activeTab) => (
        <div className="parking-container">
          <style>{PARKING_CSS}</style>
          {activeTab === 'entry' && <EntryForm />}
          {activeTab === 'exit' && <ExitForm />}
          {activeTab === 'spots' && <SpotGrid />}
          {activeTab === 'tickets' && <ActiveTickets />}
          {activeTab === 'demo' && <AnimatedFlow />}
        </div>
      )}
    </LldPage>
  );
}
