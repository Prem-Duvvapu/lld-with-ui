import { useState, useEffect, useCallback, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import * as api from './api';

const POLICIES = ['FIXED', 'PERCENTAGE'];

const CSS = `
.auc-app { max-width: 1100px; margin: 0 auto; padding: 20px; }
.auc-header { text-align: center; margin-bottom: 20px; }
.auc-header h1 { font-size: 28px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.auc-header p { color: var(--text-muted); font-size: 14px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.form-card { padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); }
.form-card h2 { margin-bottom: 14px; font-size: 17px; color: var(--info); }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.form-group input, .form-group select { width: 100%; padding: 9px 12px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary); box-sizing: border-box; transition: border-color 0.2s; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.btn-primary { width: 100%; padding: 10px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.auctions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.auction-card { background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); padding: 16px; cursor: pointer; transition: all 0.2s; }
.auction-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.auction-card .detail { display: flex; justify-content: space-between; font-size: 13px; margin-top: 6px; }
.auction-card .label { color: var(--text-muted); }

.badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-pending { background: rgba(255,193,7,0.15); color: #ffc107; }
.badge-active { background: rgba(40,167,69,0.15); color: #28a745; }
.badge-closed { background: rgba(108,117,125,0.15); color: #6c757d; }

.detail-panel { margin-top: 20px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-primary); }
.bid-form { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; margin-bottom: 16px; }
.bid-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }

.notif-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
.notif-item { padding: 8px 12px; border-radius: 8px; font-size: 12px; border-left: 3px solid var(--warning); background: var(--bg-tertiary); }

/* ---- simulation tab ---- */
@keyframes aucFadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes aucPulseGlow { 0% { box-shadow: 0 0 0 rgba(255,193,7,0); } 45% { box-shadow: 0 0 20px rgba(255,193,7,0.6); } 100% { box-shadow: 0 0 0 rgba(255,193,7,0); } }
@keyframes aucBump { 0% { transform: scale(1); } 40% { transform: scale(1.14); } 100% { transform: scale(1); } }
@keyframes aucShake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
@keyframes aucSpin { to { transform: rotate(360deg); } }
@keyframes aucShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }

.sim-shell { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 14px; padding: 22px; }
.sim-intro { text-align: center; color: var(--text-muted); font-size: 13px; margin-bottom: 18px; line-height: 1.5; max-width: 640px; margin-left: auto; margin-right: auto; }

.stepper { display: flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 4px; flex-wrap: wrap; }
.stepper-circle { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; background: var(--bg-tertiary); border: 2px solid var(--border-primary); color: var(--text-muted); transition: all 0.35s ease; flex-shrink: 0; }
.stepper-circle.active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 5px rgba(88, 101, 242, 0.16); transform: scale(1.08); }
.stepper-circle.done { background: var(--success); border-color: var(--success); color: #fff; }
.stepper-line { width: 18px; height: 2px; background: var(--border-primary); transition: background 0.35s ease; }
.stepper-line.done { background: var(--success); }
.step-caption { text-align: center; margin: 10px 0 18px; min-height: 40px; }
.step-caption .step-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.step-caption .step-sub { font-size: 12px; color: var(--text-muted); margin-top: 3px; max-width: 520px; margin-left: auto; margin-right: auto; }

.sim-panel { display: grid; grid-template-columns: 1.15fr 1fr; gap: 18px; align-items: start; }
@media (max-width: 760px) { .sim-panel { grid-template-columns: 1fr; } .form-grid { grid-template-columns: 1fr; } }

.podium-box { background: linear-gradient(160deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%); border: 2px solid var(--accent); border-radius: 14px; padding: 22px; text-align: center; margin-bottom: 16px; position: relative; overflow: hidden; }
.podium-box .hammer { font-size: 26px; }
.podium-box .item { font-size: 17px; font-weight: 800; color: var(--text-primary); margin-top: 4px; }
.podium-box .amount { font-size: 32px; font-weight: 900; color: var(--success); margin: 6px 0; transition: transform 0.2s ease; }
.podium-box .amount.bump { animation: aucBump 0.5s ease; }
.podium-box .countdown { font-size: 12.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.podium-box .countdown.urgent { color: var(--danger); font-weight: 700; }
.podium-box .strategy-tag { display: inline-block; margin-top: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border-secondary); border-radius: 999px; padding: 3px 10px; }

.avatar-row { display: flex; gap: 12px; justify-content: center; margin: 14px 0 2px; flex-wrap: wrap; }
.avatar-chip { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 12px; padding: 9px 14px; min-width: 78px; text-align: center; transition: all 0.35s ease; }
.avatar-chip .av-emoji { font-size: 22px; display: block; }
.avatar-chip .av-name { font-size: 11px; font-weight: 700; margin-top: 3px; color: var(--text-secondary); }
.avatar-chip.leading { border-color: var(--success); box-shadow: 0 0 16px rgba(63, 185, 80, 0.4); transform: translateY(-4px) scale(1.06); }
.avatar-chip.leading .av-name { color: var(--success); }
.avatar-chip.justOutbid { animation: aucShake 0.5s ease; border-color: var(--danger); }

.auc-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 16px 0; }
.auc-hud-tile { background: var(--bg-tertiary); border-radius: 10px; padding: 12px 10px; text-align: center; border: 1px solid var(--border-secondary); transition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.2s ease; }
.auc-hud-tile .num { font-size: 22px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
.auc-hud-tile .lbl { font-size: 11px; color: var(--text-muted); margin-top: 2px; letter-spacing: 0.2px; }
.auc-hud-tile.flash { border-color: var(--warning); animation: aucPulseGlow 1.4s ease; }
.auc-hud-tile.bump .num { animation: aucBump 0.45s ease; }

.sim-controls { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 14px; }
.sim-btn { display: inline-flex; align-items: center; gap: 6px; padding: 11px 22px; border-radius: 9px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s ease; }
.sim-btn.primary { background: var(--accent-gradient); color: #fff; box-shadow: 0 3px 10px rgba(88, 101, 242, 0.28); }
.sim-btn.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(88, 101, 242, 0.38); }
.sim-btn.secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.sim-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
.spinner { width: 13px; height: 13px; border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: aucSpin 0.7s linear infinite; }
.spinner.dark { border-color: rgba(255,255,255,0.15); border-top-color: var(--accent); }

.auc-log { font-size: 12.5px; line-height: 1.6; color: var(--text-secondary); background: var(--bg-tertiary); border-radius: 10px; padding: 12px 16px; margin-top: 10px; white-space: pre-wrap; border-left: 4px solid var(--border-secondary); transition: border-color 0.3s ease, background 0.3s ease; }
.auc-log.info { border-left-color: var(--info); }
.auc-log.success { border-left-color: var(--success); }
.auc-log.error { border-left-color: var(--danger); background: rgba(220, 53, 69, 0.08); }
.auc-log.warning { border-left-color: var(--warning); background: rgba(255, 193, 7, 0.08); }

.sim-panel h3.sim-heading { font-size: 13px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--info); margin-bottom: 8px; font-weight: 700; }
.auc-ladder { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
.ladder-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; background: var(--bg-tertiary); font-size: 12.5px; border: 1px solid transparent; animation: aucFadeSlideIn 0.35s ease; }
.ladder-row.winning { background: rgba(40, 167, 69, 0.12); border-color: var(--success); }
.ladder-row .amt { font-weight: 700; color: var(--success); font-variant-numeric: tabular-nums; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 18px 10px; color: var(--text-muted); font-size: 12px; text-align: center; background: var(--bg-tertiary); border-radius: 8px; border: 1px dashed var(--border-secondary); }
.empty-state .es-icon { font-size: 20px; opacity: 0.6; }
`;

// ---------------------------------------------------------------- app tab

function SetupSection({ onCreated }) {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [startDelayMinutes, setStartDelayMinutes] = useState('0');
  const [incrementPolicy, setIncrementPolicy] = useState('FIXED');
  const [incrementValue, setIncrementValue] = useState('10');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateAuction = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await api.createAuction(itemName, description, parseFloat(startingBid), parseInt(durationMinutes, 10), {
        startDelayMinutes: parseInt(startDelayMinutes || '0', 10),
        incrementPolicy,
        incrementValue: parseFloat(incrementValue),
      });
      setSuccess(`Auction "${data.itemName}" created (${data.status})!`);
      setItemName(''); setDescription(''); setStartingBid('');
      if (onCreated) onCreated();
    } catch (err) { setError(err.message || 'Failed to create auction'); }
  };

  const handleRegisterBidder = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await api.registerBidder(name, email);
      setSuccess(`Bidder "${data.name}" registered!`);
      setName(''); setEmail('');
    } catch (err) { setError(err.message || 'Failed to register bidder'); }
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
          <div className="form-row-2">
            <div className="form-group"><label>Starting Bid (₹)</label>
              <input type="number" step="0.01" min="0.01" value={startingBid} onChange={(e) => setStartingBid(e.target.value)} placeholder="e.g. 100" required />
            </div>
            <div className="form-group"><label>Duration (minutes)</label>
              <input type="number" min="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} required />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group"><label>Starts in (minutes, 0 = now)</label>
              <input type="number" min="0" value={startDelayMinutes} onChange={(e) => setStartDelayMinutes(e.target.value)} />
            </div>
            <div className="form-group"><label>Increment Policy</label>
              <select value={incrementPolicy} onChange={(e) => setIncrementPolicy(e.target.value)}>
                {POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>{incrementPolicy === 'PERCENTAGE' ? 'Increment (% of current bid)' : 'Increment (₹ flat amount)'}</label>
            <input type="number" step="0.01" min="0.01" value={incrementValue} onChange={(e) => setIncrementValue(e.target.value)} />
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

function minNextBidHint(auction) {
  if (!auction) return null;
  return auction.incrementPolicy === 'PERCENTAGE'
    ? Math.round(auction.currentBid * (1 + auction.incrementValue / 100) * 100) / 100
    : auction.currentBid + auction.incrementValue;
}

function AuctionDetail({ auctionId, bidders, onUpdate }) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bidderId, setBidderId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDetail = useCallback(async () => {
    try {
      const [a, b, n] = await Promise.all([
        api.getAuction(auctionId), api.getBidsForAuction(auctionId), api.getNotifications(),
      ]);
      setAuction(a); setBids(b);
      setNotifications(n.filter(evt => evt.auctionId === auctionId).slice(-10).reverse());
    } catch { /* transient — next poll retries */ }
  }, [auctionId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  usePolling(fetchDetail, 3000, [auctionId]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await api.placeBid(auctionId, parseInt(bidderId, 10), parseFloat(amount));
      setSuccess(`Bid of ₹${data.amount} placed!`); setAmount(''); fetchDetail(); if (onUpdate) onUpdate();
    } catch (err) { setError(err.message || 'Failed to place bid'); }
  };

  const handleClose = async () => {
    setError('');
    try {
      await api.closeAuction(auctionId);
      setSuccess('Auction closed!'); fetchDetail(); if (onUpdate) onUpdate();
    } catch (err) { setError(err.message || 'Failed to close auction'); }
  };

  if (!auction) return <div className="alert">Loading...</div>;
  const hint = minNextBidHint(auction);

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
        <div><span className="label" style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Increment</span><div style={{ fontWeight: 700, fontSize: 16 }}>{auction.incrementPolicy === 'PERCENTAGE' ? `${auction.incrementValue}%` : `₹${auction.incrementValue}`}</div></div>
      </div>

      {auction.status === 'ACTIVE' && (
        <>
          <div className="bid-hint">Next bid must be at least <strong>₹{hint?.toFixed(2)}</strong> ({auction.incrementPolicy} strategy).</div>
          <form className="bid-form" onSubmit={handlePlaceBid}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Bidder</label>
              <select value={bidderId} onChange={(e) => setBidderId(e.target.value)} required>
                <option value="">Select...</option>
                {bidders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Amount (₹)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>Place Bid</button>
          </form>
        </>
      )}
      {auction.status !== 'CLOSED' && (
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', background: 'var(--danger)', marginBottom: 16 }} onClick={handleClose}>
          Close Auction
        </button>
      )}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <h3 style={{ fontSize: 14, color: 'var(--info)', margin: '16px 0 8px' }}>Outbid Notifications ({notifications.length})</h3>
      <div className="notif-list">
        {notifications.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No one has been outbid yet.</span>}
        {notifications.map((n, i) => <div key={i} className="notif-item">{n.message}</div>)}
      </div>

      <h3 style={{ fontSize: 14, color: 'var(--info)', margin: '16px 0 8px' }}>Bid History ({bids.length})</h3>
      <div className="auc-ladder">
        {bids.map(b => {
          const bidder = bidders.find(x => x.id === b.bidderId);
          return (
            <div key={b.id} className={`ladder-row ${b.bidderId === auction.highestBidderId ? 'winning' : ''}`}>
              <span>{bidder ? bidder.name : `Bidder #${b.bidderId}`}</span>
              <span className="amt">₹{b.amount.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuctionsView() {
  const [auctions, setAuctions] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api.getAllAuctions(), api.getAllBidders()]);
      setAuctions(a); setBidders(b);
    } catch { /* transient — next poll retries */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  usePolling(fetchAll, 5000, []);

  return (
    <div>
      <SetupSection onCreated={fetchAll} />
      <h2 style={{ fontSize: 18, color: 'var(--info)', marginBottom: 12 }}>Auctions ({auctions.length})</h2>
      {loading ? <div className="alert">Loading...</div> : auctions.length === 0 ? <div className="alert">No auctions yet. Create one above.</div> : (
        <div className="auctions-grid">
          {auctions.map((a) => (
            <div key={a.id} className="auction-card" onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}>
              <h3>{a.itemName}</h3>
              <div className="desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.description}</div>
              <div className="detail"><span className="label">Status</span><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></div>
              <div className="detail"><span className="label">Current Bid</span><span className="value">₹{a.currentBid?.toFixed(2)}</span></div>
              <div className="detail"><span className="label">Policy</span><span className="value">{a.incrementPolicy}</span></div>
            </div>
          ))}
        </div>
      )}
      {selectedId && <AuctionDetail key={selectedId} auctionId={selectedId} bidders={bidders} onUpdate={fetchAll} />}
    </div>
  );
}

// ----------------------------------------------------------- simulation tab

const SIM_STEPS = [
  'Reset the isolated sandbox',
  'View seeded auctions & bidders',
  'Place the opening bid',
  'Outbid — trigger a notification',
  'Bid that is too low',
  'Bid outside the active window',
  'Percentage auto-increment',
  'Race N bidders for the same ask',
];

const STEP_SUBTITLES = [
  'Wipes the sandbox and reseeds 3 bidders and 4 auctions spanning every lifecycle state — fully separate from the live Auctions tab.',
  'Confirms what got seeded: an ACTIVE fixed-increment item, an ACTIVE percentage-increment item, a PENDING item, and a CLOSED item.',
  'Alice bids the FixedIncrement minimum on "Vintage Guitar" — the opening bid becomes the new leading offer.',
  'Bob bids again, superseding Alice. Watch AuctionNotifier fan an OutbidEvent out to the in-app feed and the server log.',
  'A bid that only equals the current ask — not the required increment above it — is rejected by BidTooLowException.',
  'A bid before an auction\'s start time (PENDING) and a bid after one has closed both hit typed lifecycle guards, not a silent no-op.',
  'Charlie bids on the "Antique Pocket Watch" — its PercentageIncrement strategy computes the minimum as a percent of the current bid.',
  '8 bidders fire the identical winning amount at the same instant via a CountDownLatch. The per-auction lock — not luck — decides who wins.',
];

const AVATARS = { Alice: '👩', Bob: '🧔', Charlie: '👨' };
function avatarFor(name) {
  if (AVATARS[name]) return AVATARS[name];
  if (name && name.startsWith('Racer')) return '🏁';
  return '🙂';
}

function findAuction(auctions, name) {
  return (auctions || []).find(a => a.itemName === name);
}
function findBidder(bidders, name) {
  return (bidders || []).find(b => b.name === name);
}

function formatCountdown(ms) {
  if (ms == null) return '--:--';
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SimulationTab() {
  const [step, setStep] = useState(-1);
  const [snapshot, setSnapshot] = useState({ auctions: [], bidders: [], notifications: [], events: [] });
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('Press "Start Simulation" to reset the isolated sim sandbox — it never touches your live auctions above.');
  const [logType, setLogType] = useState('info');
  const [ladder, setLadder] = useState([]);
  const [raceResult, setRaceResult] = useState(null);
  const [flash, setFlash] = useState(false);
  const [bidBump, setBidBump] = useState(false);
  const [justOutbid, setJustOutbid] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const flashTimer = useRef(null);
  const bumpTimer = useRef(null);
  const outbidTimer = useRef(null);

  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const say = (text, type = 'info') => { setLog(text); setLogType(type); };

  const triggerFlash = () => {
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 1400);
  };
  const triggerBump = () => {
    setBidBump(true);
    if (bumpTimer.current) clearTimeout(bumpTimer.current);
    bumpTimer.current = setTimeout(() => setBidBump(false), 500);
  };
  const triggerOutbid = (name) => {
    setJustOutbid(name);
    if (outbidTimer.current) clearTimeout(outbidTimer.current);
    outbidTimer.current = setTimeout(() => setJustOutbid(null), 900);
  };

  const guitar = () => findAuction(snapshot.auctions, 'Vintage Guitar');
  const watch = () => findAuction(snapshot.auctions, 'Antique Pocket Watch');
  const pending = () => findAuction(snapshot.auctions, 'Rare Stamp Collection');
  const closedAuction = () => findAuction(snapshot.auctions, 'Antique Clock');

  const doReset = async () => {
    setBusy(true); setRaceResult(null); setLadder([]); setJustOutbid(null);
    try {
      const snap = await api.simReset();
      setSnapshot(snap);
      setStep(0);
      say(`Sandbox reset: ${snap.auctions.length} auctions and ${snap.bidders.length} bidders seeded. Tracking "Vintage Guitar" (fixed +₹10 per bid).`, 'success');
    } catch (err) { say(`Reset failed: ${err.message}`, 'error'); }
    finally { setBusy(false); }
  };

  const appendLadder = (bidderName, amount) => setLadder(prev => [...prev, { bidderName, amount, at: Date.now() }]);

  const doStep = async (n) => {
    setBusy(true);
    try {
      if (n === 1) {
        const snap = await api.simSnapshot();
        setSnapshot(snap);
        say(`Viewing the sandbox: ${snap.auctions.length} auctions across PENDING / ACTIVE / CLOSED, ${snap.bidders.length} bidders — fully isolated from live data.`, 'info');
      } else if (n === 2) {
        const g = guitar();
        const alice = findBidder(snapshot.bidders, 'Alice');
        const amount = g.currentBid + g.incrementValue;
        const snap = await api.simPlaceBid(g.id, alice.id, amount, 2);
        setSnapshot(snap);
        appendLadder('Alice', amount);
        triggerBump();
        say(`Alice opened bidding on "${g.itemName}" at ₹${amount.toFixed(2)} (FixedIncrement: ₹${g.currentBid} + ₹${g.incrementValue}).`, 'success');
      } else if (n === 3) {
        const g = guitar();
        const bob = findBidder(snapshot.bidders, 'Bob');
        const amount = g.currentBid + g.incrementValue;
        const snap = await api.simPlaceBid(g.id, bob.id, amount, 3);
        setSnapshot(snap);
        appendLadder('Bob', amount);
        triggerFlash(); triggerBump(); triggerOutbid('Alice');
        say(`Bob bid ₹${amount.toFixed(2)}, superseding Alice — AuctionNotifier published an OutbidEvent to the in-app feed and the server log. Alice's notification now appears on the right.`, 'warning');
      } else if (n === 4) {
        const g = guitar();
        const alice = findBidder(snapshot.bidders, 'Alice');
        try {
          await api.simPlaceBid(g.id, alice.id, g.currentBid, 4); // exactly the current bid — must be rejected
          say('Unexpected: a too-low bid was accepted (this should not happen).', 'error');
        } catch (err) {
          say(`Rejected as expected: "${err.message}" — BidIncrementStrategy enforces the minimum, not just "any higher number".`, 'error');
        }
        setSnapshot(await api.simSnapshot());
      } else if (n === 5) {
        const p = pending();
        const c = closedAuction();
        const alice = findBidder(snapshot.bidders, 'Alice');
        const outcomes = [];
        try { await api.simPlaceBid(p.id, alice.id, p.currentBid + 100, 5); }
        catch (err) { outcomes.push(`PENDING "${p.itemName}" → ${err.message}`); }
        try { await api.simPlaceBid(c.id, alice.id, c.currentBid + 100, 5); }
        catch (err) { outcomes.push(`CLOSED "${c.itemName}" → ${err.message}`); }
        say(`Lifecycle guards enforced:\n${outcomes.join('\n')}`, 'error');
        setSnapshot(await api.simSnapshot());
      } else if (n === 6) {
        const w = watch();
        const charlie = findBidder(snapshot.bidders, 'Charlie');
        const amount = Math.round(w.currentBid * (1 + w.incrementValue / 100) * 100) / 100;
        const snap = await api.simPlaceBid(w.id, charlie.id, amount, 6);
        setSnapshot(snap);
        say(`Charlie bid ₹${amount.toFixed(2)} on "${w.itemName}" via PercentageIncrement: ₹${w.currentBid} × (1 + ${w.incrementValue}%) = ₹${amount.toFixed(2)}.`, 'success');
      } else if (n === 7) {
        const g = guitar();
        const bidderCount = 8;
        const result = await api.simRace(g.id, bidderCount, 7);
        setSnapshot(result);
        setRaceResult(result.race);
        triggerBump();
        say(`${bidderCount} racer bidders all offered ₹${result.race.askAmount.toFixed(2)} on "${g.itemName}" at the same instant: ${result.race.succeeded} succeeded, ${result.race.rejected} rejected — the per-auction lock decided the outcome, not luck.`, 'success');
      }
      setStep(n);
    } catch (err) {
      say(`Step failed: ${err.message}`, 'error');
    } finally { setBusy(false); }
  };

  const g = guitar();
  const remaining = g ? g.endTime - nowTick : null;
  const notifCount = (snapshot.notifications || []).length;
  const namedBidders = ['Alice', 'Bob', 'Charlie']
    .map(name => findBidder(snapshot.bidders, name))
    .filter(Boolean);

  return (
    <div className="sim-shell">
      <p className="sim-intro">
        An isolated <code>/api/auction/sim/*</code> sandbox — a second repository, notifier and observer set — so every
        step below is safe to replay without ever touching the auctions you created in the Auctions tab.
      </p>

      <div className="stepper">
        {SIM_STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`stepper-circle ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < SIM_STEPS.length - 1 && <div className={`stepper-line ${i < step ? 'done' : ''}`} />}
          </div>
        ))}
      </div>
      <div className="step-caption">
        <div className="step-title">{step >= 0 ? `Step ${step + 1} of 8 — ${SIM_STEPS[step]}` : 'Ready when you are'}</div>
        <div className="step-sub">{step >= 0 ? STEP_SUBTITLES[step] : 'Each step calls a real sim endpoint and shows exactly what the backend decided, and why.'}</div>
      </div>

      <div className="sim-panel">
        <div>
          {g ? (
            <div className="podium-box">
              <div className="hammer">🔨</div>
              <div className="item">{g.itemName}</div>
              <div className={`amount ${bidBump ? 'bump' : ''}`}>₹{g.currentBid?.toFixed(2)}</div>
              <div className={`countdown ${remaining != null && remaining < 60000 ? 'urgent' : ''}`}>
                {g.status === 'CLOSED' ? '🔒 Auction closed' : `⏱️ Time remaining ${formatCountdown(remaining)}`}
              </div>
              <div className="strategy-tag">{g.incrementPolicy} · +₹{g.incrementValue}</div>

              {namedBidders.length > 0 && (
                <div className="avatar-row">
                  {namedBidders.map(b => (
                    <div key={b.id} className={`avatar-chip ${g.highestBidderId === b.id ? 'leading' : ''} ${justOutbid === b.name ? 'justOutbid' : ''}`}>
                      <span className="av-emoji">{avatarFor(b.name)}</span>
                      <span className="av-name">{b.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state"><span className="es-icon">🏷️</span>Start the simulation to load a tracked auction.</div>
          )}

          <div className="auc-hud">
            <div className={`auc-hud-tile ${bidBump ? 'bump' : ''}`}><div className="num">{g ? `₹${g.currentBid?.toFixed(0)}` : '--'}</div><div className="lbl">Current Ask</div></div>
            <div className={`auc-hud-tile ${flash ? 'flash' : ''}`}><div className="num">{notifCount}</div><div className="lbl">Notifications</div></div>
            <div className="auc-hud-tile"><div className="num">{ladder.length}</div><div className="lbl">Bids Placed</div></div>
            {raceResult && <>
              <div className="auc-hud-tile"><div className="num" style={{ color: 'var(--success)' }}>{raceResult.succeeded}</div><div className="lbl">Race Succeeded</div></div>
              <div className="auc-hud-tile"><div className="num" style={{ color: 'var(--danger)' }}>{raceResult.rejected}</div><div className="lbl">Race Rejected</div></div>
            </>}
          </div>

          <div className="sim-controls">
            {step === -1 && (
              <button className="sim-btn primary" disabled={busy} onClick={doReset}>
                {busy ? <span className="spinner" /> : '▶'} Start Simulation
              </button>
            )}
            {step >= 0 && step < SIM_STEPS.length - 1 && (
              <button className="sim-btn primary" disabled={busy} onClick={() => doStep(step + 1)}>
                {busy && <span className="spinner" />} Next: {SIM_STEPS[step + 1]}
              </button>
            )}
            {step === SIM_STEPS.length - 1 && (
              <button className="sim-btn secondary" onClick={doReset}>↺ Run Again</button>
            )}
          </div>

          <div className={`auc-log ${logType}`}>{log}</div>
        </div>

        <div>
          <h3 className="sim-heading">Live Bid Ladder — "Vintage Guitar"</h3>
          <div className="auc-ladder">
            {ladder.length === 0
              ? <div className="empty-state"><span className="es-icon">📭</span>No bids placed yet in this run.</div>
              : ladder.slice().reverse().map((b, i) => (
                <div key={`${b.at}-${i}`} className={`ladder-row ${i === 0 ? 'winning' : ''}`}>
                  <span>{avatarFor(b.bidderName)} {b.bidderName}</span>
                  <span className="amt">₹{b.amount.toFixed(2)}</span>
                </div>
              ))}
          </div>

          <h3 className="sim-heading" style={{ marginTop: 18 }}>Outbid Notifications ({notifCount})</h3>
          <div className="notif-list">
            {notifCount === 0
              ? <div className="empty-state"><span className="es-icon">🔔</span>No one has been outbid yet.</div>
              : (snapshot.notifications || []).slice().reverse().map((n, i) => <div key={i} className="notif-item">{n.message}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- page

export default function AuctionPage() {
  return (
    <LldPage module="auction" title="Online Auction House" icon="🏷️" tabs={[
      { id: 'app', label: '🏷️ Auctions' },
      { id: 'simulation', label: '🕹️ Interactive Simulation' },
      { id: 'diagram', label: 'Class Diagram' },
      { id: 'sequence', label: 'Sequence Diagram' },
      { id: 'design', label: 'Design Details' },
    ]}>
      <style>{CSS}</style>
      {(activeTab) => (
        <div className="auc-app">
          {activeTab === 'app' && <AuctionsView />}
          {activeTab === 'simulation' && <SimulationTab />}
        </div>
      )}
    </LldPage>
  );
}
