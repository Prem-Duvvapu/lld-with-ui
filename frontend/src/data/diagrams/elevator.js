// classDiagrams — elevator
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Elevator — Class Diagram',
  classes: [
    {
      name: 'ElevatorService',
      methods: [
        '+ requestElevator(from, to): Request',
        '+ tick(): List<Elevator>',
        '+ findBestElevator(from, to): Elevator'
      ]
    },
    {
      name: 'Elevator',
      fields: [
        '- id: int',
        '- name: String',
        '- currentFloor: int',
        '- direction: Direction',
        '- status: ElevatorStatus',
        '- capacity: int',
        '- pendingFloors: List<Integer>'
      ],
      methods: [
        '+ addStop(floor): void',
        '+ removeStop(floor): void',
        '+ isFull(): boolean'
      ]
    },
    {
      name: 'Direction',
      stereotype: 'enum',
      fields: [
        'UP',
        'DOWN',
        'IDLE'
      ],
      methods: []
    },
    {
      name: 'ElevatorStatus',
      stereotype: 'enum',
      fields: [
        'MOVING',
        'STOPPED',
        'DOOR_OPEN',
        'OUT_OF_ORDER'
      ],
      methods: []
    },
    {
      name: 'Request',
      fields: [
        '- id: long',
        '- fromFloor: int',
        '- toFloor: int',
        '- status: String',
        '- assignedElevatorId: int'
      ],
      methods: []
    },
    {
      name: 'ElevatorRepository',
      fields: [
        '- elevators: ConcurrentHashMap',
        '- requests: ConcurrentHashMap',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ getAllElevators(): List',
        '+ saveElevator(e): void'
      ]
    }
  ],
  relationships: [
    {
      from: 'ElevatorService',
      to: 'Elevator',
      label: 'manages'
    },
    {
      from: 'ElevatorService',
      to: 'Request',
      label: 'creates'
    },
    {
      from: 'Elevator',
      to: 'Direction',
      label: 'has'
    },
    {
      from: 'Elevator',
      to: 'ElevatorStatus',
      label: 'has status'
    },
    {
      from: 'Request',
      to: 'Elevator',
      label: 'assigned to'
    },
    {
      from: 'ElevatorService',
      to: 'ElevatorRepository',
      label: 'uses'
    }
  ]
};
