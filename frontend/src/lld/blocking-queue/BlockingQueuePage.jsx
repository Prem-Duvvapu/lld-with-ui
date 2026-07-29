import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Design Thread-Safe Blocking Queue';
const DESC = 'A thread-safe bounded blocking queue where producers wait if full and consumers wait if empty.';
const CODE = `public class BlockingQueue<T> {
  private final T[] items;
  private int head = 0, tail = 0, count = 0;
  private final Lock lock = new ReentrantLock();
  private final Condition notFull = lock.newCondition();
  private final Condition notEmpty = lock.newCondition();

  @SuppressWarnings("unchecked")
  public BlockingQueue(int capacity) {
    items = (T[]) new Object[capacity];
  }

  public void put(T item) throws InterruptedException {
    lock.lock();
    try {
      while (count == items.length) notFull.await();
      items[tail] = item;
      tail = (tail + 1) % items.length;
      count++;
      notEmpty.signal();
    } finally { lock.unlock(); }
  }

  public T take() throws InterruptedException {
    lock.lock();
    try {
      while (count == 0) notEmpty.await();
      T item = items[head];
      head = (head + 1) % items.length;
      count--;
      notFull.signal();
      return item;
    } finally { lock.unlock(); }
  }
}`;

export default function BlockingQueuePage() {
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
