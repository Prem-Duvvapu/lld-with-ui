// classDiagrams — minesweeper
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Minesweeper — Class Diagram',
  classes: [
    {
      name: 'MinesweeperService',
      methods: [
        '+ createGame(rows, cols, mines): Game',
        '+ revealCell(gameId, row, col): Game',
        '+ flagCell(gameId, row, col): Game',
        '+ getGame(id): Game'
      ]
    },
    {
      name: 'Game',
      fields: [
        '- id: long',
        '- board: Cell[][]',
        '- rows: int',
        '- cols: int',
        '- totalMines: int',
        '- status: GameStatus',
        '- flagsUsed: int',
        '- revealedCount: int'
      ],
      methods: []
    },
    {
      name: 'Cell',
      fields: [
        '- row: int',
        '- col: int',
        '- isMine: boolean',
        '- isRevealed: boolean',
        '- isFlagged: boolean',
        '- adjacentMines: int'
      ],
      methods: []
    },
    {
      name: 'GameStatus',
      stereotype: 'enum',
      fields: [
        'PLAYING',
        'WON',
        'LOST'
      ],
      methods: []
    },
    {
      name: 'MinesweeperRepository',
      fields: [
        '- games: ConcurrentHashMap<Long, Game>'
      ],
      methods: [
        '+ save(game): void',
        '+ get(id): Game'
      ]
    }
  ],
  relationships: [
    {
      from: 'MinesweeperService',
      to: 'Game',
      label: 'manages'
    },
    {
      from: 'Game',
      to: 'Cell',
      label: 'contains'
    },
    {
      from: 'Game',
      to: 'GameStatus',
      label: 'has state'
    },
    {
      from: 'MinesweeperService',
      to: 'MinesweeperRepository',
      label: 'uses'
    }
  ]
};
