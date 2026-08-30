// designDetails — tictactoe
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Tic Tac Toe Game — Low-Level System Design',
  tldr: [
    '2-player local match engine on a 3x3 board — no AI opponent; both marks are placed by named human players.',
    'Typed exception contract (GameNotFoundException, InvalidMoveException, CellOccupiedException, NotYourTurnException, GameOverException) mapped to real HTTP statuses by the shared GlobalExceptionHandler.',
    'Board win/draw detection: O(N) row/column/diagonal scan returning the exact [startRow, startCol, endRow, endCol] winning line for the frontend to highlight.',
    'Thread-safe session isolation using a ConcurrentHashMap GameRepository protected by a per-game ReentrantLock, so two near-simultaneous move requests for the same game cannot both land.',
    'Move history log supporting atomic single-step Undo, plus a full board Reset.',
    'An isolated /api/tictactoe/sim/* engine — a separate GameRepository instance driving the interactive demo tab — so replaying the simulation can never corrupt a real match.'
  ],
  requirements: [
    'Two named players start a match; the engine assigns X to player 1 and O to player 2 and alternates turns.',
    'The board validates cell bounds and occupancy, and auto-detects a win across any row, column, or diagonal, or a draw when the board fills with no winner.',
    'The engine computes the exact winning line coordinates for visual highlight.',
    'Supports move history tracking, single-move Undo, and a full board Reset without creating a new game id.',
    'Handles concurrent move execution safely across multiple simultaneous game sessions, and reports precise, typed errors (occupied cell, wrong turn, game already over, unknown game, out-of-bounds move) instead of a generic failure.'
  ],
  entities: [
    {
      name: 'TicTacToeService',
      description: 'Facade the controller delegates to wholesale — owns per-game locking and both the live game API and the isolated /sim/* demo engine.',
      fields: [
        { name: 'repository', type: 'GameRepository', description: 'Production repository holding every real match, injected via @Qualifier("tictactoeGameRepository")' },
        { name: 'gameLocks', type: 'ConcurrentHashMap<String, ReentrantLock>', description: 'One lock per game id, created on first use via computeIfAbsent' },
        { name: 'simRepository', type: 'GameRepository', description: 'A second, independent repository instance backing /sim/* so the demo can never touch a real match' },
        { name: 'simEventLog', type: 'CopyOnWriteArrayList<SimEvent>', description: 'Append-only log of simulation steps, safe for concurrent read while the UI polls it' }
      ],
      methods: [
        { name: 'createGame(player1, player2)', returns: 'Game', description: 'Creates a new match, defaulting blank names to "Player X"/"Player O"' },
        { name: 'getGame(id)', returns: 'Game', description: 'Looks the game up, throwing GameNotFoundException when absent' },
        { name: 'makeMove(gameId, row, col, playerName)', returns: 'Game', description: 'Locks the game, validates bounds/turn/occupancy in order, then applies the move' },
        { name: 'undoLastMove(gameId)', returns: 'Game', description: 'Locks the game and pops the last move off its history' },
        { name: 'resetGame(gameId)', returns: 'Game', description: 'Locks the game and clears the board back to a fresh IN_PROGRESS state' }
      ]
    },
    {
      name: 'Game',
      description: 'Core domain entity: id, Board, two Players, current-turn index, GameStatus, winner, winning line, and move history.',
      fields: [
        { name: 'id', type: 'String', description: 'Repository-assigned id, e.g. "TTT-1"' },
        { name: 'board', type: 'Board', description: 'The 3x3 grid this match is played on' },
        { name: 'players', type: 'Player[]', description: '[0]=X, [1]=O — fixed at construction' },
        { name: 'currentPlayerIndex', type: 'int', description: 'Index into players of whoever moves next' },
        { name: 'status', type: 'GameStatus', description: 'IN_PROGRESS, WON, or DRAW' },
        { name: 'winner', type: 'Player', description: 'Set only once status becomes WON' },
        { name: 'moveCount', type: 'int', description: 'Total moves played so far' },
        { name: 'winningLine', type: 'int[]', description: '[startRow, startCol, endRow, endCol] of the winning line, once found' },
        { name: 'moveHistory', type: 'List<Move>', description: 'Ordered log every makeMove() appends to and undoLastMove() pops' }
      ],
      methods: [
        { name: 'makeMove(row, col, player)', returns: 'boolean', description: 'Places the symbol if it is that player\'s turn and the cell is empty, then checks win/draw and switches turn' },
        { name: 'checkWin(player)', returns: 'boolean', description: 'Delegates to Board#checkWinLine and records winningLine if found' },
        { name: 'checkDraw()', returns: 'boolean', description: 'True once Board#isFull() with no winner' },
        { name: 'switchPlayer()', returns: 'void', description: 'Advances currentPlayerIndex to the other player' },
        { name: 'getCurrentPlayer()', returns: 'Player', description: 'The player whose turn it is' },
        { name: 'undoLastMove()', returns: 'boolean', description: 'Pops the last Move, clears its cell, and rewinds currentPlayerIndex to that mover' },
        { name: 'reset()', returns: 'void', description: 'Clears the board and every counter for a fresh match under the same id' }
      ]
    },
    {
      name: 'Board',
      description: '3x3 grid of Cells. Owns cell occupancy checks, the row/column/diagonal win scan, fill (draw) detection, and reset.',
      fields: [
        { name: 'grid', type: 'Cell[][]', description: 'size × size grid of Cell objects' },
        { name: 'size', type: 'int', description: 'Board dimension — 3 by default, but parameterized in the constructor' }
      ],
      methods: [
        { name: 'isCellEmpty(row, col)', returns: 'boolean', description: 'Bounds-checks then reports whether the cell holds no symbol' },
        { name: 'setCell(row, col, symbol)', returns: 'boolean', description: 'Occupies an empty cell; no-op returning false if already occupied' },
        { name: 'clearCell(row, col)', returns: 'void', description: 'Nulls out a cell\'s symbol — used by undoLastMove()' },
        { name: 'isFull()', returns: 'boolean', description: 'True once every cell is occupied' },
        { name: 'checkWinLine(symbol)', returns: 'int[]', description: 'Scans every row, column and both diagonals; returns the winning line\'s coordinates or null' },
        { name: 'reset()', returns: 'void', description: 'Clears every cell\'s symbol back to empty' }
      ]
    },
    {
      name: 'Cell',
      description: 'A single grid position — row, col, and the Symbol occupying it (or empty).',
      fields: [
        { name: 'row', type: 'int', description: 'Fixed row index, set at construction' },
        { name: 'col', type: 'int', description: 'Fixed column index, set at construction' },
        { name: 'symbol', type: 'Symbol', description: 'X, O, or null when empty' }
      ],
      methods: [
        { name: 'setSymbol(symbol)', returns: 'void', description: 'Occupies (or clears, via null) this cell' },
        { name: 'isEmpty()', returns: 'boolean', description: 'True when symbol is null' }
      ]
    },
    {
      name: 'Player',
      description: 'A participant: name and assigned Symbol (X or O).',
      fields: [
        { name: 'name', type: 'String', description: 'Display name supplied when the match is created' },
        { name: 'symbol', type: 'Symbol', description: 'X for player 1, O for player 2 — fixed once assigned' }
      ],
      methods: []
    },
    {
      name: 'Move',
      description: 'Value object recording move number, player name, symbol, row/col, and timestamp — the unit the Undo stack pops.',
      fields: [
        { name: 'moveNumber', type: 'int', description: '1-based sequence number within the match' },
        { name: 'playerName', type: 'String', description: 'Name of the player who made this move' },
        { name: 'symbol', type: 'Symbol', description: 'The symbol placed' },
        { name: 'row', type: 'int', description: 'Row the symbol was placed at' },
        { name: 'col', type: 'int', description: 'Column the symbol was placed at' },
        { name: 'timestamp', type: 'long', description: 'System.currentTimeMillis() at construction' }
      ],
      methods: []
    },
    {
      name: 'GameRepository',
      description: 'ConcurrentHashMap-backed store keyed by generated match id — one instance for the live API, a second for /sim/*.',
      fields: [
        { name: 'games', type: 'ConcurrentHashMap<String, Game>', description: 'All matches this repository instance owns' },
        { name: 'counter', type: 'AtomicInteger', description: 'Source of the "TTT-N" id sequence' }
      ],
      methods: [
        { name: 'generateId()', returns: 'String', description: 'Atomically increments the counter and formats "TTT-" + n' },
        { name: 'save(game)', returns: 'void', description: 'Upserts a match by its id' },
        { name: 'get(id)', returns: 'Game', description: 'Looks up a match by id, or null if absent' }
      ]
    },
    {
      name: 'GameStatus',
      description: 'Enum tracking session lifecycle: IN_PROGRESS, WON, DRAW.',
      fields: [
        { name: 'IN_PROGRESS', type: 'enum constant', description: 'Match accepting moves' },
        { name: 'WON', type: 'enum constant', description: 'A player has completed a winning line' },
        { name: 'DRAW', type: 'enum constant', description: 'Board is full with no winner' }
      ],
      methods: []
    },
    {
      name: 'TicTacToeException hierarchy',
      description: 'Abstract module base (never thrown directly) plus five concrete, typed failures: GameNotFoundException (404), InvalidMoveException (400, out-of-bounds), CellOccupiedException (422, rule violation), NotYourTurnException (409), GameOverException (409).'
    },
    {
      name: 'SimEvent',
      description: 'One telemetry row in the /sim/* engine\'s event log — actor, description, a board snapshot, and status — so the demo tab can replay the scripted match step by step.',
      fields: [
        { name: 'id', type: 'long', description: 'Monotonically increasing id from simEventIdGen' },
        { name: 'timestamp', type: 'String', description: 'Instant.now().toString() at the moment the step was applied' },
        { name: 'actor', type: 'String', description: 'Player name, or "system" for reset/undo' },
        { name: 'description', type: 'String', description: 'Human-readable narration of the step, e.g. "Alice opens the corner"' },
        { name: 'boardSnapshot', type: 'String[][]', description: 'Deep-cloned board state right after the step was applied' },
        { name: 'status', type: 'GameStatus', description: 'Match status right after the step' }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Facade Pattern',
      used: true,
      explanation: 'TicTacToeService is the single entry point the controller delegates to wholesale — every rule (bounds, turn order, occupancy, game-over, win/draw detection) lives behind it, not scattered across the controller.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'GameRepository wraps a ConcurrentHashMap<String, Game> behind save/get/generateId, isolating in-memory storage from the service\'s game rules.'
    },
    {
      name: 'Sandboxed Simulation Instance',
      used: true,
      explanation: 'The /sim/* engine reuses TicTacToeService\'s own move-application logic against a second, independent GameRepository instance, so the interactive demo tab can never read or mutate a real match — the same isolation shape as chess and concertticket.'
    },
    {
      name: 'Exception Hierarchy',
      used: true,
      explanation: 'A per-module abstract base (TicTacToeException) lets the shared GlobalExceptionHandler map every concrete failure to the right HTTP status via @ResponseStatus, without a single hand-built error map anywhere in this module.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'TicTacToeService manages game state transitions and locking; GameRepository handles storage; Board owns grid mechanics and win/draw detection.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'Board size is already parameterized (new Board(size)); win-line scanning works for any N without touching Game or the service.'
    },
    {
      name: 'Liskov Substitution Principle (LSP)',
      description: 'Every concrete TicTacToeException can be caught and handled as a TicTacToeException — or as the shared DomainException — without special-casing any one subtype.'
    },
    {
      name: 'Dependency Inversion Principle (DIP)',
      description: 'The controller depends only on TicTacToeService\'s public API, never on GameRepository or Board directly.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Board grid state, move validation, and winning-line detection are encapsulated within Board/Game methods — the service never reaches into a Cell array directly.'
    },
    {
      name: 'Abstraction',
      description: 'REST Controllers abstract the per-game locking and precondition checks (turn, occupancy, game-over) from the frontend, which just calls an endpoint and reads a typed error.'
    },
    {
      name: 'Inheritance',
      description: 'All five concrete exceptions extend the abstract TicTacToeException, which itself extends the shared com.lld.config.DomainException.'
    }
  ],
  extensibility: [
    {
      area: 'N×N Customizable Grid Size',
      description: 'Board already accepts a size parameter and its win-scan is size-generic; wiring a size choice through createGame is the remaining step for 4x4/5x5 K-in-a-row play.',
      difficulty: 'Medium'
    },
    {
      area: 'AI Opponent',
      description: 'No AI exists today. Adding one would mean a MoveStrategy interface (e.g. random vs. minimax) injected into the service, mirroring how lru-cache injects its EvictionPolicy strategy.',
      difficulty: 'Medium'
    },
    {
      area: 'WebSocket Real-Time Multiplayer',
      description: 'Replace client polling with STOMP/WebSocket topics for real-time remote 2-player matchmaking.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Win detection re-scans every row/column/diagonal on each move (O(N) for an N x N board) rather than maintaining running row/column/diagonal counters — simpler and fast enough at N=3, but would want the counter approach if the board grows large.',
    'The exact-line coordinates returned by checkWinLine let the frontend highlight the winning line without re-deriving it, at the cost of a slightly wider return contract than a bare boolean.'
  ]
};
