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
.btn-primary { width: 100%; padding: 10px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }

.auctions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.auction-card { background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); padding: 16px; cursor: pointer; transition: all 0.2s; }

.badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-pending { background: rgba(255,193,7,0.15); color: #ffc107; }
.badge-active { background: rgba(40,167,69,0.15); color: #28a745; }
.badge-closed { background: rgba(108,117,125,0.15); color: #6c757d; }

.detail-panel { margin-top: 20px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); }
.bid-form { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; margin-bottom: 16px; }

.podium-box { background: var(--bg-primary); border: 2px solid var(--accent); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; }
.bidder-avatars { display: flex; gap: 16px; justify-content: center; margin: 16px 0; }
.bidder-avatar { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 10px; padding: 12px; min-width: 110px; transition: all 0.3s; }
.bidder-avatar.winning { border-color: var(--success); box-shadow: 0 0 14px rgba(63,185,80,0.4); transform: scale(1.06); }
`;

function AnimatedFlow() {
  const [currentBid, setCurrentBid] = useState(500);
  const [winner, setWinner] = useState('Alice 👩');
  const [timer, setTimer] = useState(15);
  const [isSold, setIsSold] = useState(false);
  const [bidHistory, setBidHistory] = useState([
    { bidder: 'Alice 👩', amount: 500, time: 'Initial Reserve' }
  ]);

  useEffect(() => {
    let interval;
    if (timer > 0 && !isSold) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && !isSold) {
      setIsSold(true);
    }
    return () => clearInterval(interval);
  }, [timer, isSold]);

  const placeBid = (bidderName, increment) => {
    if (isSold) return;
    const newAmount = currentBid + increment;
    setCurrentBid(newAmount);
    setWinner(bidderName);
    setTimer(15); // Reset timer on new bid
    setBidHistory(prev => [{ bidder: bidderName, amount: newAmount, time: new Date().toLocaleTimeString() }, ...prev]);
  };

  const reset = () => {
    setCurrentBid(500);
    setWinner('Alice 👩');
    setTimer(15);
    setIsSold(false);
    setBidHistory([{ bidder: 'Alice 👩', amount: 500, time: 'Initial Reserve' }]);
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 16 }}>
        LIVE AUCTION BATTLE & GAVEL SIMULATOR
      </div>

      <div className="podium-box">
        <div style={{ fontSize: 32 }}>🔨</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
          RARE ART: "MONA LISA REIMAGINED"
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)', margin: '8px 0' }}>
          ${currentBid}.00
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {isSold ? (
            <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 16 }}>
              🛑 SOLD! Winner: {winner} for ${currentBid}.00
            </span>
          ) : (
            `⏱️ Going once... Going twice... (${timer}s left)`
          )}
        </div>

        <div className="bidder-avatars">
          <div className={`bidder-avatar ${winner === 'Alice 👩' ? 'winning' : ''}`}>
            <div style={{ fontSize: 24 }}>👩</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Alice</div>
            <button disabled={isSold} onClick={() => placeBid('Alice 👩', 50)} style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
              + $50 Bid
            </button>
          </div>

          <div className={`bidder-avatar ${winner === 'Bob 🧔' ? 'winning' : ''}`}>
            <div style={{ fontSize: 24 }}>🧔</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Bob</div>
            <button disabled={isSold} onClick={() => placeBid('Bob 🧔', 50)} style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
              + $50 Bid
            </button>
          </div>

          <div className={`bidder-avatar ${winner === 'Charlie 👨' ? 'winning' : ''}`}>
            <div style={{ fontSize: 24 }}>👨</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Charlie</div>
            <button disabled={isSold} onClick={() => placeBid('Charlie 👨', 100)} style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, background: 'var(--warning)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
              + $100 Bid
            </button>
          </div>
        </div>
      </div>

      {isSold && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            🔄 Reset Auction Simulation
          </button>
        </div>
      )}

      <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Live Bidding Audit Trail:</div>
        {bidHistory.map((b, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-secondary)', padding: '4px 0' }}>
            <span>{b.bidder}</span>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>${b.amount}</span>
            <span style={{ color: 'var(--text-muted)' }}>{b.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      </div>
    </div>
  );
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
    <LldPage module="auction" title="Online Auction House" icon="🏷️" tabs={['app', 'simulation', 'design', 'diagram']}>
      {(activeTab) => (
        <>
          <style>{CSS}</style>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AuctionsView />}
        </>
      )}
    </LldPage>
  );
}