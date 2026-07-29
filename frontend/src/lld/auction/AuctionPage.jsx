import { useState, useEffect, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import {
  createAuction, getAllAuctions, getAuction,
  registerBidder, getAllBidders,
  placeBid, getBidsForAuction, closeAuction,
} from './api';

const CSS = `
.auction-app { max-width: 1100px; margin: 0 auto; padding: 20px; }
.auction-header { text-align: center; margin-bottom: 20px; }
.auction-header h1 { font-size: 28px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.auction-header p { color: var(--text-muted); font-size: 14px; }
.auction-nav { display: flex; gap: 6px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }
.auction-nav button { padding: 8px 18px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.auction-nav button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.auction-nav button:hover:not(.active) { background: var(--border-primary); }
.auction-main { background: var(--bg-secondary); border-radius: 12px; padding: 24px; border: 1px solid var(--border-primary); }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.form-card { padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); }
.form-card h2 { margin-bottom: 14px; font-size: 17px; color: var(--info); }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.form-group input, .form-group select { width: 100%; padding: 9px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary); box-sizing: border-box; transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
.btn-primary { width: 100%; padding: 10px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102,126,234,0.3); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-success { padding: 8px 20px; background: var(--success); color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-success:hover { opacity: 0.85; }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-danger:hover { opacity: 0.85; }
.error { margin-top: 10px; padding: 8px; background: var(--danger-bg); color: var(--danger); border-radius: 6px; border: 1px solid var(--danger-bg); font-size: 13px; }
.success { margin-top: 10px; padding: 8px; background: var(--success-bg); color: var(--success); border-radius: 6px; font-size: 13px; }

.auctions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.auction-card { background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); padding: 16px; cursor: pointer; transition: all 0.2s; }
.auction-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.auction-card.selected { border-color: var(--info); box-shadow: 0 0 0 2px var(--info-bg); }
.auction-card h3 { font-size: 16px; margin-bottom: 6px; color: var(--text-primary); }
.auction-card .desc { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }
.auction-card .detail { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px solid var(--border-secondary); }
.auction-card .detail:last-child { border-bottom: none; }
.auction-card .label { color: var(--text-muted); }
.auction-card .value { font-weight: 600; color: var(--text-primary); }

.badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-pending { background: rgba(255,193,7,0.15); color: #ffc107; }
.badge-active { background: rgba(40,167,69,0.15); color: #28a745; }
.badge-closed { background: rgba(108,117,125,0.15); color: #6c757d; }

.detail-panel { margin-top: 20px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); }
.detail-panel h2 { font-size: 18px; margin-bottom: 12px; color: var(--info); }
.bid-form { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; margin-bottom: 16px; }
.bid-form .form-group { margin-bottom: 0; min-width: 150px; flex: 1; }
.bid-form .btn-primary { width: auto; padding: 9px 24px; }

.bids-list { max-height: 300px; overflow-y: auto; }
.bid-item { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--border-secondary); font-size: 13px; }
.bid-item:last-child { border-bottom: none; }
.bid-item .bidder { color: var(--text-muted); }
.bid-item .amount { font-weight: 700; color: var(--success); }
.bid-item .time { color: var(--text-muted); font-size: 11px; }
.alert { text-align: center; padding: 24px; color: var(--text-muted); font-size: 14px; }
`;

function SetupSection({ onCreated }) {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateAuction = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await createAuction(itemName, description, parseFloat(startingBid), parseInt(durationMinutes));
      if (data.error) setError(data.error);
      else { setSuccess(`Auction "${data.itemName}" created!`); setItemName(''); setDescription(''); setStartingBid(''); if (onCreated) onCreated(); }
    } catch { setError('Failed to create auction'); }
  };

  const handleRegisterBidder = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await registerBidder(name, email);
      if (data.error) setError(data.error);
      else { setSuccess(`Bidder "${data.name}" registered!`); setName(''); setEmail(''); }
    } catch { setError('Failed to register bidder'); }
  };

  return (
    <div className="form-grid">
      <div className="form-card">
        <h2>Create Auction</h2>
        <form onSubmit={handleCreateAuction}>
          <div className="form-group"><label>Item Name</label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Vintage Guitar" required />
          </div>
          <div className="form-group"><label>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" required />
          </div>
          <div className="form-group"><label>Starting Bid (₹)</label>
            <input type="number" step="0.01" min="0.01" value={startingBid} onChange={(e) => setStartingBid(e.target.value)} placeholder="e.g. 100" required />
          </div>
          <div className="form-group"><label>Duration (minutes)</label>
            <input type="number" min="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Create Auction</button>
        </form>
      </div>
      <div className="form-card">
        <h2>Register Bidder</h2>
        <form onSubmit={handleRegisterBidder}>
          <div className="form-group"><label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" required />
          </div>
          <div className="form-group"><label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. john@example.com" required />
          </div>
          <button type="submit" className="btn-primary">Register Bidder</button>
        </form>
      </div>
      {error && <div className="error" style={{ gridColumn: '1 / -1' }}>{error}</div>}
      {success && <div className="success" style={{ gridColumn: '1 / -1' }}>{success}</div>}
    </div>
  );
}

