import { useState, useEffect, useCallback } from 'react';
import LldPage from '../../components/LldPage';
import {
  createTopic, createSubscriber, subscribe, publish,
  getTopics, getSubscribers, poll,
} from './api';

const CSS = `
.pubsub-dashboard { display: grid; grid-template-columns: 260px 1fr 260px; gap: 16px; }
.pubsub-panel { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 16px; }
.pubsub-panel h3 { font-size: 14px; color: var(--info); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-primary); text-transform: uppercase; letter-spacing: 0.5px; }
.pubsub-item { padding: 8px 10px; border: 1px solid var(--border-primary); border-radius: 6px; margin-bottom: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; background: var(--bg-card); }
.pubsub-item:hover { border-color: var(--accent); }
.pubsub-item.active { border-color: var(--accent); background: rgba(102,126,234,0.1); }
.pubsub-item .name { font-weight: 600; color: var(--text-primary); }
.pubsub-item .meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.pubsub-form { display: flex; gap: 6px; margin-top: 10px; }
.pubsub-form input, .pubsub-form textarea { flex: 1; padding: 8px 10px; border: 1px solid var(--border-primary); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text-primary); }
.pubsub-form textarea { resize: vertical; min-height: 60px; }
.pubsub-form input:focus, .pubsub-form textarea:focus { outline: none; border-color: var(--accent); }
.pubsub-form button { padding: 8px 14px; background: var(--accent-gradient); color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.pubsub-form button:hover { opacity: 0.9; }
.pubsub-form button.small { padding: 4px 10px; font-size: 11px; }
.msg-list { margin-top: 10px; max-height: 300px; overflow-y: auto; }
.msg-card { padding: 10px; border: 1px solid var(--border-secondary); border-radius: 6px; margin-bottom: 6px; background: var(--bg-card); }
.msg-card .header { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.msg-card .header .pub { color: var(--info); font-weight: 600; }
.msg-card .content { font-size: 13px; color: var(--text-primary); }
.msg-card .timestamp { font-size: 10px; color: var(--text-muted); margin-top: 4px; }
.empty-state { text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px; }
.toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 1000; animation: toastIn 0.3s ease-out; }
.toast.success { background: var(--success); color: #fff; }
.toast.error { background: var(--danger); color: #fff; }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.pubsub-grid { display: flex; flex-direction: column; gap: 16px; }
.msg-browser { margin-top: 16px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 16px; }
.msg-browser h3 { font-size: 14px; color: var(--info); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-primary); text-transform: uppercase; letter-spacing: 0.5px; }
.subscriber-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; font-size: 11px; color: var(--info); cursor: pointer; margin: 2px; transition: all 0.2s; }
.subscriber-badge:hover { background: rgba(102,126,234,0.2); }
.subscriber-badge.active { background: var(--accent); color: #fff; border-color: var(--accent); }
`;

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

