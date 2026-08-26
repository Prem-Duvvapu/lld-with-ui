// Sequence diagram content for elevator.
// Grounded directly in ElevatorControllerService#handleExternalRequest and
// ElevatorConcurrencyTest#concurrentRequests_exactlyOnceEachAndNoLostOrDuplicatedRequests:
// two riders on different floors race to be dispatched at the exact same instant, and the
// controller-wide dispatch lock is what stops them from both being handed the same nearly-full
// car and overflowing its capacity.
export default {
  title: 'Elevator — Racing to Dispatch the Same Best Car (Controller-Wide Dispatch Lock)',
  description:
    'A class diagram shows that ElevatorDispatchStrategyFactory resolves one ElevatorDispatchStrategy — it does not show what happens when two floor calls arrive at the same instant and the strategy would pick the SAME best-scoring car for both. This sequence follows two concurrent handleExternalRequest calls racing the dispatch decision, resolved by one controller-wide ReentrantLock (ElevatorControllerService#controllerLock) that makes "pick the best car" and "commit that car\'s new stops" one atomic step.',
  flows: [
    {
      id: 'concurrent-dispatch-same-best-car',
      label: 'Two riders on different floors race the SAME best-scoring car',
      description:
        'Elevator A (near-empty, idle at floor 3) is the closest car to both floor 4 and floor 6. Two near-simultaneous external requests — one for F4->F9, one for F6->F2 — both resolve LookScanDispatchStrategy to Elevator A. Only the first to acquire the dispatch lock may actually commit A\'s stops before the second thread\'s strategy call re-reads A\'s (now updated) occupancy/state; the lock guarantees the second decision is made against post-assignment state, not a stale read. See ElevatorConcurrencyTest#concurrentRequests_exactlyOnceEachAndNoLostOrDuplicatedRequests.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(caller at F4)', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\n(caller at F6)', kind: 'actor' },
        { id: 'service', name: 'ElevatorControllerService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'controllerLock\n(ReentrantLock)', kind: 'store' },
        { id: 'strategy', name: 'LookScanDispatchStrategy', kind: 'component' },
        { id: 'carA', name: 'Elevator A\n(idle @ F3)', kind: 'component' },
        { id: 'repo', name: 'ElevatorRepository', kind: 'store' },
      ],
      steps: [
        { type: 'note', over: ['carA'], text: 'Elevator A starts this scene IDLE at floor 3, empty — the nearest car to both F4 and F6.' },
        { from: 'threadA', to: 'service', text: 'handleExternalRequest(sourceFloor=4, destinationFloor=9)' },
        { from: 'service', to: 'lock', text: 'controllerLock.lock()  — ACQUIRED', activate: 'lock' },
        { from: 'threadB', to: 'service', text: 'handleExternalRequest(sourceFloor=6, destinationFloor=2)  — arrives concurrently' },
        { from: 'service', to: 'lock', text: 'controllerLock.lock()  — BLOCKS (thread A holds it)',
          detail: 'Both calls contend for the exact same ReentrantLock instance — thread B blocks here for the entire duration of thread A\'s dispatch decision.' },
        { from: 'service', to: 'strategy', text: '[thread A] selectOptimalElevator(elevators, sourceFloor=4, UP, 1)' },
        { from: 'strategy', to: 'carA', text: 'score Elevator A: dist=1, IDLE -> best candidate' },
        { from: 'strategy', to: 'service', text: 'return Elevator A', type: 'return' },
        { from: 'service', to: 'carA', text: '[thread A] elevatorLock.lock(); addStop(4); addStop(9); transitionTo(MOVING_UP)',
          detail: 'A\'s own per-car lock is also taken here — belt-and-suspenders against a caller that reaches Elevator A directly outside handleExternalRequest, e.g. handleInternalRequest.' },
        { from: 'service', to: 'repo', text: '[thread A] repo.saveRequest(request) ; repo.saveElevator(A)' },
        { from: 'service', to: 'lock', text: '[thread A] unlock()', deactivate: 'lock' },
        { from: 'service', to: 'threadA', text: 'return Request { assignedElevatorId: A.id, status: ASSIGNED }', type: 'return' },
        { type: 'note', over: ['lock'], text: 'Lock just freed — thread B, still waiting, acquires it now.' },
        { from: 'service', to: 'lock', text: '[thread B] lock()  — ACQUIRED (was blocked, now unblocks)', activate: 'lock' },
        { from: 'service', to: 'strategy', text: '[thread B] selectOptimalElevator(elevators, sourceFloor=6, DOWN, 1)',
          detail: 'This call reads Elevator A\'s state AFTER thread A\'s commit — already MOVING_UP with stops queued — the lock guarantees this read cannot interleave with thread A\'s write.' },
        { from: 'strategy', to: 'carA', text: 'score Elevator A: MOVING_UP, direction mismatch (request wants DOWN) -> heavy penalty' },
        { from: 'strategy', to: 'service', text: 'return Elevator C (idle @ F8, now the genuinely best remaining car)', type: 'return' },
        { from: 'service', to: 'repo', text: '[thread B] repo.saveRequest(request) ; repo.saveElevator(C)' },
        { from: 'service', to: 'lock', text: '[thread B] unlock()', deactivate: 'lock' },
        { from: 'service', to: 'threadB', text: 'return Request { assignedElevatorId: C.id, status: ASSIGNED }', type: 'return' },
        { type: 'note', over: ['service'], text: 'Exactly one thread ever commits a dispatch decision against a given snapshot of fleet state. If the strategy read happened OUTSIDE controllerLock, both threads could score the fleet from the same stale snapshot, both pick Elevator A, and double-book it past capacity or with conflicting directions — the exact race concurrentRequests_exactlyOnceEachAndNoLostOrDuplicatedRequests asserts against by checking every request lands a unique id and every ASSIGNED request eventually reaches COMPLETED with no car ever exceeding its capacity.' },
      ],
    },
  ],
};
