// designDetails — snakeladders
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Snake & Ladders — Design Details',
  tldr: [
    'Turn-based board game with dice rolling, snake slides, ladder climbs, and win detection',
    'Strategy Pattern for dice rolling (Standard 6-sided vs Custom dice)',
    'Queue-based turn management for players'
  ],
  requirements: [
    '100-cell board with configurable snakes and ladders',
    'Queue of players taking turns',
    'Dice roll generates random integer 1-6',
    'Token moves by roll count; if landing on snake head → slide to tail; if ladder base → climb to top',
    'First player to reach exactly cell 100 wins'
  ],
  entities: [
    {
      name: 'SnakeLaddersService',
      description: 'Game logic controller.',
      fields: [],
      methods: [
        {
          name: 'rollAndMove(gameId)',
          returns: 'GameState',
          description: 'Rolls dice and advances current player'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Dice strategy abstracts dice rolling logic.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility',
      description: 'Board manages cell mappings; GameController manages turn flow.'
    }
  ],
  oopConcepts: [
    {
      name: 'Composition',
      description: 'Board composes Snakes, Ladders, and Cells.'
    }
  ],
  extensibility: [
    {
      area: 'Multi-dice support',
      description: 'Support rolling 2 dice simultaneously.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'Used Map lookup for snake/ladder destination cells for O(1) position calculation.'
  ]
};
