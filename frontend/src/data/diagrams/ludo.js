// classDiagrams — ludo
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Ludo — Class Diagram',
  classes: [
    {
      name: 'LudoService',
      fields: [
        '- repository: LudoRepository',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ createGame(players): Game',
        '+ rollDice(id): Game',
        '+ moveToken(id, pi, ti): Game',
        '+ getGame(id): Game'
      ]
    },
    {
      name: 'Game',
      fields: [
        '- id: long',
        '- players: List<Player>',
        '- tokens: List<List<Token>>',
        '- currentPlayerIndex: int',
        '- diceValue: int',
        '- status: GameStatus',
        '- winner: String'
      ],
      methods: []
    },
    {
      name: 'Player',
      fields: [
        '- index: int',
        '- name: String',
        '- color: String (RED/GREEN/BLUE/YELLOW)'
      ],
      methods: []
    },
    {
      name: 'Token',
      fields: [
        '- id: int',
        '- color: String',
        '- position: int',
        '- isHome: boolean',
        '- isFinished: boolean'
      ],
      methods: []
    },
    {
      name: 'GameStatus',
      stereotype: 'enum',
      fields: [
        'WAITING',
        'PLAYING',
        'FINISHED'
      ],
      methods: []
    },
    {
      name: 'LudoRepository',
      fields: [
        '- games: ConcurrentHashMap<Long, Game>'
      ],
      methods: [
        '+ save(game): void',
        '+ get(id): Game',
        '+ nextId(): long'
      ]
    }
  ],
  relationships: [
    {
      from: 'LudoService',
      to: 'LudoRepository',
      label: 'uses'
    },
    {
      from: 'LudoService',
      to: 'Game',
      label: 'manages'
    },
    {
      from: 'Game',
      to: 'Player',
      label: 'has 4'
    },
    {
      from: 'Game',
      to: 'Token',
      label: 'has 16 (4x4)'
    },
    {
      from: 'Game',
      to: 'GameStatus',
      label: 'has state'
    }
  ]
};
