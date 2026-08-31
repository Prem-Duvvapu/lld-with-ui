import { useState, useMemo } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import * as api from './api';

const CSS = `
.cr-panel { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-5); }
.cr-panel h3 { margin: 0 0 var(--space-3); font-size: var(--font-lg); color: var(--text-primary); }
.cr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); }
.cr-row { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: flex-end; margin-bottom: var(--space-3); }
.cr-field { display: flex; flex-direction: column; gap: 4px; font-size: var(--font-sm); color: var(--text-secondary); }
.cr-field input, .cr-field select { padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-primary); background: var(--bg-input); color: var(--text-primary); font-size: var(--font-sm); min-width: 160px; }
.cr-btn { padding: 9px 18px; border-radius: var(--radius-sm); border: none; background: var(--accent-gradient); color: #fff; font-weight: 600; cursor: pointer; font-size: var(--font-sm); }
.cr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cr-btn.secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.cr-btn.danger { background: var(--danger); }
.cr-btn.success { background: var(--success); }
.cr-error { margin-top: 8px; padding: 10px; background: var(--danger-bg); color: var(--danger); border-radius: var(--radius-sm); font-size: var(--font-sm); border: 1px solid var(--danger-bg); }
.cr-fleet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3); }
.cr-vehicle-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: var(--radius-md); padding: var(--space-3); cursor: pointer; transition: all 0.2s; }
.cr-vehicle-card.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,70,229,0.15); }
.cr-vehicle-card.unavailable { opacity: 0.55; cursor: not-allowed; }
.cr-badge { display: inline-block; padding: 2px 9px; border-radius: var(--radius-full); font-size: var(--font-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
.cr-badge.AVAILABLE, .cr-badge.CONFIRMED, .cr-badge.COMPLETED { background: var(--success-bg); color: var(--success); }
.cr-badge.RENTED, .cr-badge.ACTIVE { background: var(--info-bg); color: var(--info); }
.cr-badge.MAINTENANCE, .cr-badge.PENDING { background: var(--warning-bg); color: var(--warning); }
.cr-badge.RETIRED, .cr-badge.CANCELLED { background: var(--danger-bg); color: var(--danger); }
.cr-table { width: 100%; border-collapse: collapse; font-size: var(--font-sm); }
.cr-table th, .cr-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border-secondary); color: var(--text-secondary); }
.cr-table th { color: var(--text-muted); font-weight: 600; font-size: var(--font-xs); text-transform: uppercase; }
.cr-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.cr-actions button { padding: 5px 10px; font-size: 11px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; }
.cr-actions button.primary { background: var(--accent); color: #fff; border: none; }
.cr-actions button.danger { background: var(--danger); color: #fff; border: none; }

/* Simulation */
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 10px; flex-wrap: wrap; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(79,70,229,0.5); }
.step-dot.done { background: var(--success); }
.cr-scene { position: relative; width: 100%; min-height: 280px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: var(--radius-lg); border: 1px solid var(--border-primary); padding: var(--space-5); margin-bottom: var(--space-4); }
.cr-lot { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); margin-top: var(--space-3); }
.cr-lot-slot { border: 2px dashed var(--border-primary); border-radius: var(--radius-md); padding: var(--space-3); text-align: center; background: var(--bg-card); transition: all 0.4s; }
.cr-lot-slot.locked { border-color: var(--warning); box-shadow: 0 0 12px rgba(217,119,6,0.35); }
.cr-lot-slot.booked { border-color: var(--success); }
.race-lane { display: flex; align-items: center; gap: var(--space-3); padding: 10px; border-radius: var(--radius-md); margin-top: 8px; background: var(--bg-card); border: 1px solid var(--border-primary); }
.race-lane.winner { border-color: var(--success); background: var(--success-bg); }
.race-lane.loser { border-color: var(--danger); background: var(--danger-bg); opacity: 0.85; }
.cr-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-2); margin-top: var(--space-3); }
.cr-hud-tile { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: var(--radius-md); padding: 10px; text-align: center; }
.cr-hud-tile .v { font-size: var(--font-lg); font-weight: 700; color: var(--accent); }
.cr-hud-tile .l { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
.cr-log { max-height: 160px; overflow-y: auto; font-size: 12px; font-family: var(--code-font); background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 10px; margin-top: 10px; }
.cr-log div { padding: 2px 0; color: var(--text-secondary); border-bottom: 1px dashed var(--border-secondary); }
`;

