// Sequence diagram content for h2o (Building H2O Molecule).
// Grounded directly in H2O concurrency primitive (CyclicBarrier / Semaphores for 2 Hydrogen + 1 Oxygen barrier rendezvous).
export default {
  title: 'Building H2O — Barrier Synchronization & Molecule Assembly',
  description:
    'How Hydrogen and Oxygen threads synchronize at a barrier so that for every water molecule formed, exactly 2 Hydrogen threads and 1 Oxygen thread bond together before any thread proceeds to the next molecule.',
  flows: [
    {
      id: 'h2o-molecule-barrier',
      label: '2 Hydrogen threads + 1 Oxygen thread rendezvous at molecule barrier',
      description:
        'Hydrogen thread H1 arrives, Hydrogen thread H2 arrives, Oxygen thread O1 arrives. The three threads synchronize on a CyclicBarrier(3), output "H", "H", "O" in parallel, and bond to create one H2O molecule.',
      participants: [
        { id: 'h1', name: 'Hydrogen 1\n(Thread-H1)', kind: 'actor' },
        { id: 'h2', name: 'Hydrogen 2\n(Thread-H2)', kind: 'actor' },
        { id: 'o1', name: 'Oxygen 1\n(Thread-O1)', kind: 'actor' },
        { id: 'barrier', name: 'MoleculeBarrier\n(CyclicBarrier 3)', kind: 'lock', stereotype: 'CyclicBarrier' },
        { id: 'output', name: 'Molecule Output', kind: 'store' },
      ],
      steps: [
        { from: 'h1', to: 'barrier', text: 'releaseHydrogen() → barrier.await() (1/3 arrived)', activate: 'barrier' },
        { from: 'h2', to: 'barrier', text: 'releaseHydrogen() → barrier.await() (2/3 arrived)' },
        { from: 'o1', to: 'barrier', text: 'releaseOxygen() → barrier.await() (3/3 arrived — BARRIER TRIPPED!)' },
        { from: 'barrier', to: 'output', text: 'h1 emits "H"' },
        { from: 'barrier', to: 'output', text: 'h2 emits "H"' },
        { from: 'barrier', to: 'output', text: 'o1 emits "O"' },
        { from: 'barrier', to: 'barrier', text: 'barrier resets for next molecule', deactivate: 'barrier' },
        { type: 'note', over: ['output'], text: 'One H2O molecule completed: invariant of 2H:1O strictly maintained.' },
      ],
    },
  ],
};
