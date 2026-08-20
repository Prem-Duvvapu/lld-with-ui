import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getTopics, createTopic, subscribe, unsubscribe, publish,
  simReset, simPublish, simSubscribe, simUnsubscribe, simGetSnapshots
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import ThemeToggle from '../../components/ThemeToggle';

export default function PubSubPage() {
  const [activeTab, setActiveTab] = useState('topics');

  // Real state
  const [topics, setTopics] = useState([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('tech-news');
  const [publishPayload, setPublishPayload] = useState('');
  const [publisherId, setPublisherId] = useState('pub-1');
  const [subId, setSubId] = useState('sub-new');
  const [subName, setSubName] = useState('New Analytics Engine');
  const [subType, setSubType] = useState('PRINT');
  const [subCapacity, setSubCapacity] = useState(20);

  // Sim state
  const [simSnapshots, setSimSnapshots] = useState([]);
  const [simStepIdx, setSimStepIdx] = useState(0);
  const [simIsPlaying, setSimIsPlaying] = useState(false);
  const [simPublishText, setSimPublishText] = useState('Breaking News Update');
  const [simLog, setSimLog] = useState([]);

  useEffect(() => {
    fetchTopics();
    fetchSimData();
  }, []);

  useEffect(() => {
    let timer;
    if (simIsPlaying) {
      timer = setInterval(() => {
        handleSimPublishFast();
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [simIsPlaying]);

  const fetchTopics = async () => {
    try {
      const data = await getTopics();
      if (Array.isArray(data)) {
        setTopics(data);
        if (data.length > 0 && !selectedTopic) {
          setSelectedTopic(data[0].name);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSimData = async () => {
    try {
      const data = await simGetSnapshots();
      if (Array.isArray(data)) {
        setSimSnapshots(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName) return;
    try {
      await createTopic(newTopicName);
      setNewTopicName('');
      fetchTopics();
    } catch (e) {
      alert(e.message);
    }
  };

  const handlePublish = async () => {
    if (!selectedTopic || !publishPayload) return;
    try {
      const rejected = await publish(selectedTopic, publishPayload, publisherId);
      if (rejected && rejected.length > 0) {
        alert('Backpressure triggered! Rejected by subscribers: ' + rejected.join(', '));
      } else {
        setPublishPayload('');
      }
      fetchTopics();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedTopic || !subId) return;
    try {
      await subscribe(selectedTopic, subId, subName, subType, subCapacity, subType === 'SLOW' ? 250 : 0);
      alert(`Subscribed ${subName} to ${selectedTopic}`);
      fetchTopics();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUnsubscribe = async (topicName, subscriberId) => {
    try {
      await unsubscribe(topicName, subscriberId);
      fetchTopics();
    } catch (e) {
      alert(e.message);
    }
  };

  // Simulation Controls
  const handleSimReset = async () => {
    try {
      const snaps = await simReset();
      setSimSnapshots(snaps);
      setSimLog([{ time: new Date().toLocaleTimeString(), text: 'Reset simulation environment' }]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimPublishFast = async () => {
    try {
      const text = simPublishText || 'News Particle #' + Math.floor(Math.random() * 900 + 100);
      const snaps = await simPublish('tech-news', text, 'pub-sim');
      setSimSnapshots(snaps);
      setSimLog(prev => [{ time: new Date().toLocaleTimeString(), text: `Published '${text}' to tech-news` }, ...prev.slice(0, 15)]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            ← Back to All Case Studies
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            📡 Pub/Sub System (Message Broker)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            High-Throughput Topic Broker with Dedicated Per-Subscriber Worker Queues & Backpressure Rejection
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', marginBottom: '24px' }}>
        {[
          { id: 'topics', label: '📡 Topics & Publishers' },
          { id: 'subscribers', label: '📥 Subscribers & Inboxes' },
          { id: 'simulation', label: '🕹️ Interactive 2D Simulation' },
          { id: 'diagram', label: '📐 Class Diagram' },
          { id: 'details', label: '📋 Design Details' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: 700,
              color: activeTab === t.id ? 'var(--accent-color, #7c3aed)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.id ? '3px solid var(--accent-color, #7c3aed)' : 'none',
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Topics & Publishers */}
      {activeTab === 'topics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>➕ Create Topic</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Topic Name (e.g. crypto-alerts)"
                value={newTopicName}
                onChange={e => setNewTopicName(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleCreateTopic}
                style={{ padding: '10px 18px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Create
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '24px', marginBottom: '16px' }}>🚀 Publish Message</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Select Topic:</label>
                <select
                  value={selectedTopic}
                  onChange={e => setSelectedTopic(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginTop: '4px' }}
                >
                  {topics.map(t => <option key={t.name} value={t.name}>{t.name} ({t.publishedCount} published)</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Publisher ID:</label>
                <input
                  type="text"
                  value={publisherId}
                  onChange={e => setPublisherId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Message Payload:</label>
                <textarea
                  rows={3}
                  placeholder="Type message content..."
                  value={publishPayload}
                  onChange={e => setPublishPayload(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginTop: '4px' }}
                />
              </div>

              <button
                onClick={handlePublish}
                style={{ padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Publish Now
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📡 Active Topics ({topics.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topics.map(t => (
                <div key={t.name} style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#7c3aed' }}>{t.name}</span>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                      {t.publishedCount} Published
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong>Subscribers ({t.workers ? t.workers.length : 0}):</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {t.workers && t.workers.map(w => (
                        <span key={w.subscriber.id} style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                          👤 {w.subscriber.name} (Q: {w.queueSize}/{w.queueCapacity})
                          <button
                            onClick={() => handleUnsubscribe(t.name, w.subscriber.id)}
                            style={{ marginLeft: '6px', background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {(!t.workers || t.workers.length === 0) && <span style={{ fontStyle: 'italic' }}>No active subscribers</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Subscribers & Inboxes */}
      {activeTab === 'subscribers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📥 Add New Subscriber</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Target Topic:</label>
                <select
                  value={selectedTopic}
                  onChange={e => setSelectedTopic(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  {topics.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Subscriber ID:</label>
                <input
                  type="text"
                  value={subId}
                  onChange={e => setSubId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Subscriber Name:</label>
                <input
                  type="text"
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Subscriber Type:</label>
                <select
                  value={subType}
                  onChange={e => setSubType(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="PRINT">Fast Consumer (0ms delay)</option>
                  <option value="SLOW">Slow Consumer (250ms delay)</option>
                  <option value="LOGGING">Audit Logger</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Bounded Queue Capacity:</label>
                <input
                  type="number"
                  value={subCapacity}
                  onChange={e => setSubCapacity(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <button
                onClick={handleSubscribe}
                style={{ padding: '12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Subscribe Now
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📊 Live Subscriber Queues & Inboxes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topics.map(t => (
                <div key={t.name} style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#7c3aed', marginBottom: '8px' }}>Topic: {t.name}</h4>
                  {t.workers && t.workers.map(w => {
                    const pct = Math.round((w.queueSize / w.queueCapacity) * 100);
                    return (
                      <div key={w.subscriber.id} style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                          <span>👤 {w.subscriber.name} <code style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({w.subscriber.id})</code></span>
                          <span>Delivered: {w.deliveredCount} | Rejected: <span style={{ color: w.rejectedCount > 0 ? '#ef4444' : 'inherit' }}>{w.rejectedCount}</span></span>
                        </div>

                        {/* Queue depth progress bar */}
                        <div style={{ margin: '8px 0', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#10b981', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                          Queue Depth: {w.queueSize} / {w.queueCapacity} items ({pct}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive 2D Simulation */}
      {activeTab === 'simulation' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>🕹️ Interactive Pub/Sub Simulation</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Demonstrates high-throughput publishing, dedicated consumer queues, and slow-subscriber backpressure rejections.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSimReset}
                style={{ padding: '10px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                🔄 Reset Sim
              </button>
              <button
                onClick={handleSimPublishFast}
                style={{ padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                ⚡ Rapid Burst Publish
              </button>
              <button
                onClick={() => setSimIsPlaying(!simIsPlaying)}
                style={{ padding: '10px 16px', background: simIsPlaying ? '#ef4444' : '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                {simIsPlaying ? '⏸ Pause Auto-Publish' : '▶ Auto-Publish Stream'}
              </button>
            </div>
          </div>

          {/* 2D Canvas Visualization Diagram */}
          <div style={{ background: '#0f172a', padding: '24px', borderRadius: '12px', color: 'white', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '260px' }}>
              {/* Publisher Column */}
              <div style={{ textAlign: 'center', width: '140px' }}>
                <div style={{ background: '#3b82f6', padding: '16px', borderRadius: '12px', fontWeight: 800, boxShadow: '0 0 15px rgba(59,130,246,0.5)' }}>
                  📡 Publisher
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>pub-sim</div>
              </div>

              {/* Central Broker Hub */}
              <div style={{ textAlign: 'center', background: '#1e293b', border: '2px solid #7c3aed', padding: '20px 30px', borderRadius: '16px', boxShadow: '0 0 25px rgba(124,58,237,0.4)' }}>
                <div style={{ fontSize: '24px' }}>⚡</div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#a78bfa' }}>Broker Hub</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>Topic: tech-news</div>
              </div>

              {/* Subscribers Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
                {simSnapshots.flatMap(t => t.subscribers || []).map(s => {
                  const pct = Math.round((s.queueSize / s.queueCapacity) * 100);
                  const isFull = s.queueSize >= s.queueCapacity;
                  return (
                    <div key={s.id} style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '8px', border: isFull ? '2px solid #ef4444' : '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span>👤 {s.name}</span>
                        <span style={{ color: s.type === 'SLOW' ? '#f59e0b' : '#10b981' }}>{s.type}</span>
                      </div>
                      <div style={{ height: '8px', background: '#334155', borderRadius: '4px', margin: '8px 0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isFull ? '#ef4444' : (s.type === 'SLOW' ? '#f59e0b' : '#10b981') }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                        <span>Queue: {s.queueSize}/{s.queueCapacity}</span>
                        <span>Delivered: {s.deliveredCount} | Rej: <strong style={{ color: s.rejectedCount > 0 ? '#ef4444' : 'inherit' }}>{s.rejectedCount}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Simulation Activity Log Feed */}
          <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>📜 Live Event Timeline Feed</h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'monospace', fontSize: '12px' }}>
              {simLog.map((log, idx) => (
                <div key={idx} style={{ color: log.text.includes('QUEUE FULL') ? '#ef4444' : 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>[{log.time}]</span>
                  {log.text}
                </div>
              ))}
              {simLog.length === 0 && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No events logged yet. Click 'Rapid Burst Publish'!</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Class Diagram */}
      {activeTab === 'diagram' && (
        <ClassDiagram module="pubsub" />
      )}

      {/* Tab 5: Design Details */}
      {activeTab === 'details' && (
        <DesignDetails module="pubsub" />
      )}
    </div>
  );
}
