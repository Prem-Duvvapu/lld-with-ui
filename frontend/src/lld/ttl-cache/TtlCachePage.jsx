import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Thread-Safe Cache with TTL';
const DESC = 'A cache that stores key-value pairs with a time-to-live (TTL). Entries expire after the TTL. Thread-safe for concurrent access.';
const CODE = `public class TtlCache<K, V> {
  private final ConcurrentHashMap<K, CacheEntry<V>> map = new ConcurrentHashMap<>();
  private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor();
  private final long ttlMillis;

  public TtlCache(long ttlMillis) {
    this.ttlMillis = ttlMillis;
    cleaner.scheduleAtFixedRate(this::evictExpired, ttlMillis, ttlMillis, TimeUnit.MILLISECONDS);
  }

  public void put(K key, V value) {
    map.put(key, new CacheEntry<>(value, System.currentTimeMillis()));
  }

  public V get(K key) {
    CacheEntry<V> entry = map.get(key);
    if (entry == null) return null;
    if (System.currentTimeMillis() - entry.timestamp > ttlMillis) {
      map.remove(key);
      return null;
    }
    return entry.value;
  }

  private void evictExpired() {
    long now = System.currentTimeMillis();
    map.entrySet().removeIf(e -> now - e.getValue().timestamp > ttlMillis);
  }

  private static class CacheEntry<V> {
    final V value;
    final long timestamp;
    CacheEntry(V value, long timestamp) {
      this.value = value; this.timestamp = timestamp;
    }
  }
}`;

export default function TtlCachePage() {
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
