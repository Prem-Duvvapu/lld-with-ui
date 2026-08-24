import { useState, useEffect, useCallback } from 'react';
import LldPage from '../../components/LldPage';
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
} from './api';

const CSS = `
.sn-container { max-width: 900px; margin: 0 auto; padding: 12px; }
.sn-main { background: var(--bg-card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); padding: 24px; min-height: 450px; border: 1px solid var(--border-primary); }
.sn-back-btn { background: none; border: none; color: #667eea; cursor: pointer; font-size: 14px; font-weight: 600; padding: 4px 0; margin-bottom: 16px; display: inline-block; }
.sn-back-btn:hover { color: #764ba2; }
.sn-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.sn-topbar-tabs { display: flex; gap: 6px; }
.sn-topbar-tabs button { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); cursor: pointer; }
.sn-topbar-tabs button.active { background: #667eea; color: #fff; border-color: #667eea; }
.sn-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border-primary); }
.sn-form h3 { font-size: 16px; color: var(--text-primary); margin-bottom: 4px; }
.sn-form label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.sn-form input, .sn-form textarea { padding: 10px 12px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; }
.sn-btn { padding: 10px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.sn-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sn-btn-secondary { background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.sn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.sn-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-radius: 10px; background: var(--bg-primary); cursor: pointer; border: 1px solid var(--border-primary); }
.sn-card:hover { background: var(--bg-card); border-color: #667eea; }
.sn-card-title { font-weight: 600; font-size: 15px; color: var(--text-primary); }
.sn-card-sub { font-size: 12px; color: var(--text-secondary); }
.sn-loading { text-align: center; color: var(--text-secondary); padding: 40px 0; font-size: 14px; }
.sn-error { text-align: center; color: #ef4444; padding: 12px; font-size: 13px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; margin-bottom: 12px; }
.sn-post-input-box { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; margin-bottom: 20px; }
.sn-post-input-box textarea { width: 100%; min-height: 60px; resize: vertical; }
.sn-feed-list { display: flex; flex-direction: column; gap: 12px; }
.sn-feed-post { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; }
.sn-feed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; }
.sn-feed-user { font-weight: 700; color: #667eea; }
.sn-feed-actions { display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--text-secondary); }
.sn-feed-actions span { cursor: pointer; }
.sn-comment-list { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-primary); display: flex; flex-direction: column; gap: 6px; }
.sn-comment { font-size: 12px; color: var(--text-primary); }
.sn-comment b { color: #667eea; }
.sn-comment-form { display: flex; gap: 8px; margin-top: 8px; }
.sn-comment-form input { flex: 1; padding: 6px 10px; border: 1px solid var(--border-primary); background: var(--bg-card); color: var(--text-primary); border-radius: 6px; font-size: 12px; }
.sn-comment-form button { padding: 6px 12px; border-radius: 6px; border: none; background: #667eea; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
.sn-req-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; margin-bottom: 8px; }
.sn-req-actions button { margin-left: 6px; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; }
.sn-accept { background: #22c55e; color: #fff; }
.sn-reject { background: #ef4444; color: #fff; }
.sn-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
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
          <div key={u.id} className="sn-card" onClick={() => onUserSelect(u)}>
            <div>
              <div className="sn-card-title">👤 {u.name}</div>
              <div className="sn-card-sub">{u.email}</div>
            </div>
            <span style={{ color: '#667eea', fontWeight: 600, fontSize: 13 }}>Select &rarr;</span>
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
      {message && <div className="sn-req-row" style={{ color: '#22c55e', justifyContent: 'center' }}>{message}</div>}

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

export default function SocialNetworkPage() {
  return (
    <LldPage
      module="social-network"
      title="Social Network System"
      icon="🌐"
      tabs={[
        { id: 'app', label: '🌐 Social App' },
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
        </>
      )}
    </LldPage>
  );
}
