// classDiagrams — snakeladders
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Snake & Ladders — Class Diagram',
  classes: [
    {
      name: 'SnakeLaddersService',
      stereotype: 'singleton',
      fields: [
        '- repository: GameRepository',
        '- diceRoller: DiceRoller',
        '- gameLocks: ConcurrentHashMap<String, ReentrantLock>',
      ],
      methods: [
        '+ createGame(playerNames): Game',
        '+ getGame(id): Game',
        '+ rollDice(gameId): Game',
      ]
    },
    {
      name: 'Game',
      fields: [
        '- id: String',
        '- players: List<Player>',
        '- currentPlayerIndex: int',
        '- snakes: Map<Integer, Integer>',
        '- ladders: Map<Integer, Integer>',
        '- diceRoller: DiceRoller',
        '- state: GameState',
        '- winner: Player',
        '- lastDiceValue: int',
        '- lastMessage: String'
      ],
      methods: [
        '+ rollAndMove(): int',
        '+ getCurrentPlayer(): Player'
      ]
    },
    {
      name: 'Player',
      fields: [
        '- name: String',
        '- position: int',
        '- color: String'
      ],
      methods: [
        '+ setPosition(pos): void'
      ]
    },
    {
      name: 'DiceRoller',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ roll(): int'
      ]
    },
    {
      name: 'RandomDiceRoller',
      fields: [
        '- random: Random'
      ],
      methods: [
        'implements DiceRoller'
      ]
    },
    {
      name: 'FixedDiceRoller',
      fields: [
        '- sequence: int[]',
        '- index: int'
      ],
      methods: [
        'implements DiceRoller'
      ]
    },
    {
      name: 'Snake',
      fields: [
        '- head: int',
        '- tail: int'
      ],
      methods: []
    },
    {
      name: 'Ladder',
      fields: [
        '- bottom: int',
        '- top: int'
      ],
      methods: []
    },
    {
      name: 'GameState',
      stereotype: 'enum',
      fields: [
        'WAITING',
        'IN_PROGRESS',
        'FINISHED'
      ],
      methods: []
    },
    {
      name: 'GameRepository',
      fields: [
        '- games: ConcurrentHashMap<String, Game>'
      ],
      methods: [
        '+ save(game): void',
        '+ get(id): Game',
        '+ generateId(): String'
      ]
    },
  ],
  relationships: [
    {
      from: 'SnakeLaddersService',
      to: 'GameRepository',
      label: 'uses'
    },
    {
      from: 'SnakeLaddersService',
      to: 'Game',
      label: 'manages'
    },
    {
      from: 'SnakeLaddersService',
      to: 'DiceRoller',
      label: 'injects'
    },
    {
      from: 'Game',
      to: 'Player',
      label: 'has 2-4'
    },
    {
      from: 'Game',
      to: 'DiceRoller',
      label: 'rolls via'
    },
    {
      from: 'Game',
      to: 'GameState',
      label: 'has state'
    },
    {
      from: 'RandomDiceRoller',
      to: 'DiceRoller',
      label: 'implements',
      dashed: true
    },
    {
      from: 'FixedDiceRoller',
      to: 'DiceRoller',
      label: 'implements',
      dashed: true
    },
  ]
};
