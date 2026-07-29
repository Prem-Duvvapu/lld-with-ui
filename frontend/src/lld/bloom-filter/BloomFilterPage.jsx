import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Design Concurrent Bloom Filter';
const DESC = 'A thread-safe Bloom filter — a space-efficient probabilistic data structure for set membership queries. Uses multiple hash functions and a bit array.';
const CODE = `public class ConcurrentBloomFilter {
  private final BitSet bitset;
  private final int size;
  private final int numHashFunctions;
  private final ReentrantLock[] locks;

  public ConcurrentBloomFilter(int size, int numHashFunctions) {
    this.size = size;
    this.numHashFunctions = numHashFunctions;
    this.bitset = new BitSet(size);
    this.locks = new ReentrantLock[16];
    for (int i = 0; i < 16; i++) locks[i] = new ReentrantLock();
  }

  private int hash(String value, int seed) {
    return Math.abs((value.hashCode() ^ (seed * 0x9e3779b9)) % size);
  }

  private int lockIndex(int bit) {
    return Math.abs(bit % locks.length);
  }

  public void add(String value) {
    for (int i = 0; i < numHashFunctions; i++) {
      int bit = hash(value, i);
      locks[lockIndex(bit)].lock();
      try { bitset.set(bit); }
      finally { locks[lockIndex(bit)].unlock(); }
    }
  }

  public boolean mightContain(String value) {
    for (int i = 0; i < numHashFunctions; i++) {
      int bit = hash(value, i);
      locks[lockIndex(bit)].lock();
      try {
        if (!bitset.get(bit)) return false;
      } finally { locks[lockIndex(bit)].unlock(); }
    }
    return true;
  }
}`;

export default function BloomFilterPage() {
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
