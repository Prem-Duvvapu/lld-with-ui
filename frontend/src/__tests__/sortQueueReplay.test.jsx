// @vitest-environment happy-dom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MergeSortReplay from '../lld/merge-sort/MergeSortReplay';
import BlockingQueueReplay from '../lld/blocking-queue/BlockingQueueReplay';
import * as merge from '../lld/merge-sort/api';
import * as queue from '../lld/blocking-queue/api';

vi.mock('../lld/merge-sort/api');
vi.mock('../lld/blocking-queue/api');

function mergeEvent(type, lo, hi, details = {}) {
  return { type, lo, hi, threadName: lo >= 2 ? 'worker-right' : 'worker-left', ...details };
}
const mergeRecording = {
  runId: 'merge-run', size: 4, parallelism: 2, sequentialThreshold: 2, distinctThreadsUsed: 2, durationMillis: 7,
  originalArray: [3, 0, 1, -2], sortedArray: [-2, 0, 1, 3],
  trace: [
    mergeEvent('PARTITION', 0, 3, { mid: 1 }),
    mergeEvent('FORK_RIGHT', 0, 3, { mid: 1 }),
    mergeEvent('PARTITION', 2, 3, { mid: 2 }),
    mergeEvent('BASE_CASE', 2, 2), mergeEvent('BASE_CASE', 3, 3),
    mergeEvent('MERGE_START', 2, 3, { mid: 2 }),
    mergeEvent('MERGE_WRITE', 2, 3, { mid: 2, position: 2, value: -2, sourceSide: 'RIGHT' }),
    mergeEvent('MERGE_WRITE', 2, 3, { mid: 2, position: 3, value: 1, sourceSide: 'LEFT' }),
    mergeEvent('MERGE_COMPLETE', 2, 3),
    mergeEvent('PARTITION', 0, 1, { mid: 0 }),
    mergeEvent('BASE_CASE', 0, 0), mergeEvent('BASE_CASE', 1, 1),
    mergeEvent('MERGE_START', 0, 1, { mid: 0 }),
    mergeEvent('MERGE_WRITE', 0, 1, { mid: 0, position: 0, value: 0, sourceSide: 'RIGHT' }),
    mergeEvent('MERGE_WRITE', 0, 1, { mid: 0, position: 1, value: 3, sourceSide: 'LEFT' }),
    mergeEvent('MERGE_COMPLETE', 0, 1),
    mergeEvent('MERGE_START', 0, 3, { mid: 1 }),
    mergeEvent('MERGE_WRITE', 0, 3, { mid: 1, position: 0, value: -2, sourceSide: 'RIGHT' }),
    mergeEvent('MERGE_WRITE', 0, 3, { mid: 1, position: 1, value: 0, sourceSide: 'LEFT' }),
    mergeEvent('MERGE_WRITE', 0, 3, { mid: 1, position: 2, value: 1, sourceSide: 'RIGHT' }),
    mergeEvent('MERGE_WRITE', 0, 3, { mid: 1, position: 3, value: 3, sourceSide: 'LEFT' }),
    mergeEvent('MERGE_COMPLETE', 0, 3),
  ].map((event, index) => ({ ...event, sequence: index + 1, elapsedNanos: index * 1000 })),
};
function queueEvent(type, threadName, queueSize, item = null) {
  return { type, threadName, queueSize, item, capacity: 2 };
}
const queueRecording = {
  runId: 'queue-run', capacity: 2, producers: 1, consumers: 2, itemsPerProducer: 3, totalItems: 3, maxObservedSize: 2, durationMillis: 4,
  trace: [
    queueEvent('DEQUEUE_ATTEMPT', 'consumer-1', 0),
    queueEvent('QUEUE_EMPTY', 'consumer-1', 0),
    queueEvent('DEQUEUE_BLOCKED', 'consumer-1', 0),
    queueEvent('ENQUEUE_ATTEMPT', 'producer-1', 0, 'P1-1'),
    queueEvent('ENQUEUE_SUCCESS', 'producer-1', 1, 'P1-1'),
    queueEvent('ENQUEUE_ATTEMPT', 'producer-1', 1, 'P1-2'),
    queueEvent('ENQUEUE_SUCCESS', 'producer-1', 2, 'P1-2'),
    queueEvent('ENQUEUE_ATTEMPT', 'producer-1', 2, 'P1-3'),
    queueEvent('QUEUE_FULL', 'producer-1', 2, 'P1-3'),
    queueEvent('ENQUEUE_BLOCKED', 'producer-1', 2, 'P1-3'),
    queueEvent('DEQUEUE_SUCCESS', 'consumer-1', 1, 'P1-1'),
    queueEvent('ENQUEUE_SUCCESS', 'producer-1', 2, 'P1-3'),
    queueEvent('DEQUEUE_ATTEMPT', 'consumer-2', 2),
    queueEvent('DEQUEUE_SUCCESS', 'consumer-2', 1, 'P1-2'),
    queueEvent('DEQUEUE_ATTEMPT', 'consumer-1', 1),
    queueEvent('DEQUEUE_SUCCESS', 'consumer-1', 0, 'P1-3'),
  ].map((event, index) => ({ ...event, sequence: index + 1, elapsedNanos: index * 1000 })),
};

