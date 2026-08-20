// designDetails — chess
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Chess — Design Details',
  requirements: [
    'Two-player chess game with standard 8×8 board and initial piece setup',
    'Full move validation for all piece types: Pawn, Rook, Knight, Bishop, Queen, King',
    'Pawn: moves forward 1 (2 from start), captures diagonally',
    'Rook: horizontal/vertical moves through empty squares',
    'Knight: L-shaped jumps (2+1), ignores pieces in between',
    'Bishop: diagonal moves through empty squares',
    'Queen: combination of rook + bishop moves',
    'King: 1 step any direction, with castling support',
    'Check detection: a king is under attack by an opponent piece',
    'Checkmate detection: in check and no legal move to escape',
    'Stalemate detection: not in check but no legal move available',
    'Cannot make a move that leaves own king in check',
    'Turn-based: White moves first, then alternating',
    'Castling: king moves 2 squares toward rook, rook jumps over',
    'Thread-safe concurrent game state via ReentrantLock'
  ],
  entities: [
    {
      name: 'ChessService',
      description: 'Core chess engine with full move validation, check/checkmate/stalemate detection, and castling support. All game mutations are protected by ReentrantLock.',
      fields: [
        {
          name: 'repository',
          type: 'ChessRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures thread-safe game state mutations'
        }
      ],
      methods: [
        {
          name: 'createGame(playerWhite, playerBlack)',
          returns: 'Game',
          description: 'Creates new game with initial board setup and two players'
        },
        {
          name: 'makeMove(gameId, fromRow, fromCol, toRow, toCol)',
          returns: 'Game',
          description: 'Validates and executes a move, detects check/checkmate/stalemate'
        },
        {
          name: 'getValidMoves(gameId, row, col)',
          returns: 'List<int[]>',
          description: 'Returns all legal destination squares for a piece at given position'
        },
        {
          name: 'getGame(gameId)',
          returns: 'Game',
          description: 'Returns current game state including board, players, status, and move history'
        }
      ]
    },
    {
      name: 'Game',
      description: 'Central entity holding all chess game state including the 8×8 board, player info, turn tracking, status, and complete move history.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique game identifier'
        },
        {
          name: 'board',
          type: 'String[8][8]',
          description: '2D array: piece codes like "wK", "bP", null for empty'
        },
        {
          name: 'players',
          type: 'Player[2]',
          description: 'Array of two players (White at index 0, Black at index 1)'
        },
        {
          name: 'currentPlayerIndex',
          type: 'int',
          description: '0 for White, 1 for Black'
        },
        {
          name: 'status',
          type: 'GameStatus',
          description: 'ACTIVE, CHECK, CHECKMATE, DRAW, STALEMATE, or RESIGNED'
        },
        {
          name: 'winner',
          type: 'String',
          description: 'Winner name when status is CHECKMATE'
        },
        {
          name: 'moveHistory',
          type: 'List<Move>',
          description: 'Chronological list of all moves played'
        }
      ],
      methods: []
    },
    {
      name: 'Move Validation',
      description: 'Each piece type has specific move validation logic with check-safety post-filtering.',
      fields: [
        {
          name: 'isValidPawnMove',
          type: 'method',
          description: 'Forward 1/2, diagonal capture, no en passant (simplified)'
        },
        {
          name: 'isValidRookMove',
          type: 'method',
          description: 'Horizontal/vertical until blocked'
        },
        {
          name: 'isValidKnightMove',
          type: 'method',
          description: '2+1 L-shape, jumps over pieces'
        },
        {
          name: 'isValidBishopMove',
          type: 'method',
          description: 'Diagonal until blocked'
        },
        {
          name: 'isValidQueenMove',
          type: 'method',
          description: 'Combination of rook + bishop'
        },
        {
          name: 'isValidKingMove',
          type: 'method',
          description: '1 step any direction + castling'
        }
      ],
      methods: [
        {
          name: 'isInCheckOnBoard(board, color)',
          returns: 'boolean',
          description: 'Scans all enemy pieces to see if they attack the king\'s square'
        },
        {
          name: 'isSquareAttacked(board, row, col, color)',
          returns: 'boolean',
          description: 'Checks if any enemy piece can move to given square'
        },
        {
          name: 'isCheckmate(game, color)',
          returns: 'boolean',
          description: 'In check + no legal move exists'
        },
        {
          name: 'hasLegalMove(game, color)',
          returns: 'boolean',
          description: 'Brute-force search: tries every piece on every destination'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'ChessRepository abstracts all data access. The service never touches the ConcurrentHashMap directly — it calls semantic methods like save() and get(). This makes the service testable and the data layer swappable.'
    },
    {
      name: 'Singleton Pattern (Spring)',
      used: true,
      explanation: 'All @Service and @Repository beans are Spring singletons. This ensures all HTTP requests share the same in-memory game state, which is essential since there is no database.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'ChessService receives ChessRepository via constructor injection. This decouples creation from usage and enables unit testing with mock repositories.'
    },
    {
      name: 'Strategy Pattern',
      used: false,
      explanation: 'Currently move validation uses switch/if-else per piece type. A MoveValidator interface with per-piece implementations (PawnValidator, RookValidator, etc.) would better follow Open/Closed and make adding new piece types easier.'
    },
    {
      name: 'Memento Pattern',
      used: false,
      explanation: 'Move history is stored but not used for undo. A proper Memento pattern would allow undoing moves by saving full board snapshots before each move, enabling takeback functionality for casual play.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'ChessService handles business logic (move validation, check detection). ChessRepository handles data storage. Game encapsulates board state. Each class has one clear purpose.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new piece type requires only adding a case in switch statements and implementing its move validation. The core game flow (select piece → validate → execute → check state) remains unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'ChessService depends on the ChessRepository abstraction, not on ConcurrentHashMap directly. This allows swapping storage strategy (HashMap → DB) without changing service logic.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Board cloning logic is a single cloneBoard() method. Check detection is centralized in isInCheckOnBoard(). Square attack checking is one method reused by all pieces.'
    },
    {
      name: 'Encapsulation',
      description: 'Game board is mutated only through service.makeMove(). The repository\'s internal map is never exposed directly. All model fields are private with getters/setters.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Piece-based Dispatch',
      description: 'Move validation dispatches to piece-specific logic based on the piece type character (K, Q, R, B, N, P). The same makeMove() code path handles all pieces via type dispatch.',
      alternative: 'Could use a Piece interface with an isValidMove() method and concrete classes for each piece type. Switch dispatch is simpler for a fixed set of 6 piece types and avoids class explosion.'
    },
    {
      name: 'Encapsulation — Board State Protection',
      description: 'The board array is never directly exposed for mutation — all changes go through makeMove() which validates, simulates, and checks for check-safety before committing.',
      alternative: 'Could expose board directly for speed. Encapsulation is chosen because it prevents invalid states and makes the mutation path auditable via move history.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Game contains arrays of Players and Moves (composition). Pieces are represented as strings, not a class hierarchy. This keeps the model simple and avoids deep inheritance trees.',
      alternative: 'Could use Piece abstract class with King, Queen, etc. subclasses. String-based pieces are chosen because they are serializable, compact, and avoid class loading overhead for 32 pieces.'
    },
    {
      name: 'Value Objects — Move Records',
      description: 'Each Move is an immutable-ish record of what happened: from/to coordinates, piece moved, piece captured, special flags. This makes the move history self-documenting.',
      alternative: 'Could store moves as simple strings like "e2e4". Structured Move objects are chosen because they support flags (castling, en passant) and are easier to parse on the frontend.'
    }
  ],
  extensibility: [
    {
      area: 'New Piece Types (e.g., Chancellor, Archbishop)',
      description: 'Add piece type to PieceType enum, add validation case in isValidMove() and isSquareAttacked(), add Unicode symbol. Core game flow unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'En Passant Capture',
      description: 'Track the last pawn double-move in Game state. In pawn validation, check if the target is the en passant square. Remove the captured pawn. Adds ~20 lines.',
      difficulty: 'Medium'
    },
    {
      area: 'Pawn Promotion',
      description: 'When a pawn reaches the last rank, present a choice dialog on the frontend. Backend accepts a promotion piece parameter in makeMove().',
      difficulty: 'Medium'
    },
    {
      area: 'Undo Move',
      description: 'Store board snapshots (Memento pattern) before each move. Add undoMove() that restores the previous snapshot and reverts to the previous player\'s turn.',
      difficulty: 'Medium'
    },
    {
      area: 'AI Opponent (Minimax)',
      description: 'Add ChessAI service with minimax evaluation. Frontend shows AI move option. AI calls makeMove() with the computed best move. No changes to validation logic.',
      difficulty: 'Hard'
    },
    {
      area: 'Game Timer / Clock',
      description: 'Add timestamps to moves. Frontend shows elapsed time per player. Service enforces time control (e.g., 10 min per player). Flags timeout as a loss.',
      difficulty: 'Medium'
    },
    {
      area: 'Database Persistence',
      description: 'Implement JpaChessRepository implementing the same interface as ChessRepository. Swap via Spring profile. No service layer changes needed.',
      difficulty: 'Medium'
    }
  ]
};
