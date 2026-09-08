// Sequence diagram content for locker.
// Grounded directly in LockerService#deposit/claimLocker and
// LockerConcurrencyTest#repeatedSingleLockerRaceNeverProducesTwoWinners: two couriers racing to
// deposit into a bank with exactly one SMALL locker. A class diagram shows Locker owns a lock; it
// does not show why the loser has to retry against a DIFFERENT candidate, not just fail outright.
export default {
  title: 'Locker Management — Two Couriers Racing for the Only SMALL Locker',
  description:
    'Both couriers\' allocation-strategy scans are plain, unlocked reads, so they can legitimately both pick the SAME candidate locker as their first choice. Whichever thread acquires that locker\'s ReentrantLock first wins: it re-checks EMPTY under the lock, claims it (EMPTY -> OCCUPIED -> AWAITING_PICKUP), and returns a pickup code. The loser blocks on the same lock, then — once it gets in — re-checks and finds the locker no longer EMPTY, so it does NOT fail outright: it adds that locker\'s id to its exclusion set and retries the whole scan, which now correctly reports no fitting locker remains.',
  flows: [
    {
      id: 'concurrent-deposit-same-candidate-locker',
      label: 'Courier A and Courier B both target the same SMALL locker — only one deposit succeeds',
      description:
        'Bank "BANK-1" has exactly one SMALL locker, "L1", currently EMPTY. Courier A and Courier B both call deposit() for a SMALL package at the same instant, started together via a CountDownLatch (see LockerConcurrencyTest). Whichever thread wins the race to acquire L1\'s lock claims it and gets a pickup code; the loser retries its scan excluding L1, finds no other SMALL-or-larger locker, and is correctly rejected with NoAvailableLockerException — never allowed to silently overwrite the winner\'s claim.',
      participants: [
        { id: 'courierA', name: 'Courier A\n(deposit SMALL)', kind: 'actor' },
        { id: 'courierB', name: 'Courier B\n(deposit SMALL)', kind: 'actor' },
        { id: 'service', name: 'LockerService', kind: 'component', stereotype: 'facade' },
        { id: 'strategy', name: 'SmallestFitFirstAllocationStrategy', kind: 'component' },
        { id: 'locker', name: 'Locker "L1"\n(SMALL)', kind: 'component' },
        { id: 'lock', name: 'L1.lockerLock\n(ReentrantLock, fair)', kind: 'component', stereotype: 'lock' },
      ],
      steps: [
        { type: 'note', over: ['locker'], text: 'L1 is the ONLY SMALL locker in the bank, currently EMPTY.' },
        { from: 'courierA', to: 'service', text: 'deposit(bank, SMALL, ...)' },
        { from: 'courierB', to: 'service', text: 'deposit(bank, SMALL, ...)  — arrives ~simultaneously' },
        { from: 'service', to: 'strategy', text: '[A] selectCandidate(lockers, SMALL, excludeIds={})' },
        { from: 'strategy', to: 'service', text: 'return L1  (unlocked read — both threads can see this)', type: 'return' },
        { from: 'service', to: 'strategy', text: '[B] selectCandidate(lockers, SMALL, excludeIds={})' },
        { from: 'strategy', to: 'service', text: 'return L1  — SAME candidate as A', type: 'return' },
        { from: 'service', to: 'lock', text: '[A] L1.getLock().lock()  — acquired', activate: 'lock' },
        { from: 'service', to: 'lock', text: '[B] L1.getLock().lock()  — BLOCKS, A holds it' },
        { from: 'service', to: 'locker', text: '[A] re-check status INSIDE the lock -> EMPTY' },
        { from: 'service', to: 'locker', text: '[A] transitionTo(OCCUPIED) -> transitionTo(AWAITING_PICKUP)' },
        { from: 'service', to: 'lock', text: '[A] L1.getLock().unlock()', deactivate: 'lock' },
        { from: 'service', to: 'courierA', text: 'return Parcel(pickupCode="482913")', type: 'return' },
        { from: 'lock', to: 'service', text: '[Courier B] lock() finally returns — B is now inside', activate: 'lock' },
        { type: 'note', over: ['locker'], text: 'This is the step the lock alone does not guarantee: B must re-read status NOW, not the EMPTY it saw before blocking.' },
        { from: 'service', to: 'locker', text: '[B] re-check status INSIDE the lock -> AWAITING_PICKUP  (A already claimed it)' },
        { from: 'service', to: 'lock', text: '[B] L1.getLock().unlock()', deactivate: 'lock' },
        { from: 'service', to: 'strategy', text: '[B] selectCandidate(lockers, SMALL, excludeIds={"L1"})  — retry, excluding the lost candidate' },
        { from: 'strategy', to: 'service', text: 'return Optional.empty()  — no other fitting locker', type: 'return' },
        { from: 'service', to: 'courierB', text: 'throw NoAvailableLockerException(409)', type: 'return' },
        { type: 'note', over: ['courierA', 'courierB'], text: 'Exactly one deposit succeeds, one clean rejection, L1 ends AWAITING_PICKUP — never claimed twice. See LockerConcurrencyTest#repeatedSingleLockerRaceNeverProducesTwoWinners, run for 300 rounds.' },
      ],
    },
  ],
};
