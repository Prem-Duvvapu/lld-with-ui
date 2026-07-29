import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.sn-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.post-input-box { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; margin-bottom: 20px; }
.post-input-box textarea { width: 100%; border: 1px solid var(--border-primary); border-radius: 6px; padding: 8px 12px; font-size: 13px; background: var(--bg-input); color: var(--text-primary); resize: none; box-sizing: border-box; }

.feed-list { display: flex; flex-direction: column; gap: 12px; }
.feed-post { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; }
.feed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; }
.feed-user { font-weight: 700; color: var(--info); }
.feed-actions { display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--text-muted); cursor: pointer; }
`;

function AnimatedFlow() {
  const [posts, setPosts] = useState([
    { id: 'P1', author: 'Prem', text: 'Excited to announce our new Low-Level Design platform with interactive simulations! 🚀', likes: 12, time: '2m ago' },
    { id: 'P2', author: 'TechCrunch', text: 'AI Agents revolutionizing software development in 2026. 🤖', likes: 45, time: '15m ago' },
  ]);
  const [newText, setNewText] = useState('');
  const [log, setLog] = useState('Fanout-on-Write Timeline Feed initialized.');

  const handleCreatePost = () => {
    if (!newText.trim()) return;
    const post = {
      id: `P${posts.length + 1}`,
      author: 'Prem',
      text: newText.trim(),
      likes: 0,
      time: 'Just now',
    };
    setPosts(prev => [post, ...prev]);
    setLog(`⚡ New post created! Performing Fanout-on-Write to follower timeline caches.`);
    setNewText('');
  };

  const handleLike = (id) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  return (
    <div className="sn-container">
      <style>{CSS}</style>

      <div className="post-input-box">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          ✍️ CREATE NEW POST (FANOUT TIMELINE ENGINE)
        </div>
        <textarea rows={2} placeholder="What is on your mind?" value={newText} onChange={e => setNewText(e.target.value)} />
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button onClick={handleCreatePost} style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Post Update
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
        YOUR TIMELINE FEED
      </div>

      <div className="feed-list">
        {posts.map(p => (
          <div key={p.id} className="feed-post">
            <div className="feed-header">
              <span className="feed-user">@{p.author}</span>
              <span style={{ color: 'var(--text-muted)' }}>{p.time}</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{p.text}</div>
            <div className="feed-actions">
              <span onClick={() => handleLike(p.id)}>❤️ {p.likes} Likes</span>
              <span>💬 Comment</span>
              <span>🔁 Share</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function SocialNetworkPage() {
  return (
    <LldPage module="social-network" title="Social Network System" icon="🌐" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
