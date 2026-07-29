import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Design Concurrent HashMap';
const DESC = 'A thread-safe hashmap implementation using 分段锁 (segment locking) similar to Java\'s ConcurrentHashMap.';
const CODE = `public class SimpleConcurrentHashMap<K, V> {
  private static final int SEGMENTS = 16;
  private final Segment[] segments;

  public SimpleConcurrentHashMap() {
    segments = new Segment[SEGMENTS];
    for (int i = 0; i < SEGMENTS; i++) segments[i] = new Segment();
  }

  private int segmentIndex(K key) {
    return Math.abs(key.hashCode() % SEGMENTS);
  }

  public void put(K key, V value) {
    Segment seg = segments[segmentIndex(key)];
    seg.lock();
    try { seg.map.put(key, value); }
    finally { seg.unlock(); }
  }

  public V get(K key) {
    Segment seg = segments[segmentIndex(key)];
    seg.lock();
    try { return seg.map.get(key); }
    finally { seg.unlock(); }
  }

  private static class Segment {
    final ReentrantLock lock = new ReentrantLock();
    final HashMap<Object, Object> map = new HashMap<>();
    void lock() { lock.lock(); }
    void unlock() { lock.unlock(); }
  }
}`;

export default function ConcurrentHashMapPage() {
  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home" style={{ color: '#667eea', textDecoration: 'none' }}>← Back to Home</Link>
      <div className="header">
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>{TITLE}</h1>
        <p style={{ color: '#888', fontSize: 14 }}>Concurrency & Multi-threading</p>
      </div>
      <main>
        <div className="content-section">
          <div className="desc">{DESC}</div>
          <div className="code-block">{CODE}</div>
        </div>
      </main>
    </div>
  );
}
