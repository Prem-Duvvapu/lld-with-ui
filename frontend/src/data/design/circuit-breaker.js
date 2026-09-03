// designDetails — circuitBreaker
// Single source of truth for this module. One file per module: duplicate keys in a shared
// object literal previously let JavaScript silently discard the richer entry (RCA-002).
// Every class, field and method named below exists verbatim in com.lld.circuitbreaker.

export default {
  title: 'Circuit Breaker — Design Details',
  requirements: [
    'Guard calls to a named downstream dependency behind a breaker with three phases: CLOSED (calls pass through, failures counted), OPEN (every call rejected immediately, no downstream attempt at all), HALF_OPEN (exactly one trial call let through after a cooldown)',
    'CLOSED trips to OPEN the moment a pluggable TripPolicy says to — either N consecutive failures, or a failure rate over a rolling window once enough calls have landed in it',
    'OPEN rejects every call with a typed CircuitOpenException until its cooldown has elapsed, at which point the next call attempt (not a background timer) moves it to HALF_OPEN and is treated as the trial',
    'HALF_OPEN\'s trial call closes the circuit on success or reopens it — restarting the cooldown — on failure; exactly one trial call is ever in flight, never two racing threads both treated as "the" trial',
    'Multiple independently-guarded services — CircuitBreakerRegistry holds one breaker per service name, each with its own lock, so calls against two different services never contend',
    'Deterministic testability — the passage of time behind a breaker\'s cooldown is abstracted behind a Clock, so tests jump straight past a cooldown instead of sleeping for real milliseconds'
  ],
  entities: [
    {
      name: 'CircuitBreakerService',
      description: 'Facade the controller delegates to wholesale. Owns the live CircuitBreakerRegistry (seeded by CircuitBreakerInitializer) plus a completely separate isolated sandbox registry and ManualClock for the /sim/* engine.',
      fields: [
        { name: 'registry', type: 'CircuitBreakerRegistry', description: 'Live, production breakers — backed by a real SystemClock' },
        { name: 'simRegistry, simClock', type: 'CircuitBreakerRegistry, ManualClock', description: 'A completely separate sandbox rebuilt from scratch on every simReset(), so a demo run can never corrupt live breaker state' }
      ],
      methods: [
        { name: 'call(serviceName, simulateSuccess)', returns: 'CallOutcome', description: 'Delegates to the named breaker\'s attemptCall(); throws CircuitOpenException if the breaker is not currently allowing calls' },
        { name: 'reset(serviceName)', returns: 'CircuitBreaker', description: 'Re-registers the named service with a fresh breaker, same TripPolicy and cooldown, clean state' }
      ]
    },
    {
      name: 'CircuitBreaker',
      description: 'One named breaker. Delegates its phase to a CircuitState instance rather than branching on an enum at every call site. A single ReentrantLock is held for the entire attemptCall(), which is what guarantees exactly one HALF_OPEN trial call is ever in flight — a second caller blocks until the first has already moved the breaker to CLOSED or back to OPEN.',
      fields: [
        { name: 'state', type: 'CircuitState', description: 'volatile — delegates to a Closed/Open/HalfOpenState singleton' },
        { name: 'tripPolicy', type: 'TripPolicy', description: 'Consulted by ClosedState.onFailure() after every failed call to decide whether to trip to OPEN' },
        { name: 'cooldownMillis, openedAtMillis', type: 'long, long', description: 'How long OPEN holds before the next call attempt may move to HALF_OPEN, and when it started holding' },
        { name: 'recentResults', type: 'Deque<Boolean>', description: 'Bounded rolling window of recent call outcomes, read by FailureRateTripPolicy' },
        { name: 'lock', type: 'ReentrantLock', description: 'Held for the whole span of attemptCall(), including any state transition it triggers' },
        { name: 'clock', type: 'Clock', description: 'SystemClock in production, ManualClock in the /sim/* sandbox — measures elapsed cooldown without ever sleeping in a test' }
      ],
      methods: [
        { name: 'attemptCall(simulateSuccess)', returns: 'CallOutcome', description: 'The one entry point: moves OPEN to HALF_OPEN if the cooldown has elapsed, rejects the call if the current state disallows it, otherwise applies the simulated outcome and returns the resulting phase' },
        { name: 'transitionTo(newState)', returns: 'void', description: 'Called by CircuitState implementations, not callers directly — reassigns state and, for OPEN, stamps openedAtMillis; for CLOSED, clears the failure count and result window' }
      ]
    },
    {
      name: 'CircuitState',
      description: 'State pattern interface. Unlike trafficsignal.state.SignalState (where the context reads a fixed next() chain), each state here actively drives the breaker\'s transitions itself via onSuccess()/onFailure(), since what happens next genuinely depends on the call\'s outcome, not on a fixed successor.',
      fields: [],
      methods: [
        { name: 'allowCall()', returns: 'boolean', description: 'CLOSED and HALF_OPEN: true. OPEN: false — the whole point of tripping' },
        { name: 'onSuccess(breaker) / onFailure(breaker)', returns: 'void', description: 'ClosedState: reset or count-and-maybe-trip. HalfOpenState: close on success, reopen on failure. OpenState: unreachable — allowCall() is false' }
      ]
    },
    {
      name: 'TripPolicy',
      description: 'Strategy deciding when CLOSED should trip to OPEN. ConsecutiveFailureTripPolicy(threshold) trips after N failures in a row with no intervening success; FailureRateTripPolicy(rate, minCalls) trips once the rolling window\'s failure rate reaches the threshold, but only once minCalls have actually landed in it. Both are seeded live by CircuitBreakerInitializer on different demo services, so the pluggability is exercised, not just declared.',
      fields: [],
      methods: [
        { name: 'shouldTrip(breaker)', returns: 'boolean', description: 'Consulted by ClosedState.onFailure() after every failed call' }
      ]
    },
    {
      name: 'CircuitBreakerRegistry',
      description: 'One CircuitBreaker per service name in a ConcurrentHashMap. get() throws UnknownServiceException for a name nothing registered — a breaker for an undeclared dependency is not a real safety net, so it deliberately does not auto-vivify one.',
      fields: [
        { name: 'breakers', type: 'ConcurrentHashMap<String, CircuitBreaker>', description: 'Keyed by service name; the map only guards registration/lookup, each breaker guards its own state independently' }
      ],
      methods: [
        { name: 'register(serviceName, tripPolicy, cooldownMillis, windowCapacity, clock)', returns: 'CircuitBreaker', description: 'Creates and stores a new breaker for the given service' },
        { name: 'get(serviceName)', returns: 'CircuitBreaker', description: 'Throws UnknownServiceException (404) if nothing is registered under that name' }
      ]
    },
    {
      name: 'Clock',
      description: 'Abstraction over "the current time", the same purpose as trafficsignal.clock.SignalTicker. SystemClock drives production breakers; ManualClock (advanceMillis()) drives the /sim/* sandbox, so a demo can jump straight past a cooldown instead of waiting on real time.',
      fields: [],
      methods: [
        { name: 'millis()', returns: 'long', description: 'The one method every implementation supplies' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State',
      used: true,
      explanation: 'ClosedState/OpenState/HalfOpenState (each a singleton implementing CircuitState) drive CircuitBreaker\'s phase. Each state\'s allowCall()/onSuccess()/onFailure() is where its behavior lives — CircuitBreaker.attemptCall() never branches on which phase it is in.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'TripPolicy is swapped between ConsecutiveFailureTripPolicy and FailureRateTripPolicy without CircuitBreaker or ClosedState changing — CircuitBreakerInitializer seeds different live services with each, so both are exercised for real, not just declared.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'CircuitBreakerRegistry is the only class touching the breakers map; CircuitBreakerService goes through it rather than holding its own storage.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'CircuitBreakerController delegates every call straight to CircuitBreakerService, which is the single entry point for both the live registry and the isolated /sim/* sandbox.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'CircuitState subclasses own phase-transition rules only. TripPolicy implementations own "should we trip" only. CircuitBreakerRegistry owns storage only. CircuitBreaker composes all three plus its own locking.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new trip rule (e.g. a slow-call-duration policy) is a new TripPolicy implementation passed to CircuitBreakerRegistry.register() — CircuitBreaker and ClosedState do not change.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'CircuitBreaker depends on the Clock and TripPolicy interfaces, not on SystemClock or a specific policy directly — production and sandbox wiring supply different implementations through the same seam.'
    },
    {
      name: 'Encapsulation',
      description: 'CircuitBreaker\'s state-mutating methods (transitionTo, incrementConsecutiveFailures, resetConsecutiveFailures, pushResult) are documented as callbacks for CircuitState implementations only, not general-purpose setters — calling them elsewhere is how the "exactly one active phase" invariant breaks.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — CircuitState.onSuccess()/onFailure()',
      description: 'CircuitBreaker.attemptCall() calls state.onSuccess(this) or state.onFailure(this) without ever checking "is this ClosedState or HalfOpenState?" — each singleton\'s own implementation supplies the correct reaction.',
      alternative: 'Could use a CircuitPhase enum with a switch statement per call — the State-pattern version keeps each phase\'s reaction to a result colocated in its own class instead of scattered across a switch.'
    },
    {
      name: 'Strategy — Pluggable TripPolicy',
      description: 'ClosedState.onFailure() calls breaker.getTripPolicy().shouldTrip(breaker) without knowing which concrete policy is installed.',
      alternative: 'Could hardcode a consecutive-failure counter directly on CircuitBreaker — the pluggable policy is what lets a rolling-failure-rate rule coexist with a consecutive-count rule on different services without either seeing the other\'s logic.'
    },
    {
      name: 'Composition — CircuitBreaker has-a CircuitState',
      description: 'CircuitBreaker coordinates its phase by composition (a CircuitState field), not by inheriting from a phase-specific base class.',
      alternative: 'Could give CircuitBreaker its own if/else phase logic — composition is what lets the phase be swapped atomically under one lock, and what keeps each phase\'s rules testable in isolation.'
    }
  ],
  extensibility: [
    {
      area: 'Slow-Call Trip Policy',
      description: 'Add a SlowCallTripPolicy that trips when too many recent calls exceeded a duration threshold — a new TripPolicy implementation; CircuitBreaker and the state classes need no change.',
      difficulty: 'Medium'
    },
    {
      area: 'Half-Open Concurrency Limit',
      description: 'Today exactly one trial call is in flight because the whole attemptCall() is under one lock. A version that lets N trial calls through concurrently would need a semaphore inside HalfOpenState instead of relying on the outer lock.',
      difficulty: 'Hard'
    },
    {
      area: 'Persisted Breaker Configuration',
      description: 'CircuitBreakerRegistry is in-memory only; swapping in a persisted-config-backed implementation behind the same register()/get() interface would let breaker thresholds survive a restart without touching CircuitBreakerService.',
      difficulty: 'Medium'
    },
    {
      area: 'Per-Breaker Event Stream',
      description: 'Add an Observer pattern (mirroring trafficsignal.observer.SignalChangeNotifier) so external code can react to a breaker tripping OPEN or recovering to CLOSED, instead of only being visible through polling GET /state.',
      difficulty: 'Medium'
    }
  ]
};
