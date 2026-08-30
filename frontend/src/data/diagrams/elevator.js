// classDiagrams — elevator
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Elevator — Class Diagram',
  classes: [
    {
      name: 'ElevatorController',
      stereotype: 'controller',
      methods: [
        '+ requestElevator(body): Request',
        '+ selectDestination(body): void',
        '+ setMaintenance(body): void',
        '+ getDispatchPolicy(): Map',
        '+ setDispatchPolicy(body): Map',
      ]
    },
    {
      name: 'ElevatorControllerService',
      stereotype: 'service',
      fields: [
        '- activePolicy: DispatchPolicy',
        '- controllerLock: ReentrantLock',
        '- pendingExternalRequests: Queue<Request>',
      ],
      methods: [
        '+ handleExternalRequest(sourceFloor, destinationFloor): Request',
        '+ handleInternalRequest(elevatorId, destinationFloor): void',
        '+ setElevatorMaintenance(elevatorId, maintenance): void',
        '+ stepSimulation(): List<Elevator>',
      ]
    },
    {
      name: 'ElevatorService',
      stereotype: 'service',
      methods: [
        '+ requestElevator(fromFloor, toFloor): Request',
        '+ tick(): List<Elevator>',
        '+ getDispatchPolicy(): DispatchPolicy'
      ]
    },
    {
      name: 'Elevator',
      fields: [
        '- id: long',
        '- currentFloor: int',
        '- direction: Direction',
        '- state: ElevatorState',
        '- capacity: int',
        '- currentOccupancy: AtomicInteger',
        '- upStops: ConcurrentSkipListSet<Integer>',
        '- downStops: ConcurrentSkipListSet<Integer>',
        '- elevatorLock: ReentrantLock'
      ],
      methods: [
        '+ transitionTo(target: ElevatorState): void',
        '+ addStop(floor): void',
        '+ removeStop(floor): void',
        '+ boardPassenger(): boolean',
        '+ isFull(): boolean',
        '+ createSnapshot(): ElevatorSnapshot'
      ]
    },
    {
      name: 'Direction',
      stereotype: 'enum',
      fields: ['UP', 'DOWN', 'IDLE'],
      methods: []
    },
    {
      name: 'ElevatorState',
      stereotype: 'enum',
      fields: ['IDLE', 'MOVING_UP', 'MOVING_DOWN', 'DOOR_OPEN', 'MAINTENANCE'],
      methods: []
    },
    {
      name: 'ElevatorLifecycleState',
      stereotype: 'interface',
      methods: [
        '+ getState(): ElevatorState',
        '+ allowedNext(): Set<ElevatorState>',
        '+ canTransitionTo(target): boolean'
      ]
    },
    {
      name: 'ElevatorLifecycleStates',
      stereotype: 'resolver',
      methods: ['+ of(state): ElevatorLifecycleState  // EnumMap of the 5 singleton states']
    },
    {
      name: 'ElevatorDispatchStrategy',
      stereotype: 'interface',
      methods: ['+ selectOptimalElevator(elevators, sourceFloor, direction, passengerCount): Elevator']
    },
    {
      name: 'LookScanDispatchStrategy',
      methods: ['+ selectOptimalElevator(...): Elevator  // distance + direction-penalty scoring, 3-tier tie-break']
    },
    {
      name: 'NearestCarDispatchStrategy',
      methods: ['+ selectOptimalElevator(...): Elevator  // raw closest-car, ignores direction']
    },
    {
      name: 'DispatchPolicy',
      stereotype: 'enum',
      fields: ['LOOK_SCAN', 'NEAREST_CAR'],
      methods: []
    },
    {
      name: 'ElevatorDispatchStrategyFactory',
      stereotype: 'factory',
      methods: ['+ forPolicy(policy: DispatchPolicy): ElevatorDispatchStrategy']
    },
    {
      name: 'ElevatorNotifier',
      stereotype: 'subject',
      methods: [
        '+ registerObserver(observer): void',
        '+ notifyStateChange(elevator, oldState, newState): void',
        '+ notifyDoorChange(elevator, isOpen): void',
        '+ notifyFloorReached(elevator, floor): void'
      ]
    },
    {
      name: 'ElevatorObserver',
      stereotype: 'interface',
      methods: [
        '+ onElevatorStateChanged(elevator, oldState, newState): void',
        '+ onFloorReached(elevator, floor): void',
        '+ onDoorStateChanged(elevator, isOpen): void'
      ]
    },
    {
      name: 'LoggingElevatorObserver',
      methods: ['+ onElevatorStateChanged(...): void  // writes to the app log']
    },
    {
      name: 'InMemoryElevatorEventObserver',
      methods: [
        '+ onDoorStateChanged(...): void  // bounded ring buffer',
        '+ recentEvents(): List<String>'
      ]
    },
    {
      name: 'Request',
      fields: [
        '- id: long',
        '- sourceFloor: int',
        '- destinationFloor: int',
        '- direction: Direction',
        '- status: String',
        '- assignedElevatorId: long'
      ],
      methods: ['+ of(sourceFloor, destinationFloor): Request  // static factory']
    },
    {
      name: 'ElevatorRepository',
      stereotype: 'repository',
      fields: [
        '- elevators: ConcurrentHashMap<Long, Elevator>',
        '- requests: ConcurrentHashMap<Long, Request>',
        '- requestIdGen: AtomicLong'
      ],
      methods: [
        '+ getAllElevators(): List<Elevator>',
        '+ saveElevator(e): void',
        '+ getPendingRequests(): List<Request>',
        '+ nextRequestId(): long'
      ]
    },
  ],
  relationships: [
    { from: 'ElevatorController', to: 'ElevatorService', label: 'delegates to' },
    { from: 'ElevatorController', to: 'ElevatorControllerService', label: 'delegates to' },
    { from: 'ElevatorService', to: 'ElevatorControllerService', label: 'wraps' },
    { from: 'ElevatorControllerService', to: 'ElevatorRepository', label: 'uses' },
    { from: 'ElevatorControllerService', to: 'ElevatorDispatchStrategyFactory', label: 'resolves strategy via' },
    { from: 'ElevatorControllerService', to: 'ElevatorNotifier', label: 'publishes to' },
    { from: 'ElevatorControllerService', to: 'Request', label: 'creates' },
    { from: 'ElevatorControllerService', to: 'Elevator', label: 'dispatches & ticks' },
    { from: 'ElevatorDispatchStrategyFactory', to: 'DispatchPolicy', label: 'keyed by' },
    { from: 'ElevatorDispatchStrategyFactory', to: 'ElevatorDispatchStrategy', label: 'resolves to' },
    { from: 'LookScanDispatchStrategy', to: 'ElevatorDispatchStrategy', label: 'implements' },
    { from: 'NearestCarDispatchStrategy', to: 'ElevatorDispatchStrategy', label: 'implements' },
    { from: 'Elevator', to: 'ElevatorLifecycleStates', label: 'validates transitions via' },
    { from: 'ElevatorLifecycleStates', to: 'ElevatorLifecycleState', label: 'resolves to' },
    { from: 'Elevator', to: 'Direction', label: 'has' },
    { from: 'Elevator', to: 'ElevatorState', label: 'has' },
    { from: 'ElevatorLifecycleState', to: 'ElevatorState', label: 'describes' },
    { from: 'Request', to: 'Elevator', label: 'assigned to' },
    { from: 'ElevatorNotifier', to: 'ElevatorObserver', label: 'fans out to' },
    { from: 'LoggingElevatorObserver', to: 'ElevatorObserver', label: 'implements' },
    { from: 'InMemoryElevatorEventObserver', to: 'ElevatorObserver', label: 'implements' },
    { from: 'ElevatorRepository', to: 'Elevator', label: 'stores' },
    { from: 'ElevatorRepository', to: 'Request', label: 'stores' },
  ]
};
