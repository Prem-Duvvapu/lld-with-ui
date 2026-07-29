import { Link } from 'react-router-dom';

const styles = `
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #667eea; border-radius: 6px; color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600; }
.header { text-align: center; margin-bottom: 24px; }
.content-section { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.code-block { background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #b5e890; white-space: pre; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
`;

const TITLE = 'Multi-threaded Merge Sort';
const DESC = 'Merge sort that uses multiple threads to sort sub-arrays in parallel. Uses ForkJoinPool or custom thread pool.';
const CODE = `public class ParallelMergeSort {
  private static final int THRESHOLD = 1000;

  public static void sort(int[] arr) {
    ForkJoinPool pool = ForkJoinPool.commonPool();
    pool.invoke(new SortTask(arr, 0, arr.length - 1));
  }

  static class SortTask extends RecursiveAction {
    private final int[] arr;
    private final int left, right;

    SortTask(int[] arr, int left, int right) {
      this.arr = arr; this.left = left; this.right = right;
    }

    @Override
    protected void compute() {
      if (left >= right) return;
      if (right - left < THRESHOLD) {
        Arrays.sort(arr, left, right + 1);
        return;
      }
      int mid = left + (right - left) / 2;
      SortTask leftTask = new SortTask(arr, left, mid);
      SortTask rightTask = new SortTask(arr, mid + 1, right);
      invokeAll(leftTask, rightTask);
      merge(arr, left, mid, right);
    }

    private void merge(int[] arr, int left, int mid, int right) {
      int[] temp = Arrays.copyOfRange(arr, left, right + 1);
      int i = 0, j = mid - left + 1, k = left;
      int leftEnd = mid - left;
      int rightEnd = right - left;
      while (i <= leftEnd && j <= rightEnd)
        arr[k++] = temp[i] <= temp[j] ? temp[i++] : temp[j++];
      while (i <= leftEnd) arr[k++] = temp[i++];
    }
  }
}`;

export default function MergeSortPage() {
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
