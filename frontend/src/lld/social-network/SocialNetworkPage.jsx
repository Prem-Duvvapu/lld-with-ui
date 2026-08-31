import { useState, useEffect, useCallback, useRef } from 'react';
import LldPage from '../../components/LldPage';
import { usePolling } from '../../hooks/usePolling';
import {
  createUser,
  getAllUsers,
  sendFriendRequest,
  respondToRequest,
  getFriends,
  getPendingRequests,
  createPost,
  getFeed,
  likePost,
  addComment,
  simReset,
  simCreateUser,
  simCreatePost,
  simSendFriendRequest,
  simRespond,
  simLikePost,
  simAddComment,
  simRace,
  simGetSnapshot,
} from './api';

const CSS = `
.sn-container { max-width: 900px; margin: 0 auto; padding: 12px; }
.sn-main { background: var(--bg-card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); padding: 24px; min-height: 450px; border: 1px solid var(--border-primary); }
.sn-back-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 14px; font-weight: 600; padding: 4px 0; margin-bottom: 16px; display: inline-block; }
.sn-back-btn:hover { color: var(--accent-hover); }
.sn-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.sn-topbar-tabs { display: flex; gap: 6px; }
.sn-topbar-tabs button { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); cursor: pointer; }
.sn-topbar-tabs button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.sn-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border-primary); }
.sn-form h3 { font-size: 16px; color: var(--text-primary); margin-bottom: 4px; }
.sn-form label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.sn-form input, .sn-form textarea { padding: 10px 12px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; }
.sn-btn { padding: 10px 20px; background: var(--accent-gradient, var(--accent)); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.15s, opacity 0.15s; }
.sn-btn:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.92; }
.sn-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sn-btn-secondary { background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.sn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.sn-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-radius: 10px; background: var(--bg-primary); cursor: pointer; border: 1px solid var(--border-primary); }
.sn-card:hover { background: var(--bg-card); border-color: var(--accent); }
.sn-card-title { font-weight: 600; font-size: 15px; color: var(--text-primary); }
.sn-card-sub { font-size: 12px; color: var(--text-secondary); }
.sn-loading { text-align: center; color: var(--text-secondary); padding: 40px 0; font-size: 14px; }
.sn-error { text-align: center; color: var(--danger); padding: 12px; font-size: 13px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; margin-bottom: 12px; }
.sn-post-input-box { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; margin-bottom: 20px; }
.sn-post-input-box textarea { width: 100%; min-height: 60px; resize: vertical; }
.sn-feed-list { display: flex; flex-direction: column; gap: 12px; }
.sn-feed-post { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; }
.sn-feed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; }
.sn-feed-user { font-weight: 700; color: var(--accent); }
.sn-feed-actions { display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--text-secondary); }
.sn-feed-actions span { cursor: pointer; }
.sn-comment-list { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-primary); display: flex; flex-direction: column; gap: 6px; }
.sn-comment { font-size: 12px; color: var(--text-primary); }
.sn-comment b { color: var(--accent); }
.sn-comment-form { display: flex; gap: 8px; margin-top: 8px; }
.sn-comment-form input { flex: 1; padding: 6px 10px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); border-radius: 6px; font-size: 12px; }
.sn-comment-form button { padding: 6px 12px; border-radius: 6px; border: none; background: var(--accent); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
.sn-req-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; margin-bottom: 8px; }
.sn-req-actions button { margin-left: 6px; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; }
.sn-accept { background: var(--success); color: #fff; }
.sn-reject { background: var(--danger); color: #fff; }
.sn-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }

/* ---------------------------------------------------------- simulation tab */
.sn-sim { max-width: 1000px; margin: 0 auto; }
.sn-step-indicator { display: flex; gap: 6px; justify-content: center; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.sn-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--bg-tertiary); border: 1px solid var(--border-primary); transition: all 0.25s; }
.sn-step-dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent); transform: scale(1.3); }
.sn-step-dot.done { background: var(--success); border-color: var(--success); }
.sn-step-label { font-size: 12px; color: var(--text-muted); margin-left: 8px; }
.sn-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 14px 0; }
.sn-hud-tile { background: var(--bg-tertiary); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid var(--border-secondary); transition: box-shadow 0.3s; }
.sn-hud-tile .num { font-size: 22px; font-weight: 700; color: var(--accent); }
.sn-hud-tile .lbl { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.sn-controls { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin: 14px 0; }
.sn-log { font-size: 12.5px; color: var(--text-secondary); background: var(--bg-tertiary); border-radius: 8px; padding: 10px 14px; margin-top: 10px; line-height: 1.5; min-height: 20px; }

.sn-panel { background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: 10px; padding: 14px 16px; margin-top: 14px; }
.sn-panel h4 { font-size: 13px; color: var(--accent); margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.03em; }

/* social graph */
.sn-graph-wrap { display: flex; justify-content: center; }
.sn-graph { width: 100%; max-width: 520px; height: 220px; }
.sn-graph-edge { stroke: var(--accent); stroke-width: 2; opacity: 0.55; transition: all 0.4s; }
.sn-graph-edge.pending { stroke: var(--warning); stroke-dasharray: 5 4; opacity: 0.8; }
.sn-graph-node circle { fill: var(--bg-card); stroke: var(--accent); stroke-width: 2; transition: all 0.4s; }
.sn-graph-node.highlight circle { fill: var(--accent); stroke: var(--accent); animation: sn-pulse 1s ease-out; }
.sn-graph-node text { fill: var(--text-primary); font-size: 11px; font-weight: 700; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
.sn-graph-node.highlight text { fill: #fff; }
.sn-graph-node .sn-graph-name { font-size: 9px; font-weight: 600; fill: var(--text-muted); }
@keyframes sn-pulse {
  0% { r: 20; opacity: 0.4; }
  100% { r: 24; opacity: 0; }
}

/* feed fan-out events */
.sn-feedevent-list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
.sn-feedevent { padding: 8px 12px; border-radius: 8px; font-size: 12px; border-left: 3px solid var(--accent); background: var(--bg-card); animation: sn-slide-in 0.35s ease-out; }
@keyframes sn-slide-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

/* sim event log */
.sn-eventlog { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.sn-event { padding: 8px 12px; border-radius: 8px; font-size: 12px; border-left: 3px solid var(--border-primary); background: var(--bg-card); animation: sn-slide-in 0.3s ease-out; }
.sn-event.SUCCESS { border-left-color: var(--success); }
.sn-event.ERROR { border-left-color: var(--danger); }
.sn-event.WARNING { border-left-color: var(--warning); }
.sn-event.INFO { border-left-color: var(--info, var(--accent)); }
.sn-event-title { font-weight: 700; color: var(--text-primary); }
.sn-event-desc { color: var(--text-secondary); margin-top: 2px; }

.sn-race-bar { display: flex; height: 22px; border-radius: 6px; overflow: hidden; margin-top: 8px; border: 1px solid var(--border-primary); }
.sn-race-bar .won { background: var(--success); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 700; }
.sn-race-bar .lost { background: var(--danger); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 700; }
`;

