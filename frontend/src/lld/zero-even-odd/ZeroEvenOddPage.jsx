import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Print Zero Even Odd';
const DESC = 'Three threads print numbers: Thread A prints 0, Thread B prints even numbers, Thread C prints odd numbers. Sequence: 0102030405...';
const CODE = `class ZeroEvenOdd {
  private int n;
  private Semaphore zeroSema = new Semaphore(1);
  private Semaphore evenSema = new Semaphore(0);
  private Semaphore oddSema = new Semaphore(0);

  public ZeroEvenOdd(int n) { this.n = n; }

  public void zero(IntConsumer printNumber) throws InterruptedException {
    for (int i = 1; i <= n; i++) {
      zeroSema.acquire();
      printNumber.accept(0);
      if (i % 2 == 0) evenSema.release();
      else oddSema.release();
    }
  }

  public void even(IntConsumer printNumber) throws InterruptedException {
    for (int i = 2; i <= n; i += 2) {
      evenSema.acquire();
      printNumber.accept(i);
      zeroSema.release();
    }
  }

  public void odd(IntConsumer printNumber) throws InterruptedException {
    for (int i = 1; i <= n; i += 2) {
      oddSema.acquire();
      printNumber.accept(i);
      zeroSema.release();
    }
  }
}`;

export default function ZeroEvenOddPage() {
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
