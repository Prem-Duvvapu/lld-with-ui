// classDiagrams — snakeladders
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Snake & Ladders — Class Diagram',
  classes: [
    {
      name: 'SnakeLaddersService',
      methods: [
        '+ createGame(playerNames): Game',
        '+ rollDice(gameId): RollResult',
        '+ checkWin(player): boolean'
      ]
    },
    {
      name: 'Game',
      fields: [
        '- id: String',
        '- players: List<Player>',
        '- board: Map<Integer, Integer>',
        '- currentPlayerIndex: int',
        '- state: GameState'
      ],
      methods: [
        '+ movePlayer(player, steps): void',
        '+ applySnakeOrLadder(pos): int',
        '+ nextTurn(): void'
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
      name: 'Dice',
      methods: [
        '+ roll(): int'
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
        'IN_PROGRESS',
        'FINISHED'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'SnakeLaddersService',
      to: 'Game',
      label: 'manages'
    },
    {
      from: 'Game',
      to: 'Player',
      label: 'has'
    },
    {
      from: 'Game',
      to: 'Dice',
      label: 'uses'
    },
    {
      from: 'Game',
      to: 'Snake',
      label: 'has 6'
    },
    {
      from: 'Game',
      to: 'Ladder',
      label: 'has 11'
    },
    {
      from: 'Game',
      to: 'GameState',
      label: 'has state'
    }
  ]
};
