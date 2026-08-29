// Sequence diagram content for merge-sort.
// Grounded directly in Parallel MergeSort (ForkJoinPool + RecursiveTask divide & conquer).
export default {
  title: 'Parallel Merge Sort — Fork/Join Divide-and-Conquer & Subarray Merging',
  description:
    'How ParallelMergeSort utilizes Java ForkJoinPool to recursively fork array halves into parallel worker subtasks, sorting concurrently and joining with linear merge.',
  flows: [
    {
      id: 'fork-join-merge-sort',
      label: 'Array partition forks into parallel subtasks and joins sorted halves',
      description:
        'Input array [38, 27, 43, 3, 9, 82, 10] is submitted to ForkJoinPool. The task forks left half [38, 27, 43, 3] and right half [9, 82, 10]. Subtasks execute in parallel, join results, and merge into [3, 9, 10, 27, 38, 43, 82].',
      participants: [
        { id: 'client', name: 'Client Thread', kind: 'actor' },
        { id: 'pool', name: 'ForkJoinPool', kind: 'component', stereotype: 'executor' },
        { id: 'mainTask', name: 'MergeSortTask\n(root: 0..6)', kind: 'component', stereotype: 'task' },
        { id: 'leftTask', name: 'LeftSubTask\n(0..3)', kind: 'component', stereotype: 'task' },
        { id: 'rightTask', name: 'RightSubTask\n(4..6)', kind: 'component', stereotype: 'task' },
      ],
      steps: [
        { from: 'client', to: 'pool', text: 'pool.invoke(MergeSortTask([38, 27, 43, 3, 9, 82, 10]))', activate: 'pool' },
        { from: 'pool', to: 'mainTask', text: 'compute()', activate: 'mainTask' },
        { from: 'mainTask', to: 'leftTask', text: 'leftTask.fork() — runs on Worker-1', activate: 'leftTask' },
        { from: 'mainTask', to: 'rightTask', text: 'rightTask.compute() — runs on Worker-2 in parallel', activate: 'rightTask' },
        { from: 'leftTask', to: 'leftTask', text: 'sort [38, 27, 43, 3] → [3, 27, 38, 43]' },
        { from: 'rightTask', to: 'rightTask', text: 'sort [9, 82, 10] → [9, 10, 82]' },
        { from: 'mainTask', to: 'leftTask', text: 'leftTask.join()', deactivate: 'leftTask' },
        { from: 'mainTask', to: 'mainTask', text: 'mergeSortedArrays([3, 27, 38, 43], [9, 10, 82])' },
        { from: 'mainTask', to: 'pool', text: 'return [3, 9, 10, 27, 38, 43, 82]', type: 'return', deactivate: 'mainTask' },
        { from: 'pool', to: 'client', text: 'Sorted array result', type: 'return', deactivate: 'pool' },
      ],
    },
  ],
};
