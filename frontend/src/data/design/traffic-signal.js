// designDetails — trafficSignal
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-30) — the previous version described a fictional
// TrafficController/Road/TrafficSignal domain (an enum-only SignalState, a "Singleton
// TrafficController", Observer marked used:false) that does not exist anywhere in
// com.lld.trafficsignal. The real module has no Road concept — TrafficLight sits directly on an
// Intersection — models the State pattern with real classes (RedState/YellowState/GreenState), and
// the Observer pattern is fully wired and in active use (SignalChangeNotifier fans phase changes
// out to InAppSignalObserver and LoggingSignalObserver on every transition).

export default {
  title: 'Traffic Signal — Design Details',
  requirements: [
    'A 4-way intersection where exactly one TrafficLight is GREEN or YELLOW at a time (the "active" light) while every other light is RED — no two directions may be simultaneously GREEN',
    'Automatic phase cycling: RED (10s) → GREEN (8s) → YELLOW (3s) → RED, with the next light in rotation handed GREEN once the active one completes its YELLOW clearance',
    'Manual transition — request a specific light to move to a specific phase; rejected unless it is that light\'s one legal next phase per its current SignalState',
    'Emergency override — force exactly one light to GREEN and every other light to RED immediately, freezing normal cycling until resumeNormalOperation() is called explicitly; a second override while one is active is rejected, not queued',
    'Multiple intersection support — TrafficRepository stores any number of independently-ticking Intersection instances',
    'Phase-change notifications — every transition (automatic, manual, or emergency-induced) is published to registered observers for in-app display and server-side logging',
    'Deterministic testability — the passage of time is abstracted behind SignalTicker, so tests drive an intersection with a ManualSignalTicker instead of sleeping for a real scheduler'
  ],
  entities: [
    {
      name: 'TrafficSignalService',
      description: 'Facade the controller delegates to wholesale. Owns one production Intersection auto-ticking on a real ScheduledExecutorSignalTicker, plus any extra intersections created via createIntersection().',
      fields: [
        {
          name: 'repository',
          type: 'TrafficRepository',
          description: 'Intersection storage, injected via constructor'
        },
        {
          name: 'productionTicker',
          type: 'SignalTicker',
          description: 'ScheduledExecutorSignalTicker in production; a test constructor accepts a ManualSignalTicker instead for deterministic timing tests'
        }
      ],
      methods: [
        {
          name: 'createIntersection(name, positions)',
          returns: 'Intersection',
          description: 'Builds a new intersection, registers it with the repository, and schedules its tick() on the production ticker'
        },
        {
          name: 'requestEmergencyOverride(intersectionId, lightId)',
          returns: 'Intersection',
          description: 'Delegates to Intersection.requestEmergencyOverride(); throws InvalidOverrideException if one is already active'
        },
        {
          name: 'manualTransition(intersectionId, lightId, requested)',
          returns: 'Intersection',
          description: 'Delegates to Intersection.manualTransition(); rejected with IllegalSignalTransitionException unless requested is that light\'s one legal next phase'
        }
      ]
    },
    {
      name: 'Intersection',
      description: 'A 4-way intersection: exactly one TrafficLight is ever GREEN/YELLOW (the "active" light) while every other stays RED. A single ReentrantLock guards every read-then-write operation, since two directions simultaneously GREEN is a real conflict, not just a display glitch.',
      fields: [
        {
          name: 'lights',
          type: 'List<TrafficLight>',
          description: 'One per approach position; lights.get(0) starts GREEN, the rest RED, on construction'
        },
        {
          name: 'notifier',
          type: 'SignalChangeNotifier',
          description: 'Published to on every phase change — automatic, manual, or emergency'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Held for the whole span of tick()/manualTransition()/requestEmergencyOverride()/resumeNormalOperation()'
        },
        {
          name: 'activeIndex, emergencyActive, emergencyLightId',
          type: 'int, boolean, Integer',
          description: 'Which light is currently active, and whether an emergency override is in force (freezing tick() as a no-op until resumed)'
        }
      ],
      methods: [
        {
          name: 'tick()',
          returns: 'void',
          description: 'One simulated second: decrements the active light\'s countdown; at zero, GREEN advances to YELLOW on the same light, or YELLOW advances to RED and hands GREEN to the next light in rotation. A no-op while an emergency override is active.'
        },
        {
          name: 'requestEmergencyOverride(lightId)',
          returns: 'void',
          description: 'Forces the target light to GREEN and every other light to RED immediately, bypassing the legal-transition table — a documented simplification; a real preemption system would insert an all-red/clearance interval first'
        },
        {
          name: 'resumeNormalOperation()',
          returns: 'void',
          description: 'Moves the overridden light from GREEN to YELLOW (a legal transition) and lets ordinary ticking continue from there — no automatic timeout; an earlier revision spawned a one-shot executor per call to auto-clear it, which leaked a thread pool per call'
        }
      ]
    },
    {
      name: 'TrafficLight',
      description: 'One signal head. Its phase is delegated to a SignalState instance instead of a directly-mutated enum field, so the legal-transition table lives in the state classes, not in TrafficLight or its callers. Mutation is package-private — only Intersection, which owns the cross-light lock, may change a light\'s phase.',
      fields: [
        {
          name: 'state',
          type: 'SignalState',
          description: 'volatile — the current phase, delegated to a Red/Yellow/GreenState singleton'
        },
        {
          name: 'remainingSeconds',
          type: 'int',
          description: 'volatile — counts down to zero, at which point Intersection.tick() advances the phase'
        }
      ],
      methods: [
        {
          name: 'requestTransitionTo(requested)',
          returns: 'void',
          description: 'Validates requested against state.next() and applies it if it matches, else throws IllegalSignalTransitionException — the enforcement point for "reject illegal jumps"'
        }
      ]
    },
    {
      name: 'SignalState',
      description: 'State pattern interface for one light\'s phase. Each concrete state (RedState/YellowState/GreenState) is a singleton that knows the one phase it may legally advance to and how long it holds — RED→GREEN→YELLOW→RED is expressed entirely by how the singletons wire to each other via next(), not by an if/else chain at any call site.',
      fields: [],
      methods: [
        {
          name: 'next()',
          returns: 'SignalState',
          description: 'RedState.next() → GreenState, GreenState.next() → YellowState, YellowState.next() → RedState — the whole legal-transition table'
        }
      ]
    },
    {
      name: 'SignalTicker',
      description: 'Abstraction over "the passage of time". ScheduledExecutorSignalTicker (one shared daemon thread per intersection, shut down via @PreDestroy) drives production; ManualSignalTicker (registered tasks only run when advance(seconds) is called explicitly, no thread involved) drives tests and the isolated /sim/* demo.',
      fields: [],
      methods: [
        {
          name: 'scheduleEverySecond(task)',
          returns: 'TickHandle',
          description: 'Registers a task to run once per simulated second; returns a handle whose cancel() stops it'
        }
      ]
    },
    {
      name: 'SignalChangeNotifier / SignalObserver',
      description: 'Observer pattern subject/interface. Every registered observer is notified — via a CopyOnWriteArrayList so publish() never locks and subscribe/unsubscribe mid-publish is safe — on every transition. A misbehaving observer\'s exception is caught per-observer so it cannot break the rest.',
      fields: [],
      methods: [
        {
          name: 'publish(event)',
          returns: 'void',
          description: 'Fans a SignalChangeEvent out to InAppSignalObserver (keeps the last 200 in memory) and LoggingSignalObserver (writes at DEBUG, not INFO, since the production ticker fires every second for the process lifetime — logging at INFO would flood stdout)'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State',
      used: true,
      explanation: 'SignalState (RedState/YellowState/GreenState, each a singleton) drives TrafficLight\'s phase. Each state\'s next() is the only place the legal-transition table is declared — TrafficLight.requestTransitionTo() validates against it rather than re-deriving the rule itself.'
    },
    {
      name: 'Observer',
      used: true,
      explanation: 'SignalChangeNotifier (the subject) fans every SignalChangeEvent out to registered SignalObserver implementations. InAppSignalObserver keeps a bounded in-memory history for the UI; LoggingSignalObserver writes to the server log. This is fully wired and fires on every real transition, not a hypothetical extension point.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'SignalTicker is swapped between ScheduledExecutorSignalTicker (a real background scheduler) and ManualSignalTicker (advances only when told to) without Intersection or TrafficSignalService changing — the seam that keeps timed-transition tests deterministic.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'TrafficRepository is the only class touching the intersections map; TrafficSignalService goes through it rather than holding its own storage.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'SignalState subclasses own phase-transition rules only. SignalTicker implementations own "when does time pass" only. SignalChangeNotifier owns fan-out only. Intersection composes all three plus its own cross-light locking.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new phase (e.g. a protected left-turn arrow) is a new SignalState implementation wired into the existing next() chain — TrafficLight and Intersection do not change.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Intersection depends on the SignalTicker interface, not on ScheduledExecutorSignalTicker directly — production wiring and test wiring supply different implementations through the same seam.'
    },
    {
      name: 'Encapsulation',
      description: 'TrafficLight\'s phase-mutating methods (forceState, decrementAndCheckExpired, requestTransitionTo) are package-private — only Intersection, which owns the lock coordinating a light with its siblings, may change a light\'s phase.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — SignalState.next()',
      description: 'Intersection.advance() calls active.getCurrentState() and light.forceState(...) without ever checking "is this RedState or GreenState?" — each state singleton\'s own next() supplies the correct successor.',
      alternative: 'Could use a LightState enum with a switch statement mapping each value to its successor — the State-pattern version keeps each phase\'s duration and successor colocated in its own class instead of scattered across a switch.'
    },
    {
      name: 'Composition — Intersection has-a List<TrafficLight>',
      description: 'Intersection coordinates its lights by composition, not inheritance; TrafficLight in turn has-a SignalState rather than encoding phase as its own field.',
      alternative: 'Could give TrafficLight its own tick()/countdown loop per light — centralizing coordination in Intersection is what makes "exactly one active light" an invariant enforceable in one place, under one lock.'
    },
    {
      name: 'Strategy — Pluggable SignalTicker',
      description: 'Intersection.tick() is invoked by whichever SignalTicker was registered — a real ScheduledExecutorSignalTicker in production, a ManualSignalTicker under test — without Intersection knowing which.',
      alternative: 'Could give Intersection its own background thread — pluggable ticker is what lets tests advance time deterministically with zero sleeping.'
    }
  ],
  extensibility: [
    {
      area: 'Pedestrian Crossing',
      description: 'Add a PedestrianSignalState pair (WALK/DONT_WALK) alongside the vehicle SignalState hierarchy, tied to the same Intersection tick() — the observer notification path needs no change.',
      difficulty: 'Medium'
    },
    {
      area: 'Adaptive Timing',
      description: 'Replace each state\'s fixed getDurationSeconds() with a call to a pluggable TimingStrategy that reads simulated vehicle-density input — RedState/YellowState/GreenState\'s next() wiring is unaffected.',
      difficulty: 'Hard'
    },
    {
      area: 'Scheduled Timeout on Emergency Override',
      description: 'requestEmergencyOverride() deliberately has no auto-timeout today (an earlier version leaked a thread pool per call — see RCA-038 in this repo). A safe version would need a single shared, cancellable scheduled task per intersection instead of a fire-and-forget one per call.',
      difficulty: 'Medium'
    },
    {
      area: 'Persisted Intersection Configuration',
      description: 'TrafficRepository is in-memory only; swapping in a JPA-backed implementation behind the same interface would let intersection layouts survive a restart without touching TrafficSignalService.',
      difficulty: 'Medium'
    }
  ]
};