const VEHICLE_TYPES = ['HATCHBACK', 'SEDAN', 'SUV', 'VAN', 'TRUCK'];
const PAYMENT_METHODS = ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET'];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
const TODAY = new Date().toISOString().slice(0, 10);

// ============================= Reserve tab =============================
function ReserveTab() {
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState(addDays(TODAY, 10));
  const [endDate, setEndDate] = useState(addDays(TODAY, 13));
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [myReservations, setMyReservations] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  usePolling(async () => {
    const [b, c] = await Promise.all([api.getBranches(), api.getCustomers()]);
    setBranches(b);
    setCustomers(c);
  }, 8000, []);

  usePolling(async () => {
    if (!customerId) { setMyReservations([]); return; }
    setMyReservations(await api.getReservations(customerId));
  }, 4000, [customerId]);

  async function handleSearch() {
    setError(''); setEstimate(null); setSelectedVehicle(null);
    try {
      const results = await api.searchAvailableVehicles(branchId || undefined, type || undefined, startDate, endDate);
      setVehicles(results);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSelectVehicle(v) {
    setSelectedVehicle(v);
    setError('');
    try {
      const est = await api.getEstimate(v.type, startDate, endDate);
      setEstimate(est);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRegisterCustomer() {
    if (!newCustomerName.trim()) return;
    setBusy(true);
    try {
      const c = await api.registerCustomer({
        name: newCustomerName, email: `${newCustomerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: '9000000000', licenseNumber: 'DL-' + Math.floor(Math.random() * 90000 + 10000),
      });
      setCustomers((prev) => [...prev, c]);
      setCustomerId(c.id);
      setNewCustomerName('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handleReserve() {
    if (!customerId || !selectedVehicle) return;
    setBusy(true); setError('');
    try {
      await api.reserveVehicle(customerId, selectedVehicle.id, startDate, endDate);
      setSelectedVehicle(null); setEstimate(null);
      setMyReservations(await api.getReservations(customerId));
      handleSearch();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function act(fn, id) {
    setBusy(true); setError('');
    try {
      await fn(id);
      setMyReservations(await api.getReservations(customerId));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <style>{CSS}</style>
      <div className="cr-panel">
        <h3>Customer</h3>
        <div className="cr-row">
          <div className="cr-field">
            <label>Existing customer</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
            </select>
          </div>
          <div className="cr-field">
            <label>Or register a new one</label>
            <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Full name" />
          </div>
          <button className="cr-btn secondary" disabled={busy || !newCustomerName.trim()} onClick={handleRegisterCustomer}>Register</button>
        </div>
      </div>

      <div className="cr-panel">
        <h3>Search Available Vehicles</h3>
        <div className="cr-row">
          <div className="cr-field">
            <label>Branch</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Any branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="cr-field">
            <label>Category</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Any category</option>
              {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="cr-field">
            <label>Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="cr-field">
            <label>End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="cr-btn" onClick={handleSearch}>Search</button>
        </div>

        <div className="cr-fleet-grid">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={`cr-vehicle-card ${selectedVehicle?.id === v.id ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={selectedVehicle?.id === v.id}
              onClick={() => handleSelectVehicle(v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectVehicle(v); } }}
            >
              <strong>{v.make} {v.model}</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>{v.year} · {v.licensePlate}</div>
              <span className={`cr-badge ${v.type}`} style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>{v.type}</span>{' '}
              <span className={`cr-badge ${v.status}`}>{v.status}</span>
            </div>
          ))}
          {vehicles.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No search yet — pick dates and press Search.</div>}
        </div>

        {selectedVehicle && estimate && (
          <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
            <div>Estimated cost for <strong>{selectedVehicle.make} {selectedVehicle.model}</strong>, {estimate.days} day(s): <strong style={{ color: 'var(--success)' }}>₹{estimate.estimatedCost.toFixed(2)}</strong></div>
            <button className="cr-btn" style={{ marginTop: 10 }} disabled={busy || !customerId} onClick={handleReserve}>
              {customerId ? 'Reserve This Vehicle' : 'Select a customer first'}
            </button>
          </div>
        )}
        {error && <div className="cr-error">{error}</div>}
      </div>

      <div className="cr-panel">
        <h3>My Reservations</h3>
        {!customerId && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select a customer to see their reservations.</div>}
        {customerId && (
          <table className="cr-table">
            <thead><tr><th>ID</th><th>Vehicle</th><th>Dates</th><th>Status</th><th>Cost</th><th>Actions</th></tr></thead>
            <tbody>
              {myReservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.vehicleId}</td>
                  <td>{r.startDate} → {r.endDate}</td>
                  <td><span className={`cr-badge ${r.status}`}>{r.status}</span></td>
                  <td>₹{(r.actualCost ?? r.estimatedCost).toFixed(2)}</td>
                  <td className="cr-actions">
                    {r.status === 'PENDING' && <button className="primary" disabled={busy} onClick={() => act((id) => api.confirmReservation(id), r.id)}>Confirm & Pay</button>}
                    {r.status === 'CONFIRMED' && <button className="primary" disabled={busy} onClick={() => act(api.pickupReservation, r.id)}>Pick Up</button>}
                    {r.status === 'ACTIVE' && <button className="primary" disabled={busy} onClick={() => act((id) => api.returnVehicle(id, 15000, null), r.id)}>Return</button>}
                    {(r.status === 'PENDING' || r.status === 'CONFIRMED') && <button className="danger" disabled={busy} onClick={() => act(api.cancelReservation, r.id)}>Cancel</button>}
                  </td>
                </tr>
              ))}
              {myReservations.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>No reservations yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================= Fleet tab =============================
function FleetTab() {
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  usePolling(async () => {
    const [b, v] = await Promise.all([api.getBranches(), api.getVehicles()]);
    setBranches(b); setVehicles(v);
  }, 5000, []);

  return (
    <div className="cr-panel">
      <style>{CSS}</style>
      <h3>Live Fleet — {vehicles.length} vehicles across {branches.length} branches</h3>
      {branches.map((b) => (
        <div key={b.id} style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{b.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {b.city}</span></div>
          <div className="cr-fleet-grid">
            {vehicles.filter((v) => v.branchId === b.id).map((v) => (
              <div key={v.id} className="cr-vehicle-card" style={{ cursor: 'default' }}>
                <strong>{v.make} {v.model}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>{v.licensePlate} · {v.odometer} km</div>
                <span className="cr-badge" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>{v.type}</span>{' '}
                <span className={`cr-badge ${v.status}`}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================= Simulation tab =============================
const STEPS = [
  { title: 'Reset Sandbox', detail: 'Wipe the isolated /sim/* sandbox so this run starts clean.' },
  { title: 'Seed Fleet', detail: 'Seed one SUV and two customers into the sandbox.' },
  { title: 'First Reservation', detail: 'Customer A reserves the SUV for a 5-day window.' },
  { title: 'Confirm & Pay', detail: "Authorize payment on Customer A's reservation." },
  { title: 'Overlap Race', detail: 'Customers B and C both try to reserve the SAME SUV for an overlapping window — at the same instant.' },
  { title: 'Race Result', detail: 'Exactly one of B/C should win; the other must be rejected by the per-vehicle lock.' },
  { title: 'Pickup & Return', detail: "Customer A picks up and returns the SUV; it becomes free again." },
  { title: 'Final State', detail: 'Inspect the sandbox reservation ledger and vehicle status.' },
];

function SimulationTab() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [custA, setCustA] = useState(null);
  const [custB, setCustB] = useState(null);
  const [custC, setCustC] = useState(null);
  const [reservationA, setReservationA] = useState(null);
  const [raceResult, setRaceResult] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const pushLog = (msg) => setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  async function runStep() {
    setBusy(true); setError('');
    try {
      if (step === 0) {
        await api.simReset();
        pushLog('Sandbox reset.');
      } else if (step === 1) {
        const v = await api.simSeedVehicle({ make: 'Ford', model: 'Explorer', year: 2023, licensePlate: 'SIM-001', type: 'SUV', status: 'AVAILABLE', branchId: 'SIM-BR', odometer: 0 });
        const a = await api.simSeedCustomer({ name: 'Ava' });
        const b = await api.simSeedCustomer({ name: 'Ben' });
        const c = await api.simSeedCustomer({ name: 'Cleo' });
        setVehicle(v); setCustA(a); setCustB(b); setCustC(c);
        pushLog(`Seeded vehicle ${v.id} (${v.make} ${v.model}) and 3 customers.`);
      } else if (step === 2) {
        const start = addDays(TODAY, 10), end = addDays(TODAY, 15);
        const r = await api.simReserve(custA.id, vehicle.id, start, end);
        setReservationA(r);
        pushLog(`Ava reserved ${vehicle.id} for ${start} → ${end} (reservation ${r.id}, PENDING).`);
      } else if (step === 3) {
        const r = await api.simConfirm(reservationA.id, 'UPI');
        setReservationA(r);
        pushLog(`Ava's reservation ${r.id} confirmed and paid.`);
      } else if (step === 4) {
        // Genuine concurrency: fire both requests at once and let the backend's
        // per-vehicle lock decide the winner — nothing is decided in the browser.
        const start = addDays(TODAY, 20), end = addDays(TODAY, 23);
        const [rb, rc] = await Promise.allSettled([
          api.simReserve(custB.id, vehicle.id, start, end),
          api.simReserve(custC.id, vehicle.id, start, end),
        ]);
        setRaceResult({ b: rb, c: rc });
        pushLog(`Ben and Cleo both requested ${vehicle.id} for ${start} → ${end} simultaneously.`);
      } else if (step === 5) {
        const winner = raceResult.b.status === 'fulfilled' ? 'Ben' : 'Cleo';
        const loserErr = raceResult.b.status === 'rejected' ? raceResult.b.reason?.message : raceResult.c.reason?.message;
        pushLog(`${winner} won the race. The loser was rejected: "${loserErr}"`);
      } else if (step === 6) {
        const picked = await api.simPickup(reservationA.id);
        pushLog(`Ava picked up ${vehicle.id} — vehicle now RENTED.`);
        const returned = await api.simReturn(picked.id, 8500);
        setReservationA(returned);
        pushLog(`Ava returned ${vehicle.id} — vehicle free again, cost ₹${returned.actualCost}.`);
      } else if (step === 7) {
        const [res, vs] = await Promise.all([api.simGetReservations(), api.simGetVehicles()]);
        setReservations(res); setVehicles(vs);
        pushLog(`Sandbox ledger: ${res.length} reservations, ${vs.length} vehicle(s).`);
      }
      setStep((s) => Math.min(s + 1, STEPS.length));
    } catch (e) {
      setError(e.message || 'Step failed');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep(0); setLog([]); setVehicle(null); setCustA(null); setCustB(null); setCustC(null);
    setReservationA(null); setRaceResult(null); setReservations([]); setVehicles([]); setError('');
  }

  return (
    <div className="cr-panel">
      <style>{CSS}</style>
      <div className="step-indicator">
        {STEPS.map((s, i) => <div key={s.title} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s.title} />)}
      </div>
      <h3 style={{ textAlign: 'center' }}>{step < STEPS.length ? `Step ${step + 1}/${STEPS.length}: ${STEPS[step].title}` : 'Simulation Complete'}</h3>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{step < STEPS.length ? STEPS[step].detail : 'Reset to run it again.'}</p>

      <div className="cr-scene">
        {vehicle && (
          <div className="cr-lot">
            <div className={`cr-lot-slot ${step >= 6 && step < 7 ? 'locked' : ''} ${reservationA?.status === 'COMPLETED' ? 'booked' : ''}`}>
              <strong>{vehicle.make} {vehicle.model}</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{vehicle.id}</div>
              {reservationA && <div style={{ marginTop: 6 }}><span className={`cr-badge ${reservationA.status}`}>{reservationA.status}</span> Ava</div>}
            </div>
            <div className="cr-lot-slot">
              <strong>Overlap Race Target</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Same vehicle, overlapping dates</div>
            </div>
          </div>
        )}

        {raceResult && (
          <div style={{ marginTop: 14 }}>
            <div className={`race-lane ${raceResult.b.status === 'fulfilled' ? 'winner' : 'loser'}`}>
              <strong>Ben</strong> — {raceResult.b.status === 'fulfilled' ? `Reservation ${raceResult.b.value.id} confirmed PENDING` : `Rejected: ${raceResult.b.reason?.message}`}
            </div>
            <div className={`race-lane ${raceResult.c.status === 'fulfilled' ? 'winner' : 'loser'}`}>
              <strong>Cleo</strong> — {raceResult.c.status === 'fulfilled' ? `Reservation ${raceResult.c.value.id} confirmed PENDING` : `Rejected: ${raceResult.c.reason?.message}`}
            </div>
          </div>
        )}

        {reservations.length > 0 && (
          <div className="cr-hud">
            <div className="cr-hud-tile"><div className="v">{reservations.length}</div><div className="l">Reservations</div></div>
            <div className="cr-hud-tile"><div className="v">{reservations.filter((r) => r.status !== 'CANCELLED').length}</div><div className="l">Non-cancelled</div></div>
            <div className="cr-hud-tile"><div className="v">{vehicles[0]?.status || '—'}</div><div className="l">Vehicle Status</div></div>
            <div className="cr-hud-tile"><div className="v">{vehicles[0]?.odometer ?? '—'}</div><div className="l">Odometer (km)</div></div>
          </div>
        )}

        {log.length > 0 && <div className="cr-log">{log.map((l, i) => <div key={i}>{l}</div>)}</div>}
      </div>

      {error && <div className="cr-error">{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {step < STEPS.length
          ? <button className="cr-btn" disabled={busy} onClick={runStep}>{busy ? 'Running…' : `Run: ${STEPS[step].title}`}</button>
          : <button className="cr-btn success" onClick={reset}>🔄 Run Again</button>}
        {step > 0 && step < STEPS.length && <button className="cr-btn secondary" onClick={reset}>Reset</button>}
      </div>
    </div>
  );
}

// ============================= Page =============================
export default function CarRentalPage() {
  const tabs = useMemo(() => ([
    { id: 'reserve', label: '🚗 Reserve a Vehicle' },
    { id: 'fleet', label: '🏢 Fleet Dashboard' },
    { id: 'simulation', label: 'Interactive 2D Simulation' },
    { id: 'diagram', label: 'Class Diagram' },
    { id: 'sequence', label: 'Sequence Diagram' },
    { id: 'design', label: 'Design Details' },
  ]), []);

  return (
    <LldPage module="car-rental" title="Car Rental System" icon="🚙" tabs={tabs}>
      {(activeTab) => (
        <>
          {activeTab === 'reserve' && <ReserveTab />}
          {activeTab === 'fleet' && <FleetTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
