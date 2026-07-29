import { useState, useEffect } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.sb-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.sb-ticker { display: flex; gap: 20px; justify-content: center; background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); margin-bottom: 20px; }
.sb-ticker-item { font-size: 13px; font-weight: 700; }

.order-book-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.book-col { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; }
.book-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid var(--border-secondary); padding-bottom: 6px; }

.order-row { display: flex; justify-content: space-between; padding: 6px 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 4px; }
.order-row.buy { background: rgba(63,185,80,0.1); color: var(--success); }
.order-row.sell { background: rgba(248,81,73,0.1); color: var(--danger); }

.sb-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.sb-input { padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-input); color: var(--text-primary); font-size: 13px; width: 100px; }
`;

function AnimatedFlow() {
  const [buys, setBuys] = useState([
    { id: 'B1', qty: 10, price: 184.50 },
    { id: 'B2', qty: 25, price: 184.00 },
    { id: 'B3', qty: 50, price: 183.50 },
  ]);
  const [sells, setSells] = useState([
    { id: 'S1', qty: 15, price: 185.50 },
    { id: 'S2', qty: 30, price: 186.00 },
    { id: 'S3', qty: 100, price: 186.50 },
  ]);
  const [price, setPrice] = useState('185.50');
  const [qty, setQty] = useState('15');
  const [trades, setTrades] = useState([]);
  const [statusMsg, setStatusMsg] = useState('Limit Order Book ready. Place BUY or SELL order to trigger matching engine.');

  const handlePlaceOrder = (type) => {
    const p = parseFloat(price);
    const q = parseInt(qty, 10);
    if (isNaN(p) || isNaN(q)) return;

    const orderId = `${type[0]}-${Math.floor(Math.random() * 900 + 100)}`;

    if (type === 'BUY') {
      // Check for match with sells (lowest sell price)
      const matchIdx = sells.findIndex(s => p >= s.price);
      if (matchIdx !== -1) {
        const matchedSell = sells[matchIdx];
        const matchPrice = matchedSell.price;
        setTrades(prev => [`⚡ TRADE EXECUTED: ${q} shares @ $${matchPrice.toFixed(2)} (Buy #${orderId} ↔ Sell #${matchedSell.id})`, ...prev]);
        setSells(prev => prev.filter((_, idx) => idx !== matchIdx));
        setStatusMsg(`🎯 MATCHING ENGINE TRIGGERED! Order ${orderId} matched with Sell ${matchedSell.id} at $${matchPrice}!`);
      } else {
        setBuys(prev => [...prev, { id: orderId, qty: q, price: p }].sort((a, b) => b.price - a.price));
        setStatusMsg(`📥 BUY Order #${orderId} ($${p}) added to Bid Order Book.`);
      }
    } else {
      // SELL order
      const matchIdx = buys.findIndex(b => p <= b.price);
      if (matchIdx !== -1) {
        const matchedBuy = buys[matchIdx];
        const matchPrice = matchedBuy.price;
        setTrades(prev => [`⚡ TRADE EXECUTED: ${q} shares @ $${matchPrice.toFixed(2)} (Sell #${orderId} ↔ Buy #${matchedBuy.id})`, ...prev]);
        setBuys(prev => prev.filter((_, idx) => idx !== matchIdx));
        setStatusMsg(`🎯 MATCHING ENGINE TRIGGERED! Order ${orderId} matched with Buy ${matchedBuy.id} at $${matchPrice}!`);
      } else {
        setSells(prev => [...prev, { id: orderId, qty: q, price: p }].sort((a, b) => a.price - b.price));
        setStatusMsg(`📥 SELL Order #${orderId} ($${p}) added to Ask Order Book.`);
      }
    }
  };

  return (
    <div className="sb-container">
      <style>{CSS}</style>

      <div className="sb-ticker">
        <div className="sb-ticker-item">AAPL: <span style={{ color: 'var(--success)' }}>$185.20 ▲ +1.2%</span></div>
        <div className="sb-ticker-item">GOOGL: <span style={{ color: 'var(--success)' }}>$172.50 ▲ +0.8%</span></div>
        <div className="sb-ticker-item">TSLA: <span style={{ color: 'var(--danger)' }}>$240.10 ▼ -2.1%</span></div>
      </div>

      <div className="order-book-grid">
        <div className="book-col">
          <div className="book-title" style={{ color: 'var(--success)' }}>💚 BIDS (BUY ORDERS)</div>
          {buys.length === 0 ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No Bids</div> : buys.map(b => (
            <div key={b.id} className="order-row buy">
              <span>{b.id}</span>
              <span>{b.qty} shares</span>
              <span>${b.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="book-col">
          <div className="book-title" style={{ color: 'var(--danger)' }}>❤️ ASKS (SELL ORDERS)</div>
          {sells.length === 0 ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No Asks</div> : sells.map(s => (
            <div key={s.id} className="order-row sell">
              <span>{s.id}</span>
              <span>{s.qty} shares</span>
              <span>${s.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sb-controls">
        <input className="sb-input" placeholder="Price ($)" value={price} onChange={e => setPrice(e.target.value)} />
        <input className="sb-input" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} />
        <button onClick={() => handlePlaceOrder('BUY')} style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--success)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
          💚 BUY LIMIT
        </button>
        <button onClick={() => handlePlaceOrder('SELL')} style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--danger)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
          ❤️ SELL LIMIT
        </button>
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {statusMsg}
      </div>

      {trades.length > 0 && (
        <div style={{ marginTop: 12, background: 'var(--bg-primary)', padding: 10, borderRadius: 6, border: '1px solid var(--border-primary)', fontSize: 11, fontFamily: 'monospace' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Recent Executed Trades:</div>
          {trades.map((t, idx) => (
            <div key={idx} style={{ color: 'var(--success)' }}>{t}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StockBrokeragePage() {
  return (
    <LldPage module="stock-brokerage" title="Stock Brokerage System" icon="📈" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
