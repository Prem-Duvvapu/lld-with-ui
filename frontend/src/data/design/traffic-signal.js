// designDetails — trafficSignal
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Traffic Signal — Design Details',
  requirements: [
    'Traffic intersection with multiple roads — each road has a traffic light with RED, YELLOW, GREEN states',
    'Signal timing configuration — configurable duration for each light state per road',
    'Automatic state cycling: RED to GREEN to YELLOW to RED with configurable durations per state',
    'Emergency override — traffic controller can manually set all signals to RED for emergency vehicle passage',
    'Pedestrian crossing integration — pedestrian button triggers signal change with walk/don\'t-walk indicators',
    'Multiple intersection support — system can manage several independent intersections each with its own configuration',
    'Concurrent road coordination — when one road turns GREEN, the crossing road turns RED to prevent collisions'
  ],
  entities: [
    {
      name: 'TrafficController',
      description: 'Central coordinator managing all intersections. Provides manual override for emergencies and handles system-wide commands like rush-hour mode.',
      fields: [
        {
          name: 'intersections',
          type: 'Map<String, Intersection>',
          description: 'All managed intersections indexed by ID'
        },
        {
          name: 'emergencyMode',
          type: 'boolean',
          description: 'When true, all signals are forced to RED for emergency vehicles'
        }
      ],
      methods: [
        {
          name: 'startIntersection(id)',
          returns: 'void',
          description: 'Begins the signal cycling for a specific intersection'
        },
        {
          name: 'emergencyOverride()',
          returns: 'void',
          description: 'Sets all signals to RED for emergency vehicle passage'
        },
        {
          name: 'releaseOverride()',
          returns: 'void',
          description: 'Restores normal signal operation after emergency'
        }
      ]
    },
    {
      name: 'Intersection',
      description: 'Represents a single road intersection with multiple approach roads. Coordinates signal timing so conflicting roads never have GREEN simultaneously.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique intersection identifier'
        },
        {
          name: 'roads',
          type: 'List<Road>',
          description: 'All approach roads at this intersection'
        },
        {
          name: 'currentPhase',
          type: 'int',
          description: 'Index of the currently active road phase'
        },
        {
          name: 'timer',
          type: 'ScheduledExecutorService',
          description: 'Manages state transition scheduling'
        }
      ],
      methods: [
        {
          name: 'startCycle()',
          returns: 'void',
          description: 'Begins the signal cycling sequence'
        },
        {
          name: 'transitionNext()',
          returns: 'void',
          description: 'Advances to the next road GREEN phase'
        },
        {
          name: 'emergencyStop()',
          returns: 'void',
          description: 'Halts all cycling and sets all signals to RED'
        }
      ]
    },
    {
      name: 'Road',
      description: 'An approach road to the intersection. Has its own traffic signal and knows the crossing road(s) for conflict detection.',
      fields: [
        {
          name: 'name',
          type: 'String',
          description: 'Road name (e.g., Main Street, 5th Avenue)'
        },
        {
          name: 'signal',
          type: 'TrafficSignal',
          description: 'The traffic light controlling this road'
        },
        {
          name: 'crossingRoads',
          type: 'List<Road>',
          description: 'Roads that intersect with this one — must not share GREEN'
        }
      ],
      methods: [
        {
          name: 'changeSignal(state)',
          returns: 'void',
          description: 'Changes this road\'s signal to the given state'
        },
        {
          name: 'conflictsWith(other)',
          returns: 'boolean',
          description: 'Checks if another road crosses this one'
        }
      ]
    },
    {
      name: 'TrafficSignal',
      description: 'Individual traffic light with RED, YELLOW, GREEN states. Maintains current state and configured durations for each state.',
      fields: [
        {
          name: 'currentState',
          type: 'SignalState',
          description: 'Current light state: RED, YELLOW, or GREEN'
        },
        {
          name: 'durations',
          type: 'Map<SignalState, Integer>',
          description: 'Time in seconds for each state'
        }
      ],
      methods: [
        {
          name: 'setState(state)',
          returns: 'void',
          description: 'Transitions the signal to the specified state'
        },
        {
          name: 'getState()',
          returns: 'SignalState',
          description: 'Returns current light state'
        }
      ]
    },
    {
      name: 'SignalState',
      description: 'Enum for traffic light states: RED (stop), YELLOW (caution/transition), GREEN (go). Determines vehicle and pedestrian behavior.',
      fields: [
        {
          name: 'RED',
          type: 'enum',
          description: 'Vehicles must stop — crossing road has GREEN or YELLOW'
        },
        {
          name: 'YELLOW',
          type: 'enum',
          description: 'Transition state — caution, about to turn RED'
        },
        {
          name: 'GREEN',
          type: 'enum',
          description: 'Vehicles may proceed — crossing road is RED'
        }
      ],
      methods: [
        {
          name: 'nextState()',
          returns: 'SignalState',
          description: 'Returns the next state in the cycle: RED to GREEN to YELLOW to RED'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State',
      used: true,
      explanation: 'TrafficSignal uses the State pattern via SignalState enum. Each state (RED, YELLOW, GREEN) defines behavior and valid next transition. Adding FLASHING state only requires a new enum constant.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'TrafficController is a singleton managing all intersections. A single controller ensures coordinated emergency overrides and consistent system-wide configuration.'
    },
    {
      name: 'Observer',
      used: false,
      explanation: 'Pedestrian crossing buttons act as observers watching for the walk signal. Emergency vehicles could notify the controller to trigger override. Currently handled via direct controller calls.'
    },
    {
      name: 'Strategy',
      used: false,
      explanation: 'Signal timing strategies (MorningRushStrategy, NightStrategy, WeekendStrategy) could replace fixed durations. Intersection would delegate timing to a TimingStrategy without changing core cycle logic.'
    },
    {
      name: 'Command',
      used: false,
      explanation: 'Emergency override, pedestrian crossing, and manual mode could be encapsulated as Command objects. Enables undo/redo, scheduling, and logging of signal changes.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'TrafficController handles coordination. Intersection manages phase sequencing. Road owns its signal and knows conflicts. TrafficSignal maintains state and timing. Each has one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New road types, signal timing strategies, or intersection topologies can be added by extending interfaces. Core cycle logic is closed for modification but open for extension.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Intersection depends on Road and TrafficSignal abstractions, not concrete implementations. Timing mechanism uses an interface for different scheduling backends.'
    },
    {
      name: 'Encapsulation',
      description: 'TrafficSignal hides state transition rules. Intersection hides phase coordination logic. Roads cannot directly change other roads\' signals — coordination goes through the Intersection.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'The RED to GREEN to YELLOW cycle is a straightforward state machine. Modeling it as one keeps implementation simple and verifiable.'
    }
  ],
  oopConcepts: [
    {
      name: 'State Pattern via Enum',
      description: 'SignalState enum drives all signal behavior. Each state knows its valid transition. TrafficSignal simply delegates to current state, avoiding complex if-else chains.',
      alternative: 'Could use boolean flags (isRed, isGreen). Enum-based state makes invalid states (both GREEN and RED) unrepresentable.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Intersection has-a List of Road. Road has-a TrafficSignal. TrafficSignal has-a SignalState. The system is built by composing objects.',
      alternative: 'Could extend a BaseIntersection class. Composition is chosen because intersections vary in road count and layout.'
    },
    {
      name: 'Encapsulation — Conflict Prevention',
      description: 'The Intersection encapsulates phase coordination. Roads cannot independently turn GREEN — every transition is validated by the Intersection to prevent conflicting signals.',
      alternative: 'Could let each road manage its own signal. Centralized coordination guarantees safety invariants at the architectural level.'
    }
  ],
  extensibility: [
    {
      area: 'New Signal State',
      description: 'Add FLASHING or LEFT_TURN_ARROW state to SignalState enum. Define duration and next transition. Existing states remain unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'Adaptive Traffic Timing',
      description: 'Add sensors to detect vehicle density. Implement AdaptiveTimingStrategy that adjusts GREEN durations based on real-time traffic volume.',
      difficulty: 'Hard'
    },
    {
      area: 'Pedestrian Crossing',
      description: 'Add PedestrianButton as an observer. When pressed, Intersection schedules a pedestrian walk interval during the next appropriate cycle.',
      difficulty: 'Medium'
    },
    {
      area: 'Connected Vehicle Integration',
      description: 'Add CommunicationModule that broadcasts signal states to approaching vehicles via V2I. Vehicles receive GREEN timing for optimal speed advice.',
      difficulty: 'Hard'
    }
  ]
};
