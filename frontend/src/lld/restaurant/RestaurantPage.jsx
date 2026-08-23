import { useState, useEffect, useCallback, Fragment } from 'react';
import LldPage from '../../components/LldPage';
import * as api from './api';

const CSS = `
.rest-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.rest-stage { position: relative; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; }

.table-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
.table-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.3s; position: relative; }
.table-card.occupied { border-color: var(--warning); background: rgba(255,204,0,0.05); }
.table-card.preparing { border-color: var(--info); background: rgba(102,126,234,0.05); }
.table-card.served { border-color: var(--success); background: rgba(63,185,80,0.08); }
.table-card.billed { border-color: #a78bfa; background: rgba(167,139,250,0.08); }
.table-card.selected { box-shadow: 0 0 0 2px var(--accent); }

.menu-selector { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.menu-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; font-size: 12px; }
.menu-btn.active { border-color: var(--accent); background: var(--accent-gradient); color: #fff; }
.rest-action-btn { padding: 10px 20px; border-radius: 8px; color: #fff; border: none; cursor: pointer; font-weight: 600; transition: opacity 0.2s; }
.rest-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.rest-log { margin-top: 16px; background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); font-size: 12px; color: var(--info); text-align: center; font-weight: 600; }
.sim-events { margin-top: 16px; max-height: 200px; overflow-y: auto; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-primary); padding: 12px; }
.sim-event { padding: 4px 0; font-size: 11px; color: var(--text-secondary); border-bottom: 1px solid var(--border-primary); }
.sim-event:last-child { border-bottom: none; }

/* ---------- Simulation scene ---------- */
.sim-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1px; background: var(--border-primary); border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.sim-hud-cell { background: var(--bg-primary); padding: 10px 12px; }
.sim-hud-cell dt { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 4px; font-weight: 700; }
.sim-hud-cell dd { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; line-height: 1.2; }
.sim-hud-cell dd.ok { color: var(--success); }
.sim-hud-cell dd.warn { color: var(--warning); }
.sim-hud-cell dd.bad { color: var(--danger); }
.sim-hud-cell dd.idle { color: var(--text-muted); font-weight: 600; }

.step-indicator { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.step-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border-primary); background: var(--bg-primary); color: var(--text-muted); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all var(--duration-normal, 0.25s) ease; }
.step-dot.done { border-color: var(--success); background: var(--success-bg); color: var(--success); }
.step-dot.active { border-color: var(--accent); background: var(--accent-gradient); color: #fff; transform: scale(1.15); }
.step-rule { flex: 0 0 14px; height: 2px; background: var(--border-primary); }
.step-rule.done { background: var(--success); }

.pass-lane { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0 4px; }
.pass-station { position: relative; border: 1px dashed var(--border-primary); border-radius: 8px; padding: 10px 6px; text-align: center; background: var(--bg-primary); transition: all var(--duration-normal, 0.25s) ease; }
.pass-station .ps-icon { font-size: 18px; opacity: 0.35; }
.pass-station .ps-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--text-muted); margin-top: 2px; }
.pass-station.reached { border-style: solid; border-color: var(--success); background: var(--success-bg); }
.pass-station.reached .ps-icon { opacity: 1; }
.pass-station.reached .ps-label { color: var(--success); }
.pass-station.current { border-color: var(--accent); background: var(--bg-tertiary); animation: passPulse 1.6s ease-in-out infinite; }
.pass-station.current .ps-icon { opacity: 1; }
.pass-station.current .ps-label { color: var(--accent); }
@keyframes passPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(102,126,234,0.35); } 50% { box-shadow: 0 0 0 6px rgba(102,126,234,0); } }

.race-panel { border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; margin-top: 14px; }
.race-head { background: var(--bg-tertiary); padding: 8px 12px; font-size: 11px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.04em; }
.race-row { display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-top: 1px solid var(--border-primary); background: var(--bg-primary); font-size: 11.5px; }
.race-badge { flex: 0 0 74px; text-align: center; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; letter-spacing: 0.05em; }
.race-badge.won { background: var(--success-bg); color: var(--success); }
.race-badge.lost { background: var(--danger-bg); color: var(--danger); }
.race-who { flex: 0 0 72px; font-weight: 700; color: var(--text-primary); }
.race-why { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.race-row.won-row { animation: raceWin 0.5s ease-out; }
@keyframes raceWin { from { background: var(--success-bg); } to { background: var(--bg-primary); } }

.sim-log-bad { color: var(--danger); }
.table-card.contended { animation: contend 0.7s ease-out 2; }
@keyframes contend { 0%, 100% { transform: none; } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }

@media (prefers-reduced-motion: reduce) {
  .pass-station.current, .race-row.won-row, .table-card.contended { animation: none; }
}
`;

