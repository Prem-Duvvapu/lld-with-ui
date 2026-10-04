// @vitest-environment happy-dom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import ConcurrentHashMapReplay from '../lld/concurrent-hashmap/ConcurrentHashMapReplay';
import RecordedOrderingReplay from '../components/RecordedOrderingReplay';
import * as mapApi from '../lld/concurrent-hashmap/api';

vi.mock('../lld/concurrent-hashmap/api');

const mapRecording = {
  runId: 'maps', segments: 1, threads: 2, incrementsPerThread: 1, distinctKeys: 1, computeRacers: 2,
  durationMillis: 12, totalIncrements: 2, sumOfFinalCounters: 2, computeExecutions: 1,
  trace: [
    { mapScope: 'COUNTERS', type: 'SEGMENT_LOCK_ACQUIRED', threadName: 'unusual-counter' },
    { mapScope: 'COUNTERS', type: 'MERGE_SUCCESS', key: '__proto__', valueAfter: '0' },
    { mapScope: 'COUNTERS', type: 'SEGMENT_LOCK_RELEASED', threadName: 'unusual-counter' },
    { mapScope: 'CONFIG', type: 'COMPUTE_IF_ABSENT_ATTEMPT', threadName: 'not-a-racer' },
    { mapScope: 'CONFIG', type: 'COMPUTE_IF_ABSENT_COMPUTED', key: 'shared-config', valueAfter: 'computed-value' },
    { mapScope: 'CONFIG', type: 'COMPUTE_IF_ABSENT_SKIPPED' },
    { mapScope: 'COUNTERS', type: 'REMOVE_SUCCESS', key: '__proto__' },
  ].map((event, index) => ({ sequence: index + 1, elapsedNanos: index * 1000, segmentIndex: 0, threadName: 'source', ...event })),
};
const scenes = [
  ['foo-bar', 'Repetitions', 'n', 1000, 'FOO_ATTEMPT', 'FOO_PRINTED', 'item', 'foo'],
  ['zero-even-odd', 'Upper bound', 'n', 2000, 'ZERO_ATTEMPT', 'ZERO_PRINTED', 'token', '0'],
  ['fizz-buzz', 'Upper bound', 'n', 3000, 'FIZZBUZZ_ATTEMPT', 'FIZZBUZZ_PRINTED', 'token', 'FizzBuzz'],
  ['h2o', 'Molecules to bond', 'moleculeCount', 150, 'HYDROGEN_ATTEMPT', 'MOLECULE_BONDED', 'item', 'H2O-recorded-id'],
];

function orderingRecording(field, attempt, printed, tokenField, token) {
  return {
    runId: 'ordering', [field]: 1, threadCount: 3, durationMillis: 5, hydrogenCount: 2, oxygenCount: 1, result: 'exact backend result',
    events: [attempt, printed].map((type, index) => ({ sequence: index + 1, elapsedNanos: index * 1000, threadName: 'actual-source', type, [tokenField]: token, repetition: 1, n: 1, outputLength: index })),
  };
}

function submit() {
  fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
}
async function load() {
  submit();
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Paused · 0/'));
}
function seek(position) {
  fireEvent.change(screen.getByLabelText(/^Applied events:/), { target: { value: String(position) } });
}
function output(kind) {
  return screen.queryByRole('list', { name: kind === 'h2o' ? 'Recorded molecule cards' : 'Recorded output tokens' });
}
beforeEach(() => {
  vi.resetAllMocks();
  mapApi.runConcurrentHashMap.mockResolvedValue(structuredClone(mapRecording));
});

it('validates map settings without allocating a preview and uses returned settings', async () => {
  render(<ConcurrentHashMapReplay />);
  const input = screen.getByLabelText('Segments per map');
  for (const value of ['', '0', '-1', '33', '1.5', '100000000']) {
    fireEvent.change(input, { target: { value } });
    submit();
  }
  expect(mapApi.runConcurrentHashMap).not.toHaveBeenCalled();
  expect(screen.queryByRole('list')).toBeNull();
  fireEvent.change(input, { target: { value: '32' } });
  await load();
  expect(mapApi.runConcurrentHashMap.mock.calls[0][0].segments).toBe(32);
  expect(screen.getByText(/actual 1 segments per map/)).toBeTruthy();
  expect(within(screen.getByRole('list', { name: 'COUNTERS map segments' })).getAllByRole('listitem')).toHaveLength(1);
});

