// classDiagrams — traffic-signal
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-30) — of the previous five classes, only TrafficLight,
// Intersection, and LightState existed in com.lld.trafficsignal; 'SignalController' (with a
// Map<String, Intersection> field and a handleEmergency() method) and 'Timer' (duration/remaining/
// tick/isExpired) were both fabricated. The real module is TrafficSignalService/TrafficRepository
// plus a State-pattern SignalState hierarchy (RedState/YellowState/GreenState) driving each
// TrafficLight, a pluggable SignalTicker (real scheduler vs. manual/test), and an Observer chain
// (SignalChangeNotifier fanning SignalChangeEvent out to InAppSignalObserver/LoggingSignalObserver).

export default {
  title: 'Traffic Signal Control System — Class Diagram',
  classes: [
    {
      name: 'TrafficSignalService',
      fields: [
        '- repository: TrafficRepository',
        '- productionTicker: SignalTicker',
        '- mainIntersection: Intersection'
      ],
      methods: [
        '+ listIntersections(): List<Intersection>',
        '+ getIntersection(id): Intersection',
        '+ createIntersection(name, positions): Intersection',
        '+ requestEmergencyOverride(intersectionId, lightId): Intersection',
        '+ resumeNormalOperation(intersectionId): Intersection',
        '+ manualTransition(intersectionId, lightId, requested): Intersection'
      ]
    },
    {
      name: 'TrafficRepository',
      fields: [
        '- intersections: Map<Integer, Intersection>',
        '- idGenerator: AtomicInteger'
      ],
      methods: [
        '+ nextIntersectionId(): int',
        '+ save(intersection): void',
        '+ find(id): Intersection',
        '+ findAll(): List<Intersection>'
      ]
    },
    {
      name: 'Intersection',
      fields: [
        '- id: int',
        '- lights: List<TrafficLight>',
        '- notifier: SignalChangeNotifier',
        '- lock: ReentrantLock',
        '- activeIndex: int',
        '- emergencyActive: boolean',
        '- emergencyLightId: Integer'
      ],
      methods: [
        '+ tick(): void',
        '+ manualTransition(lightId, requested): void',
        '+ requestEmergencyOverride(lightId): void',
        '+ resumeNormalOperation(): void'
      ]
    },
    {
      name: 'TrafficLight',
      fields: [
        '- id: int',
        '- position: String',
        '- state: SignalState',
        '- remainingSeconds: int'
      ],
      methods: [
        '+ getCurrentState(): LightState',
        '+ getTimer(): int',
        '~ forceState(newState): void',
        '~ decrementAndCheckExpired(): boolean',
        '~ requestTransitionTo(requested): void'
      ]
    },
    {
      name: 'SignalState',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getPhase(): LightState',
        '+ getDurationSeconds(): int',
        '+ next(): SignalState'
      ]
    },
    {
      name: 'RedState',
      fields: [
        'implements SignalState',
        '+ DURATION_SECONDS: int = 10'
      ],
      methods: [
        '+ next(): SignalState'
      ]
    },
    {
      name: 'YellowState',
      fields: [
        'implements SignalState',
        '+ DURATION_SECONDS: int = 3'
      ],
      methods: [
        '+ next(): SignalState'
      ]
    },
    {
      name: 'GreenState',
      fields: [
        'implements SignalState',
        '+ DURATION_SECONDS: int = 8'
      ],
      methods: [
        '+ next(): SignalState'
      ]
    },
    {
      name: 'LightState',
      stereotype: 'enum',
      fields: [
        'RED',
        'YELLOW',
        'GREEN'
      ],
      methods: []
    },
    {
      name: 'SignalTicker',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ scheduleEverySecond(task): TickHandle'
      ]
    },
    {
      name: 'ScheduledExecutorSignalTicker',
      fields: [
        'implements SignalTicker',
        '- executor: ScheduledExecutorService'
      ],
      methods: [
        '+ scheduleEverySecond(task): TickHandle',
        '+ shutdown(): void'
      ]
    },
    {
      name: 'ManualSignalTicker',
      fields: [
        'implements SignalTicker',
        '- tasks: List<Runnable>'
      ],
      methods: [
        '+ scheduleEverySecond(task): TickHandle',
        '+ advance(seconds): void'
      ]
    },
    {
      name: 'SignalObserver',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onSignalChange(event): void'
      ]
    },
    {
      name: 'SignalChangeNotifier',
      fields: [
        '- observers: List<SignalObserver>'
      ],
      methods: [
        '+ registerObserver(observer): void',
        '+ removeObserver(observer): void',
        '+ publish(event): void'
      ]
    },
    {
      name: 'InAppSignalObserver',
      fields: [
        'implements SignalObserver',
        '- events: Deque<SignalChangeEvent>'
      ],
      methods: [
        '+ onSignalChange(event): void',
        '+ recentEvents(): List<SignalChangeEvent>'
      ]
    },
    {
      name: 'LoggingSignalObserver',
      fields: [
        'implements SignalObserver'
      ],
      methods: [
        '+ onSignalChange(event): void'
      ]
    },
    {
      name: 'SignalChangeEvent',
      fields: [
        '- intersectionId: int',
        '- lightId: int',
        '- position: String',
        '- previousPhase: LightState',
        '- newPhase: LightState',
        '- timestamp: LocalDateTime'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'TrafficSignalService', to: 'TrafficRepository', label: 'uses' },
    { from: 'TrafficSignalService', to: 'SignalTicker', label: 'drives ticking via' },
    { from: 'TrafficSignalService', to: 'Intersection', label: 'owns' },
    { from: 'TrafficRepository', to: 'Intersection', label: 'stores' },
    { from: 'Intersection', to: 'TrafficLight', label: 'coordinates (exactly one active)' },
    { from: 'Intersection', to: 'SignalChangeNotifier', label: 'publishes via' },
    { from: 'TrafficLight', to: 'SignalState', label: 'delegates phase to' },
    { from: 'RedState', to: 'SignalState', label: 'implements', dashed: true },
    { from: 'YellowState', to: 'SignalState', label: 'implements', dashed: true },
    { from: 'GreenState', to: 'SignalState', label: 'implements', dashed: true },
    { from: 'SignalState', to: 'LightState', label: 'has phase' },
    { from: 'ScheduledExecutorSignalTicker', to: 'SignalTicker', label: 'implements', dashed: true },
    { from: 'ManualSignalTicker', to: 'SignalTicker', label: 'implements', dashed: true },
    { from: 'InAppSignalObserver', to: 'SignalObserver', label: 'implements', dashed: true },
    { from: 'LoggingSignalObserver', to: 'SignalObserver', label: 'implements', dashed: true },
    { from: 'SignalChangeNotifier', to: 'SignalObserver', label: 'notifies' },
    { from: 'SignalChangeNotifier', to: 'SignalChangeEvent', label: 'publishes' }
  ]
};