function getTableEmoji(tableStatus, orderStatus) {
  if (!tableStatus || tableStatus === 'AVAILABLE') return '🪑';
  if (orderStatus === 'PLACED') return '👥';
  if (orderStatus === 'PREPARING') return '🍳';
  if (orderStatus === 'READY' || orderStatus === 'SERVED') return '🍽️';
  if (orderStatus === 'BILLED') return '💵';
  return '👥';
}

function getTableCssClass(tableStatus, orderStatus) {
  if (!tableStatus || tableStatus === 'AVAILABLE') return '';
  if (orderStatus === 'PREPARING') return 'preparing';
  if (orderStatus === 'READY' || orderStatus === 'SERVED') return 'served';
  if (orderStatus === 'BILLED') return 'billed';
  return 'occupied';
}

function getDisplayStatus(tableStatus, orderStatus) {
  if (!tableStatus || tableStatus === 'AVAILABLE') return 'AVAILABLE';
  if (orderStatus) return orderStatus;
  return tableStatus;
}

/* ============================================================
 *  App Tab — drives the live /api/restaurant/* endpoints
 * ============================================================ */
function AppTab() {
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('T1');
  const [selectedItems, setSelectedItems] = useState([]);
  const [partySize, setPartySize] = useState(2);
  const [log, setLog] = useState('Select a table to seat guests and place order.');

  const refresh = useCallback(async () => {
    try {
      const [t, m, o] = await Promise.all([api.getTables(), api.getMenu(), api.getOrders()]);
      setTables(t);
      setMenu(m);
      setOrders(o);
    } catch (err) {
      setLog(`❌ ${err.message}`);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll tables every 5s
  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Re-derives the table's active order from RestaurantTable.currentOrderId — the backend's
  // source of truth — rather than scanning order history by tableId. History keeps every past
  // order (including paid/BILLED ones) forever, so a tableId+status scan would keep matching a
  // table's last completed order even after payBill() released the table and cleared
  // currentOrderId, showing stale line items for a table that is actually AVAILABLE again.
  const getOrderForTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table?.currentOrderId) return undefined;
    return orders.find(o => o.id === table.currentOrderId);
  };

  const toggleMenuItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]
    );
  };

  const activeTable = tables.find(t => t.id === selectedTableId);
  const activeOrder = getOrderForTable(selectedTableId);

  const handleSeat = async () => {
    try {
      const capacity = activeTable?.capacity || 1;
      const size = Math.min(Math.max(1, partySize || 1), capacity);
      await api.seatGuests(selectedTableId, size);
      setLog(`👥 Party of ${size} seated at Table ${selectedTableId}.`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const handleOrder = async () => {
    if (selectedItems.length === 0) { setLog('⚠️ Select at least one menu item.'); return; }
    try {
      const lines = selectedItems.map(id => ({ menuItemId: id, quantity: 1 }));
      const order = await api.placeOrder(selectedTableId, 'Rahul', lines, null);
      setLog(`📝 Order ${order.id} placed for Table ${selectedTableId} (₹${order.subtotal}).`);
      setSelectedItems([]);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const handlePrepare = async () => {
    if (!activeOrder) return;
    try {
      await api.startPreparation(activeOrder.id);
      setLog(`🍳 Kitchen preparing order ${activeOrder.id}...`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const handleReady = async () => {
    if (!activeOrder) return;
    try {
      await api.markReady(activeOrder.id);
      setLog(`✅ Order ${activeOrder.id} is ready!`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const handleServe = async () => {
    if (!activeOrder) return;
    try {
      await api.markServed(activeOrder.id);
      setLog(`🍽️ Order ${activeOrder.id} served to Table ${selectedTableId}.`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const [billsByOrder, setBillsByOrder] = useState({});

  const handleBill = async () => {
    if (!activeOrder) return;
    try {
      const bill = await api.generateBill(activeOrder.id);
      setBillsByOrder(prev => ({ ...prev, [activeOrder.id]: bill }));
      setLog(`💵 Bill ${bill.id}: Subtotal ₹${bill.subtotal} | Tax ₹${bill.tax} | Service ₹${bill.serviceCharge} | Total ₹${bill.total} (${bill.strategyUsed})`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const handlePay = async () => {
    if (!activeOrder) return;
    try {
      const bill = billsByOrder[activeOrder.id];
      const billId = bill ? bill.id : `BILL-${activeOrder.id.replace('ORD-', '')}`;
      const payment = await api.payBill(billId, 'CARD');
      setLog(`💳 Payment ${payment.id}: ₹${payment.amount} via ${payment.method}. Table released!`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const handleCancel = async () => {
    if (!activeOrder) return;
    try {
      await api.cancelOrder(activeOrder.id);
      setLog(`❌ Order ${activeOrder.id} cancelled.`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  return (
    <div className="rest-container">
      <style>{CSS}</style>

      <div className="rest-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          RESTAURANT FLOOR PLAN & TABLE MANAGEMENT
        </div>
        <div className="table-grid">
          {tables.map(t => {
            const order = getOrderForTable(t.id);
            const orderStatus = order?.status;
            return (
              <div key={t.id}
                className={`table-card ${getTableCssClass(t.status, orderStatus)} ${selectedTableId === t.id ? 'selected' : ''}`}
                onClick={() => setSelectedTableId(t.id)}>
                <div style={{ fontSize: 24 }}>{getTableEmoji(t.status, orderStatus)}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Table {t.id} ({t.capacity} Seats)</div>
                <div style={{
                  fontSize: 11,
                  color: t.status === 'AVAILABLE' ? 'var(--text-muted)' : orderStatus === 'SERVED' ? 'var(--success)' : 'var(--warning)',
                  fontWeight: 600, marginTop: 2
                }}>
                  Status: {getDisplayStatus(t.status, orderStatus)}
                </div>
                {order && (
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.items?.map(i => i.name).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu Selection */}
      <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          Menu Items for Table {selectedTableId}:
        </div>
        <div className="menu-selector">
          {menu.filter(m => m.available).map(item => (
            <button key={item.id}
              className={`menu-btn ${selectedItems.includes(item.id) ? 'active' : ''}`}
              onClick={() => toggleMenuItem(item.id)}>
              {item.name} (₹{item.price})
            </button>
          ))}
        </div>
      </div>

      {/* Party size */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        <label htmlFor="rest-party-size" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Party size for Table {selectedTableId} (max {activeTable?.capacity ?? '—'}):
        </label>
        <input
          id="rest-party-size"
          type="number"
          min={1}
          max={activeTable?.capacity || 12}
          value={partySize}
          onChange={(e) => setPartySize(Math.max(1, Math.min(Number(e.target.value) || 1, activeTable?.capacity || 12)))}
          style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="rest-action-btn" onClick={handleSeat}
          disabled={activeTable?.status !== 'AVAILABLE'}
          style={{ background: 'var(--accent-gradient)' }}>
          👥 Seat Guests
        </button>
        <button className="rest-action-btn" onClick={handleOrder}
          disabled={activeTable?.status !== 'OCCUPIED' || activeOrder}
          style={{ background: 'var(--accent)' }}>
          📝 Place Order
        </button>
        <button className="rest-action-btn" onClick={handlePrepare}
          disabled={activeOrder?.status !== 'PLACED'}
          style={{ background: 'var(--info)' }}>
          🍳 Prepare
        </button>
        <button className="rest-action-btn" onClick={handleReady}
          disabled={activeOrder?.status !== 'PREPARING'}
          style={{ background: 'var(--success)' }}>
          ✅ Ready
        </button>
        <button className="rest-action-btn" onClick={handleServe}
          disabled={activeOrder?.status !== 'READY'}
          style={{ background: 'var(--success)' }}>
          🍽️ Serve
        </button>
        <button className="rest-action-btn" onClick={handleBill}
          disabled={activeOrder?.status !== 'SERVED'}
          style={{ background: '#a78bfa' }}>
          💵 Bill
        </button>
        <button className="rest-action-btn" onClick={handlePay}
          disabled={activeOrder?.status !== 'BILLED'}
          style={{ background: 'var(--warning)' }}>
          💳 Pay
        </button>
        <button className="rest-action-btn" onClick={handleCancel}
          disabled={!activeOrder || (activeOrder.status !== 'PLACED' && activeOrder.status !== 'PREPARING')}
          style={{ background: 'var(--danger)' }}>
          ❌ Cancel
        </button>
      </div>

      <div className="rest-log">{log}</div>
    </div>
  );
}

/* ============================================================
 *  Simulation Tab — drives /api/restaurant/sim/* only.
 *  Every number on screen came back from the backend; nothing
 *  here is faked in React state.
 * ============================================================ */

const PASS_STATIONS = [
  { key: 'PLACED', icon: '\uD83D\uDCDD', label: 'ORDERED' },
  { key: 'PREPARING', icon: '\uD83C\uDF73', label: 'KITCHEN' },
  { key: 'READY', icon: '\uD83D\uDD14', label: 'READY' },
  { key: 'SERVED', icon: '\uD83C\uDF7D\uFE0F', label: 'SERVED' },
];

const SIM_STEPS = [
  { label: 'Reset', detail: 'Reseed the sandbox — six tables, twelve menu items, empty ledger.' },
  { label: 'Race', detail: 'Five waiters call occupy("T1") at the same instant. The per-table lock lets exactly one through.' },
  { label: 'Order', detail: 'The winning waiter places an order. It is validated against the menu and priced by the backend.' },
  { label: 'Prepare', detail: 'Kitchen claims the ticket: PLACED to PREPARING through the transition table.' },
  { label: 'Ready', detail: 'Chef marks it READY. Any transition not in the table is refused.' },
  { label: 'Serve', detail: 'Waiter delivers: READY to SERVED. The order is now billable.' },
  { label: 'Refuse', detail: 'Try to cancel a SERVED order. The state machine rejects it with 409 — the failure path.' },
  { label: 'Bill & Pay', detail: 'Bill priced by the active BillingStrategy, then paid — which releases the table.' },
];

const TABLE_UNDER_RACE = 'T1';

function SimulationTab() {
  const [simTables, setSimTables] = useState([]);
  const [simOrders, setSimOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [race, setRace] = useState(null);
  const [bill, setBill] = useState(null);
  const [log, setLog] = useState('Sandbox ready. Step through the eight stages below.');
  const [logBad, setLogBad] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const refreshSim = useCallback(async () => {
    const [state, evts] = await Promise.all([api.simState(), api.simEvents()]);
    setSimTables(state.tables || []);
    setSimOrders(state.orders || []);
    setEvents(evts || []);
    return state;
  }, []);

  const say = (message, bad = false) => { setLog(message); setLogBad(bad); };

  // Steps look the order up from the sandbox rather than trusting React state.
  // If someone hits Reset mid-flow the order is gone, so fail with a sentence
  // instead of a TypeError from `undefined.id`.
  const findOrderBy = async (status) => {
    const state = await api.simState();
    const found = (state.orders || []).find(o => o.status === status);
    if (!found) {
      throw new Error(`No ${status} order in the sandbox — press Reset and start from step 1.`);
    }
    return found;
  };

  useEffect(() => {
    api.simReset().then(refreshSim).catch(err => say(`\u274C ${err.message}`, true));
  }, [refreshSim]);

  const activeOrder = simOrders.find(o => o.status !== 'CANCELLED' && o.status !== 'BILLED')
    || simOrders.find(o => o.status === 'BILLED');
  const racedTable = simTables.find(t => t.id === TABLE_UNDER_RACE);

  const resetAll = async () => {
    await api.simReset();
    setRace(null);
    setBill(null);
    setStep(0);
    say('\uD83D\uDD04 Sandbox reset. Six tables AVAILABLE, no orders.');
    await refreshSim();
  };

  const runStep = async () => {
    if (busy) return;
    setBusy(true);
    try {
      switch (step) {
        case 0:
          await resetAll();
          break;

        case 1: {
          const result = await api.simRace(TABLE_UNDER_RACE, 5, 2);
          setRace(result);
          say(`\uD83D\uDD10 ${result.attempts} waiters raced for ${result.tableId}: `
            + `${result.winner} won, ${result.rejected} were rejected by the lock.`);
          break;
        }

        case 2: {
          const order = await api.simOrder(TABLE_UNDER_RACE, race?.winner || 'Waiter-1', [
            { menuItemId: 'M-001', quantity: 2 },
            { menuItemId: 'M-004', quantity: 1 },
            { menuItemId: 'M-011', quantity: 2 },
          ], 'Extra spicy');
          say(`\uD83D\uDCDD Order ${order.id} placed \u2014 backend priced it at \u20B9${order.subtotal}.`);
          break;
        }

        case 3: {
          const target = await findOrderBy('PLACED');
          const order = await api.simPrepare(target.id);
          say(`\uD83C\uDF73 ${order.id}: PLACED \u2192 PREPARING.`);
          break;
        }

        case 4: {
          const target = await findOrderBy('PREPARING');
          const order = await api.simReady(target.id);
          say(`\uD83D\uDD14 ${order.id} is READY. Allowed next: ${['SERVED'].join(', ')}.`);
          break;
        }

        case 5: {
          const target = await findOrderBy('READY');
          const order = await api.simServe(target.id);
          say(`\uD83C\uDF7D\uFE0F ${order.id} served. It can now be billed.`);
          break;
        }

        case 6: {
          const target = await findOrderBy('SERVED');
          try {
            await api.simCancel(target.id);
            say(`\u26A0\uFE0F Expected the cancel to be refused, but it succeeded.`, true);
          } catch (err) {
            // The rejection is the point of this step, not an error in the demo.
            say(`\uD83D\uDEAB Refused as designed \u2014 ${err.message}`, true);
          }
          break;
        }

        case 7: {
          const target = await findOrderBy('SERVED');
          const generated = await api.simBill(target.id);
          setBill(generated);
          const payment = await api.simPay(generated.id, 'CARD');
          say(`\uD83D\uDCB3 ${generated.id} priced by ${generated.strategyUsed}: `
            + `\u20B9${generated.subtotal} \u2212 \u20B9${generated.discount} + tax \u20B9${generated.tax} `
            + `+ service \u20B9${generated.serviceCharge} = \u20B9${generated.total}. `
            + `Paid via ${payment.method}; ${TABLE_UNDER_RACE} released.`);
          break;
        }

        default:
          break;
      }

      if (step > 0) await refreshSim();
      setStep(s => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      say(`\u274C ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  };

  const done = step >= SIM_STEPS.length;
  const orderStatus = activeOrder?.status;
  const reachedIndex = orderStatus === 'BILLED'
    ? PASS_STATIONS.length - 1
    : PASS_STATIONS.findIndex(st => st.key === orderStatus);

  return (
    <div className="rest-container">
      <style>{CSS}</style>

      <div className="step-indicator">
        {SIM_STEPS.map((s, i) => (
          <Fragment key={s.label}>
            {i > 0 && <span className={`step-rule ${i <= step ? 'done' : ''}`} />}
            <span
              className={`step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
              title={`${s.label} — ${s.detail}`}
            >
              {i < step ? '\u2713' : i + 1}
            </span>
          </Fragment>
        ))}
      </div>

      {/* Telemetry — every value here came from the sandbox API */}
      <dl className="sim-hud">
        <div className="sim-hud-cell">
          <dt>Table {TABLE_UNDER_RACE}</dt>
          <dd className={racedTable?.status === 'AVAILABLE' ? 'ok' : 'warn'}>
            {racedTable?.status || '—'}
          </dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Lock winner</dt>
          <dd className={race ? 'ok' : 'idle'}>{race?.winner || 'not run'}</dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Rejected</dt>
          <dd className={race && race.rejected > 0 ? 'bad' : 'idle'}>
            {race ? race.rejected : '—'}
          </dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Active order</dt>
          <dd className={activeOrder ? '' : 'idle'}>{activeOrder?.id || 'none'}</dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Order status</dt>
          <dd className={orderStatus ? 'warn' : 'idle'}>{orderStatus || '—'}</dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Subtotal</dt>
          <dd className={activeOrder ? '' : 'idle'}>
            {activeOrder ? `\u20B9${activeOrder.subtotal}` : '—'}
          </dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Strategy</dt>
          <dd className={bill ? 'ok' : 'idle'}>{bill?.strategyUsed || '—'}</dd>
        </div>
        <div className="sim-hud-cell">
          <dt>Total billed</dt>
          <dd className={bill ? 'ok' : 'idle'}>{bill ? `\u20B9${bill.total}` : '—'}</dd>
        </div>
      </dl>

      {/* Floor plan */}
      <div className="rest-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          SANDBOX FLOOR PLAN
        </div>
        <div className="table-grid">
          {simTables.map(t => {
            const order = simOrders.find(o => o.tableId === t.id && o.status !== 'CANCELLED');
            const status = t.status === 'AVAILABLE' ? undefined : order?.status;
            return (
              <div
                key={t.id}
                className={`table-card ${getTableCssClass(t.status, status)} `
                  + `${step === 2 && t.id === TABLE_UNDER_RACE ? 'contended' : ''}`}
                style={{ cursor: 'default' }}
              >
                <div style={{ fontSize: 24 }}>{getTableEmoji(t.status, status)}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                  Table {t.id} ({t.capacity} Seats)
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, marginTop: 2,
                  color: t.status === 'AVAILABLE' ? 'var(--text-muted)' : 'var(--warning)',
                }}>
                  {getDisplayStatus(t.status, status)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Kitchen pass — the order ticket's journey through the state machine */}
        <div className="pass-lane">
          {PASS_STATIONS.map((st, i) => (
            <div
              key={st.key}
              className={`pass-station ${reachedIndex > i ? 'reached' : ''} ${reachedIndex === i ? 'current' : ''}`}
            >
              <div className="ps-icon">{st.icon}</div>
              <div className="ps-label">{st.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          KITCHEN PASS — OrderStatus transitions, enforced server-side
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
        <button className="rest-action-btn" onClick={resetAll} disabled={busy}
          style={{ background: 'var(--danger)' }}>
          \uD83D\uDD04 Reset
        </button>
        <button className="rest-action-btn" onClick={runStep} disabled={busy || done}
          style={{ background: 'var(--accent-gradient)' }}>
          {done
            ? '\u2713 Simulation complete'
            : `\u25B6 Step ${step + 1} of ${SIM_STEPS.length}: ${SIM_STEPS[step].label}`}
        </button>
      </div>

      {!done && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, maxWidth: 620, marginInline: 'auto' }}>
          {SIM_STEPS[step].detail}
        </div>
      )}

      <div className={`rest-log ${logBad ? 'sim-log-bad' : ''}`}>{log}</div>

      {/* Contention detail — who took the lock and who was turned away */}
      {race && (
        <div className="race-panel">
          <div className="race-head">
            CONTENTION ON {race.tableId} — {race.attempts} concurrent occupy() calls, one lock
          </div>
          {race.results.map(r => (
            <div key={r.waiter} className={`race-row ${r.outcome === 'WON' ? 'won-row' : ''}`}>
              <span className={`race-badge ${r.outcome === 'WON' ? 'won' : 'lost'}`}>
                {r.outcome}
              </span>
              <span className="race-who">{r.waiter}</span>
              <span className="race-why">{r.reason}</span>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="sim-events">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Event Log ({events.length})
          </div>
          {events.map(e => (
            <div key={e.id} className="sim-event">
              <span style={{ color: e.type === 'REJECTED' ? 'var(--danger)' : 'var(--accent)', fontWeight: 600 }}>
                [{e.type}]
              </span>{' '}
              <span style={{ color: 'var(--text-muted)' }}>{e.actor}:</span>{' '}
              {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RestaurantPage() {
  return (
    <LldPage module="restaurant" title="Restaurant Management" icon="🍽️" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
