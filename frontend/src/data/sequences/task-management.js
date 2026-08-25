// Sequence diagram content for task-management.
// Grounded directly in TaskService#claimTask / #doClaimTask and TaskConcurrencyTest#claimRace_onlyOneWins:
// two actors racing to claim the same unassigned task through the per-task ReentrantLock.
// The class diagram shows TaskService holding a taskLocks map — only a sequence diagram shows
// that the SECOND caller's check happens strictly after the FIRST caller's write, because both
// are serialized through the same lock acquisition, not because of thread-scheduling luck.
export default {
  title: 'Task Management — Concurrent Claim Race (Per-Task Lock)',
  description:
    'Two actors call claimTask() on the same unassigned task at effectively the same instant. TaskConcurrencyTest#claimRace_onlyOneWins fires 12 actors at one task via a CountDownLatch and asserts exactly one wins. This diagram walks the 2-actor case: the lock is what turns "two racing HTTP requests" into "one clean winner and one clean 409," instead of a torn write where both callers believe they own the task.',
  flows: [
    {
      id: 'claim-race',
      label: 'Two actors race to claim one task',
      description:
        'A task is unassigned on the board. Wei and Noah both press "Claim" within the same millisecond. Without a lock around the read-check-write, both requests could read assignee == null before either writes, and both would "succeed" — corrupting the single-owner invariant. TaskService#doClaimTask takes a fair per-task ReentrantLock and re-checks assignee INSIDE the lock, so only the request that actually acquires the lock first ever sees assignee == null.',
      participants: [
        { id: 'wei', name: 'Wei — Actor A', kind: 'actor' },
        { id: 'noah', name: 'Noah — Actor B', kind: 'actor' },
        { id: 'controller', name: 'TaskController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'TaskService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'taskLocks.get(id)\n(ReentrantLock)', kind: 'lock' },
        { id: 'repo', name: 'TaskRepository', kind: 'store' },
      ],
      steps: [
        { from: 'wei', to: 'controller', text: 'POST /api/tasks/42/claim {actor:"Wei"}',
          detail: 'Fired from a browser tab. In TaskConcurrencyTest this is a pool thread instead, released by the same CountDownLatch as Noah\'s — the HTTP path and the test path both bottom out in TaskService#claimTask.' },
        { from: 'noah', to: 'controller', text: 'POST /api/tasks/42/claim {actor:"Noah"}',
          detail: 'Arrives effectively simultaneously — that is the whole point of the scenario, not an artifact of network timing.' },
        { from: 'controller', to: 'service', text: 'claimTask(42, "Wei")', activate: 'service' },
        { from: 'controller', to: 'service', text: 'claimTask(42, "Noah")' },
        { type: 'note', over: ['service'], text: 'Both calls enter doClaimTask() concurrently. Only ONE can hold task 42\'s lock at a time.' },
        { from: 'service', to: 'lock', text: 'lockFor(42).lock()  — Wei\'s thread acquires it first', activate: 'lock' },
        { from: 'service', to: 'lock', text: 'lockFor(42).lock()  — Noah\'s thread BLOCKS here',
          detail: 'This is the line that matters: Noah\'s thread does not proceed to read the task until Wei\'s critical section fully finishes. There is no window where both threads are inside the check at once.' },
        { from: 'service', to: 'repo', text: '[Wei] findTaskById(42)' },
        { from: 'repo', to: 'service', text: 'return Task#42 {assignee: null}', type: 'return' },
        { from: 'service', to: 'service', text: '[Wei] assignee == null -> claim is legal' },
        { from: 'service', to: 'repo', text: '[Wei] saveTask(Task#42 {assignee:"Wei"})' },
        { from: 'service', to: 'lock', text: '[Wei] unlock()', deactivate: 'lock' },
        { from: 'service', to: 'controller', text: 'return Task#42 {assignee:"Wei"}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'wei', text: '200 OK  Task#42 claimed by Wei', type: 'return' },
        { type: 'note', over: ['lock'], text: 'Noah\'s thread now acquires the lock Wei just released.' },
        { from: 'lock', to: 'service', text: '[Noah] lock() succeeds', activate: 'service' },
        { from: 'service', to: 'repo', text: '[Noah] findTaskById(42)' },
        { from: 'repo', to: 'service', text: 'return Task#42 {assignee:"Wei"}', type: 'return',
          detail: 'This is the re-check that closes the race: Noah\'s thread reads the CURRENT state, written under the same lock, not a stale copy from before Wei\'s write.' },
        { from: 'service', to: 'service', text: '[Noah] assignee != null -> throw TaskAlreadyAssignedException(42, "Wei")' },
        { from: 'service', to: 'controller', text: 'propagate TaskAlreadyAssignedException', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'noah', text: '409 Conflict  "Task 42 is already assigned to Wei."', type: 'return' },
        { type: 'note', over: ['wei', 'noah'], text: 'Exactly one winner, one clean 409 — never two winners, never a torn write. TaskConcurrencyTest#claimRace_onlyOneWins asserts this holds across 300 repeated rounds.' },
      ],
    },
  ],
};
