import { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import {
  getStocks,
  getOrderBookDepth,
  getAccount,
  getAccountOrders,
  getRecentQuotes,
  placeOrder,
  cancelOrder,
  simReset,
  simPlaceOrder,
  simCancelOrder,
} from './api';
import { usePolling } from '../../hooks/usePolling';
import './StockBrokeragePage.css';

const ACCOUNTS = [
  { id: 'ACC-user-alice', label: 'Alice Vance' },
  { id: 'ACC-user-bob', label: 'Bob Smith' },
];

/* ============================= TAB 1: LIVE TRADING CONSOLE ============================= */

function AppTab() {
  const [stocks, setStocks] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('INFY');
  const [accountId, setAccountId] = useState('ACC-user-alice');
  const [account, setAccount] = useState(null);
  const [orders, setOrders] = useState([]);
  const [depth, setDepth] = useState({ bids: [], asks: [], spread: 0 });
  const [quotes, setQuotes] = useState([]);
  const [banner, setBanner] = useState(null);

  const [side, setSide] = useState('BUY');
  const [type, setType] = useState('LIMIT');
  const [price, setPrice] = useState('1500');
  const [qty, setQty] = useState('10');

  const showBanner = (text, kind = 'info') => {
    setBanner({ text, kind });
    setTimeout(() => setBanner(null), 4000);
  };

  const refresh = async () => {
    try {
      const [d, acc, ord, q] = await Promise.all([
        getOrderBookDepth(selectedSymbol),
        getAccount(accountId),
        getAccountOrders(accountId),
        getRecentQuotes(),
      ]);
      setDepth(d || { bids: [], asks: [], spread: 0 });
      setAccount(acc);
      setOrders(ord || []);
      setQuotes(q || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getStocks().then((list) => {
      setStocks(list || []);
      if (list && list.length && !list.find((s) => s.symbol === selectedSymbol)) {
        setSelectedSymbol(list[0].symbol);
      }
    }).catch((err) => showBanner(`Failed to reach backend on port 9190: ${err.message}`, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  usePolling(refresh, 4000, [selectedSymbol, accountId]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const q = parseInt(qty, 10);
    const p = parseFloat(price);
    if (!Number.isInteger(q) || q <= 0) return showBanner('Quantity must be a positive integer', 'error');
    if (type === 'LIMIT' && (!(p > 0))) return showBanner('Limit price must be positive', 'error');

    try {
      const order = await placeOrder({
        accountId, symbol: selectedSymbol, side, type,
        price: type === 'LIMIT' ? p : 0.0, quantity: q,
      });
      showBanner(`Order ${order.orderId} — ${order.status} (${order.filledQuantity}/${order.totalQuantity} filled)`, 'success');
      refresh();
      getStocks().then(setStocks);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await cancelOrder(orderId);
      showBanner(`Order ${orderId} cancelled — reservation released.`, 'info');
      refresh();
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  return (
    <div className="sb-page">
      <div className="sb-ticker">
        <span className="sb-ticker-label">Live Quotes</span>
        {stocks.map((s) => (
          <div
            key={s.symbol}
            className={`sb-ticker-chip ${selectedSymbol === s.symbol ? 'active' : ''}`}
            onClick={() => { setSelectedSymbol(s.symbol); setPrice(String(s.currentPrice)); }}
          >
            <span>{s.symbol}</span>
            <span className="price">₹{s.currentPrice?.toFixed(2)}</span>
          </div>
        ))}
        <select className="sb-account-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}
          style={{ marginLeft: 'auto', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
          {ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>

      {banner && <div className={`sb-banner ${banner.kind}`}>{banner.text}</div>}

      <div className="sb-grid">
        {/* Order Placement */}
        <div className="sb-card">
          <h3>Place Order — {selectedSymbol}</h3>
          <form onSubmit={handlePlaceOrder}>
            <div className="sb-toggle-row">
              <button type="button" className={`sb-toggle-btn buy ${side === 'BUY' ? 'active' : ''}`} onClick={() => setSide('BUY')}>BUY</button>
              <button type="button" className={`sb-toggle-btn sell ${side === 'SELL' ? 'active' : ''}`} onClick={() => setSide('SELL')}>SELL</button>
            </div>
            <div className="sb-toggle-row">
              <button type="button" className={`sb-toggle-btn type ${type === 'LIMIT' ? 'active' : ''}`} onClick={() => setType('LIMIT')}>LIMIT</button>
              <button type="button" className={`sb-toggle-btn type ${type === 'MARKET' ? 'active' : ''}`} onClick={() => setType('MARKET')}>MARKET</button>
            </div>
            {type === 'LIMIT' && (
              <div className="sb-field">
                <label>Limit Price (₹)</label>
                <input type="number" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
            )}
            <div className="sb-field">
              <label>Quantity</label>
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </div>
            <div className="sb-estimate">
              <span>Estimated Total</span>
              <strong>₹{((type === 'LIMIT' ? parseFloat(price || 0) : (stocks.find(s => s.symbol === selectedSymbol)?.currentPrice || 0)) * parseInt(qty || 0, 10)).toFixed(2)}</strong>
            </div>
            <button type="submit" className={`sb-submit-btn ${side.toLowerCase()}`}>Submit {side} {type}</button>
          </form>
        </div>

        {/* Order Book Depth */}
        <div className="sb-card">
          <div className="sb-depth-header">
            <h3 style={{ margin: 0 }}>Order Book — {selectedSymbol}</h3>
            <span>Spread: <span className="sb-spread">₹{depth.spread?.toFixed(2)}</span></span>
          </div>
          <div className="sb-depth-cols">
            <div>
              <div className="sb-depth-col-header bid"><span>Qty (cum)</span><span>Bid</span></div>
              {(!depth.bids || depth.bids.length === 0) ? <div className="sb-depth-empty">No bids</div> :
                depth.bids.map((b, i) => (
                  <div key={i} className="sb-depth-row bid"><span>{b.quantity} ({b.cumulative})</span><span>₹{b.price?.toFixed(2)}</span></div>
                ))}
            </div>
            <div>
              <div className="sb-depth-col-header ask"><span>Ask</span><span>Qty (cum)</span></div>
              {(!depth.asks || depth.asks.length === 0) ? <div className="sb-depth-empty">No asks</div> :
                depth.asks.map((a, i) => (
                  <div key={i} className="sb-depth-row ask"><span>₹{a.price?.toFixed(2)}</span><span>{a.quantity} ({a.cumulative})</span></div>
                ))}
            </div>
          </div>
          <h3 style={{ marginTop: 18 }}>Recent Quotes</h3>
          <div className="sb-scroll" style={{ maxHeight: 140 }}>
            {quotes.slice(0, 8).map((q, i) => (
              <div key={i} className="sb-order-row">
                <span>{q.symbol}</span>
                <span style={{ color: q.changePercent >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  ₹{q.newPrice?.toFixed(2)} ({q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio & Orders */}
        <div className="sb-card">
          <h3>Account — {account?.accountId}</h3>
          <div className="sb-balance-grid">
            <div className="sb-balance-tile"><div className="l">Cash</div><div className="v cash">₹{account?.cashBalance?.toFixed(0)}</div></div>
            <div className="sb-balance-tile"><div className="l">Reserved</div><div className="v reserved">₹{account?.reservedBalance?.toFixed(0)}</div></div>
            <div className="sb-balance-tile"><div className="l">Available</div><div className="v available">₹{account?.availableBalance?.toFixed(0)}</div></div>
          </div>
          <table className="sb-table">
            <thead><tr><th>Sym</th><th>Qty</th><th>Resvd</th><th>Avail</th><th>Avg ₹</th></tr></thead>
            <tbody>
              {account?.portfolio?.allHoldings?.map((h) => (
                <tr key={h.symbol}>
                  <td>{h.symbol}</td><td>{h.quantity}</td><td>{h.reservedQuantity}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 700 }}>{h.availableQuantity}</td>
                  <td>{h.avgBuyPrice?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: 18 }}>Recent Orders</h3>
          <div className="sb-scroll">
            {orders.map((o) => (
              <div key={o.orderId} className="sb-order-row">
                <div>
                  <span className={`sb-order-side ${o.side}`}>{o.side} {o.type}</span>
                  <div>{o.symbol} · {o.filledQuantity}/{o.totalQuantity} @ {o.limitPrice ? `₹${o.limitPrice}` : 'MKT'}</div>
                  <div className="sb-order-meta">Status: {o.status} · {o.orderId}</div>
                </div>
                {(o.status === 'PENDING' || o.status === 'PARTIALLY_FILLED') && (
                  <button className="sb-cancel-btn" onClick={() => handleCancel(o.orderId)}>Cancel</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================= TAB 2: 8-STEP SIMULATION ============================= */

const SIM_STEPS = [
  'Reset sandbox',
  'View seeded accounts & INFY order book ladder',
  'Rest a LIMIT order in the book',
  'Sweep the book with a MARKET order',
  'Self-trade prevention (blocked)',
  'Fund-reservation race (blocked)',
  'Cancel a resting order',
  'Review telemetry & event log',
];

function SimulationTab() {
  const [snapshot, setSnapshot] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [restSide, setRestSide] = useState('BUY');
  const [restPrice, setRestPrice] = useState('1498');
  const [restQty, setRestQty] = useState('15');
  const [restAccount, setRestAccount] = useState('SIM-ACC-BETA');
  const [cancelOrderId, setCancelOrderId] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const events = snapshot?.events || [];
  const accounts = snapshot?.accounts || [];
  const infyBook = snapshot?.orderBooks?.INFY || { bids: [], asks: [], spread: 0 };
  const stocks = snapshot?.stocks || [];
  const infyStock = stocks.find((s) => s.symbol === 'INFY');
  const pendingOrders = (snapshot?.orders || []).filter((o) => o.status === 'PENDING' || o.status === 'PARTIALLY_FILLED');
  const selfTradeBlocks = events.filter((e) => (e.description || '').includes('Self-trade')).length;

  const applyResult = (result, advanceHint) => {
    if (!mountedRef.current) return;
    setSnapshot(result);
    if (advanceHint != null) setStep((s) => Math.min(SIM_STEPS.length - 1, Math.max(s, advanceHint)));
  };

  const withBusy = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.message || 'Simulation step failed'); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  const doReset = () => withBusy(async () => {
    const result = await simReset();
    applyResult(result, 1);
  });

  const doContinueToRest = () => setStep(2);

  const doRestOrder = () => withBusy(async () => {
    const result = await simPlaceOrder({
      accountId: restAccount, symbol: 'INFY', side: restSide, type: 'LIMIT',
      price: parseFloat(restPrice), quantity: parseInt(restQty, 10),
    });
    applyResult(result, 3);
  });

  const doMarketSweep = () => withBusy(async () => {
    const result = await simPlaceOrder({ accountId: 'SIM-ACC-BETA', symbol: 'INFY', side: 'SELL', type: 'MARKET', price: 0, quantity: 15 });
    applyResult(result, 4);
  });

  const doSelfTrade = () => withBusy(async () => {
    // Alpha rests a fresh SELL, then Alpha immediately tries to BUY across her own spread —
    // the top-of-book self-trade guard in OrderExecutionStrategy rejects the second order.
    await simPlaceOrder({ accountId: 'SIM-ACC-ALPHA', symbol: 'INFY', side: 'SELL', type: 'LIMIT', price: 1550, quantity: 10 });
    const result = await simPlaceOrder({ accountId: 'SIM-ACC-ALPHA', symbol: 'INFY', side: 'BUY', type: 'LIMIT', price: 1550, quantity: 10 });
    applyResult(result, 5);
  });

  const doOverBudget = () => withBusy(async () => {
    const result = await simPlaceOrder({ accountId: 'SIM-ACC-BETA', symbol: 'INFY', side: 'BUY', type: 'LIMIT', price: 2000, quantity: 5000 });
    applyResult(result, 6);
  });

  const doCancel = () => withBusy(async () => {
    if (!cancelOrderId) { setError('Pick a resting order to cancel first.'); return; }
    const result = await simCancelOrder(cancelOrderId);
    applyResult(result, 7);
  });

  const reset = () => { setSnapshot(null); setStep(0); setError(''); };
  const finalStep = () => setStep(7);

  return (
    <div>
      <div className="sb-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`sb-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span className="sb-step-label">{SIM_STEPS[step]}</span>
      </div>

      {error && <div className="sb-banner error" style={{ maxWidth: 600, margin: '0 auto 12px' }}>{error}</div>}

      {!snapshot ? (
        <div className="sb-sim-intro">
          <p>
            Runs entirely against the isolated <code>/api/stockbroker/sim/*</code> sandbox — its own
            stocks, accounts and order books, seeded with a 4-level INFY bid/ask ladder — so nothing
            here can ever touch the live trading console's data.
          </p>
          <div className="sb-sim-actions">
            <button className="sb-btn-trigger" onClick={doReset} disabled={busy}>▶ Reset Sandbox</button>
          </div>
        </div>
      ) : (
        <>
          <div className="sb-hud">
            <div className="sb-hud-tile"><div className="v">₹{infyStock?.currentPrice?.toFixed(2) ?? '—'}</div><div className="l">INFY Price</div></div>
            <div className="sb-hud-tile"><div className="v">₹{infyBook.spread?.toFixed(2) ?? '—'}</div><div className="l">Bid/Ask Spread</div></div>
            <div className="sb-hud-tile"><div className="v">{pendingOrders.length}</div><div className="l">Resting Orders</div></div>
            <div className="sb-hud-tile"><div className="v">{selfTradeBlocks}</div><div className="l">Self-Trade Blocks</div></div>
            <div className="sb-hud-tile"><div className="v">{events.length}</div><div className="l">Events Logged</div></div>
          </div>

          <div className="sb-sim-grid">
            <div className="sb-card">
              <h3>Seeded Accounts</h3>
              {accounts.map((a) => (
                <div key={a.accountId} className="sb-account-row">
                  <span>{a.accountId}</span>
                  <strong>Avail ₹{a.availableBalance?.toFixed(0)}</strong>
                </div>
              ))}
            </div>
            <div className="sb-card">
              <h3>INFY Order Book Ladder</h3>
              {infyBook.asks?.slice().reverse().map((a, i) => (
                <div key={`a${i}`} className="sb-ladder-row ask"><span>ASK ₹{a.price?.toFixed(2)}</span><span>{a.quantity} sh</span></div>
              ))}
              <div className="sb-ladder-mid">— LAST ₹{infyStock?.currentPrice?.toFixed(2) ?? '—'} —</div>
              {infyBook.bids?.map((b, i) => (
                <div key={`b${i}`} className="sb-ladder-row bid"><span>BID ₹{b.price?.toFixed(2)}</span><span>{b.quantity} sh</span></div>
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="sb-sim-actions">
              <span className="sb-sim-hint">2 traders (Alpha, Beta) and a 4-level INFY ladder are seeded above — resting bids from Beta, resting asks from Alpha.</span>
              <button className="sb-btn-trigger" onClick={doContinueToRest} disabled={busy}>Continue →</button>
            </div>
          )}

          {step === 2 && (
            <div className="sb-sim-actions">
              <select value={restAccount} onChange={(e) => setRestAccount(e.target.value)}>
                <option value="SIM-ACC-ALPHA">Alpha</option>
                <option value="SIM-ACC-BETA">Beta</option>
              </select>
              <select value={restSide} onChange={(e) => setRestSide(e.target.value)}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
              <input type="number" value={restPrice} onChange={(e) => setRestPrice(e.target.value)} placeholder="Limit price" />
              <input type="number" value={restQty} onChange={(e) => setRestQty(e.target.value)} placeholder="Qty" />
              <button className="sb-btn-trigger" onClick={doRestOrder} disabled={busy}>Place Resting Order</button>
            </div>
          )}

          {step === 3 && (
            <div className="sb-sim-actions">
              <span className="sb-sim-hint">Beta submits a MARKET SELL for 15 shares — walks the resting bid levels immediately instead of resting.</span>
              <button className="sb-btn-trigger" onClick={doMarketSweep} disabled={busy}>Trigger Market Sweep</button>
            </div>
          )}

          {step === 4 && (
            <div className="sb-sim-actions">
              <span className="sb-sim-hint">Alpha rests a SELL at ₹1550, then Alpha tries to BUY across her own spread at ₹1550 — the top-of-book self-trade guard must reject it.</span>
              <button className="sb-btn-trigger" onClick={doSelfTrade} disabled={busy}>Attempt Self-Trade</button>
            </div>
          )}

          {step === 5 && (
            <div className="sb-sim-actions">
              <span className="sb-sim-hint">Beta tries to BUY 5,000 shares @ ₹2,000 — far beyond her available cash.</span>
              <button className="sb-btn-trigger danger" onClick={doOverBudget} disabled={busy}>Attempt Over-Budget Order</button>
            </div>
          )}

          {step === 6 && (
            <div className="sb-sim-actions">
              <select value={cancelOrderId} onChange={(e) => setCancelOrderId(e.target.value)}>
                <option value="">— pick a resting order —</option>
                {pendingOrders.map((o) => (
                  <option key={o.orderId} value={o.orderId}>{o.orderId} · {o.accountId} · {o.side} {o.remainingQuantity}@₹{o.limitPrice}</option>
                ))}
              </select>
              <button className="sb-btn-trigger" onClick={doCancel} disabled={busy}>Cancel Order</button>
            </div>
          )}

          {step === 7 && (
            <div className="sb-final-note">✓ Walkthrough complete — inspect the full event log below.</div>
          )}

          <div className="sb-card">
            <h3>Event Log</h3>
            <div className="sb-timeline sb-scroll">
              {events.slice().reverse().slice(0, 30).map((ev) => (
                <div key={ev.id} className={`sb-timeline-item ${(ev.type || '').toLowerCase().includes('reject') || (ev.type || '').toLowerCase().includes('fail') ? 'rejected' : ''}`}>
                  <div className="row1"><span className="type">{ev.type}</span><span>{ev.timestamp}</span></div>
                  <div className="desc">{ev.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sb-sim-actions">
            {step >= 6 && step < 7 && <button className="sb-btn-trigger" onClick={finalStep} disabled={busy}>Review Telemetry →</button>}
            <button className="sb-btn-trigger ghost" onClick={doReset} disabled={busy}>↺ Reset</button>
            <button className="sb-btn-trigger danger" onClick={reset} disabled={busy}>Exit Sandbox</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function StockBrokeragePage() {
  return (
    <LldPage module="stockbroker" title="Stock Brokerage Platform" icon="📈" tabs={['app', 'simulation', 'diagram', 'sequence', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'app' && <AppTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
