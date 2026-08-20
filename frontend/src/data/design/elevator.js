// designDetails — elevator
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Elevator Control System — Design Details',
  tldr: [
    'Multi-elevator control system optimizing passenger dispatch across floors',
    'LOOK / SCAN Algorithm for directional elevator movement and request scheduling',
    'State Machine for Elevator states: IDLE, MOVING_UP, MOVING_DOWN, STOPPED_DOOR_OPEN',
    'Thread-safe request handling using ReentrantLock and ConcurrentHashMap'
  ],
  requirements: [
    'Multi-elevator dispatch across N floors (e.g. 4 elevators, 10 floors)',
    'External floor call buttons (Up / Down)',
    'Internal elevator destination buttons',
    'Optimal elevator selection based on proximity and current direction',
    'Door opening and closing lifecycle transitions'
  ],
  entities: [
    {
      name: 'ElevatorService',
      description: 'Core controller delegating floor requests to optimal elevators.',
      fields: [
        {
          name: 'elevators',
          type: 'List<Elevator>',
          description: 'List of elevator instances'
        }
      ],
      methods: [
        {
          name: 'requestElevator(floor, direction)',
          returns: 'void',
          description: 'Dispatches optimal elevator to floor request'
        },
        {
          name: 'step() / tick()',
          returns: 'void',
          description: 'Advances all elevator positions by 1 floor unit'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Elevator dispatch strategies (Proximity, SCAN algorithm).'
    },
    {
      name: 'State Pattern',
      used: true,
      explanation: 'Elevator state transitions between IDLE, MOVING, and STOPPED.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility',
      description: 'Elevator Car handles state/movement; Controller dispatches requests.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Elevator internal floor queues managed via encapsulated methods.'
    }
  ],
  extensibility: [
    {
      area: 'Express Elevators',
      description: 'Add express elevator rules for high-rise buildings.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Used LOOK algorithm over FCFS to minimize elevator travel distance and wait times.',
    'Scheduled background simulation ticks drive elevator state updates synchronously or on timer.'
  ]
};