function AuctionDetail({ auctionId, bidders, onUpdate }) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidderId, setBidderId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDetail = useCallback(async () => {
    const a = await getAuction(auctionId);
    if (!a.error) setAuction(a);
    const b = await getBidsForAuction(auctionId);
    if (!b.error) setBids(b);
  }, [auctionId]);

  useEffect(() => { fetchDetail(); const i = setInterval(fetchDetail, 3000); return () => clearInterval(i); }, [fetchDetail]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await placeBid(auctionId, parseInt(bidderId), parseFloat(amount));
      if (data.error) setError(data.error);
      else { setSuccess(`Bid of ₹${data.amount} placed!`); setAmount(''); fetchDetail(); if (onUpdate) onUpdate(); }
    } catch { setError('Failed to place bid'); }
  };

  const handleClose = async () => {
    setError('');
    try {
      const data = await closeAuction(auctionId);
      if (data.error) setError(data.error);
      else { setSuccess('Auction closed!'); fetchDetail(); if (onUpdate) onUpdate(); }
    } catch { setError('Failed to close auction'); }
  };

  if (!auction) return <div className="alert">Loading...</div>;

  return (
    <div className="detail-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2>{auction.itemName}</h2>
        <span className={`badge badge-${auction.status.toLowerCase()}`}>{auction.status}</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{auction.description}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><span className="label" style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Starting Bid</span><div style={{ fontWeight: 700, fontSize: 16 }}>₹{auction.startingBid?.toFixed(2)}</div></div>
        <div><span className="label" style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Current Bid</span><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>₹{auction.currentBid?.toFixed(2)}</div></div>
        <div><span className="label" style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Time Remaining</span><div style={{ fontWeight: 700, fontSize: 16 }}>{formatTime(auction.endTime - Date.now())}</div></div>
      </div>
      {auction.highestBidderId && (
        <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-muted)' }}>
          Highest bidder ID: <strong>{auction.highestBidderId}</strong>
        </div>
      )}
      {auction.status === 'ACTIVE' && (
        <>
          <form className="bid-form" onSubmit={handlePlaceBid}>
            <div className="form-group"><label>Bidder</label>
              <select value={bidderId} onChange={(e) => setBidderId(e.target.value)} required>
                <option value="">Select bidder</option>
                {bidders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Amount (₹)</label>
              <input type="number" step="0.01" min={auction.currentBid + 0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ₹${(auction.currentBid + 0.01).toFixed(2)}`} required />
            </div>
            <button type="submit" className="btn-primary">Place Bid</button>
          </form>
          <button className="btn-danger" onClick={handleClose}>Close Auction</button>
        </>
      )}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: 15, color: 'var(--info)' }}>Bidding History ({bids.length})</h3>
      <div className="bids-list">
        {bids.length === 0 && <div className="alert">No bids yet.</div>}
        {bids.map((b) => (
          <div key={b.id} className="bid-item">
            <span className="bidder">Bidder #{b.bidderId}</span>
            <span className="amount">₹{b.amount.toFixed(2)}</span>
            <span className="time">{new Date(b.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(ms) {
  if (ms <= 0) return 'Ended';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

function formatTimeEnd(endTime) {
  const diff = endTime - Date.now();
  if (diff <= 0) return 'Ended';
  const totalSec = Math.floor(diff / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 59) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}m ${s}s`;
}

function AuctionsView() {
  const [auctions, setAuctions] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAuctions = async () => {
    const data = await getAllAuctions();
    if (!data.error) setAuctions(data);
    setLoading(false);
  };

  const fetchBidders = async () => {
    const data = await getAllBidders();
    if (!data.error) setBidders(data);
  };

  useEffect(() => {
    fetchAuctions();
    fetchBidders();
    const i = setInterval(() => { fetchAuctions(); fetchBidders(); }, 5000);
    return () => clearInterval(i);
  }, []);

  return (
    <div>
      <SetupSection onCreated={fetchAuctions} />
      <h2 style={{ fontSize: 18, color: 'var(--info)', marginBottom: 12 }}>Active Auctions ({auctions.length})</h2>
      {loading ? <div className="alert">Loading...</div> : auctions.length === 0 ? <div className="alert">No auctions yet. Create one above.</div> : (
        <div className="auctions-grid">
          {auctions.map((a) => (
            <div key={a.id} className={`auction-card ${selectedId === a.id ? 'selected' : ''}`} onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}>
              <h3>{a.itemName}</h3>
              <div className="desc">{a.description}</div>
              <div className="detail"><span className="label">Status</span><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></div>
              <div className="detail"><span className="label">Current Bid</span><span className="value">₹{a.currentBid?.toFixed(2)}</span></div>
              <div className="detail"><span className="label">Time Left</span><span className="value">{formatTimeEnd(a.endTime)}</span></div>
              {a.highestBidderId && <div className="detail"><span className="label">Highest Bidder</span><span className="value">#{a.highestBidderId}</span></div>}
            </div>
          ))}
        </div>
      )}
      {selectedId && <AuctionDetail key={selectedId} auctionId={selectedId} bidders={bidders} onUpdate={fetchAuctions} />}
    </div>
  );
}

export default function AuctionPage() {
  return (
    <LldPage module="auction" title="Online Auction" icon="🏷️" tabs={['app', 'design', 'diagram']}>
      <style>{CSS}</style>
      <AuctionView />
    </LldPage>
  );
}

function AuctionView() {
  return (
    <div className="auction-app">
      <header className="auction-header">
        <h1>Online Auction House</h1>
        <p>Create auctions, register bidders, place bids, and track winners in real-time</p>
      </header>
      <main className="auction-main">
        <AuctionsView />
      </main>
    </div>
  );
}