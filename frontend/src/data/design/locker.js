// designDetails — locker
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Locker Management (Amazon Locker) — Design Details',
  requirements: [
    'A courier deposits a package into an available locker sized to fit it, at a chosen bank, under a chosen allocation policy.',
    'Strategy Pattern for locker allocation: SmallestFitFirstAllocationStrategy (minimizes wasted space) vs FirstFitAllocationStrategy (first fitting locker in scan order, genuinely different, potentially wasteful behavior) — resolved via an EnumMap-backed factory.',
    'State Machine locker lifecycle: EMPTY -> OCCUPIED -> AWAITING_PICKUP -> EMPTY, declared once (Locker#transitionTo) and enforced in one place, mirroring uber.model.RideStatus\'s declared-transition-table idiom.',
    'Factory Pattern for pickup-code generation: PickupCodeFactory produces 6-digit codes guaranteed unique against every currently-active (not yet picked up) code.',
    'A recipient later opens the assigned locker with the one-time pickup code; a wrong or already-consumed code is rejected.',
    'Race-Free Deposit: two couriers depositing at the same instant must never both claim the same locker, even when both couriers\' allocation scans land on the identical candidate.',
    'Isolated Concurrency Simulation: an isolated /api/locker/sim/* sandbox (a second LockerRepository instance) with a live N-courier race against a deliberately scarce single locker, so the demo can never touch a live bank.',
  ],
  entities: [
    {
      name: 'LockerService',
      description: 'Spring @Service facade owning deposit/pickup and the isolated simulation engine.',
      fields: [
        { name: 'repository', type: 'LockerRepository', description: 'Live banks/lockers/parcels store' },
        { name: 'strategyFactory', type: 'LockerAllocationStrategyFactory', description: 'Resolves AllocationPolicy to a concrete strategy' },
        { name: 'codeFactory', type: 'PickupCodeFactory', description: 'Generates unique 6-digit pickup codes' },
        { name: 'parcelIdGen', type: 'AtomicLong', description: 'Monotonic id generator for deposited parcels' },
      ],
      methods: [
        { name: 'deposit(bankId, size, courierId, recipientId, policy)', returns: 'Parcel', description: 'Resolves a strategy, then loops: pick a candidate locker, lock it, re-check EMPTY, claim or retry excluding that candidate' },
        { name: 'pickup(pickupCode)', returns: 'Parcel', description: 'Finds the active parcel for that code, frees its locker under lock, stamps pickedUpAtEpoch' },
      ],
    },
    {
      name: 'Locker',
      description: 'A single physical locker. status is mutated only through transitionTo, the one place its lifecycle can move.',
      fields: [
        { name: 'id', type: 'String', description: 'Locker identifier' },
        { name: 'bankId', type: 'String', description: 'Owning LockerBank id' },
        { name: 'size', type: 'LockerSize', description: 'SMALL, MEDIUM or LARGE — ordinal-comparable via fits(required)' },
        { name: 'status', type: 'LockerStatus', description: 'EMPTY / OCCUPIED / AWAITING_PICKUP' },
        { name: 'lockerLock', type: 'ReentrantLock', description: 'Fair, per-locker lock — the concurrency centerpiece, held across the whole find-and-claim sequence' },
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Throws IllegalStateException on any move not in LockerStatus#allowedNext' },
      ],
    },
    {
      name: 'LockerStatus (enum)',
      description: 'Declares its own legal-next-states set — EMPTY→{OCCUPIED}, OCCUPIED→{AWAITING_PICKUP}, AWAITING_PICKUP→{EMPTY} — a cycle with no terminal state, since a locker is reused forever.',
      fields: [],
      methods: [
        { name: 'canTransitionTo(next)', returns: 'boolean', description: 'True if next is in this status\'s allowedNext set' },
      ],
    },
    {
      name: 'LockerAllocationStrategy (Interface)',
      description: 'Picks which candidate locker a deposit should try to claim next — a suggestion, not a reservation.',
      fields: [],
      methods: [
        { name: 'selectCandidate(lockersInBank, requiredSize, excludeIds)', returns: 'Optional<Locker>', description: 'Filters to EMPTY, fitting, non-excluded lockers and picks one' },
      ],
    },
    {
      name: 'Parcel',
      description: 'A courier-deposited package. pickedUpAtEpoch stays null until collected.',
      fields: [
        { name: 'id', type: 'String', description: 'Parcel identifier' },
        { name: 'size', type: 'LockerSize', description: 'Required locker size' },
        { name: 'assignedLockerId', type: 'String', description: 'The locker this parcel was claimed into' },
        { name: 'pickupCode', type: 'String', description: '6-digit one-time code' },
        { name: 'pickedUpAtEpoch', type: 'Long', description: 'null until picked up' },
      ],
      methods: [],
    },
    {
      name: 'PickupCodeFactory',
      description: 'Factory generating pickup codes guaranteed unique against the currently-active set.',
      fields: [],
      methods: [
        { name: 'generate(activeCodes)', returns: 'String', description: 'Loops SecureRandom 6-digit generation until a code outside activeCodes is found' },
      ],
    },
  ],
  designPatterns: [
    {
      name: 'Strategy + Factory Pattern',
      used: true,
      explanation: 'LockerAllocationStrategyFactory resolves AllocationPolicy (SMALLEST_FIT / FIRST_FIT) to SmallestFitFirstAllocationStrategy or FirstFitAllocationStrategy via an EnumMap — the same shape as inventory.strategy.ReorderStrategyFactory. The two strategies genuinely diverge: a unit test proves smallest-fit picks a tight-fitting SMALL locker over a LARGE one even when LARGE is scanned first, while first-fit takes whichever fits first, wasting the LARGE locker on a SMALL package.',
    },
    {
      name: 'State Pattern (declared transition table)',
      used: true,
      explanation: 'LockerStatus declares its own legal-next-states set (mirroring uber.model.RideStatus), and Locker#transitionTo is the single enforcement point — a locker can never skip OCCUPIED or move backward.',
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'PickupCodeFactory generates 6-digit codes, checked against every currently-active code before being handed out.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'LockerRepository is pure CRUD; allocation logic lives in the Strategy implementations; lifecycle enforcement lives on Locker itself; LockerService only orchestrates.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A third allocation policy (e.g. round-robin across banks) is one new enum constant, one new LockerAllocationStrategy implementation, one factory registration — LockerService never changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Both concrete LockerAllocationStrategy implementations honor the same contract (never return an OCCUPIED or too-small locker), so LockerService can call either interchangeably.' },
  ],
  oopConcepts: [
    { name: 'Encapsulation', description: 'A Locker\'s ReentrantLock and status field are private; every mutation goes through transitionTo, which is the only place that can move the state machine.' },
    { name: 'Polymorphism', description: 'LockerService calls strategy.selectCandidate(...) without knowing which concrete strategy it holds.' },
    { name: 'Abstraction', description: 'The REST API exposes deposit/pickup/banks endpoints without leaking the retry-with-exclusion locking mechanics underneath.' },
  ],
  extensibility: [
    { area: 'Package expiry & automatic return-to-sender', description: 'Parcel already carries expiresAtEpoch; a background sweep (mirroring library\'s DueDateNotifier) could free expired lockers automatically.', difficulty: 'Medium' },
    { area: 'SMS/email pickup-code delivery', description: 'PickupCodeFactory\'s output would feed a Notification-style dispatch instead of only being returned in the API response.', difficulty: 'Easy' },
    { area: 'Multi-bank network-wide allocation', description: 'Currently a deposit targets one named bank; a "nearest bank with capacity" policy would need a geo-aware strategy layered above the existing per-bank one.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'The retry-with-exclusion loop under contention is O(lockers-in-bank) in the worst case (every candidate raced away before this courier\'s turn) rather than a single atomic bulk-claim — simpler to reason about and to prove correct with a per-locker lock, at the cost of a few wasted lock acquisitions under very heavy contention on one bank.',
    'PickupCodeFactory only guarantees uniqueness against the currently-*active* code set, not every code ever issued — a historical, already-consumed code could theoretically be reissued. Acceptable here since a stale code can no longer open anything; a real system would likely still avoid reissue for audit-trail clarity.',
    'LockerBank is pure metadata with no locker list of its own; LockerRepository.getLockersInBank filters the flat locker map by bankId on every call rather than maintaining a bank -> lockers index. Simpler to keep consistent (no dual-bookkeeping to drift), at the cost of an O(all lockers) scan per lookup — fine at this module\'s in-memory demo scale.',
  ],
  summary: 'A deposit-and-pickup locker network modeling Amazon\'s real locker system at small scale. Its centerpiece is closing the classic check-then-act allocation race: two couriers whose allocation-strategy scan lands on the same candidate locker can never both claim it, because the whole "is this locker still EMPTY? if so, claim it" sequence runs under that one locker\'s own fair ReentrantLock, with the loser retrying against a fresh candidate (excluding the one it just lost) rather than failing outright. A declared LockerStatus transition table gives the physical EMPTY -> OCCUPIED -> AWAITING_PICKUP -> EMPTY cycle real structure, and two genuinely different allocation strategies (tightest-fit vs first-fit) sit behind one factory. An isolated /sim/* sandbox with a live 4-courier race against a single scarce locker lets the whole story play out on demand.',
  highlights: [
    'The allocation race: per-locker ReentrantLock held across the whole find-and-claim sequence, with a bounded retry-and-exclude loop for the loser — proven by a 300-round repeated concurrency test (a single-shot 2-thread race reliably passes on broken code) plus an 8-courier-vs-3-locker test asserting exactly min(couriers, lockers) succeed and no locker is ever double-claimed.',
    'Two allocation strategies with genuinely different real-world behavior, not two names for the same loop: SmallestFitFirstAllocationStrategy minimizes wasted space, FirstFitAllocationStrategy can hand a SMALL package a LARGE locker if that happens to be scanned first — both proven with a deliberately adversarial scan order in a unit test.',
    'A locker\'s full physical lifecycle (EMPTY -> OCCUPIED -> AWAITING_PICKUP -> EMPTY) is exercised end to end by a repeated-round test that deposits, picks up, and re-deposits into the same freed locker 200 times, proving the cycle genuinely closes rather than only being tested one lap.',
    'PickupCodeFactory only ever offers a code outside the currently-active set — proven by a repeated-round redeposit test asserting a fresh code never collides with a still-active one from a different parcel.',
  ],
};
