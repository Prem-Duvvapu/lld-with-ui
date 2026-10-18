import { useEffect, useRef, useState } from 'react';
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
import { useParkingAction, useParkingList } from './useParkingRequests';
import './ParkingLotPage.css';

function serverTime(value) {
  return typeof value === 'string' ? value.replace('T', ' ').replace(/\.\d+/, '') : '—';
}

function ReadFeedback({ resource, noun }) {
  if (resource.error) return (
    <div role="alert" className="parking-error">
      <p>{resource.error}{resource.data !== null ? ' Showing the last successful snapshot.' : ''}</p>
      <Button variant="secondary" loading={resource.loading} onClick={resource.retry}>Retry</Button>
    </div>
  );
  if (resource.loading && resource.data === null) return <p role="status">Loading {noun}…</p>;
  return null;
}

function GateSelect({ resource, type, gateId, onChange }) {
  const gates = (resource.data || []).filter(gate => gate.type === type);
  const label = type === 'ENTRY' ? 'Entry Gate' : 'Exit Gate';
  return <>
    <ReadFeedback resource={resource} noun="gates" />
    {!resource.loading && !resource.error && gates.length === 0 && <div role="status" className="parking-notice">
      <p>No {type.toLowerCase()} gates are configured.</p>
      <Button variant="secondary" onClick={resource.retry}>Refresh gates</Button>
    </div>}
    <Select label={label} value={gateId} onChange={onChange} disabled={!gates.length} required>
      {!gates.length && <option value="">No gates available</option>}
      {gates.map(gate => <option key={gate.id} value={gate.id}>{gate.name}</option>)}
    </Select>
  </>;
}

function selectedGate(resource, type, draft) {
  const gates = (resource.data || []).filter(gate => gate.type === type);
  return gates.find(gate => gate.id === draft)?.id || gates[0]?.id || '';
}

function requireTicket(data, needsAmount = false) {
  if (!data?.ticketNumber || !data.spotId || (needsAmount && (typeof data.amount !== 'number' || !Number.isFinite(data.amount)))) {
    throw new Error('The server returned an incomplete ticket response.');
  }
  return data;
}

function TicketDetails({ ticket }) {
  return <>
    <div className="parking-detail"><span>Ticket #</span><strong>{ticket.ticketNumber}</strong></div>
    <div className="parking-detail"><span>Vehicle</span><strong>{ticket.vehicleNumber}</strong></div>
    <div className="parking-detail"><span>Vehicle type</span><strong>{ticket.vehicleType}</strong></div>
    <div className="parking-detail"><span>Assigned spot</span><strong>{ticket.spotId}</strong></div>
  </>;
}

function EntryForm() {
  const gates = useParkingList(getGates, 60000);
  const action = useParkingAction();
  const [gateDraft, setGateDraft] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [strategy, setStrategy] = useState('NEAREST');
  const [result, setResult] = useState(null);
  const [inputError, setInputError] = useState('');
  const heading = useRef(null);
  const gateId = selectedGate(gates, 'ENTRY', gateDraft);
  useEffect(() => { if (result) heading.current?.focus(); }, [result]);

  const submit = event => {
    event.preventDefault();
    if (action.busy || !gateId || gates.error) return;
    if (!vehicleNumber.trim()) { setInputError('Enter a vehicle number.'); return; }
    setInputError('');
    void action.run(options => vehicleEntry(gateId, vehicleNumber.trim(), vehicleType, strategy, options), data => {
      setResult(requireTicket(data));
      setVehicleNumber('');
    }, 'The server may have issued a ticket. Check Active Tickets before trying again; this action is not automatically retried.');
  };

  return <div className="parking-form-card"><Card>
    <CardHeader title="🚗 Vehicle Entry" subtitle="Issue a live parking ticket and reserve a spot" />
    <CardBody>
      <p className="parking-time-note">This changes the live lot. Leaving this tab stops waiting, but cannot cancel an entry already received by the server.</p>
      <form onSubmit={submit} aria-label="Vehicle entry">
        <fieldset disabled={action.busy} className="parking-fields">
          <legend>Vehicle entry details</legend>
          <GateSelect resource={gates} type="ENTRY" gateId={gateId} onChange={event => setGateDraft(event.target.value)} />
          <Input label="Vehicle Number" value={vehicleNumber} onChange={event => setVehicleNumber(event.target.value)} placeholder="e.g. KA-01-AB-1234" required aria-invalid={Boolean(inputError)} />
          <Select label="Vehicle Type" value={vehicleType} onChange={event => setVehicleType(event.target.value)}>
            <option value="CAR">Car</option><option value="BIKE">Bike</option><option value="TRUCK">Truck</option>
          </Select>
          <Select label="Spot Strategy" value={strategy} onChange={event => setStrategy(event.target.value)}>
            <option value="NEAREST">Nearest Spot First</option><option value="FARTHEST">Farthest Spot First</option>
          </Select>
          <Button type="submit" disabled={!gateId || Boolean(gates.error)} loading={action.busy} className="parking-wide">Park Vehicle & Issue Ticket</Button>
        </fieldset>
      </form>
      {(inputError || action.error) && <div role="alert" className="parking-error">{inputError || action.error}</div>}
      {result && <section className="parking-result" aria-label="Issued parking ticket">
        <h3 ref={heading} tabIndex={-1}>🎟️ Ticket Issued</h3>
        <TicketDetails ticket={result} />
        <div className="parking-detail"><span>Entry time (server)</span><strong>{serverTime(result.entryTime)}</strong></div>
        <p>Keep this ticket number for the Exit tab. This is the live lot, separate from the simulation.</p>
      </section>}
    </CardBody>
  </Card></div>;
}

