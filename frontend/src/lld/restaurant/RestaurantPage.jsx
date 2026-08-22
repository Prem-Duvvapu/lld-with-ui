import { useState, useEffect, useCallback } from 'react';
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

  const getOrderForTable = (tableId) =>
    orders.find(o => o.tableId === tableId && o.status !== 'CANCELLED');

  const toggleMenuItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]
    );
  };

  const activeTable = tables.find(t => t.id === selectedTableId);
  const activeOrder = getOrderForTable(selectedTableId);

  const handleSeat = async () => {
    try {
      await api.seatGuests(selectedTableId, activeTable?.capacity || 2);
      setLog(`👥 Guests seated at Table ${selectedTableId}.`);
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

  const handleBill = async () => {
    if (!activeOrder) return;
    try {
      const bill = await api.generateBill(activeOrder.id);
      setLog(`💵 Bill ${bill.id}: Subtotal ₹${bill.subtotal} | Tax ₹${bill.tax} | Service ₹${bill.serviceCharge} | Total ₹${bill.total} (${bill.strategyUsed})`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const handlePay = async () => {
    if (!activeOrder) return;
    try {
      const bills = orders.filter(o => o.id === activeOrder.id);
      // Find the bill for this order by fetching order details
      const orderDetail = await api.getOrder(activeOrder.id);
      // Try to pay using the bill endpoint — we need the bill id
      // We'll look it up from the table state
      const allOrders = await api.getOrders();
      const currentOrder = allOrders.find(o => o.id === activeOrder.id);
      // The bill would have been generated, so try paying
      const payment = await api.payBill(`BILL-${activeOrder.id.replace('ORD-', '')}`, 'CARD');
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
          style={{ background: '#10b981' }}>
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
          style={{ background: '#f59e0b' }}>
          💳 Pay
        </button>
        <button className="rest-action-btn" onClick={handleCancel}
          disabled={!activeOrder || (activeOrder.status !== 'PLACED' && activeOrder.status !== 'PREPARING')}
          style={{ background: 'var(--danger, #ef4444)' }}>
          ❌ Cancel
        </button>
      </div>

      <div className="rest-log">{log}</div>
    </div>
  );
}

/* ============================================================
 *  Simulation Tab — drives /api/restaurant/sim/* only
 * ============================================================ */
function SimulationTab() {
  const [simTables, setSimTables] = useState([]);
  const [simOrders, setSimOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [log, setLog] = useState('Simulation sandbox. Click Reset to begin.');
  const [step, setStep] = useState(0);

  const refreshSim = useCallback(async () => {
    try {
      const [state, evts] = await Promise.all([api.simState(), api.simEvents()]);
      setSimTables(state.tables || []);
      setSimOrders(state.orders || []);
      setEvents(evts || []);
    } catch (err) {
      setLog(`❌ ${err.message}`);
    }
  }, []);

  useEffect(() => {
    api.simReset().then(refreshSim).catch(err => setLog(`❌ ${err.message}`));
  }, [refreshSim]);

  const runStep = async () => {
    try {
      switch (step) {
        case 0: {
          await api.simReset();
          setLog('🔄 Sandbox reset. Ready to begin.');
          break;
        }
        case 1: {
          await api.simSeat('T1', 2);
          setLog('👥 Step 1: Seated party of 2 at Table T1.');
          break;
        }
        case 2: {
          const order = await api.simOrder('T1', 'Rahul', [
            { menuItemId: 'M-001', quantity: 2 },
            { menuItemId: 'M-004', quantity: 1 }
          ], 'Extra spicy');
          setLog(`📝 Step 2: Order ${order.id} placed (₹${order.subtotal}).`);
          break;
        }
        case 3: {
          const orders = (await api.simState()).orders || [];
          const active = orders.find(o => o.status === 'PLACED');
          if (active) {
            await api.simPrepare(active.id);
            setLog(`🍳 Step 3: Kitchen preparing ${active.id}.`);
          }
          break;
        }
        case 4: {
          const orders = (await api.simState()).orders || [];
          const active = orders.find(o => o.status === 'PREPARING');
          if (active) {
            await api.simReady(active.id);
            setLog(`✅ Step 4: ${active.id} is ready for pickup.`);
          }
          break;
        }
        case 5: {
          const orders = (await api.simState()).orders || [];
          const active = orders.find(o => o.status === 'READY');
          if (active) {
            await api.simServe(active.id);
            setLog(`🍽️ Step 5: ${active.id} served to table.`);
          }
          break;
        }
        case 6: {
          const orders = (await api.simState()).orders || [];
          const active = orders.find(o => o.status === 'SERVED');
          if (active) {
            const bill = await api.simBill(active.id);
            setLog(`💵 Step 6: Bill ${bill.id} — Total ₹${bill.total} (${bill.strategyUsed}).`);
          }
          break;
        }
        case 7: {
          const state = await api.simState();
          const unpaid = (state.bills || []).find(b => !b.paid);
          if (unpaid) {
            const payment = await api.simPay(unpaid.id, 'CARD');
            setLog(`💳 Step 7: Paid ₹${payment.amount} via ${payment.method}. Table released! ✨`);
          }
          break;
        }
        default:
          setLog('🎉 Simulation complete! Click Reset to start over.');
          setStep(0);
          await refreshSim();
          return;
      }
      setStep(s => s + 1);
      await refreshSim();
    } catch (err) {
      setLog(`❌ ${err.message}`);
    }
  };

  const handleReset = async () => {
    try {
      await api.simReset();
      setStep(0);
      setLog('🔄 Sandbox reset. Ready to begin.');
      await refreshSim();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  return (
    <div className="rest-container">
      <style>{CSS}</style>

      <div className="rest-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          🕹️ INTERACTIVE RESTAURANT SIMULATION
        </div>
        <div className="table-grid">
          {simTables.map(t => {
            const order = simOrders.find(o => o.tableId === t.id && o.status !== 'CANCELLED');
            const orderStatus = order?.status;
            return (
              <div key={t.id} className={`table-card ${getTableCssClass(t.status, orderStatus)}`}>
                <div style={{ fontSize: 24 }}>{getTableEmoji(t.status, orderStatus)}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Table {t.id} ({t.capacity} Seats)</div>
                <div style={{
                  fontSize: 11,
                  color: t.status === 'AVAILABLE' ? 'var(--text-muted)' : 'var(--warning)',
                  fontWeight: 600, marginTop: 2
                }}>
                  {getDisplayStatus(t.status, orderStatus)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
        <button className="rest-action-btn" onClick={handleReset} style={{ background: 'var(--danger, #ef4444)' }}>
          🔄 Reset
        </button>
        <button className="rest-action-btn" onClick={runStep} style={{ background: 'var(--accent-gradient)' }}>
          ▶️ Step {step + 1}: {['Reset', 'Seat', 'Order', 'Prepare', 'Ready', 'Serve', 'Bill', 'Pay', 'Done'][step] || 'Done'}
        </button>
      </div>

      <div className="rest-log">{log}</div>

      {events.length > 0 && (
        <div className="sim-events">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Event Log ({events.length})</div>
          {events.map(e => (
            <div key={e.id} className="sim-event">
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[{e.type}]</span>{' '}
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
