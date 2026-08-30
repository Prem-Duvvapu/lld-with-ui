// classDiagrams — minesweeper
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Minesweeper — Class Diagram',
  classes: [
    {
      name: 'MinesweeperService',
      stereotype: 'singleton',
      fields: [
        '- repository: MinesweeperRepository',
        '- minePlacer: MinePlacer',
        '- gameLocks: ConcurrentHashMap<Long, ReentrantLock>',
      ],
      methods: [
        '+ createGame(rows, cols, mines): Game',
        '+ revealCell(gameId, row, col): Game',
        '+ flagCell(gameId, row, col): Game',
        '+ getGame(id): Game',
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
        '- revealedCount: int',
        '- firstClickDone: boolean'
      ],
      methods: []
    },
    {
      name: 'Cell',
      fields: [
        '- row: int',
        '- col: int',
        '- mine: boolean',
        '- revealed: boolean',
        '- flagged: boolean',
        '- adjacentMines: int'
      ],
      methods: []
    },
    {
      name: 'MinePlacer',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ place(board, rows, cols, totalMines, excludeRow, excludeCol): void'
      ]
    },
    {
      name: 'RandomMinePlacer',
      fields: [
        '- random: Random'
      ],
      methods: [
        'implements MinePlacer'
      ]
    },
    {
      name: 'FixedMinePlacer',
      fields: [
        '- coordinates: List<int[]>'
      ],
      methods: [
        'implements MinePlacer'
      ]
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
        '+ get(id): Game',
        '+ nextId(): long'
      ]
    },
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
    },
    {
      from: 'MinesweeperService',
      to: 'MinePlacer',
      label: 'injects'
    },
    {
      from: 'RandomMinePlacer',
      to: 'MinePlacer',
      label: 'implements',
      dashed: true
    },
    {
      from: 'FixedMinePlacer',
      to: 'MinePlacer',
      label: 'implements',
      dashed: true
    },
  ]
};
