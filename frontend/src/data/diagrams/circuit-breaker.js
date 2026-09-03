// classDiagrams — circuit-breaker
// Single source of truth for this module. Domain design only — no exception classes and no
// simulation plumbing (SimEvent, CircuitBreakerService's /sim/* fields), per this repo's
// convention (see CLAUDE.md). Every class, field and method below exists verbatim in
// com.lld.circuitbreaker.

export default {
  title: 'Circuit Breaker — Class Diagram',
  classes: [
    {
      name: 'CircuitBreakerService',
      fields: [
        '- registry: CircuitBreakerRegistry'
      ],
      methods: [
        '+ registerService(serviceName, tripPolicy, cooldownMillis, windowCapacity): CircuitBreaker',
        '+ listServices(): List<CircuitBreaker>',
        '+ getService(serviceName): CircuitBreaker',
        '+ call(serviceName, simulateSuccess): CallOutcome',
        '+ reset(serviceName): CircuitBreaker'
      ]
    },
    {
      name: 'CircuitBreakerRegistry',
      fields: [
        '- breakers: ConcurrentHashMap<String, CircuitBreaker>'
      ],
      methods: [
        '+ register(serviceName, tripPolicy, cooldownMillis, windowCapacity, clock): CircuitBreaker',
        '+ get(serviceName): CircuitBreaker',
        '+ findAll(): List<CircuitBreaker>'
      ]
    },
    {
      name: 'CircuitBreaker',
      fields: [
        '- name: String',
        '- state: CircuitState',
        '- tripPolicy: TripPolicy',
        '- cooldownMillis: long',
        '- consecutiveFailures: int',
        '- recentResults: Deque<Boolean>',
        '- openedAtMillis: long',
        '- lock: ReentrantLock',
        '- clock: Clock'
      ],
      methods: [
        '+ attemptCall(simulateSuccess): CallOutcome',
        '+ transitionTo(newState): void',
        '+ incrementConsecutiveFailures(): void',
        '+ resetConsecutiveFailures(): void',
        '+ pushResult(success): void',
        '+ getPhase(): CircuitPhase',
        '+ getFailureRate(): double'
      ]
    },
    {
      name: 'CircuitState',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getPhase(): CircuitPhase',
        '+ allowCall(): boolean',
        '+ onSuccess(breaker): void',
        '+ onFailure(breaker): void'
      ]
    },
    {
      name: 'ClosedState',
      fields: [
        'implements CircuitState'
      ],
      methods: [
        '+ allowCall(): boolean',
        '+ onSuccess(breaker): void',
        '+ onFailure(breaker): void'
      ]
    },
    {
      name: 'OpenState',
      fields: [
        'implements CircuitState'
      ],
      methods: [
        '+ allowCall(): boolean',
        '+ onSuccess(breaker): void',
        '+ onFailure(breaker): void'
      ]
    },
    {
      name: 'HalfOpenState',
      fields: [
        'implements CircuitState'
      ],
      methods: [
        '+ allowCall(): boolean',
        '+ onSuccess(breaker): void',
        '+ onFailure(breaker): void'
      ]
    },
    {
      name: 'CircuitPhase',
      stereotype: 'enum',
      fields: [
        'CLOSED',
        'OPEN',
        'HALF_OPEN'
      ],
      methods: []
    },
    {
      name: 'TripPolicy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ shouldTrip(breaker): boolean',
        '+ describe(): String'
      ]
    },
    {
      name: 'ConsecutiveFailureTripPolicy',
      fields: [
        'implements TripPolicy',
        '- threshold: int'
      ],
      methods: [
        '+ shouldTrip(breaker): boolean'
      ]
    },
    {
      name: 'FailureRateTripPolicy',
      fields: [
        'implements TripPolicy',
        '- failureRateThreshold: double',
        '- minCallsInWindow: int'
      ],
      methods: [
        '+ shouldTrip(breaker): boolean'
      ]
    },
    {
      name: 'Clock',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ millis(): long'
      ]
    },
    {
      name: 'SystemClock',
      fields: [
        'implements Clock'
      ],
      methods: [
        '+ millis(): long'
      ]
    },
    {
      name: 'ManualClock',
      fields: [
        'implements Clock',
        '- currentMillis: AtomicLong'
      ],
      methods: [
        '+ millis(): long',
        '+ advanceMillis(delta): void'
      ]
    },
    {
      name: 'CallOutcome',
      fields: [
        '- serviceName: String',
        '- attempted: boolean',
        '- callSucceeded: Boolean',
        '- phase: CircuitPhase'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'CircuitBreakerService', to: 'CircuitBreakerRegistry', label: 'uses' },
    { from: 'CircuitBreakerRegistry', to: 'CircuitBreaker', label: 'stores' },
    { from: 'CircuitBreaker', to: 'CircuitState', label: 'delegates phase to' },
    { from: 'ClosedState', to: 'CircuitState', label: 'implements', dashed: true },
    { from: 'OpenState', to: 'CircuitState', label: 'implements', dashed: true },
    { from: 'HalfOpenState', to: 'CircuitState', label: 'implements', dashed: true },
    { from: 'CircuitState', to: 'CircuitPhase', label: 'has phase' },
    { from: 'CircuitBreaker', to: 'TripPolicy', label: 'consults' },
    { from: 'ConsecutiveFailureTripPolicy', to: 'TripPolicy', label: 'implements', dashed: true },
    { from: 'FailureRateTripPolicy', to: 'TripPolicy', label: 'implements', dashed: true },
    { from: 'CircuitBreaker', to: 'Clock', label: 'measures cooldown via' },
    { from: 'SystemClock', to: 'Clock', label: 'implements', dashed: true },
    { from: 'ManualClock', to: 'Clock', label: 'implements', dashed: true },
    { from: 'CircuitBreaker', to: 'CallOutcome', label: 'returns' }
  ]
};
