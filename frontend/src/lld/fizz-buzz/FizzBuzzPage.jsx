import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Fizz Buzz Multithreaded';
const DESC = 'Four threads print numbers 1 to n. Rules: divisible by 3 → fizz, 5 → buzz, both → fizzbuzz, else → number.';
const CODE = `class FizzBuzz {
  private int n;
  private int current = 1;
  private final Object lock = new Object();

  public FizzBuzz(int n) { this.n = n; }

  public void fizz(Runnable printFizz) throws InterruptedException {
    synchronized (lock) {
      while (current <= n) {
        if (current % 3 == 0 && current % 5 != 0) {
          printFizz.run(); current++; lock.notifyAll();
        } else lock.wait();
      }
    }
  }

  public void buzz(Runnable printBuzz) throws InterruptedException {
    synchronized (lock) {
      while (current <= n) {
        if (current % 5 == 0 && current % 3 != 0) {
          printBuzz.run(); current++; lock.notifyAll();
        } else lock.wait();
      }
    }
  }

  public void fizzbuzz(Runnable printFizzBuzz) throws InterruptedException {
    synchronized (lock) {
      while (current <= n) {
        if (current % 15 == 0) {
          printFizzBuzz.run(); current++; lock.notifyAll();
        } else lock.wait();
      }
    }
  }

  public void number(IntConsumer printNumber) throws InterruptedException {
    synchronized (lock) {
      while (current <= n) {
        if (current % 3 != 0 && current % 5 != 0) {
          printNumber.accept(current); current++; lock.notifyAll();
        } else lock.wait();
      }
    }
  }
}`;

export default function FizzBuzzPage() {
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
