import { useState, useEffect, useCallback, useRef } from 'react';
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

/* SIMULATION STYLES */
.sim-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.step-indicator { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.step-dot.active { background: var(--accent); box-shadow: 0 0 10px var(--accent); }
.step-dot.done { background: var(--success); }

.pubsub-stage { position: relative; width: 100%; height: 360px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: 12px; border: 1px solid var(--border-primary); overflow: hidden; display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; margin-bottom: 16px; }

.publisher-column, .subscriber-column { display: flex; flex-direction: column; gap: 16px; z-index: 2; width: 180px; }
.broker-core { width: 220px; min-height: 240px; background: var(--bg-card); border: 2px solid var(--accent); border-radius: 14px; padding: 16px; z-index: 2; box-shadow: 0 8px 24px rgba(0,0,0,0.15); display: flex; flex-direction: column; align-items: center; position: relative; }

.node-card { background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; padding: 10px 14px; text-align: center; transition: all 0.3s; position: relative; }
.node-card.active { border-color: var(--accent); box-shadow: 0 0 12px rgba(102,126,234,0.3); transform: scale(1.03); }
.node-card.glow-green { border-color: var(--success); box-shadow: 0 0 16px rgba(63,185,80,0.4); }

.packet-particle { position: absolute; width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; z-index: 10; transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 14px var(--accent); }

.sim-controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.sim-btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.sim-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }
.sim-btn.primary:hover { opacity: 0.9; transform: translateY(-1px); }
.sim-btn:disabled { opacity: 0.4; cursor: not-allowed; }
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

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [activePub, setActivePub] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('orders.created');
  const [payloadText, setPayloadText] = useState('🛒 Order #882 placed for $120.00');
  const [packetPos, setPacketPos] = useState(null);
  const [fanoutPackets, setFanoutPackets] = useState([]);
  const [subscriberGlows, setSubscriberGlows] = useState({});
  const [logMessages, setLogMessages] = useState([]);
  const [autoStream, setAutoStream] = useState(false);
  const autoStreamRef = useRef(null);

  const steps = ['Idle', 'Publisher Selected', 'Topic Queued', 'Broker Fanout', 'Subscribers Received'];

  const publishers = [
    { id: 'pub-orders', name: 'Order Service', icon: '🛒' },
    { id: 'pub-payments', name: 'Payment Gateway', icon: '💳' },
    { id: 'pub-auth', name: 'User Auth', icon: '👤' },
  ];

  const topics = ['orders.created', 'payments.success', 'user.signup'];

  const subscribers = [
    { id: 'sub-email', name: 'Email Worker', icon: '📧', topics: ['orders.created', 'user.signup'] },
    { id: 'sub-analytics', name: 'Analytics Engine', icon: '📊', topics: ['orders.created', 'payments.success', 'user.signup'] },
    { id: 'sub-audit', name: 'Audit Logger', icon: '📜', topics: ['payments.success'] },
  ];

  const log = (msg) => setLogMessages(prev => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5) ]);

  const runSimulation = async () => {
    const pub = publishers[Math.floor(Math.random() * publishers.length)];
    setActivePub(pub.id);
    setStep(1);
    log(`${pub.name} created payload: "${payloadText}"`);

    // Ensure topic & sub backend API calls happen seamlessly
    try {
      await createTopic(selectedTopic);
      await createSubscriber('sub-email', 'Email Worker');
      await subscribe(selectedTopic, 'sub-email');
    } catch { /* API fallback safe */ }

    // Animate packet from Publisher to Broker
    setPacketPos({ x: 120, y: 150, icon: pub.icon });
    await new Promise(r => setTimeout(r, 400));
    setPacketPos({ x: 420, y: 150, icon: '✉️' });
    setStep(2);
    log(`Message buffered in Broker topic: #${selectedTopic}`);

    await publish(selectedTopic, pub.name, payloadText).catch(() => {});

    await new Promise(r => setTimeout(r, 800));
    setPacketPos(null);
    setStep(3);
    log(`Broker performing Fanout broadcast to subscribed consumers...`);

    // Fanout animation to eligible subscribers
    const eligibleSubs = subscribers.filter(s => s.topics.includes(selectedTopic));
    const fanoutList = eligibleSubs.map((s, idx) => ({ id: s.id, x: 740, y: 60 + idx * 90 }));
    setFanoutPackets(fanoutList);

    await new Promise(r => setTimeout(r, 800));
    setFanoutPackets([]);
    setStep(4);

    // Glow subscribers
    const glows = {};
    eligibleSubs.forEach(s => glows[s.id] = true);
    setSubscriberGlows(glows);
    log(`Delivered to ${eligibleSubs.length} subscriber(s)!`);

    setTimeout(() => {
      setSubscriberGlows({});
      setStep(0);
      setActivePub(null);
    }, 1500);
  };

  useEffect(() => {
    if (autoStream) {
      autoStreamRef.current = setInterval(runSimulation, 3500);
    } else {
      clearInterval(autoStreamRef.current);
    }
    return () => clearInterval(autoStreamRef.current);
  }, [autoStream, selectedTopic]);

  return (
    <div className="sim-container">
      <div className="step-indicator">
        {steps.map((s, idx) => (
          <div key={s} className={`step-dot ${idx === step ? 'active' : ''} ${idx < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{steps[step]}</span>
      </div>

      <div className="pubsub-stage">
        {/* Publishers */}
        <div className="publisher-column">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 4 }}>PUBLISHERS</div>
          {publishers.map(p => (
            <div key={p.id} className={`node-card ${activePub === p.id ? 'active' : ''}`}>
              <div style={{ fontSize: 20 }}>{p.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
            </div>
          ))}
        </div>

        {/* Broker Core */}
        <div className="broker-core">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>📡 MESSAGE BROKER</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Topic Partition Buffer</div>

          <div style={{ width: '100%', background: 'var(--bg-secondary)', padding: 8, borderRadius: 6, marginBottom: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--info)' }}>Topic: {selectedTopic}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Status: ACTIVE · In-Memory FIFO</div>
          </div>

          <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
            {step === 2 || step === 3 ? '⚡ Processing Packet...' : '● Idle Ready'}
          </div>
        </div>

        {/* Subscribers */}
        <div className="subscriber-column">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 4 }}>SUBSCRIBERS</div>
          {subscribers.map(s => {
            const isSubbed = s.topics.includes(selectedTopic);
            return (
              <div key={s.id} className={`node-card ${subscriberGlows[s.id] ? 'glow-green' : ''}`} style={{ opacity: isSubbed ? 1 : 0.4 }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: isSubbed ? 'var(--success)' : 'var(--text-muted)' }}>
                  {isSubbed ? 'Subscribed' : 'Filtered Out'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Single animated packet */}
        {packetPos && (
          <div className="packet-particle" style={{ left: packetPos.x, top: packetPos.y }}>
            {packetPos.icon}
          </div>
        )}

        {/* Fanout packets */}
        {fanoutPackets.map(fp => (
          <div key={fp.id} className="packet-particle" style={{ left: fp.x, top: fp.y, background: 'var(--success)' }}>
            📬
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="sim-controls">
        <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
          {topics.map(t => <option key={t} value={t}>Topic: {t}</option>)}
        </select>

        <button className="sim-btn primary" onClick={runSimulation} disabled={step !== 0}>
          ▶ Publish Event Packet
        </button>

        <button className="sim-btn" onClick={() => setAutoStream(!autoStream)} style={{ borderColor: autoStream ? 'var(--accent)' : '' }}>
          {autoStream ? '⏸ Pause Auto-Stream' : '⚡ Auto-Stream Events'}
        </button>
      </div>

      {/* Execution Log */}
      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Live Broker Event Log:</div>
        {logMessages.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>Click "Publish Event Packet" to run simulation.</div> : logMessages.map((m, idx) => (
          <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)', marginBottom: 2 }}>{m}</div>
        ))}
      </div>
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
    <LldPage module="pub-sub" title="Pub Sub System" icon="📡" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          <style>{CSS}</style>
          {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

          {activeTab === 'simulation' && <AnimatedFlow />}

          {activeTab === 'app' && (
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
          )}
        </>
      )}
    </LldPage>
  );
}