function SubscriberInbox({ subscriberId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    poll(subscriberId).then((data) => {
      setMessages(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [subscriberId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ fontSize: 13, color: 'var(--text-primary)' }}>Inbox: {subscriberId}</h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      {loading ? <div className="empty-state">Loading...</div> : messages.length === 0 ? (
        <div className="empty-state">No messages</div>
      ) : (
        <div className="msg-list" style={{ maxHeight: 200 }}>
          {messages.map((m) => (
            <div key={m.id} className="msg-card">
              <div className="header"><span className="pub">{m.publisher}</span><span>{m.topic}</span></div>
              <div className="content">{m.content}</div>
              <div className="timestamp">{new Date(m.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PubSubPage() {
  const [topics, setTopics] = useState([]);
  const [subs, setSubs] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [pubName, setPubName] = useState('');
  const [pubContent, setPubContent] = useState('');
  const [subId, setSubId] = useState('');
  const [subName, setSubName] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [inboxSub, setInboxSub] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => setToast({ message, type });
  const clearToast = useCallback(() => setToast(null), []);

  const refresh = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([getTopics(), getSubscribers()]);
      setTopics(Array.isArray(t) ? t : []);
      setSubs(Array.isArray(s) ? s : []);
    } catch { showToast('Failed to load data', 'error'); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    const data = await createTopic(newTopicName.trim());
    if (data.error) showToast(data.error, 'error');
    else { showToast(`Topic "${data.name}" created`, 'success'); setNewTopicName(''); refresh(); }
  };

  const handleCreateSubscriber = async (e) => {
    e.preventDefault();
    if (!subId.trim() || !subName.trim()) return;
    const data = await createSubscriber(subId.trim(), subName.trim());
    if (data.error) showToast(data.error, 'error');
    else { showToast(`Subscriber "${data.name}" created`, 'success'); setSubId(''); setSubName(''); refresh(); }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subTopic || !subId) return;
    const data = await subscribe(subTopic, subId);
    if (data.error) showToast(data.error, 'error');
    else { showToast(data.message, 'success'); refresh(); }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!selectedTopic || !pubName.trim() || !pubContent.trim()) return;
    const data = await publish(selectedTopic, pubName.trim(), pubContent.trim());
    if (data.error) showToast(data.error, 'error');
    else { showToast('Message published', 'success'); setPubContent(''); refresh(); }
  };

  const handleViewInbox = async (sid) => {
    setInboxSub(inboxSub === sid ? null : sid);
  };

  const selectedTopicData = topics.find((t) => t.name === selectedTopic);

  return (
    <LldPage module="pub-sub" title="Pub Sub System" icon="📡" tabs={['app', 'design', 'diagram']}>
      <style>{CSS}</style>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

      <div className="pubsub-grid">
        <div className="pubsub-dashboard">
          {/* LEFT: Topics */}
          <div className="pubsub-panel">
            <h3>Topics ({topics.length})</h3>
            <form className="pubsub-form" onSubmit={handleCreateTopic}>
              <input type="text" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} placeholder="New topic name" />
              <button type="submit">+</button>
            </form>
            <div style={{ marginTop: 10 }}>
              {topics.length === 0 ? <div className="empty-state">No topics yet</div> : topics.map((t) => (
                <div key={t.name} className={`pubsub-item ${selectedTopic === t.name ? 'active' : ''}`} onClick={() => setSelectedTopic(t.name)}>
                  <div className="name">{t.name}</div>
                  <div className="meta">{Object.keys(t.subscribers || {}).length} subscriber{(Object.keys(t.subscribers || {}).length !== 1) ? 's' : ''} · {t.messages?.length || 0} messages</div>
                </div>
              ))}
            </div>
          </div>

          {/* MIDDLE: Selected Topic Detail */}
          <div className="pubsub-panel">
            {!selectedTopic ? (
              <div className="empty-state" style={{ padding: 40 }}>Select a topic from the left panel</div>
            ) : (
              <>
                <h3>{selectedTopic}</h3>
                <form className="pubsub-form" onSubmit={handlePublish} style={{ flexDirection: 'column' }}>
                  <input type="text" value={pubName} onChange={(e) => setPubName(e.target.value)} placeholder="Publisher name" />
                  <textarea value={pubContent} onChange={(e) => setPubContent(e.target.value)} placeholder="Message content" />
                  <button type="submit">Publish Message</button>
                </form>

                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  Subscribers:
                  {selectedTopicData && Object.keys(selectedTopicData.subscribers || {}).length === 0
                    ? <span style={{ marginLeft: 6 }}>None</span>
                    : Object.keys(selectedTopicData?.subscribers || {}).map((sid) => (
                        <span key={sid} className="subscriber-badge" onClick={() => handleViewInbox(sid)}>{sid}</span>
                      ))}
                </div>

                <div className="msg-list">
                  {(selectedTopicData?.messages?.length || 0) === 0 ? (
                    <div className="empty-state">No messages published yet</div>
                  ) : (
                    [...(selectedTopicData?.messages || [])].reverse().map((m) => (
                      <div key={m.id} className="msg-card">
                        <div className="header"><span className="pub">{m.publisher}</span><span>#{m.id}</span></div>
                        <div className="content">{m.content}</div>
                        <div className="timestamp">{new Date(m.timestamp).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Subscribers */}
          <div className="pubsub-panel">
            <h3>Subscribers ({subs.length})</h3>
            <form className="pubsub-form" onSubmit={handleCreateSubscriber} style={{ flexDirection: 'column' }}>
              <input type="text" value={subId} onChange={(e) => setSubId(e.target.value)} placeholder="Subscriber ID" />
              <input type="text" value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Subscriber name" />
              <button type="submit">+ Add Subscriber</button>
            </form>

            <div style={{ marginTop: 10 }}>
              {subs.length === 0 ? <div className="empty-state">No subscribers</div> : subs.map((s) => (
                <div key={s.id} className={`pubsub-item ${inboxSub === s.id ? 'active' : ''}`} onClick={() => handleViewInbox(s.id)}>
                  <div className="name">{s.name}</div>
                  <div className="meta">@{s.id} · {s.messages?.length || 0} messages</div>
                </div>
              ))}
            </div>

            {topics.length > 0 && (
              <form className="pubsub-form" onSubmit={handleSubscribe} style={{ flexDirection: 'column', marginTop: 16 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Subscribe to Topic</h4>
                <select value={subTopic} onChange={(e) => setSubTopic(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                  <option value="">Select topic</option>
                  {topics.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
                <input type="text" value={subId} onChange={(e) => setSubId(e.target.value)} placeholder="Subscriber ID" />
                <button type="submit">Subscribe</button>
              </form>
            )}
          </div>
        </div>

        {/* BOTTOM: Message Browser */}
        {inboxSub && (
          <div className="msg-browser">
            <SubscriberInbox subscriberId={inboxSub} onClose={() => setInboxSub(null)} />
          </div>
        )}
      </div>
    </LldPage>
  );
}
