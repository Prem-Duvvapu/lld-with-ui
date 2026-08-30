// classDiagrams — tictactoe
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Tic Tac Toe Game — Class Diagram',
  classes: [
    {
      name: 'TicTacToeService',
      stereotype: 'singleton',
      fields: [
        '- repository: GameRepository',
        '- gameLocks: ConcurrentHashMap<String, ReentrantLock>',
      ],
      methods: [
        '+ createGame(p1, p2): Game',
        '+ getGame(id): Game',
        '+ makeMove(gameId, row, col, playerName): Game',
        '+ undoLastMove(gameId): Game',
        '+ resetGame(gameId): Game',
      ]
    },
    {
      name: 'Game',
      fields: [
        '- id: String',
        '- board: Board',
        '- players: Player[]',
        '- currentPlayerIndex: int',
        '- status: GameStatus',
        '- winner: Player',
        '- moveHistory: List<Move>',
        '- winningLine: int[]'
      ],
      methods: [
        '+ makeMove(row, col, player): boolean',
        '+ checkWin(player): boolean',
        '+ checkDraw(): boolean',
        '+ switchPlayer(): void',
        '+ getCurrentPlayer(): Player',
        '+ undoLastMove(): boolean',
        '+ reset(): void'
      ]
    },
    {
      name: 'Board',
      fields: [
        '- grid: Cell[][]',
        '- size: int'
      ],
      methods: [
        '+ isCellEmpty(row, col): boolean',
        '+ setCell(row, col, Symbol): void',
        '+ isFull(): boolean',
        '+ checkWinLine(symbol): int[]'
      ]
    },
    {
      name: 'Cell',
      fields: [
        '- row: int',
        '- col: int',
        '- symbol: Symbol'
      ],
      methods: [
        '+ getSymbol(): Symbol',
        '+ setSymbol(Symbol): void',
        '+ isEmpty(): boolean'
      ]
    },
    {
      name: 'Player',
      fields: [
        '- name: String',
        '- symbol: Symbol'
      ],
      methods: []
    },
    {
      name: 'Move',
      fields: [
        '- moveNumber: int',
        '- playerName: String',
        '- symbol: Symbol',
        '- row: int',
        '- col: int',
        '- timestamp: long'
      ],
      methods: []
    },
    {
      name: 'Symbol',
      stereotype: 'enum',
      fields: [
        'X',
        'O'
      ],
      methods: []
    },
    {
      name: 'GameStatus',
      stereotype: 'enum',
      fields: [
        'IN_PROGRESS',
        'WON',
        'DRAW'
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
      from: 'TicTacToeService',
      to: 'GameRepository',
      label: 'uses'
    },
    {
      from: 'TicTacToeService',
      to: 'Game',
      label: 'manages'
    },
    {
      from: 'Game',
      to: 'Board',
      label: 'contains'
    },
    {
      from: 'Game',
      to: 'Player',
      label: 'has players (X & O)'
    },
    {
      from: 'Game',
      to: 'Move',
      label: 'records history'
    },
    {
      from: 'Game',
      to: 'GameStatus',
      label: 'has status'
    },
    {
      from: 'Board',
      to: 'Cell',
      label: 'contains 3×3'
    },
    {
      from: 'Cell',
      to: 'Symbol',
      label: 'holds'
    },
    {
      from: 'Player',
      to: 'Symbol',
      label: 'assigned'
    },
  ]
};