function ExitForm() {
  const gates = useParkingList(getGates, 60000);
  const action = useParkingAction();
  const [gateDraft, setGateDraft] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [pricingStrategy, setPricingStrategy] = useState('HOURLY');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [inputError, setInputError] = useState('');
  const heading = useRef(null);
  const gateId = selectedGate(gates, 'EXIT', gateDraft);
  const ticketInput = useRef(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (preview || receipt) heading.current?.focus();
    else if (restoreFocus.current) { ticketInput.current?.focus(); restoreFocus.current = false; }
  }, [preview, receipt]);

  const scan = event => {
    event.preventDefault();
    if (action.busy || !gateId || gates.error) return;
    if (!ticketNumber.trim()) { setInputError('Enter a ticket number.'); return; }
    setInputError('');
    void action.run(options => scanVehicleExit(gateId, ticketNumber.trim(), pricingStrategy, options), data => setPreview(requireTicket(data, true)));
  };
  const pay = () => {
    if (action.error || !preview) return;
    void action.run(options => payVehicleExit(gateId, preview.ticketNumber, pricingStrategy, paymentMethod, options), data => setReceipt(requireTicket(data, true)),
      'Payment may have completed. Rescan this ticket before paying again; this action is not automatically retried.');
  };
  const back = (clearTicket = false) => {
    if (action.busy) return;
    restoreFocus.current = true;
    setPreview(null); setReceipt(null); setInputError(''); action.clear();
    if (clearTicket) setTicketNumber('');
  };

  return <div className="parking-form-card"><Card>
    <CardHeader title="💳 Vehicle Exit & Payment" subtitle="Scan a live ticket, preview the fee, then pay and release the spot" />
    <CardBody>
      <p className="parking-time-note">Leaving this tab stops waiting, but cannot cancel a payment already received by the server.</p>
      {!preview && !receipt && <form onSubmit={scan} aria-label="Ticket scan">
        <fieldset disabled={action.busy} className="parking-fields">
          <legend>Ticket scan details</legend>
          <GateSelect resource={gates} type="EXIT" gateId={gateId} onChange={event => setGateDraft(event.target.value)} />
          <Input ref={ticketInput} label="Ticket Number" value={ticketNumber} onChange={event => setTicketNumber(event.target.value)} placeholder="e.g. TKT-00001" required aria-invalid={Boolean(inputError)} />
          <Select label="Pricing Strategy" value={pricingStrategy} onChange={event => setPricingStrategy(event.target.value)}>
            <option value="HOURLY">Hourly Pricing</option><option value="FLAT">Flat Rate Pricing</option><option value="DYNAMIC">Dynamic Surge Pricing</option>
          </Select>
          <Button type="submit" disabled={!gateId || Boolean(gates.error)} loading={action.busy} className="parking-wide">Scan Ticket & Calculate Price</Button>
        </fieldset>
      </form>}
      {preview && !receipt && <section className="parking-result" aria-label="Parking fee preview">
        <h3 ref={heading} tabIndex={-1}>🎟️ Ticket Details & Price Preview</h3>
        <TicketDetails ticket={preview} />
        <div className="parking-detail"><span>Pricing applied</span><strong>{pricingStrategy}</strong></div>
        <div className="parking-detail"><span>Preview amount</span><strong>₹{preview.amount.toFixed(2)}</strong></div>
        <p>The server recalculates the final charge at payment time. The preview does not release the spot.</p>
        <Select label="Select Payment Method" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} disabled={action.busy}>
          <option value="UPI">UPI / QR Code</option><option value="CARD">Credit / Debit Card</option><option value="CASH">Cash</option>
        </Select>
        <div className="parking-actions">
          <Button onClick={pay} loading={action.busy} disabled={Boolean(action.error)}>Pay & Exit</Button>
          <Button onClick={() => back()} disabled={action.busy} variant="secondary">Back to ticket scan</Button>
        </div>
      </section>}
      {receipt && <section className="parking-result" aria-label="Parking payment receipt">
        <h3 ref={heading} tabIndex={-1}>✅ Payment Successful! Exit Gate Opened</h3>
        <TicketDetails ticket={receipt} />
        <div className="parking-detail"><span>Amount paid</span><strong>₹{receipt.amount.toFixed(2)} ({receipt.paymentMethod})</strong></div>
        <Button onClick={() => back(true)} className="parking-wide">Process Another Vehicle Exit</Button>
      </section>}
      {(inputError || action.error) && <div role="alert" className="parking-error">{inputError || action.error}</div>}
      {preview && !receipt && action.error && <p className="parking-time-note">Return to the ticket scan to refresh this ticket before another payment attempt.</p>}
    </CardBody>
  </Card></div>;
}

