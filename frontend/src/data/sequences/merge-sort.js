// Sequence diagram content for merge-sort.
// Grounded directly in MergeSortService#run / ParallelMergeSorter#sort (ForkJoinPool +
// RecursiveAction) — corrected after an earlier version invented "MergeSortTask" /
// "LeftSubTask" / "RightSubTask" classes (the real inner class is SortTask, a
// RecursiveAction, not a RecursiveTask) and skipped the real POST /run + RunResult/trace
// contract in favor of a bare pool.invoke() call.
export default {
  title: 'Parallel Merge Sort — ForkJoinPool SortTask Divide-and-Conquer',
  description:
    'How MergeSortService#run hands a cloned array to ParallelMergeSorter#sort, which submits one root SortTask (a RecursiveAction) to a freshly-sized ForkJoinPool; each task below sequentialThreshold sorts in place on the current thread, while larger ranges fork one half onto another pool worker and compute the other half on the current thread, then merge through a shared buffer.',
  flows: [
    {
      id: 'fork-join-sort-task-divide-and-conquer',
      label: 'POST /run — root SortTask forks the right half onto another worker while sorting the left half here',
      description:
        'A run request (size=7, parallelism=4, sequentialThreshold=2) either uses the supplied array or generates one at random, then blocks on ParallelMergeSorter#sort. The root SortTask covers [0,6]; because 7 elements exceed sequentialThreshold=2, it splits at the midpoint, forks the right SortTask so a different ForkJoinPool worker may steal and run it, computes the left SortTask itself, joins the forked task, then merges both sorted halves through the shared buffer array (MergeSortServiceTest proves the result always matches Arrays.sort, including on duplicates and pre-sorted input).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'MergeSortController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'MergeSortService', kind: 'component', stereotype: 'facade' },
        { id: 'sorter', name: 'ParallelMergeSorter', kind: 'component' },
        { id: 'pool', name: 'ForkJoinPool\n(parallelism=4)', kind: 'component', stereotype: 'executor' },
        { id: 'rootTask', name: 'SortTask\n(root: [0,6])', kind: 'component', stereotype: 'task' },
        { id: 'rightTask', name: 'SortTask\n(right: [4,6])', kind: 'component', stereotype: 'task' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/merge-sort/run {size:7, parallelism:4, sequentialThreshold:2}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { from: 'service', to: 'service', text: 'generate random int[7] (or use supplied array); validate params' },
        { from: 'service', to: 'sorter', text: 'new ParallelMergeSorter(4, 2, recorder).sort(array)', activate: 'sorter' },
        { from: 'sorter', to: 'sorter', text: 'clone input array; allocate shared buffer[7]' },
        { from: 'sorter', to: 'pool', text: 'new ForkJoinPool(4); pool.submit(new SortTask(array, 0, 6, buffer))', activate: 'pool' },
        { from: 'pool', to: 'rootTask', text: 'compute()', activate: 'rootTask' },
        { from: 'rootTask', to: 'rootTask', text: 'hi-lo=6 > sequentialThreshold(2) -> mid=3; left=SortTask[0,3], right=SortTask[4,6]' },
        { from: 'rootTask', to: 'rightTask', text: 'right.fork() — may be stolen by another pool worker', activate: 'rightTask' },
        { from: 'rootTask', to: 'rootTask', text: 'left.compute() on THIS thread — recurses, bottoms out below threshold, sorts [0,3] in place' },
        { from: 'rightTask', to: 'rightTask', text: '[different worker thread] recurses, bottoms out, sorts [4,6] in place' },
        { from: 'rootTask', to: 'rightTask', text: 'right.join() — waits for the forked half if not already done', deactivate: 'rightTask' },
        { from: 'rootTask', to: 'rootTask', text: 'merge(array[0..3], array[4..6]) via shared buffer -> array[0..6] fully sorted' },
        { from: 'rootTask', to: 'pool', text: 'compute() returns (RecursiveAction — no value, array mutated in place)', type: 'return', deactivate: 'rootTask' },
        { from: 'pool', to: 'sorter', text: 'task.get() completes; pool.shutdown()', type: 'return', deactivate: 'pool' },
        { from: 'sorter', to: 'service', text: 'return fully sorted array', type: 'return', deactivate: 'sorter' },
        { from: 'service', to: 'controller', text: 'return RunResult {sortedArray, orderedTrace[]} — sortedArray verified to equal Arrays.sort(original)', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — sorted array + thread-lane trace for replay', type: 'return' },
      ],
    },
  ],
};
