// classDiagrams — trafficSignal
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Traffic Signal — Class Diagram',
  classes: [
    {
      name: 'TrafficLight',
      fields: [
        '- id: String',
        '- currentState: LightState',
        '- timer: Timer'
      ],
      methods: [
        '+ changeState(newState): void',
        '+ getState(): LightState'
      ]
    },
    {
      name: 'Intersection',
      fields: [
        '- id: String',
        '- lights: List<TrafficLight>',
        '- controller: SignalController'
      ],
      methods: [
        '+ getLights(): List<TrafficLight>',
        '+ startCycle(): void'
      ]
    },
    {
      name: 'SignalController',
      fields: [
        '- intersections: Map<String, Intersection>',
        '- activePattern: String'
      ],
      methods: [
        '+ controlIntersection(id): void',
        '+ handleEmergency(id): void',
        '+ setTimings(green, yellow, red): void'
      ]
    },
    {
      name: 'Timer',
      fields: [
        '- duration: int',
        '- remaining: int'
      ],
      methods: [
        '+ start(): void',
        '+ tick(): void',
        '+ reset(): void',
        '+ isExpired(): boolean'
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
    }
  ],
  relationships: [
    {
      from: 'TrafficLight',
      to: 'LightState',
      label: 'has state'
    },
    {
      from: 'TrafficLight',
      to: 'Timer',
      label: 'has timer'
    },
    {
      from: 'Intersection',
      to: 'TrafficLight',
      label: 'contains'
    },
    {
      from: 'Intersection',
      to: 'SignalController',
      label: 'controlled by'
    },
    {
      from: 'SignalController',
      to: 'Intersection',
      label: 'monitors'
    }
  ]
};
