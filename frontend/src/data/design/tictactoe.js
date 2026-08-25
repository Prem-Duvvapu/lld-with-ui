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
      name: 'Game',
      description: 'Core domain entity: id, Board, two Players, current-turn index, GameStatus, winner, winning line, and move history.'
    },
    {
      name: 'Board',
      description: '3x3 grid of Cells. Owns cell occupancy checks, the row/column/diagonal win scan, fill (draw) detection, and reset.'
    },
    {
      name: 'Cell',
      description: 'A single grid position — row, col, and the Symbol occupying it (or empty).'
    },
    {
      name: 'Player',
      description: 'A participant: name and assigned Symbol (X or O).'
    },
    {
      name: 'Move',
      description: 'Value object recording move number, player name, symbol, row/col, and timestamp — the unit the Undo stack pops.'
    },
    {
      name: 'GameStatus',
      description: 'Enum tracking session lifecycle: IN_PROGRESS, WON, DRAW.'
    },
    {
      name: 'TicTacToeException hierarchy',
      description: 'Abstract module base (never thrown directly) plus five concrete, typed failures: GameNotFoundException (404), InvalidMoveException (400, out-of-bounds), CellOccupiedException (422, rule violation), NotYourTurnException (409), GameOverException (409).'
    },
    {
      name: 'SimEvent',
      description: 'One telemetry row in the /sim/* engine\'s event log — actor, description, a board snapshot, and status — so the demo tab can replay the scripted match step by step.'
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
