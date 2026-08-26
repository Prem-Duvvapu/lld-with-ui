// designDetails — elevator
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Elevator Control System — Design Details',
  tldr: [
    'Multi-elevator control system dispatching a 4-car bank across a 10-floor building',
    'Two swappable dispatch strategies — LOOK/SCAN direction-aware scoring and a raw Nearest-Car baseline — resolved through an EnumMap-backed factory',
    'A declared elevator state machine (IDLE / MOVING_UP / MOVING_DOWN / DOOR_OPEN / MAINTENANCE) with a legal-transition table enforced on every state change, not just tracked by an unguarded enum field',
    'Per-elevator ReentrantLock plus a controller-wide dispatch lock so concurrent floor calls are assigned exactly once, with no double-booked or lost requests',
    'Isolated /api/elevator/sim/* sandbox so the interactive demo can never corrupt the real elevator bank'
  ],
  requirements: [
    'Multi-elevator dispatch across N floors (4 elevators, 10 floors)',
    'External floor call buttons that already know both the pickup floor and the intended destination',
    'Internal elevator destination buttons for a rider who wants a different floor than announced',
    'Optimal elevator selection based on proximity, current direction, and remaining capacity, with a choice of dispatch algorithm',
    'A real door-open/close lifecycle that the JSON contract reports honestly (not collapsed into a generic "stopped" status)',
    'Pulling a car into maintenance mid-route without losing or double-assigning its queued stops'
  ],
  entities: [
    {
      name: 'ElevatorControllerService',
      description: 'Owns both the real elevator bank and an isolated /sim/* sandbox. Dispatches, steps the simulation clock, and enforces floor-range and elevator-existence validation before anything touches an Elevator.',
      fields: [
        { name: 'activePolicy', type: 'DispatchPolicy', description: 'Which strategy the factory resolves for every dispatch call right now.' },
        { name: 'controllerLock', type: 'ReentrantLock', description: 'Serializes dispatch decisions so two simultaneous calls can never race for the same car.' },
        { name: 'pendingExternalRequests', type: 'Queue<Request>', description: 'Calls that found no eligible car at assignment time; drained on every tick and whenever a car returns from maintenance.' }
      ],
      methods: [
        { name: 'handleExternalRequest(sourceFloor, destinationFloor)', returns: 'Request', description: 'Validates both floors, dispatches via the active strategy, and queues both stops on the winning car in one step.' },
        { name: 'handleInternalRequest(elevatorId, destinationFloor)', returns: 'void', description: 'Adds a destination call to a specific car already in service — rejects a MAINTENANCE car.' },
        { name: 'setElevatorMaintenance(elevatorId, maintenance)', returns: 'void', description: 'Guarded MAINTENANCE transition; reassigns every orphaned stop as a fresh external request.' },
        { name: 'stepSimulation() / simStep()', returns: 'List<Elevator>', description: 'Advances every non-maintenance car by one floor or one door-timer tick.' }
      ]
    },
    {
      name: 'Elevator',
      description: 'Thread-safe per-car state: current floor, direction, occupancy, and two ConcurrentSkipListSets tracking queued up/down stops. Not converted to Lombok — like trafficsignal.model.Intersection and atm.model.Account, a lock-holding entity with real invariants stays hand-written rather than accepting generated setters that would bypass the guard.',
      fields: [
        { name: 'state', type: 'ElevatorState', description: 'Mutated only through transitionTo(), never assigned directly outside test fixtures.' },
        { name: 'elevatorLock', type: 'ReentrantLock', description: 'Guards every read-then-write on this car\'s stops, occupancy and state.' }
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Validates target against ElevatorLifecycleStates.of(state).allowedNext() and throws IllegalElevatorStateTransitionException for an illegal jump.' },
        { name: 'addStop(floor) / removeStop(floor)', returns: 'void', description: 'Maintains the ascending up-stop and descending down-stop sets.' },
        { name: 'boardPassenger() / deboardPassenger(n)', returns: 'boolean / void', description: 'Atomic occupancy changes bounded by capacity.' }
      ]
    },
    {
      name: 'ElevatorDispatchStrategyFactory',
      description: 'Resolves DispatchPolicy to its ElevatorDispatchStrategy via an EnumMap built once in the constructor — the same shape as inventory.strategy.ReorderStrategyFactory.',
      fields: [],
      methods: [
        { name: 'forPolicy(policy)', returns: 'ElevatorDispatchStrategy', description: 'One O(1) lookup, no branching at call sites.' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern + Factory',
      used: true,
      explanation: 'ElevatorDispatchStrategy has two implementations — LookScanDispatchStrategy (distance + direction-penalty scoring with 3-tier tie-breaking) and NearestCarDispatchStrategy (pure closest-car, ignoring direction of travel entirely) — resolved by ElevatorDispatchStrategyFactory\'s EnumMap<DispatchPolicy, ElevatorDispatchStrategy>. Switching policy at runtime (POST /api/elevator/policy) changes which car gets picked without touching ElevatorControllerService.'
    },
    {
      name: 'State Pattern',
      used: true,
      explanation: 'com.lld.elevator.state — one singleton per ElevatorState (IdleState, MovingUpState, MovingDownState, DoorOpenState, MaintenanceState), each declaring its own Set<ElevatorState> allowedNext(), the same class-per-state shape as taskmanagement.state.TaskState. Elevator#transitionTo is the single enforcement point; an illegal jump (e.g. MOVING_UP straight to IDLE, skipping the door-open phase) throws IllegalElevatorStateTransitionException instead of silently overwriting the field.'
    },
    {
      name: 'Observer Pattern',
      used: true,
      explanation: 'ElevatorNotifier fans state-change/floor-reached/door-change events out to every registered ElevatorObserver — LoggingElevatorObserver (audit trail to the app log) and InMemoryElevatorEventObserver (bounded in-memory ring buffer), both Spring-managed beans injected into the live notifier. The isolated /sim/* sandbox deliberately does not route through this notifier — it keeps its own SimEvent log — so a replayed demo can never appear in the real telemetry stream.'
    }
  ],
  principles: [
    { name: 'Single Responsibility', description: 'Elevator owns car-local state and stop bookkeeping; ElevatorControllerService owns dispatch, ticking and maintenance orchestration; ElevatorDispatchStrategyFactory owns policy resolution.' },
    { name: 'Open/Closed', description: 'Adding a third dispatch policy means one new ElevatorDispatchStrategy implementation, one enum constant, one factory entry — zero changes to ElevatorControllerService.' },
    { name: 'Encapsulation', description: 'Elevator\'s up/down stop sets and state field are private; every mutation goes through a method that maintains the class invariants (bounded occupancy, legal transitions only).' }
  ],
  oopConcepts: [
    { name: 'Polymorphism', description: 'ElevatorControllerService calls strategy.selectOptimalElevator(...) and state.canTransitionTo(...) without knowing which concrete implementation is behind either interface.' },
    { name: 'Encapsulation', description: 'The elevator\'s internal floor queues (upStops/downStops) are only ever mutated via addStop/removeStop, never exposed as a mutable reference for a caller to corrupt directly.' }
  ],
  extensibility: [
    { area: 'Express elevators', description: 'A third DispatchPolicy that only stops at even floors above a threshold — one new strategy implementation.', difficulty: 'Medium' },
    { area: 'Weight-based capacity', description: 'Swap the passenger-count capacity check in ElevatorDispatchStrategy for a weight sensor input.', difficulty: 'Medium' },
    { area: 'Multi-bank buildings', description: 'Partition the elevator list by bank before handing it to the strategy — the strategy interface does not change.', difficulty: 'Hard' }
  ],
  tradeoffs: [
    'LOOK/SCAN over pure FCFS to minimize total travel distance and average wait time — the direction-penalty scoring in LookScanDispatchStrategy strongly prefers a car already headed toward the call over an idle-but-farther one.',
    'Dispatch takes both the source and destination floor in one call rather than a strict two-phase "press the hall button, then press a floor button once inside" flow — a documented simplification that also fixed a real bug: the earlier two-phase design queued a placeholder stop one floor past the pickup that was never removed, and completeMatchingRequests could never match a request against its real destination floor.',
    'The reassignment path for a car pulled into maintenance mid-route only knows a bare floor number was pending, not whether it was the original pickup or destination — so the requeued request\'s displayed destination is a same-direction placeholder. A documented limitation of that specific recovery path, not a resurfacing of the two-phase bug above.',
    'Background @Scheduled ticking (1.5s) drives the real elevator bank so the UI can simply poll GET /elevators; the isolated sim sandbox is stepped explicitly by the caller instead, so a demo replay is fully deterministic and pausable.'
  ]
};
