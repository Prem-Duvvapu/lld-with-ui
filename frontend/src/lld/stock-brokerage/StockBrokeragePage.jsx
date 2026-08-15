import React, { useState, useEffect } from 'react';
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
  simGetSnapshots,
  simGetEvents,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import ThemeToggle from '../../components/ThemeToggle';

export default function StockBrokeragePage() {
  const [activeTab, setActiveTab] = useState('trade');

  // Real Market & Account State
  const [stocks, setStocks] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('INFY');
  const [currentAccountId, setCurrentAccountId] = useState('ACC-user-alice');
  const [account, setAccount] = useState(null);
  const [accountOrders, setAccountOrders] = useState([]);
  const [orderBookDepth, setOrderBookDepth] = useState({ bids: [], asks: [], spread: 0 });
  const [recentQuotes, setRecentQuotes] = useState([]);

  // Order Placement Form
  const [orderSide, setOrderSide] = useState('BUY');
  const [orderType, setOrderType] = useState('LIMIT');
  const [orderPrice, setOrderPrice] = useState('1500');
  const [orderQty, setOrderQty] = useState('10');

  // Simulation State
  const [simSnapshots, setSimSnapshots] = useState(null);
  const [simEvents, setSimEvents] = useState([]);
  const [simAccountId, setSimAccountId] = useState('SIM-ACC-ALPHA');
  const [simSymbol, setSimSymbol] = useState('INFY');
  const [simSide, setSimSide] = useState('BUY');
  const [simType, setSimType] = useState('MARKET');
  const [simPrice, setSimPrice] = useState('1500');
  const [simQty, setSimQty] = useState('15');
  const [simLoading, setSimLoading] = useState(false);

  // Status Banner
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'info' });

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(() => {
      refreshMarketData();
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedSymbol, currentAccountId]);

  const showBanner = (text, type = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: 'info' }), 4000);
  };

  const loadInitialData = async () => {
    try {
      const stockList = await getStocks();
      if (Array.isArray(stockList) && stockList.length > 0) {
        setStocks(stockList);
        setSelectedSymbol(stockList[0].symbol);
        setOrderPrice(stockList[0].currentPrice.toString());
      }
      refreshMarketData();
    } catch (err) {
      console.error(err);
      showBanner('Failed to connect to backend on port 9090.', 'error');
    }
  };

  const refreshMarketData = async () => {
    try {
      if (selectedSymbol) {
        const depth = await getOrderBookDepth(selectedSymbol);
        setOrderBookDepth(depth || { bids: [], asks: [], spread: 0 });
      }
      if (currentAccountId) {
        const acc = await getAccount(currentAccountId);
        setAccount(acc);
        const orders = await getAccountOrders(currentAccountId);
        setAccountOrders(orders || []);
      }
      const quotes = await getRecentQuotes();
      setRecentQuotes(quotes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      const p = parseFloat(orderPrice);
      const q = parseInt(orderQty, 10);
      if (isNaN(q) || q <= 0) {
        showBanner('Quantity must be a positive integer', 'error');
        return;
      }
      if (orderType === 'LIMIT' && (isNaN(p) || p <= 0)) {
        showBanner('Price must be positive for Limit orders', 'error');
        return;
      }

      const order = await placeOrder({
        accountId: currentAccountId,
        symbol: selectedSymbol,
        side: orderSide,
        type: orderType,
        price: orderType === 'LIMIT' ? p : 0.0,
        quantity: q,
      });

      showBanner(`Order ${order.orderId} submitted! Status: ${order.status}`, 'success');
      refreshMarketData();
      const updatedStocks = await getStocks();
      setStocks(updatedStocks || []);
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOrder(orderId);
      showBanner(`Order ${orderId} cancelled. Unfilled funds/shares released.`, 'info');
      refreshMarketData();
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };

  // Simulation Handlers
  const handleSimReset = async () => {
    setSimLoading(true);
    try {
      const snap = await simReset();
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
      showBanner('Simulation sandbox reset with 4-level INFY Order Book.', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimPlaceOrder = async (overrideSide, overrideType, overridePrice, overrideQty) => {
    try {
      const sSide = overrideSide || simSide;
      const sType = overrideType || simType;
      const sPrice = overridePrice ? parseFloat(overridePrice) : parseFloat(simPrice);
      const sQty = overrideQty ? parseInt(overrideQty, 10) : parseInt(simQty, 10);

      const snap = await simPlaceOrder({
        accountId: simAccountId,
        symbol: simSymbol,
        side: sSide,
        type: sType,
        price: sType === 'LIMIT' ? sPrice : 0.0,
        quantity: sQty,
      });
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimCancel = async (orderId) => {
    try {
      const snap = await simCancelOrder(orderId);
      setSimSnapshots(snap);
      const events = await simGetEvents();
      setSimEvents(events || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--bg-secondary, #1e293b)', borderBottom: '1px solid var(--border-primary, #334155)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}>
            📈
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Online Stock Brokerage Platform</h1>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>LLD Portfolio Module #35 · Price-Time Order Book, Execution Strategies & Observer Quotes</span>
          </div>
        </div>

        {/* Account Switcher & Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', padding: '6px 12px', borderRadius: 8, border: '1px solid #334155' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Active Trader:</span>
            <select
              value={currentAccountId}
              onChange={(e) => setCurrentAccountId(e.target.value)}
              style={{ background: 'transparent', color: '#f8fafc', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', outline: 'none' }}
            >
              <option value="ACC-user-alice" style={{ background: '#1e293b' }}>Alice Vance (ACC-user-alice)</option>
              <option value="ACC-user-bob" style={{ background: '#1e293b' }}>Bob Smith (ACC-user-bob)</option>
            </select>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Real-Time Stock Ticker Tape */}
      <div style={{ display: 'flex', gap: 20, padding: '10px 24px', background: '#0f172a', borderBottom: '1px solid #334155', overflowX: 'auto', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Live Quotes:</span>
        {stocks.map(s => {
          const isSelected = selectedSymbol === s.symbol;
          return (
            <div
              key={s.symbol}
              onClick={() => {
                setSelectedSymbol(s.symbol);
                setOrderPrice(s.currentPrice.toString());
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px',
                borderRadius: 6,
                background: isSelected ? 'rgba(16,185,129,0.15)' : '#1e293b',
                border: `1px solid ${isSelected ? '#10b981' : '#334155'}`,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>{s.symbol}</span>
              <span style={{ color: '#38bdf8' }}>₹{s.currentPrice.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Status Banner */}
      {statusMsg.text && (
        <div style={{ padding: '10px 24px', background: statusMsg.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          {statusMsg.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: 8, padding: '12px 24px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'trade', label: '📈 Trade & Portfolio' },
          { id: 'orderbook', label: `📊 Live Order Book (${selectedSymbol})` },
          { id: 'simulation', label: '🕹️ Concurrency & Matching Simulation' },
          { id: 'diagram', label: '📐 Class Diagram' },
          { id: 'details', label: '📋 Design Details' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              if (t.id === 'simulation') handleSimReset();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              background: activeTab === t.id ? '#10b981' : 'transparent',
              color: activeTab === t.id ? '#fff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
        {/* =================================================================== */}
        {/* TAB 1: TRADE & PORTFOLIO */}
        {/* =================================================================== */}
        {activeTab === 'trade' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24 }}>
            {/* Order Placement Console */}
            <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 20 }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800 }}>
                Place Order — {selectedSymbol}
              </h2>

              <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Buy / Sell Toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setOrderSide('BUY')}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: 'none',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: orderSide === 'BUY' ? '#10b981' : '#0f172a',
                      color: orderSide === 'BUY' ? '#fff' : '#94a3b8',
                    }}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('SELL')}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: 'none',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: orderSide === 'SELL' ? '#ef4444' : '#0f172a',
                      color: orderSide === 'SELL' ? '#fff' : '#94a3b8',
                    }}
                  >
                    SELL
                  </button>
                </div>

                {/* Market / Limit Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setOrderType('LIMIT')}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: `1px solid ${orderType === 'LIMIT' ? '#38bdf8' : '#334155'}`,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      background: orderType === 'LIMIT' ? 'rgba(56,189,248,0.15)' : '#0f172a',
                      color: orderType === 'LIMIT' ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    LIMIT ORDER
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('MARKET')}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: `1px solid ${orderType === 'MARKET' ? '#38bdf8' : '#334155'}`,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      background: orderType === 'MARKET' ? 'rgba(56,189,248,0.15)' : '#0f172a',
                      color: orderType === 'MARKET' ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    MARKET ORDER
                  </button>
                </div>

                {/* Limit Price Input */}
                {orderType === 'LIMIT' && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Limit Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={orderPrice}
                      onChange={e => setOrderPrice(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 14 }}
                    />
                  </div>
                )}

                {/* Quantity Input */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Quantity (Shares)
                  </label>
                  <input
                    type="number"
                    value={orderQty}
                    onChange={e => setOrderQty(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 14 }}
                  />
                </div>

                {/* Cost Estimation */}
                <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Estimated Total:</span>
                  <span style={{ fontWeight: 800, color: '#f8fafc' }}>
                    ₹{(parseFloat(orderPrice || 0) * parseInt(orderQty || 0)).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: orderSide === 'BUY' ? '#10b981' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Submit {orderSide} {orderType} Order
                </button>
              </form>
            </div>

            {/* Account Portfolio & Order History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Balances Card */}
              <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 20 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 800 }}>
                  Account Balances ({account?.accountId})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Cash</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>₹{account?.cashBalance?.toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Reserved Funds</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#eab308' }}>₹{account?.reservedBalance?.toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Available to Trade</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>₹{account?.availableBalance?.toFixed(2)}</div>
                  </div>
                </div>

                {/* Holdings Table */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>Portfolio Holdings</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: 6 }}>Symbol</th>
                        <th style={{ padding: 6 }}>Total Qty</th>
                        <th style={{ padding: 6 }}>Reserved</th>
                        <th style={{ padding: 6 }}>Avail</th>
                        <th style={{ padding: 6 }}>Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account?.portfolio?.allHoldings?.map(h => (
                        <tr key={h.symbol} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: 6, fontWeight: 700 }}>{h.symbol}</td>
                          <td style={{ padding: 6 }}>{h.quantity}</td>
                          <td style={{ padding: 6, color: '#eab308' }}>{h.reservedQuantity}</td>
                          <td style={{ padding: 6, color: '#10b981', fontWeight: 700 }}>{h.availableQuantity}</td>
                          <td style={{ padding: 6 }}>₹{h.avgBuyPrice?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order History */}
              <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 20 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 800 }}>Recent Orders</h3>
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {accountOrders.map(o => (
                    <div key={o.orderId} style={{ background: '#0f172a', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <div>
                        <span style={{ fontWeight: 800, color: o.side === 'BUY' ? '#10b981' : '#ef4444', marginRight: 8 }}>
                          {o.side} {o.type}
                        </span>
                        <span>{o.symbol} · {o.filledQuantity}/{o.totalQuantity} @ ₹{o.limitPrice || 'MKT'}</span>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>Status: {o.status} · Ref: {o.orderId}</div>
                      </div>
                      {(o.status === 'PENDING' || o.status === 'PARTIALLY_FILLED') && (
                        <button
                          onClick={() => handleCancelOrder(o.orderId)}
                          style={{ padding: '4px 8px', borderRadius: 4, background: '#ef4444', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: LIVE ORDER BOOK & DEPTH LADDER */}
        {/* =================================================================== */}
        {activeTab === 'orderbook' && (
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  Order Book Depth — {selectedSymbol}
                </h2>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Price-Time Priority Matching Ladder · Bid/Ask Spread: <strong style={{ color: '#38bdf8' }}>₹{orderBookDepth.spread?.toFixed(2)}</strong>
                </div>
              </div>

              {/* Symbol Selector */}
              <div style={{ display: 'flex', gap: 6 }}>
                {stocks.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => setSelectedSymbol(s.symbol)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 12,
                      background: selectedSymbol === s.symbol ? '#10b981' : '#0f172a',
                      color: selectedSymbol === s.symbol ? '#fff' : '#94a3b8',
                    }}
                  >
                    {s.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Depth Ladder Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* BIDS LADDER */}
              <div style={{ background: '#0f172a', padding: 16, borderRadius: 10, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#10b981', borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 8 }}>
                  <span>QTY (CUMULATIVE)</span>
                  <span>BID PRICE (₹)</span>
                </div>
                {orderBookDepth.bids?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 12 }}>No resting Bids in book</div>
                ) : (
                  orderBookDepth.bids?.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px dashed #1e293b' }}>
                      <span style={{ color: '#cbd5e1' }}>{b.quantity} ({b.cumulative})</span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>₹{b.price?.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* ASKS LADDER */}
              <div style={{ background: '#0f172a', padding: 16, borderRadius: 10, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#ef4444', borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 8 }}>
                  <span>ASK PRICE (₹)</span>
                  <span>QTY (CUMULATIVE)</span>
                </div>
                {orderBookDepth.asks?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 12 }}>No resting Asks in book</div>
                ) : (
                  orderBookDepth.asks?.map((a, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px dashed #1e293b' }}>
                      <span style={{ color: '#ef4444', fontWeight: 800 }}>₹{a.price?.toFixed(2)}</span>
                      <span style={{ color: '#cbd5e1' }}>{a.quantity} ({a.cumulative})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CONCURRENCY & MATCHING SIMULATION */}
        {/* =================================================================== */}
        {activeTab === 'simulation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                    🕹️ Concurrency & Order Matching Simulation
                  </h2>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Simulate price-time matching, market sweeps across depth levels, and fund reservation race conditions.
                  </div>
                </div>
                <button
                  onClick={handleSimReset}
                  disabled={simLoading}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#334155', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  🔄 Reset Sandbox
                </button>
              </div>

              {/* Simulation Action Triggers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, background: '#0f172a', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                {/* 1. Market Buy Sweep */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>1. Walk the Book (Market Buy)</div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    Alpha submits Market Buy for 25 INFY, sweeping through asks @ ₹1505 and @ ₹1510.
                  </p>
                  <button
                    onClick={() => handleSimPlaceOrder('BUY', 'MARKET', 0, 25)}
                    style={{ padding: 8, borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', marginTop: 4 }}
                  >
                    Trigger Market Buy Sweep (25 Shares)
                  </button>
                </div>

                {/* 2. Limit Order Resting */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>2. Rest Limit Order in Ladder</div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    Beta places Buy Limit @ ₹1498 for 15 INFY, nesting at top of Bids.
                  </p>
                  <button
                    onClick={() => handleSimPlaceOrder('BUY', 'LIMIT', 1498.0, 15)}
                    style={{ padding: 8, borderRadius: 6, background: '#0284c7', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', marginTop: 4 }}
                  >
                    Place Resting Buy Limit (15 @ ₹1498)
                  </button>
                </div>

                {/* 3. Fund Reservation Race */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>3. Test Balance Reservation Race</div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    Attempts to submit Buy order exceeding available cash balance (rejected).
                  </p>
                  <button
                    onClick={() => handleSimPlaceOrder('BUY', 'LIMIT', 2000.0, 500)}
                    style={{ padding: 8, borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', marginTop: 4 }}
                  >
                    Submit Over-Budget Order (500 @ ₹2000)
                  </button>
                </div>
              </div>

              {/* 2D Order Book Ladder & Live Stream */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Visual Ladder */}
                <div style={{ background: '#0f172a', padding: 16, borderRadius: 10, border: '1px solid #334155' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>
                    📊 Simulated INFY Order Book Depth
                  </div>
                  {simSnapshots?.orderBooks?.INFY && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                      {simSnapshots.orderBooks.INFY.asks?.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 4 }}>
                          <span>ASK: ₹{a.price?.toFixed(2)}</span>
                          <span>{a.quantity} shares</span>
                        </div>
                      ))}
                      <div style={{ textAlign: 'center', padding: '4px 0', color: '#38bdf8', fontWeight: 800, fontSize: 10 }}>
                        --- LAST TRADED SPREAD: ₹{simSnapshots.orderBooks.INFY.spread?.toFixed(2)} ---
                      </div>
                      {simSnapshots.orderBooks.INFY.bids?.map((b, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 4 }}>
                          <span>BID: ₹{b.price?.toFixed(2)}</span>
                          <span>{b.quantity} shares</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event Stream */}
                <div style={{ background: '#0f172a', padding: 16, borderRadius: 10, border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>
                    Matching Engine Telemetry Stream ({simEvents.length})
                  </div>
                  <div style={{ flex: 1, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {simEvents.slice().reverse().map(ev => (
                      <div key={ev.id} style={{
                        background: '#1e293b',
                        padding: '8px 10px',
                        borderRadius: 6,
                        borderLeft: `3px solid ${ev.type.includes('REJECTED') || ev.type.includes('FAILED') ? '#ef4444' : '#10b981'}`,
                        fontSize: 11
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 10 }}>
                          <span style={{ fontWeight: 700, color: '#f8fafc' }}>{ev.type}</span>
                          <span>{ev.timestamp}</span>
                        </div>
                        <div style={{ marginTop: 2, color: '#cbd5e1' }}>{ev.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CLASS DIAGRAM */}
        {/* =================================================================== */}
        {activeTab === 'diagram' && <ClassDiagram module="stockbroker" />}

        {/* =================================================================== */}
        {/* TAB 5: DESIGN DETAILS */}
        {/* =================================================================== */}
        {activeTab === 'details' && <DesignDetails module="stockbroker" />}
      </main>
    </div>
  );
}