function SpotGrid() {
  const resource = useParkingList(getFloors);
  const [filter, setFilter] = useState('ALL');
  const floors = resource.data || [];
  const spots = floors.flatMap(floor => floor.spots);
  const occupied = spots.filter(spot => spot.occupied).length;
  return <section aria-label="Live parking spaces">
    <ReadFeedback resource={resource} noun="parking spaces" />
    {resource.data === null && resource.loading && <Skeleton height={180} />}
    {resource.data !== null && <>
      <div className="parking-toolbar">
        <div><h2>Parking Lot Real-Time Layout</h2><p>{occupied}/{spots.length} spots occupied</p></div>
        <Select label="Show parking spots" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="ALL">All Spots ({spots.length})</option><option value="AVAILABLE">Available Only ({spots.length - occupied})</option>
        </Select>
      </div>
      {!floors.length && <EmptyState title="No parking floors configured" description="Refresh after a floor has been configured on the backend." />}
      {floors.map(floor => {
        const visible = floor.spots.filter(spot => filter === 'ALL' || !spot.occupied);
        return <section key={floor.floorNumber} className="parking-floor">
          <h3>Floor {floor.floorNumber}</h3>
          {!visible.length && <p>No {filter === 'AVAILABLE' ? 'available ' : ''}spots on this floor.</p>}
          <div className="parking-spots">{visible.map(spot => <div key={spot.id} className={`parking-spot ${spot.occupied ? 'occupied' : 'available'}`}>
            <strong>{spot.id}</strong><span>{spot.vehicleType}</span><span>{spot.occupied ? 'Occupied' : 'Available'}</span>
          </div>)}</div>
        </section>;
      })}
      <div className="parking-actions"><Badge variant="success">● Available</Badge><Badge variant="danger">● Occupied</Badge></div>
    </>}
  </section>;
}

function ActiveTickets() {
  const resource = useParkingList(getActiveTickets);
  const [page, setPage] = useState(0);
  const tickets = [...(resource.data || [])].sort((first, second) => first.ticketNumber.localeCompare(second.ticketNumber, undefined, { numeric: true }));
  const pages = Math.max(1, Math.ceil(tickets.length / 25));
  const currentPage = Math.min(page, pages - 1);
  return <section aria-label="Live active tickets">
    <ReadFeedback resource={resource} noun="active tickets" />
    {resource.data === null && resource.loading && <Skeleton height={180} />}
    {resource.data !== null && <>
      <div className="parking-toolbar"><h2>Active Parking Tickets</h2><Badge variant="info">{tickets.length} Active</Badge></div>
      {!tickets.length ? <EmptyState icon="🎟️" title="No active tickets" description="Park a vehicle in the Entry tab to see active tickets here." /> : <>
        <div className="parking-table-scroll" role="region" aria-label="Active parking tickets table" tabIndex={0}>
          <Table headers={['Ticket #', 'Vehicle Number', 'Vehicle Type', 'Spot ID', 'Entry Time (server)', 'Elapsed (server)']} data={tickets.slice(currentPage * 25, (currentPage + 1) * 25)} renderRow={ticket => <tr key={ticket.ticketNumber}>
            <td><strong>{ticket.ticketNumber}</strong></td><td>{ticket.vehicleNumber}</td><td>{ticket.vehicleType}</td><td>{ticket.spotId}</td><td>{serverTime(ticket.entryTime)}</td><td>{Number.isFinite(ticket.elapsedMinutes) ? `${ticket.elapsedMinutes} min` : '—'}</td>
          </tr>} />
        </div>
        <p className="parking-time-note">Times and elapsed minutes are reported by the server, not a fee estimate.</p>
        {pages > 1 && <nav className="parking-actions" aria-label="Active ticket pages">
          <Button variant="secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Previous ticket page">Previous</Button>
          <span role="status">Page {currentPage + 1} of {pages}</span>
          <Button variant="secondary" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)} aria-label="Next ticket page">Next</Button>
        </nav>}
      </>}
    </>}
  </section>;
}

export default function ParkingLotPage() {
  return <LldPage module="parking" title="Parking Lot System" icon="🅿️" tabs={['entry', 'exit', 'spots', 'tickets', 'simulation', 'diagram', 'sequence', 'design']}>
    {activeTab => <div className="parking-container">
      {activeTab === 'entry' && <EntryForm />}{activeTab === 'exit' && <ExitForm />}
      {activeTab === 'spots' && <SpotGrid />}{activeTab === 'tickets' && <ActiveTickets />}
      {activeTab === 'simulation' && <ParkingSimulation />}
    </div>}
  </LldPage>;
}
