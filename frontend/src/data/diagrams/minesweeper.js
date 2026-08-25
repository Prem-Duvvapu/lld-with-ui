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
        '- simRepository: MinesweeperRepository',
        '- simEventLog: List<SimEvent>'
      ],
      methods: [
        '+ createGame(rows, cols, mines): Game',
        '+ revealCell(gameId, row, col): Game',
        '+ flagCell(gameId, row, col): Game',
        '+ getGame(id): Game',
        '+ simReset(): Game',
        '+ simReveal(row, col): Game',
        '+ simFlag(row, col): Game'
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
    {
      name: 'MinesweeperException',
      stereotype: 'exception',
      fields: [],
      methods: []
    },
    {
      name: 'GameNotFoundException',
      stereotype: 'exception',
      fields: ['@ResponseStatus 404'],
      methods: []
    },
    {
      name: 'GameOverException',
      stereotype: 'exception',
      fields: ['@ResponseStatus 409'],
      methods: []
    },
    {
      name: 'InvalidCellException',
      stereotype: 'exception',
      fields: ['@ResponseStatus 400'],
      methods: []
    },
    {
      name: 'InvalidBoardConfigException',
      stereotype: 'exception',
      fields: ['@ResponseStatus 400'],
      methods: []
    },
    {
      name: 'SimEvent',
      fields: [
        '- id: long',
        '- timestamp: String',
        '- actor: String',
        '- description: String',
        '- status: GameStatus',
        '- revealedCount: int'
      ],
      methods: []
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
    {
      from: 'GameNotFoundException',
      to: 'MinesweeperException',
      label: 'extends'
    },
    {
      from: 'GameOverException',
      to: 'MinesweeperException',
      label: 'extends'
    },
    {
      from: 'InvalidCellException',
      to: 'MinesweeperException',
      label: 'extends'
    },
    {
      from: 'InvalidBoardConfigException',
      to: 'MinesweeperException',
      label: 'extends'
    },
    {
      from: 'MinesweeperService',
      to: 'MinesweeperException',
      label: 'throws'
    },
    {
      from: 'MinesweeperService',
      to: 'SimEvent',
      label: 'logs (/sim/* engine)'
    }
  ]
};