it('isolates maps sharing a segment and displays only recorded mutations and lock observations', async () => {
  render(<ConcurrentHashMapReplay />);
  await load();
  fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
  expect(screen.getByText('Recorded acquisition by unusual-counter')).toBeTruthy();
  seek(3);
  expect(screen.getByText('Release announced by unusual-counter')).toBeTruthy();
  let inspector = within(screen.getByRole('region', { name: 'Recorded map inspector' }));
  expect(inspector.getByText('__proto__')).toBeTruthy();
  expect(inspector.getByText('0', { selector: 'dd' })).toBeTruthy();
  seek(4);
  expect(screen.getByText('Completed compute events applied: 0')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Configuration map' })).toBeTruthy();
  expect(inspector.queryByText('__proto__')).toBeNull();
  seek(6);
  expect(screen.getByText('Completed compute events applied: 1')).toBeTruthy();
  expect(inspector.getByText('shared-config')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Map to inspect'), { target: { value: 'COUNTERS' } });
  inspector = within(screen.getByRole('region', { name: 'Recorded map inspector' }));
  expect(inspector.queryByText('shared-config')).toBeNull();
  expect(inspector.getByText('__proto__')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
  expect(inspector.queryByText('__proto__')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Previous event' }));
  expect(inspector.getByText('__proto__')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
  expect(inspector.queryByText('__proto__')).toBeNull();
  expect(screen.getByText('Completed compute events applied: 0')).toBeTruthy();
  expect(mapApi.runConcurrentHashMap).toHaveBeenCalledTimes(1);
});

it('bounds large map rendering and follows actual segment metadata rather than hashing keys', async () => {
  mapApi.runConcurrentHashMap.mockResolvedValue({ ...mapRecording, segments: 32, trace: [{ ...mapRecording.trace[1], segmentIndex: 31 }] });
  render(<ConcurrentHashMapReplay />);
  await load();
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
  fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
  expect(screen.getByText('Segment page 4 of 4')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Segment 31' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous segments' }));
  expect(screen.getByLabelText('Follow selected event').checked).toBe(false);
  expect(screen.getByText('Segment page 3 of 4')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Follow selected event'));
  expect(screen.getByText('Segment page 4 of 4')).toBeTruthy();
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
});

it('rejects missing map identity without guessing from thread names or losing the old recording', async () => {
  render(<ConcurrentHashMapReplay />);
  await load();
  seek(2);
  mapApi.runConcurrentHashMap.mockResolvedValueOnce({ ...mapRecording, trace: [{ ...mapRecording.trace[0], mapScope: undefined }] });
  submit();
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('lacks map-source telemetry'));
  expect(screen.getByRole('progressbar').value).toBe(2);
  expect(screen.getByText('__proto__')).toBeTruthy();
  expect(mapApi.runConcurrentHashMap).toHaveBeenCalledTimes(2);
});

it.each(scenes)('%s validates settings and replays exact recorded output, never attempts', async (kind, label, field, maximum, attempt, printed, tokenField, token) => {
  const execute = vi.fn().mockResolvedValue(orderingRecording(field, attempt, printed, tokenField, token));
  render(<RecordedOrderingReplay kind={kind} executeRun={execute} />);
  const input = screen.getByLabelText(label);
  expect(Number(input.max)).toBe(maximum);
  for (const value of ['', '0', '-1', String(maximum + 1), '1.5']) {
    fireEvent.change(input, { target: { value } });
    submit();
  }
  expect(execute).not.toHaveBeenCalled();
  expect(screen.queryByRole('list')).toBeNull();
  fireEvent.change(input, { target: { value: String(maximum) } });
  await load();
  expect(execute.mock.calls[0][0]).toEqual({ [field]: maximum });
  expect(output(kind)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
  expect(output(kind)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
  expect(within(output(kind)).getByText(token, { selector: 'strong' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous event' }));
  expect(output(kind)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
  expect(output(kind)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
  expect(output(kind)).toBeNull();
  expect(execute).toHaveBeenCalledTimes(1);
});

it('retains H2O acquisitions at bonding and removes only each recorded departing thread', async () => {
  const response = orderingRecording('moleculeCount', 'HYDROGEN_ATTEMPT', 'MOLECULE_BONDED', 'item', 'H2O-1');
  response.events = [
    ['HYDROGEN_ACQUIRED', 'hydrogen-a', 'H'], ['HYDROGEN_ACQUIRED', 'hydrogen-b', 'H'], ['OXYGEN_ACQUIRED', 'oxygen-a', 'O'],
    ['MOLECULE_BONDED', 'oxygen-a', 'H2O-1'], ['HYDROGEN_DEPARTED', 'hydrogen-b', 'H'], ['OXYGEN_DEPARTED', 'oxygen-a', 'O'], ['HYDROGEN_DEPARTED', 'hydrogen-a', 'H'],
  ].map(([type, threadName, item], index) => ({ sequence: index + 1, type, threadName, item, elapsedNanos: index * 1000, outputLength: 0 }));
  render(<RecordedOrderingReplay kind="h2o" executeRun={vi.fn().mockResolvedValue(response)} />);
  await load();
  seek(4);
  expect(screen.getByRole('heading', { name: 'Acquired atoms without a recorded departure · 3' })).toBeTruthy();
  expect(within(output('h2o')).getByText('H2O-1')).toBeTruthy();
  seek(5);
  const atoms = screen.getByRole('list', { name: 'Atoms acquired without a recorded departure' });
  expect(within(atoms).queryByText('hydrogen-b')).toBeNull();
  expect(within(atoms).getByText('hydrogen-a')).toBeTruthy();
  seek(4);
  expect(within(screen.getByRole('list', { name: 'Atoms acquired without a recorded departure' })).getByText('hydrogen-b')).toBeTruthy();
  seek(7);
  expect(screen.queryByRole('list', { name: 'Atoms acquired without a recorded departure' })).toBeNull();
});

it('pages large output and worker rosters without altering recorded tokens or complete results', async () => {
  const response = orderingRecording('n', 'FOO_ATTEMPT', 'FOO_PRINTED', 'item', 'foo');
  response.events = Array.from({ length: 55 }, (_, index) => ({ sequence: index + 1, type: 'FOO_PRINTED', threadName: `source-${index}`, item: `backend-token-${index}`, elapsedNanos: index, repetition: index }));
  render(<RecordedOrderingReplay kind="foo-bar" executeRun={vi.fn().mockResolvedValue(response)} />);
  await load();
  fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
  expect(screen.getByText('Output page 3 of 3')).toBeTruthy();
  expect(within(output('foo-bar')).getAllByRole('listitem')).toHaveLength(7);
  fireEvent.click(screen.getByRole('button', { name: 'Previous output page' }));
  expect(within(output('foo-bar')).getAllByRole('listitem')).toHaveLength(24);
  expect(within(output('foo-bar')).getByText('backend-token-24')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Follow latest output'));
  expect(screen.getByText('Output page 3 of 3')).toBeTruthy();
  const observations = screen.getByRole('region', { name: 'Recorded worker activity' });
  expect(observations.querySelectorAll('.simulation-panel-grid > div')).toHaveLength(12);
  const details = observations.querySelector('details');
  await act(async () => { details.open = true; fireEvent(details, new Event('toggle')); });
  fireEvent.click(screen.getByRole('button', { name: 'Next worker page' }));
  expect(screen.getByText('Worker page 2 of 5')).toBeTruthy();
  expect(within(observations).getByRole('heading', { name: 'source-12' })).toBeTruthy();
  const summary = screen.getByText('Backend run summary and complete result').closest('details');
  await act(async () => { summary.open = true; fireEvent(summary, new Event('toggle')); });
  expect(screen.getByText('Backend result: exact backend result')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
  expect(output('foo-bar')).toBeNull();
});

it.each(scenes)('%s preserves a failed rerun and aborts pending work on departure', async (kind, label, field, maximum, attempt, printed, tokenField, token) => {
  const response = orderingRecording(field, attempt, printed, tokenField, token);
  let finish;
  const execute = vi.fn().mockResolvedValueOnce(response).mockRejectedValueOnce(new Error('Domain request rejected')).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = render(<RecordedOrderingReplay kind={kind} executeRun={execute} />);
  await load();
  seek(2);
  submit();
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Domain request rejected'));
  expect(output(kind)).toBeTruthy();
  expect(screen.getByRole('progressbar').value).toBe(2);
  submit();
  const signal = execute.mock.calls[2][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => { finish(response); });
  expect(execute).toHaveBeenCalledTimes(3);
});

it('aborts map collection and ignores late results after stopping the wait', async () => {
  let finish;
  mapApi.runConcurrentHashMap.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<ConcurrentHashMapReplay />);
  submit();
  const signal = mapApi.runConcurrentHashMap.mock.calls[0][1].signal;
  fireEvent.click(screen.getByRole('button', { name: 'Stop waiting' }));
  expect(signal.aborted).toBe(true);
  await act(async () => { finish(mapRecording); });
  expect(screen.queryByRole('list')).toBeNull();
  expect(screen.getByRole('alert').textContent).toContain('backend may still finish');
});