function timeAgo(ts) {
  if (!ts) return '';
  try {
    const then = new Date(ts).getTime();
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return '';
  }
}

/* --- Onboarding: pick or create the active user --- */
function UserOnboarding({ onUserSelect }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    getAllUsers().then(setUsers).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try {
      const user = await createUser(name.trim(), email.trim(), bio.trim());
      setUsers((prev) => [...prev, user]);
      setName(''); setEmail(''); setBio('');
      onUserSelect(user);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="sn-loading">Loading users...</div>;

  return (
    <div>
      {error && <div className="sn-error">{error}</div>}
      <form className="sn-form" onSubmit={handleCreate}>
        <h3>Create New User</h3>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" />
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. alice@email.com" />
        <label>Bio (optional)</label>
        <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Software engineer" />
        <button type="submit" className="sn-btn" disabled={!name.trim() || !email.trim()}>+ Create User</button>
      </form>
      <div className="sn-section-title">Select Active User</div>
      {users.length === 0 && <div className="sn-loading">No users created yet</div>}
      <div className="sn-grid">
        {users.map((u) => (
          <div
            key={u.id}
            className="sn-card"
            role="button"
            tabIndex={0}
            onClick={() => onUserSelect(u)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUserSelect(u); } }}
          >
            <div>
              <div className="sn-card-title">👤 {u.name}</div>
              <div className="sn-card-sub">{u.email}</div>
            </div>
            <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>Select &rarr;</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Feed: fanout timeline of the active user + friends --- */
function FeedView({ user, users }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newText, setNewText] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});

  const userName = useCallback((id) => users.find((u) => u.id === id)?.name || `User #${id}`, [users]);

  const loadFeed = useCallback(() => {
    return getFeed(user.id).then(setPosts).catch((e) => setError(e.message));
  }, [user.id]);

  useEffect(() => {
    setLoading(true);
    loadFeed().finally(() => setLoading(false));
  }, [loadFeed]);

  // Poll the timeline so a friend's new post/like/comment shows up without a manual refresh —
  // silent (no loading spinner, no error banner) since it's a background refresh, not a
  // user-initiated action.
  usePolling(() => {
    getFeed(user.id).then(setPosts).catch(() => {});
  }, 5000, [user.id]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setPosting(true); setError(null);
    try {
      await createPost(user.id, newText.trim());
      setNewText('');
      await loadFeed();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await likePost(postId, user.id);
      await loadFeed();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    try {
      await addComment(postId, user.id, text);
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      await loadFeed();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="sn-loading">Loading feed...</div>;

  return (
    <div>
      {error && <div className="sn-error">{error}</div>}
      <div className="sn-post-input-box">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          ✍️ CREATE NEW POST
        </div>
        <form onSubmit={handleCreatePost}>
          <textarea placeholder="What is on your mind?" value={newText} onChange={(e) => setNewText(e.target.value)} />
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button type="submit" className="sn-btn" disabled={posting || !newText.trim()}>
              {posting ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>

      <div className="sn-section-title">Your Timeline Feed ({posts.length})</div>
      {posts.length === 0 && <div className="sn-loading">No posts yet. Be the first to post, or add friends to see their updates.</div>}
      <div className="sn-feed-list">
        {posts.map((p) => {
          const liked = (p.likes || []).includes(user.id);
          return (
            <div key={p.id} className="sn-feed-post">
              <div className="sn-feed-header">
                <span className="sn-feed-user">@{userName(p.authorId)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{timeAgo(p.timestamp)}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{p.content}</div>
              <div className="sn-feed-actions">
                <span onClick={() => handleLike(p.id)}>{liked ? '❤️' : '🤍'} {(p.likes || []).length} Likes</span>
                <span>💬 {(p.comments || []).length} Comments</span>
              </div>
              {(p.comments || []).length > 0 && (
                <div className="sn-comment-list">
                  {p.comments.map((c) => (
                    <div key={c.id} className="sn-comment">
                      <b>{userName(c.authorId)}:</b> {c.content}
                    </div>
                  ))}
                </div>
              )}
              <div className="sn-comment-form">
                <input
                  placeholder="Write a comment..."
                  value={commentDrafts[p.id] || ''}
                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(p.id); }}
                />
                <button onClick={() => handleAddComment(p.id)}>Comment</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Friends: pending requests, current friends, send a new request --- */
function FriendsView({ user, users, onFriendsChanged }) {
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const userName = useCallback((id) => users.find((u) => u.id === id)?.name || `User #${id}`, [users]);

  const load = useCallback(() => {
    return Promise.all([getFriends(user.id), getPendingRequests(user.id)])
      .then(([f, p]) => { setFriends(f); setPending(p); })
      .catch((e) => setError(e.message));
  }, [user.id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Poll for an incoming friend request landing while this tab is open.
  usePolling(() => {
    Promise.all([getFriends(user.id), getPendingRequests(user.id)])
      .then(([f, p]) => { setFriends(f); setPending(p); })
      .catch(() => {});
  }, 5000, [user.id]);

  const friendIds = new Set(friends.map((f) => f.id));
  const otherUsers = users.filter((u) => u.id !== user.id && !friendIds.has(u.id));

  const handleSendRequest = async (toUserId) => {
    setError(null); setMessage(null);
    try {
      await sendFriendRequest(user.id, toUserId);
      setMessage(`Friend request sent to ${userName(toUserId)}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRespond = async (requestId, accept) => {
    setError(null); setMessage(null);
    try {
      await respondToRequest(requestId, accept);
      await load();
      if (onFriendsChanged) onFriendsChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="sn-loading">Loading friends...</div>;

  return (
    <div>
      {error && <div className="sn-error">{error}</div>}
      {message && <div className="sn-req-row" style={{ color: 'var(--success)', justifyContent: 'center' }}>{message}</div>}

      <div className="sn-section-title">Pending Requests ({pending.length})</div>
      {pending.length === 0 && <div className="sn-loading">No pending friend requests.</div>}
      {pending.map((r) => (
        <div key={r.id} className="sn-req-row">
          <span>{userName(r.fromUserId)} wants to be friends</span>
          <div className="sn-req-actions">
            <button className="sn-accept" onClick={() => handleRespond(r.id, true)}>Accept</button>
            <button className="sn-reject" onClick={() => handleRespond(r.id, false)}>Reject</button>
          </div>
        </div>
      ))}

      <div className="sn-section-title" style={{ marginTop: 20 }}>Your Friends ({friends.length})</div>
      {friends.length === 0 && <div className="sn-loading">No friends yet.</div>}
      <div className="sn-grid">
        {friends.map((f) => (
          <div key={f.id} className="sn-card" style={{ cursor: 'default' }}>
            <div>
              <div className="sn-card-title">👤 {f.name}</div>
              <div className="sn-card-sub">{f.email}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="sn-section-title" style={{ marginTop: 20 }}>People You May Know</div>
      {otherUsers.length === 0 && <div className="sn-loading">No other users to add.</div>}
      <div className="sn-grid">
        {otherUsers.map((u) => (
          <div key={u.id} className="sn-card" style={{ cursor: 'default' }}>
            <div>
              <div className="sn-card-title">👤 {u.name}</div>
              <div className="sn-card-sub">{u.email}</div>
            </div>
            <button className="sn-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleSendRequest(u.id)}>
              + Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialApp() {
  const [activeUser, setActiveUser] = useState(null);
  const [view, setView] = useState('feed');
  const [users, setUsers] = useState([]);

  const refreshUsers = useCallback(() => {
    getAllUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeUser) refreshUsers();
  }, [activeUser, refreshUsers]);

  if (!activeUser) {
    return <UserOnboarding onUserSelect={setActiveUser} />;
  }

  return (
    <div>
      <div className="sn-topbar">
        <button className="sn-back-btn" onClick={() => { setActiveUser(null); setView('feed'); }} style={{ margin: 0 }}>
          &larr; Switch User ({activeUser.name})
        </button>
        <div className="sn-topbar-tabs">
          <button className={view === 'feed' ? 'active' : ''} onClick={() => setView('feed')}>📰 Feed</button>
          <button className={view === 'friends' ? 'active' : ''} onClick={() => setView('friends')}>🤝 Friends</button>
        </div>
      </div>
      {view === 'feed' && <FeedView user={activeUser} users={users} />}
      {view === 'friends' && <FriendsView user={activeUser} users={users} onFriendsChanged={refreshUsers} />}
    </div>
  );
}

/* ================================================================== */
/* Simulation tab — isolated /api/social/sim/* sandbox                */
/* ================================================================== */

const SIM_STEPS = [
  'Reset sandbox — seed Alice, Bob (already friends) & Carol',
  'Carol sends a friend request to Alice',
  'Carol re-sends the same request — rejected (duplicate)',
  'Alice accepts — bidirectional friendship formed',
  'Carol posts — Observer fans it out to her friends\' feeds',
  'Alice likes & comments on Carol\'s post',
  'Dave joins the network',
  'Dave & Bob race 8 simultaneous friend requests — the pair lock decides the winner',
];

function findByName(users, needle) {
  return users.find((u) => u.name.includes(needle));
}

function SocialGraph({ users, friendPairs, pendingPairs, highlightedId }) {
  const n = Math.max(users.length, 1);
  const cx = 260, cy = 110, r = 78;
  const positions = {};
  users.forEach((u, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[u.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  return (
    <div className="sn-graph-wrap">
      <svg className="sn-graph" viewBox="0 0 520 220">
        {friendPairs.map(([a, b]) => {
          const pa = positions[a], pb = positions[b];
          if (!pa || !pb) return null;
          return <line key={`f-${a}-${b}`} className="sn-graph-edge" x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
        })}
        {pendingPairs.map(([a, b]) => {
          const pa = positions[a], pb = positions[b];
          if (!pa || !pb) return null;
          return <line key={`p-${a}-${b}`} className="sn-graph-edge pending" x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
        })}
        {users.map((u) => {
          const pos = positions[u.id];
          if (!pos) return null;
          const highlight = u.id === highlightedId;
          return (
            <g key={u.id} className={`sn-graph-node ${highlight ? 'highlight' : ''}`}>
              <circle cx={pos.x} cy={pos.y} r="18" />
              <text x={pos.x} y={pos.y}>{u.name.charAt(0)}</text>
              <text className="sn-graph-name" x={pos.x} y={pos.y + 30}>{u.name.split(' ')[0]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SimulationTab() {
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('Press Start to reset the isolated sim sandbox.');
  const [snapshot, setSnapshot] = useState({ users: [], posts: [], friendRequests: [], feedEvents: [], events: [] });
  const [raceResult, setRaceResult] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const flashTimer = useRef(null);

  const flash = (userId) => {
    setHighlightedId(userId);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setHighlightedId(null), 900);
  };

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const applySnapshot = (snap) => {
    setSnapshot({
      users: snap.users || [],
      posts: snap.posts || [],
      friendRequests: snap.friendRequests || [],
      feedEvents: snap.feedEvents || [],
      events: snap.events || [],
    });
    return snap;
  };

  const refresh = async () => applySnapshot(await simGetSnapshot());

  const { users, posts, friendRequests, feedEvents, events } = snapshot;
  const alice = findByName(users, 'Alice');
  const bob = findByName(users, 'Bob');
  const carol = findByName(users, 'Carol');
  const dave = findByName(users, 'Dave');

  const friendPairs = [];
  const seen = new Set();
  for (const r of friendRequests) {
    if (r.status === 'ACCEPTED') {
      const key = [r.fromUserId, r.toUserId].sort().join('-');
      if (!seen.has(key)) { seen.add(key); friendPairs.push([r.fromUserId, r.toUserId]); }
    }
  }
  // Alice & Bob start already friends (seeded), with no FriendRequest row behind it.
  if (alice && bob && !seen.has([alice.id, bob.id].sort().join('-'))) {
    friendPairs.push([alice.id, bob.id]);
  }
  const pendingPairs = friendRequests.filter((r) => r.status === 'PENDING').map((r) => [r.fromUserId, r.toUserId]);

  const doReset = async () => {
    setBusy(true); setRaceResult(null);
    try {
      const snap = await simReset();
      applySnapshot(snap);
      setStep(0);
      setLog('Sandbox reset. 3 users seeded — Alice and Bob already friends, Carol has none yet.');
    } catch (err) {
      setLog(`Reset failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const doStep = async (n) => {
    setBusy(true);
    try {
      if (n === 1) {
        await simSendFriendRequest(carol.id, alice.id, 2);
        await refresh();
        flash(carol.id);
        setLog(`Carol → Alice friend request sent. Pair lock key "${Math.min(carol.id, alice.id)}#${Math.max(carol.id, alice.id)}" now guards this pair.`);
      } else if (n === 2) {
        try {
          await simSendFriendRequest(carol.id, alice.id, 3);
          setLog('Unexpected: the duplicate request was NOT rejected — check DuplicateFriendRequestException wiring.');
        } catch (err) {
          await refresh();
          setLog(`Rejected as expected (HTTP ${err.status}): "${err.message}" — no second FriendRequest row was created.`);
        }
      } else if (n === 3) {
        const pendingReq = friendRequests.find((r) => r.fromUserId === carol.id && r.toUserId === alice.id && r.status === 'PENDING');
        await simRespond(pendingReq.id, true, 4);
        await refresh();
        flash(alice.id);
        setLog('Alice accepted — Carol and Alice are now bidirectional friends.');
      } else if (n === 4) {
        await simCreatePost(carol.id, 'Just joined and made a new friend! 👋', 5);
        const snap = await refresh();
        flash(carol.id);
        const latest = (snap.feedEvents || []).slice(-1)[0];
        setLog(`Carol posted. FeedNotifier fanned the event out to ${latest?.friendsNotified ?? '?'} friend's feed (Alice) via the Observer chain.`);
      } else if (n === 5) {
        const carolPost = posts.filter((p) => p.authorId === carol.id).sort((a, b) => b.id - a.id)[0];
        await simLikePost(carolPost.id, alice.id, 6);
        await simAddComment(carolPost.id, alice.id, 'Welcome! 🎉', 6);
        await refresh();
        flash(alice.id);
        setLog("Alice liked and commented on Carol's post.");
      } else if (n === 6) {
        const before = new Set(users.map((u) => u.id));
        await simCreateUser('Dave Okafor', 'dave@example.com', 'Full-stack developer', 7);
        const snap = await refresh();
        const created = (snap.users || []).find((u) => !before.has(u.id));
        if (created) flash(created.id);
        setLog('Dave joined the network — not yet friends with anyone.');
      } else if (n === 7) {
        const snap = await refresh();
        const daveNow = findByName(snap.users, 'Dave');
        const result = await simRace(daveNow.id, bob.id, 8, 8);
        setRaceResult({ succeeded: result.raceSucceeded, rejected: result.raceRejected, attempts: result.raceAttempts });
        applySnapshot(result);
        flash(daveNow.id);
        setLog(`8 threads raced to connect Dave & Bob simultaneously, from both directions: ${result.raceSucceeded} succeeded, ${result.raceRejected} rejected — the canonical pair lock let exactly one through.`);
      }
      setStep(n);
    } catch (err) {
      setLog(`Step failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sn-sim">
      <div className="sn-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`sn-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span className="sn-step-label">
          {step >= 0 ? `Step ${step + 1}/8: ${SIM_STEPS[step]}` : 'Not started'}
        </span>
      </div>

      <div className="sn-hud">
        <div className="sn-hud-tile"><div className="num">{users.length}</div><div className="lbl">Users</div></div>
        <div className="sn-hud-tile"><div className="num">{friendPairs.length}</div><div className="lbl">Friendships</div></div>
        <div className="sn-hud-tile"><div className="num">{friendRequests.filter((r) => r.status === 'PENDING').length}</div><div className="lbl">Pending Requests</div></div>
        <div className="sn-hud-tile"><div className="num">{posts.length}</div><div className="lbl">Posts</div></div>
        <div className="sn-hud-tile"><div className="num">{feedEvents.length}</div><div className="lbl">Feed Fan-Outs</div></div>
        {raceResult && (
          <>
            <div className="sn-hud-tile"><div className="num" style={{ color: 'var(--success)' }}>{raceResult.succeeded}</div><div className="lbl">Race: Won</div></div>
            <div className="sn-hud-tile"><div className="num" style={{ color: 'var(--danger)' }}>{raceResult.rejected}</div><div className="lbl">Race: Rejected</div></div>
          </>
        )}
      </div>

      <div className="sn-panel">
        <h4>🕸️ Social Graph</h4>
        {users.length === 0 ? (
          <div className="sn-loading">Start the simulation to see the graph.</div>
        ) : (
          <SocialGraph users={users} friendPairs={friendPairs} pendingPairs={pendingPairs} highlightedId={highlightedId} />
        )}
        {raceResult && (
          <div className="sn-race-bar">
            <div className="won" style={{ flex: raceResult.succeeded || 0.001 }}>{raceResult.succeeded} won</div>
            <div className="lost" style={{ flex: raceResult.rejected || 0.001 }}>{raceResult.rejected} rejected</div>
          </div>
        )}
      </div>

      <div className="sn-controls">
        {step === -1 && <button className="sn-btn" disabled={busy} onClick={doReset}>▶ Start Simulation</button>}
        {step >= 0 && step < SIM_STEPS.length - 1 && (
          <button className="sn-btn" disabled={busy} onClick={() => doStep(step + 1)}>
            {busy ? 'Working…' : `Next: ${SIM_STEPS[step + 1]}`}
          </button>
        )}
        {step === SIM_STEPS.length - 1 && (
          <button className="sn-btn sn-btn-secondary" onClick={doReset}>↺ Run Again</button>
        )}
      </div>

      <div className="sn-log">{log}</div>

      <div className="sn-panel">
        <h4>📰 Feed Fan-Out Events (Observer)</h4>
        <div className="sn-feedevent-list">
          {feedEvents.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No posts published yet.</span>}
          {feedEvents.slice().reverse().map((ev, i) => (
            <div key={`${ev.postId}-${i}`} className="sn-feedevent">
              <b>{ev.authorName}</b> published post #{ev.postId} → fanned out to <b>{ev.friendsNotified}</b> friend(s)&apos; feeds
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>&ldquo;{ev.contentPreview}&rdquo;</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sn-panel">
        <h4>🧾 Sim Event Log</h4>
        <div className="sn-eventlog">
          {events.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No events yet.</span>}
          {events.slice().reverse().map((ev) => (
            <div key={ev.id} className={`sn-event ${ev.status}`}>
              <div className="sn-event-title">{ev.title}</div>
              <div className="sn-event-desc">{ev.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SocialNetworkPage() {
  return (
    <LldPage
      module="social-network"
      title="Social Network System"
      icon="🌐"
      tabs={[
        { id: 'app', label: '🌐 Social App' },
        { id: 'simulation', label: '🕹️ Interactive Simulation' },
        { id: 'sequence', label: 'Sequence Diagram' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'design', label: 'Design Details' },
      ]}
    >
      {(activeTab) => (
        <>
          {activeTab === 'app' && (
            <div className="sn-container">
              <style>{CSS}</style>
              <main className="sn-main">
                <SocialApp />
              </main>
            </div>
          )}
          {activeTab === 'simulation' && (
            <div className="sn-container">
              <style>{CSS}</style>
              <main className="sn-main">
                <SimulationTab />
              </main>
            </div>
          )}
        </>
      )}
    </LldPage>
  );
}
