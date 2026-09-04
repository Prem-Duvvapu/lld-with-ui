// Sequence diagram content for thread-pool.
// Grounded directly in CustomThreadPool#submit, #tryAssignDirectly, #spawnWorker, and
// Worker#run (Strategy + Producer-Consumer patterns).
export default {
  title: 'Thread Pool — Core Fill, Queue Fill, and Saturation',
  description:
    'How three submissions in a row are routed differently by the same core/queue/max algorithm: the first spins up a dedicated core worker, the second queues because the one core worker is already busy, and the third is rejected once the queue is also full and the pool is already at maxPoolSize.',
  flows: [
    {
      id: 'core-queue-saturation-flow',
      label: 'Core worker spin-up, then queueing, then AbortPolicy rejection',
      description:
        'A pool with corePoolSize=1, maxPoolSize=1, queueCapacity=1 and AbortPolicy. T1 gets its own dedicated core worker directly (bypassing the queue entirely). T2 queues, since the one worker is busy but the queue has room. T3 arrives once both the single worker and the one queue slot are occupied — the pool is saturated, so AbortPolicy throws instead of accepting it.',
      participants: [
        { id: 'caller', name: 'Caller', kind: 'actor' },
        { id: 'controller', name: 'ThreadPool\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ThreadPool\nService', kind: 'component', stereotype: 'facade' },
        { id: 'pool', name: 'CustomThreadPool', kind: 'component', stereotype: 'context' },
        { id: 'policy', name: 'AbortPolicy', kind: 'component', stereotype: 'strategy' },
        { id: 'workerA', name: 'Worker A\n(core)', kind: 'component' },
      ],
      steps: [
        { from: 'caller', to: 'controller', text: 'POST /api/threadpool/demo-pool/submit {taskName:"T1"}' },
        { from: 'controller', to: 'service', text: 'submitTask("demo-pool", "T1", duration)', activate: 'service' },
        { from: 'service', to: 'pool', text: 'submit("T1", runnable)', activate: 'pool' },
        { from: 'pool', to: 'pool', text: 'tryAssignDirectly: workerCount(0) < corePoolSize(1)' },
        { from: 'pool', to: 'workerA', text: 'spawnWorker(core=true, firstTask=T1) — handed directly, bypasses the queue' },
        { from: 'workerA', to: 'workerA', text: 'run(): executes T1 immediately, no takeTask() call needed yet' },
        { from: 'pool', to: 'service', text: 'return SubmitResult(ACCEPTED)', type: 'return', deactivate: 'pool' },
        { from: 'service', to: 'controller', text: 'return result', type: 'return', deactivate: 'service' },
        { from: 'caller', to: 'controller', text: 'POST .../submit {taskName:"T2"}' },
        { from: 'controller', to: 'service', text: 'submitTask("demo-pool", "T2", duration)', activate: 'service' },
        { from: 'service', to: 'pool', text: 'submit("T2", runnable)', activate: 'pool' },
        { from: 'pool', to: 'pool', text: 'tryAssignDirectly: workerCount(1) == core; queue.size(0) < queueCapacity(1) -> enqueue' },
        { from: 'pool', to: 'service', text: 'return SubmitResult(ACCEPTED) — T2 waits in queue', type: 'return', deactivate: 'pool' },
        { from: 'service', to: 'controller', text: 'return result', type: 'return', deactivate: 'service' },
        { from: 'caller', to: 'controller', text: 'POST .../submit {taskName:"T3"}' },
        { from: 'controller', to: 'service', text: 'submitTask("demo-pool", "T3", duration)', activate: 'service' },
        { from: 'service', to: 'pool', text: 'submit("T3", runnable)', activate: 'pool' },
        { from: 'pool', to: 'pool', text: 'tryAssignDirectly: queue full(1/1) AND workerCount(1) == maxPoolSize(1) -> saturated' },
        { from: 'pool', to: 'policy', text: 'rejectionPolicy.decide()' },
        { from: 'policy', to: 'pool', text: 'ABORT', type: 'return' },
        { from: 'pool', to: 'service', text: 'throw TaskRejectedException — T3 never queued, never run', type: 'return', deactivate: 'pool' },
        { from: 'service', to: 'controller', text: '429 Too Many Requests', type: 'return', deactivate: 'service' },
      ],
    },
  ],
};
