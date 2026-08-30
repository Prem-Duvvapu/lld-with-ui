// Sequence diagram content for h2o.
// Grounded directly in H2OService#run / H2OBonder — corrected after an earlier version
// showed only a bare CyclicBarrier(3) rendezvous. The real primitive layers TWO
// throttling Semaphores (hydrogenSemaphore: 2 permits, oxygenSemaphore: 1 permit) in
// FRONT of a CyclicBarrier(3, this::bond) — the semaphores cap how many H/O threads
// can be mid-molecule at once (never more than 2 H and 1 O "in flight"), and the barrier
// is what actually forms each triplet and runs the synchronized bond() callback.
export default {
  title: 'Building H2O — Semaphore-Throttled Barrier Rendezvous',
  description:
    'How H2OService#run spins up named hydrogen ("H-1", "H-2", ...) and oxygen ("O-1", ...) threads against one H2OBonder. Each hydrogen thread first acquires hydrogenSemaphore (2 permits) and each oxygen thread acquires oxygenSemaphore (1 permit) before reaching the shared CyclicBarrier(3) — throttling ensures at most 2 H and 1 O are ever mid-rendezvous. The barrier releases all three together and runs bond() exactly once per trip.',
  flows: [
    {
      id: 'h2o-semaphore-throttled-barrier',
      label: 'POST /run — 2 Hydrogen + 1 Oxygen throttle through semaphores, then bond at the barrier',
      description:
        'A run request seeds enough H and O threads for 1 molecule. H-1 and H-2 each acquire a hydrogenSemaphore permit (2 available) and arrive at the barrier; O-1 acquires the sole oxygenSemaphore permit and arrives third, tripping the barrier — which runs bond() synchronized on the same monitor as the output list, then releases all three, each of which releases its own semaphore permit back for the next molecule (H2OServiceTest asserts every 3 consecutive trace outputs are exactly 2 H + 1 O).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'H2OController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'H2OService', kind: 'component', stereotype: 'facade' },
        { id: 'h1', name: '"H-1"', kind: 'actor' },
        { id: 'h2', name: '"H-2"', kind: 'actor' },
        { id: 'o1', name: '"O-1"', kind: 'actor' },
        { id: 'bonder', name: 'H2OBonder\n(hydrogenSem=2, oxygenSem=1, CyclicBarrier(3))', kind: 'component', stereotype: 'primitive' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/h2o/run {moleculeCount:1}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { from: 'service', to: 'h1', text: 'start "H-1" -> bonder.hydrogen()' },
        { from: 'service', to: 'h2', text: 'start "H-2" -> bonder.hydrogen()' },
        { from: 'service', to: 'o1', text: 'start "O-1" -> bonder.oxygen()' },
        { from: 'h1', to: 'bonder', text: 'hydrogenSemaphore.acquire() (2→1); barrier.await() — 1/3 arrived', activate: 'bonder' },
        { from: 'h2', to: 'bonder', text: 'hydrogenSemaphore.acquire() (1→0); barrier.await() — 2/3 arrived' },
        { from: 'o1', to: 'bonder', text: 'oxygenSemaphore.acquire() (1→0); barrier.await() — 3/3 arrived, BARRIER TRIPS' },
        { from: 'bonder', to: 'bonder', text: 'bond() runs ONCE (by the triggering thread): output.add("H","O","H"); moleculeCount++; record MOLECULE_BONDED' },
        { from: 'bonder', to: 'h1', text: 'barrier.await() returns for all 3; H-1 releases hydrogenSemaphore (0→1)', deactivate: 'bonder' },
        { from: 'h2', to: 'bonder', text: 'H-2 releases hydrogenSemaphore (1→2)', activate: 'bonder', deactivate: 'bonder' },
        { from: 'o1', to: 'bonder', text: 'O-1 releases oxygenSemaphore (0→1) — both semaphores back to full, ready for the next molecule', activate: 'bonder', deactivate: 'bonder' },
        { from: 'service', to: 'h1', text: 'thread.join() on all H/O threads' },
        { from: 'service', to: 'controller', text: 'return RunResult {moleculesBonded: 1, orderedTrace[]}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — full ordered trace for replay', type: 'return' },
      ],
    },
  ],
};