beforeEach(() => {
  vi.resetAllMocks();
  merge.runMergeSort.mockResolvedValue(structuredClone(mergeRecording));
  queue.runBlockingQueue.mockResolvedValue(structuredClone(queueRecording));
});
afterEach(() => vi.useRealTimers());

async function runExperiment() {
  fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
  await waitFor(() => expect(screen.getByText(/Paused · 0\//)).toBeTruthy());
}
function seek(position) {
  fireEvent.change(screen.getByLabelText(/Applied events:/), { target: { value: String(position) } });
}
async function expandDetails(summary) {
  const details = screen.getByText(summary).closest('details');
  await act(async () => {
    details.open = true;
    fireEvent(details, new Event('toggle'));
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  return details;
}

describe('Merge sort recorded views', () => {
  it('validates drafts instead of clamping them and renders only returned arrays', async () => {
    render(<MergeSortReplay />);
    expect(merge.runMergeSort).not.toHaveBeenCalled();
    expect(screen.queryByRole('list')).toBeNull();
    for (const value of ['', '0', '65', '2.5', '1000000']) {
      fireEvent.change(screen.getByLabelText('Array size'), { target: { value } });
      fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    }
    expect(merge.runMergeSort).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Array size'), { target: { value: '64' } });
    await runExperiment();
    expect(merge.runMergeSort.mock.calls[0][0]).toEqual({ size: 64, parallelism: 4, sequentialThreshold: 2 });
    expect(within(screen.getByRole('list', { name: 'Committed array values' })).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText(/4 elements · parallelism 2 · sequential threshold 2/)).toBeTruthy();
    expect(screen.getByText('Recorded partition and merge tasks · 0 ranges')).toBeTruthy();
  });

  it('separates scratch writes from committed ranges through interleaved tasks and reverse seeking', async () => {
    render(<MergeSortReplay />);
    await runExperiment();
    const committed = () => within(screen.getByRole('list', { name: 'Committed array values' }));
    const scratch = () => within(screen.getByRole('list', { name: 'Scratch buffer values' }));
    seek(7);
    expect(committed().getByRole('listitem', { name: 'Index 2: 1' })).toBeTruthy();
    expect(scratch().getByRole('listitem', { name: 'Index 2: -2, selected event' })).toBeTruthy();
    expect(scratch().getByRole('listitem', { name: 'Index 0: not written' })).toBeTruthy();
    seek(9);
    expect(committed().getByRole('listitem', { name: 'Index 2: -2, selected event' })).toBeTruthy();
    seek(14);
    expect(scratch().getByRole('listitem', { name: 'Index 0: 0, selected event' })).toBeTruthy();
    expect(committed().getByRole('listitem', { name: 'Index 0: 3' })).toBeTruthy();
    seek(18);
    expect(committed().getByRole('listitem', { name: 'Index 0: 0' })).toBeTruthy();
    expect(scratch().getByRole('listitem', { name: 'Index 0: -2, selected event' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
    expect(committed().getAllByRole('listitem').map(cell => cell.querySelector('strong').textContent)).toEqual(['-2', '0', '1', '3']);
    seek(8);
    expect(committed().getByRole('listitem', { name: 'Index 2: 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
    expect(scratch().getAllByRole('listitem').every(cell => cell.querySelector('strong').textContent === '—')).toBe(true);
    expect(merge.runMergeSort).toHaveBeenCalledTimes(1);
  });

  it('reports actual recorded ranges and worker events without predicting unseen tasks', async () => {
    render(<MergeSortReplay />);
    await runExperiment();
    seek(3);
    const tasks = await expandDetails('Recorded partition and merge tasks · 2 ranges');
    expect(within(tasks).getAllByRole('heading')).toHaveLength(2);
    expect(within(tasks).queryByRole('heading', { name: 'Range [0, 1]' })).toBeNull();
    const workers = within(screen.getByRole('region', { name: 'Recorded merge sort workers' }));
    expect(workers.getByText('Last recorded: FORK_RIGHT')).toBeTruthy();
    expect(workers.getByText('Last recorded: PARTITION')).toBeTruthy();
    const log = await expandDetails('Full backend recording · 22 events');
    expect(within(log).getAllByRole('listitem')).toHaveLength(22);
    expect(log.querySelector('[aria-current="step"]').textContent).toContain('#3');
  });

  it('preserves the recording and its actual parameters when another run fails', async () => {
    render(<MergeSortReplay />);
    await runExperiment();
    seek(9);
    merge.runMergeSort.mockRejectedValueOnce(new Error('Backend refused sort parameters'));
    fireEvent.change(screen.getByLabelText('Parallelism'), { target: { value: '16' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Backend refused sort parameters'));
    expect(screen.getByText(/4 elements · parallelism 2/)).toBeTruthy();
    expect(screen.getByRole('progressbar').value).toBe(9);
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
    expect(screen.getByRole('progressbar').value).toBe(10);
    expect(merge.runMergeSort).toHaveBeenCalledTimes(2);
  });
});

it('keeps both large sort arrays in one bounded window with optional event following', async () => {
  const values = Array.from({ length: 64 }, (_, index) => index + 1);
  merge.runMergeSort.mockResolvedValueOnce({ ...mergeRecording, size: 64, originalArray: values, sortedArray: values, trace: [{ ...mergeRecording.trace[6], position: 50, lo: 48, hi: 51, value: 51 }] });
  render(<MergeSortReplay />);
  await runExperiment();
  const committed = () => within(screen.getByRole('list', { name: 'Committed array values' }));
  const scratch = () => within(screen.getByRole('list', { name: 'Scratch buffer values' }));
  expect(committed().getAllByRole('listitem')).toHaveLength(16);
  expect(scratch().getAllByRole('listitem')).toHaveLength(16);
  seek(1);
  expect(screen.getByText('Indices 48–63 of 64')).toBeTruthy();
  expect(committed().getByRole('listitem', { name: 'Index 50: 51' })).toBeTruthy();
  expect(scratch().getByRole('listitem', { name: 'Index 50: 51, selected event' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous indices' }));
  expect(screen.getByLabelText('Follow selected event').checked).toBe(false);
  expect(screen.getByText('Indices 32–47 of 64')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
  expect(screen.getByText('Indices 32–47 of 64')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Follow selected event'));
  expect(screen.getByText('Indices 0–15 of 64')).toBeTruthy();
  expect(merge.runMergeSort).toHaveBeenCalledTimes(1);
});

it('replays a singleton base case without inventing scratch writes or merges', async () => {
  merge.runMergeSort.mockResolvedValueOnce({ ...mergeRecording, size: 1, originalArray: [0], sortedArray: [0], distinctThreadsUsed: 1, trace: [{ ...mergeRecording.trace[0], type: 'BASE_CASE', lo: 0, hi: 0, mid: null }] });
  render(<MergeSortReplay />);
  fireEvent.change(screen.getByLabelText('Array size'), { target: { value: '1' } });
  await runExperiment();
  expect(merge.runMergeSort.mock.calls[0][0].size).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
  expect(screen.getByText('Replay complete · 1/1 events applied')).toBeTruthy();
  expect(within(screen.getByRole('list', { name: 'Committed array values' })).getByRole('listitem', { name: 'Index 0: 0' })).toBeTruthy();
  expect(within(screen.getByRole('list', { name: 'Scratch buffer values' })).getByRole('listitem', { name: 'Index 0: not written' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
  expect(screen.getByRole('progressbar').value).toBe(0);
});

describe('Blocking queue recorded views', () => {
  it('validates capacity and thread drafts before requesting or allocating any slots', async () => {
    render(<BlockingQueueReplay />);
    for (const value of ['', '-1', '51', '1.5', '1000000']) {
      fireEvent.change(screen.getByLabelText('Capacity'), { target: { value } });
      fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    }
    expect(queue.runBlockingQueue).not.toHaveBeenCalled();
    expect(screen.queryByRole('list')).toBeNull();
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Producers'), { target: { value: '13' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    expect(queue.runBlockingQueue).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Producers'), { target: { value: '12' } });
    await runExperiment();
    expect(queue.runBlockingQueue.mock.calls[0][0]).toEqual({ capacity: 50, producers: 12, consumers: 2, itemsPerProducer: 3 });
    expect(within(screen.getByRole('list', { name: 'Recorded queue slots' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/capacity 2 · producers: 1 · consumers: 2/)).toBeTruthy();
  });

  it('reconstructs FIFO contents only on successful events and supports backward seeking', async () => {
    render(<BlockingQueueReplay />);
    await runExperiment();
    const slots = () => within(screen.getByRole('list', { name: 'Recorded queue slots' }));
    seek(4);
    expect(slots().getByRole('listitem', { name: 'Slot 0: empty' })).toBeTruthy();
    seek(10);
    expect(slots().getByRole('listitem', { name: 'Slot 0: P1-1, front' })).toBeTruthy();
    expect(slots().getByRole('listitem', { name: 'Slot 1: P1-2' })).toBeTruthy();
    seek(11);
    expect(slots().getByRole('listitem', { name: 'Slot 0: P1-2, front' })).toBeTruthy();
    seek(12);
    expect(slots().getByRole('listitem', { name: 'Slot 1: P1-3' })).toBeTruthy();
    expect(screen.getByText(/Backend occupancy at the selected event: 2\/2/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
    expect(screen.getByRole('heading', { name: 'FIFO buffer · 0/2 occupied' })).toBeTruthy();
    seek(7);
    expect(slots().getByRole('listitem', { name: 'Slot 0: P1-1, front' })).toBeTruthy();
    expect(queue.runBlockingQueue).toHaveBeenCalledTimes(1);
  });

  it('labels waits as last-recorded observations, never as current lock ownership', async () => {
    render(<BlockingQueueReplay />);
    await runExperiment();
    seek(10);
    expect(screen.getByText('Last recorded: ENQUEUE_BLOCKED')).toBeTruthy();
    expect(screen.getByText('Last recorded: DEQUEUE_BLOCKED')).toBeTruthy();
    expect(screen.queryByText(/Locked by|ReentrantLock Unlocked/)).toBeNull();
    seek(11);
    expect(screen.queryByText('Last recorded: DEQUEUE_BLOCKED')).toBeNull();
    expect(screen.getByText('Last recorded: ENQUEUE_BLOCKED')).toBeTruthy();
    seek(12);
    expect(screen.queryByText('Last recorded: ENQUEUE_BLOCKED')).toBeNull();
    expect(screen.getByText('Last recorded: ENQUEUE_SUCCESS')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
    expect(screen.getAllByText('No applied events')).toHaveLength(3);
  });

  it('preserves the previous queue recording after a failed experiment', async () => {
    render(<BlockingQueueReplay />);
    await runExperiment();
    seek(7);
    queue.runBlockingQueue.mockRejectedValueOnce(new Error('Queue experiment rejected'));
    fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Queue experiment rejected'));
    expect(screen.getByRole('progressbar').value).toBe(7);
    expect(screen.getByRole('heading', { name: 'FIFO buffer · 2/2 occupied' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous event' }));
    expect(screen.getByRole('heading', { name: 'FIFO buffer · 1/2 occupied' })).toBeTruthy();
    expect(queue.runBlockingQueue).toHaveBeenCalledTimes(2);
  });
});

it.each([
  ['merge sort', MergeSortReplay, merge.runMergeSort, mergeRecording],
  ['blocking queue', BlockingQueueReplay, queue.runBlockingQueue, queueRecording],
])('aborts a pending %s experiment on departure and discards its late response', async (_name, Component, execute, recording) => {
  let finish;
  execute.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = render(<Component />);
  fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
  expect(screen.getByRole('button', { name: 'Stop waiting' })).toBeTruthy();
  const signal = execute.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  vi.useFakeTimers();
  await act(async () => { finish(recording); });
  expect(vi.getTimerCount()).toBe(0);
  expect(execute).toHaveBeenCalledTimes(1);
});
