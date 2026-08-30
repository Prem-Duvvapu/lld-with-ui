// classDiagrams — chess
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Chess — Class Diagram',
  classes: [
    {
      name: 'ChessService',
      fields: [
        '- repository: ChessRepository',
        '- strategyFactory: PieceMoveStrategyFactory',
        '- gameLocks: Map<Long, ReentrantLock>',
      ],
      methods: [
        '+ createGame(w, b): Game',
        '+ makeMove(id, fr, fc, tr, tc, promo): Game',
        '+ getValidMoves(id, r, c): List<int[]>',
        '+ resign(id, color): Game',
        '+ getGame(id): Game'
      ]
    },
    {
      name: 'PieceMoveStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ type(): PieceType',
        '+ isValidMove(board, fr, fc, tr, tc, context): boolean',
        '+ attacksSquare(board, fr, fc, tr, tc): boolean'
      ]
    },
    {
      name: 'PawnMoveStrategy',
      methods: ['+ isValidMove(...): boolean', '+ attacksSquare(...): boolean']
    },
    {
      name: 'RookMoveStrategy',
      methods: ['+ isValidMove(...): boolean', '+ attacksSquare(...): boolean']
    },
    {
      name: 'KnightMoveStrategy',
      methods: ['+ isValidMove(...): boolean', '+ attacksSquare(...): boolean']
    },
    {
      name: 'BishopMoveStrategy',
      methods: ['+ isValidMove(...): boolean', '+ attacksSquare(...): boolean']
    },
    {
      name: 'QueenMoveStrategy',
      methods: ['+ isValidMove(...): boolean', '+ attacksSquare(...): boolean']
    },
    {
      name: 'KingMoveStrategy',
      methods: ['+ isValidMove(...): boolean  // + castling', '+ attacksSquare(...): boolean']
    },
    {
      name: 'PieceMoveStrategyFactory',
      fields: ['- strategies: EnumMap<PieceType, PieceMoveStrategy>'],
      methods: ['+ forType(type): PieceMoveStrategy']
    },
    {
      name: 'MoveCommand',
      stereotype: 'interface',
      fields: [],
      methods: ['+ execute(): Move', '+ undo(): void']
    },
    {
      name: 'ApplyMoveCommand',
      fields: [
        '- game: Game',
        '- fromRow/fromCol/toRow/toCol: int',
        '- requestedPromotion: PieceType'
      ],
      methods: ['+ execute(): Move', '+ undo(): void']
    },
    {
      name: 'Game',
      fields: [
        '- id: long',
        '- board: Piece[8][8]',
        '- players: Player[2]',
        '- currentPlayerIndex: int',
        '- status: GameStatus',
        '- winner: String',
        '- moveHistory: List<Move>',
        '- kingMoved: boolean[2]',
        '- rookMoved: boolean[4]',
        '- enPassantTarget: int[2]'
      ],
      methods: ['+ currentColor(): Color']
    },
    {
      name: 'Piece',
      fields: ['- type: PieceType', '- color: Color'],
      methods: ['+ code(): String', '+ static of(color, type): Piece']
    },
    {
      name: 'Player',
      fields: ['- id: long', '- name: String', '- color: Color']
    },
    {
      name: 'Move',
      fields: [
        '- fromRow/fromCol/toRow/toCol: int',
        '- piece: Piece',
        '- capturedPiece: Piece',
        '- promotedTo: PieceType',
        '- castling/enPassant/promotion: boolean'
      ]
    },
    {
      name: 'GameStatus',
      stereotype: 'enum',
      fields: ['ACTIVE', 'CHECK', 'CHECKMATE', 'STALEMATE', 'DRAW', 'RESIGNED'],
      methods: ['+ isTerminal(): boolean', '+ canTransitionTo(next): boolean']
    },
    {
      name: 'PieceType',
      stereotype: 'enum',
      fields: ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN'],
      methods: ['+ code(): char']
    },
    {
      name: 'Color',
      stereotype: 'enum',
      fields: ['WHITE', 'BLACK'],
      methods: ['+ opposite(): Color', '+ index(): int']
    },
    {
      name: 'ChessRepository',
      fields: ['- games: ConcurrentHashMap<Long, Game>'],
      methods: ['+ save(game): void', '+ get(id): Game', '+ nextId(): long']
    }
  ],
  relationships: [
    { from: 'ChessService', to: 'ChessRepository', label: 'uses' },
    { from: 'ChessService', to: 'PieceMoveStrategyFactory', label: 'uses' },
    { from: 'ChessService', to: 'ApplyMoveCommand', label: 'creates & executes' },
    { from: 'PieceMoveStrategyFactory', to: 'PieceMoveStrategy', label: 'resolves' },
    { from: 'PawnMoveStrategy', to: 'PieceMoveStrategy', label: 'implements' },
    { from: 'RookMoveStrategy', to: 'PieceMoveStrategy', label: 'implements' },
    { from: 'KnightMoveStrategy', to: 'PieceMoveStrategy', label: 'implements' },
    { from: 'BishopMoveStrategy', to: 'PieceMoveStrategy', label: 'implements' },
    { from: 'QueenMoveStrategy', to: 'PieceMoveStrategy', label: 'implements' },
    { from: 'KingMoveStrategy', to: 'PieceMoveStrategy', label: 'implements' },
    { from: 'ApplyMoveCommand', to: 'MoveCommand', label: 'implements' },
    { from: 'ApplyMoveCommand', to: 'Game', label: 'mutates' },
    { from: 'ApplyMoveCommand', to: 'Move', label: 'produces' },
    { from: 'Game', to: 'Player', label: 'has 2' },
    { from: 'Game', to: 'Piece', label: 'board of' },
    { from: 'Game', to: 'GameStatus', label: 'has state' },
    { from: 'Game', to: 'Move', label: 'has many' },
    { from: 'Piece', to: 'PieceType', label: 'has a' },
    { from: 'Piece', to: 'Color', label: 'has a' },
    { from: 'Player', to: 'Color', label: 'has a' }
  ]
};
