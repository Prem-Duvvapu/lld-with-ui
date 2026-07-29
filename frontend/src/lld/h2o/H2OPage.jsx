import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Building H2O Molecule';
const DESC = 'Two threads release hydrogen (H) and oxygen (O) atoms. They must combine to form H2O molecules. Each molecule needs 2 hydrogens and 1 oxygen.';
const CODE = `class H2O {
  private Semaphore hSema = new Semaphore(2);
  private Semaphore oSema = new Semaphore(0);
  private CyclicBarrier barrier = new CyclicBarrier(3);

  public void hydrogen(Runnable releaseHydrogen) throws InterruptedException {
    hSema.acquire();
    releaseHydrogen.run();
    try { barrier.await(); } catch (BrokenBarrierException e) {}
    hSema.release();
  }

  public void oxygen(Runnable releaseOxygen) throws InterruptedException {
    oSema.acquire();
    releaseOxygen.run();
    try { barrier.await(); } catch (BrokenBarrierException e) {}
    oSema.release();
  }
}`;

export default function H2OPage() {
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
