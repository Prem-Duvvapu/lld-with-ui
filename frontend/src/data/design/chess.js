// designDetails — chess
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Chess — Design Details',
  requirements: [
    'Two-player chess game with standard 8×8 board and initial piece setup',
    'Full move validation for all piece types: Pawn, Rook, Knight, Bishop, Queen, King',
    'Pawn: moves forward 1 (2 from start), captures diagonally, en passant, promotion',
    'Rook: horizontal/vertical moves through empty squares',
    'Knight: L-shaped jumps (2+1), ignores pieces in between',
    'Bishop: diagonal moves through empty squares',
    'Queen: combination of rook + bishop moves',
    'King: 1 step any direction, with castling (kingside and queenside) support',
    'Check detection: a king is under attack by an opponent piece',
    'Checkmate detection: in check and no legal move to escape',
    'Stalemate detection: not in check but no legal move available',
    'Cannot make a move that leaves own king in check, even if otherwise shape-valid (pins)',
    'Turn-based: White moves first, then alternating; moving out of turn is rejected',
    'Castling: king moves 2 squares toward rook, rook jumps over — with all standard illegality checks',
    'En passant: a pawn capturing a just-advanced enemy pawn, legal for exactly one reply',
    'Pawn promotion: reaching the back rank promotes to a caller-chosen piece, defaulting to queen',
    'Resignation ends the game and credits the opponent as winner',
    'Thread-safe concurrent game state via a per-game ReentrantLock'
  ],
  entities: [
    {
      name: 'ChessService',
      description: 'Facade for the whole module: orchestrates move legality (via strategy + command), check/checkmate/stalemate detection, and the isolated /sim/* demo engine. The controller only translates HTTP.',
      fields: [
        { name: 'repository', type: 'ChessRepository', description: 'Live game storage, injected via constructor' },
        { name: 'strategyFactory', type: 'PieceMoveStrategyFactory', description: 'Resolves the per-piece-type movement strategy' },
        { name: 'gameLocks', type: 'Map<Long, ReentrantLock>', description: 'One lock per game id, taken for the whole read-validate-mutate span of a move' },
        { name: 'simRepository', type: 'ChessRepository', description: 'A second, fully separate repository instance backing the isolated /sim/* demo, so it cannot corrupt real games' }
      ],
      methods: [
        { name: 'createGame(playerWhite, playerBlack)', returns: 'Game', description: 'Creates a new game with the standard initial setup' },
        { name: 'makeMove(gameId, fromRow, fromCol, toRow, toCol, promotionType)', returns: 'Game', description: 'Validates (shape via strategy, then check-safety) and applies a move via ApplyMoveCommand, then recomputes status' },
        { name: 'getValidMoves(gameId, row, col)', returns: 'List<int[]>', description: 'All legal destination squares for the piece at the given position' },
        { name: 'resign(gameId, color)', returns: 'Game', description: 'Ends the game immediately, crediting the other player as winner' },
        { name: 'getGame(gameId)', returns: 'Game', description: 'Current game state including board, players, status, and full move history' }
      ]
    },
    {
      name: 'PieceMoveStrategy',
      description: 'One per piece type (Pawn, Rook, Knight, Bishop, Queen, King). Each implementation owns only its own shape/path/blocking rules and its raw attack pattern — never check-safety, which the service applies uniformly to every type.',
      fields: [],
      methods: [
        { name: 'isValidMove(board, fr, fc, tr, tc, context)', returns: 'boolean', description: 'Movement-pattern legality, including the king\'s castling and the pawn\'s double-step/en-passant special cases via MoveContext' },
        { name: 'attacksSquare(board, fr, fc, tr, tc)', returns: 'boolean', description: 'Raw threat pattern used for check detection — differs from isValidMove for pawns (diagonal-only, occupancy-independent) and kings (no castling)' }
      ]
    },
    {
      name: 'PieceMoveStrategyFactory',
      description: 'Resolves the strategy for a PieceType from an EnumMap built at construction time, so the service never switches on piece type.',
      fields: [{ name: 'strategies', type: 'EnumMap<PieceType, PieceMoveStrategy>', description: 'Built once from all injected strategy beans' }],
      methods: [{ name: 'forType(type)', returns: 'PieceMoveStrategy', description: 'Looks up the strategy for a piece type' }]
    },
    {
      name: 'ApplyMoveCommand',
      description: 'Command pattern: encapsulates applying one already-validated move as a reversible unit — board write, castling rook hop, en-passant capture removal, promotion swap, and move-history append — decoupled from the legality checks that decided it was allowed.',
      fields: [],
      methods: [
        { name: 'execute()', returns: 'Move', description: 'Mutates the game and returns the recorded Move' },
        { name: 'undo()', returns: 'void', description: 'Reverts exactly what execute() did, including castling and en passant' }
      ]
    },
    {
      name: 'Game',
      description: 'Central entity holding all chess game state: the 8×8 typed board, player info, turn tracking, status, castling rights, en-passant target, and complete move history.',
      fields: [
        { name: 'id', type: 'long', description: 'Unique game identifier' },
        { name: 'board', type: 'Piece[8][8]', description: 'Typed board — null for empty, a Piece(type, color) otherwise. Serializes over the wire as the same "wK"/"bP" codes the frontend already expects.' },
        { name: 'players', type: 'Player[2]', description: 'White at index 0, Black at index 1' },
        { name: 'currentPlayerIndex', type: 'int', description: '0 for White, 1 for Black' },
        { name: 'status', type: 'GameStatus', description: 'ACTIVE, CHECK, CHECKMATE, STALEMATE, DRAW, or RESIGNED, with a declared transition table' },
        { name: 'winner', type: 'String', description: 'Winner name once the game reaches CHECKMATE or RESIGNED' },
        { name: 'moveHistory', type: 'List<Move>', description: 'Chronological list of every applied move' },
        { name: 'kingMoved', type: 'boolean[2]', description: 'Castling right lost forever once a color\'s king has moved' },
        { name: 'rookMoved', type: 'boolean[4]', description: 'Castling right lost forever once the rook on that home square has moved' },
        { name: 'enPassantTarget', type: 'int[2] (nullable)', description: 'The square skipped over by the immediately preceding pawn double-step, or null — cleared by every other move' }
      ],
      methods: []
    },
    {
      name: 'Piece',
      description: 'Immutable (PieceType, Color) value object. Serializes as a two-character code via @JsonValue so the wire format is unchanged even though the internal model is now typed instead of raw strings.',
      fields: [
        { name: 'type', type: 'PieceType', description: 'KING, QUEEN, ROOK, BISHOP, KNIGHT, or PAWN' },
        { name: 'color', type: 'Color', description: 'WHITE or BLACK' }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Each piece type has its own PieceMoveStrategy implementation (PawnMoveStrategy, RookMoveStrategy, ...), resolved by PieceMoveStrategyFactory. Replaces the switch-per-type dispatch that previously lived inline in the service — adding a new piece type means adding a new strategy bean, not touching existing code.'
    },
    {
      name: 'Command Pattern',
      used: true,
      explanation: 'ApplyMoveCommand encapsulates the mutation of applying a validated move — including the special cases (castling\'s rook hop, en passant\'s off-square capture, promotion\'s piece swap) — as a reversible unit with execute()/undo(), decoupled from the ChessService orchestration that decides a move is legal.'
    },
    {
      name: 'State Machine',
      used: true,
      explanation: 'GameStatus declares its legal transitions in a Map<GameStatus, Set<GameStatus>> with isTerminal()/canTransitionTo(), mirroring uber.model.RideStatus. CHECKMATE, STALEMATE, DRAW and RESIGNED are terminal; the service checks isTerminal() before accepting any further move.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'ChessRepository abstracts all data access behind save()/get()/nextId(). The isolated /sim/* engine gets its own separate ChessRepository instance rather than touching live game state.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'PieceMoveStrategyFactory builds an EnumMap<PieceType, PieceMoveStrategy> from every injected strategy bean at construction time and resolves by type — the one place that knows all six piece types exist.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'ChessService receives ChessRepository and PieceMoveStrategyFactory via constructor injection, and every strategy is a Spring bean collected into the factory by type. This keeps every layer independently unit-testable without a Spring context.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'ChessService orchestrates; each PieceMoveStrategy owns one piece type\'s shape rules; ApplyMoveCommand owns mutation; ChessRepository owns storage. No class does more than one job.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new piece type (e.g. a Fairy-chess Chancellor) means adding one new PieceMoveStrategy bean — PieceMoveStrategyFactory picks it up automatically via the injected List<PieceMoveStrategy>. No existing class changes.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'ChessService depends on the PieceMoveStrategy interface and the ChessRepository abstraction, never on a concrete piece\'s rules or on ConcurrentHashMap directly.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Rook and Bishop\'s sliding logic is written once each and reused by QueenMoveStrategy (rook-lines OR bishop-diagonals) for both isValidMove and attacksSquare, instead of a third copy.'
    },
    {
      name: 'Encapsulation',
      description: 'The board is mutated only through ApplyMoveCommand, invoked only after ChessService has confirmed both shape-legality and check-safety. All model fields are private with generated accessors.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Strategy Dispatch',
      description: 'ChessService calls strategyFactory.forType(piece.getType()).isValidMove(...) — the same call site handles all six piece types via polymorphism, with zero conditional branching on type.',
      alternative: 'A switch on PieceType is simpler for a fixed set of 6 types but was the actual defect this module used to have: it made the move-validation logic untestable in isolation and coupled every piece\'s rules into one giant method.'
    },
    {
      name: 'Encapsulation — Board State Protection',
      description: 'The board is never directly exposed for uncontrolled mutation — every change goes through ApplyMoveCommand after ChessService has validated shape and check-safety, and simulated the move on a clone first.',
      alternative: 'Exposing the board for direct writes would be faster but would make invalid states (e.g. two kings, a move that leaves check) possible from outside the service.'
    },
    {
      name: 'Value Objects — Piece and Move',
      description: 'Piece is an immutable (type, color) pair; Move is a self-documenting record of what happened (from/to, captured piece, castling/en-passant/promotion flags). Both serialize cleanly and are trivially comparable in tests.',
      alternative: 'Raw two-character strings ("wP") are more compact but push type-checking into every call site as substring comparisons — the bug this module used to have.'
    },
    {
      name: 'Command Pattern as an OOP Idiom',
      description: 'ApplyMoveCommand turns "apply this move" into an object with execute()/undo(), rather than a void method that just mutates in place — makes the mutation testable and reversible independent of the validation that authorized it.',
      alternative: 'Inlining the mutation directly into makeMove() (the old approach) is shorter but couples validation and mutation so tightly that neither can be tested alone, and undo becomes structurally impossible to add later.'
    }
  ],
  extensibility: [
    {
      area: 'New Piece Types (e.g., Chancellor, Archbishop)',
      description: 'Implement PieceMoveStrategy, annotate @Component, add the enum constant to PieceType. PieceMoveStrategyFactory picks it up automatically via its injected List<PieceMoveStrategy>.',
      difficulty: 'Easy'
    },
    {
      area: 'Fifty-move / threefold-repetition draws',
      description: 'Track a repetition count and a halfmove clock on Game, check both in ChessService.applyMove alongside the existing checkmate/stalemate computation, and transition to GameStatus.DRAW.',
      difficulty: 'Medium'
    },
    {
      area: 'Undo Move',
      description: 'ApplyMoveCommand.undo() already reverses the last applied move exactly. Exposing it needs only a controller endpoint that pops the last command off a per-game stack the service would maintain.',
      difficulty: 'Easy'
    },
    {
      area: 'AI Opponent (Minimax)',
      description: 'Add a ChessAI that calls ChessService.getValidMoves for every friendly piece to enumerate a move tree, then calls makeMove() with the chosen move. No changes to validation logic needed.',
      difficulty: 'Hard'
    },
    {
      area: 'Game Timer / Clock',
      description: 'Add timestamps to Move, track remaining time per player on Game, and have ChessService flag a timeout as a loss the same way it already flags checkmate.',
      difficulty: 'Medium'
    },
    {
      area: 'Database Persistence',
      description: 'Implement a JPA-backed ChessRepository behind the same save()/get()/nextId() contract and swap via a Spring profile — the service layer is unaware of the storage mechanism.',
      difficulty: 'Medium'
    }
  ]
};
