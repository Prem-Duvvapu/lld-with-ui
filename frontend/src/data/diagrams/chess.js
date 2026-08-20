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
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ createGame(w, b): Game',
        '+ makeMove(id, fr, fc, tr, tc): Game',
        '+ getValidMoves(id, r, c): List<int[]>',
        '+ getGame(id): Game'
      ]
    },
    {
      name: 'Game',
      fields: [
        '- id: long',
        '- board: String[8][8]',
        '- players: Player[2]',
        '- currentPlayerIndex: int',
        '- status: GameStatus',
        '- winner: String',
        '- moveHistory: List<Move>'
      ],
      methods: []
    },
    {
      name: 'Player',
      fields: [
        '- id: long',
        '- name: String',
        '- color: String (WHITE/BLACK)'
      ],
      methods: []
    },
    {
      name: 'Move',
      fields: [
        '- fromRow/Col: int',
        '- toRow/Col: int',
        '- piece: String',
        '- capturedPiece: String',
        '- isCastling: boolean'
      ],
      methods: []
    },
    {
      name: 'GameStatus',
      stereotype: 'enum',
      fields: [
        'ACTIVE',
        'CHECK',
        'CHECKMATE',
        'DRAW',
        'STALEMATE'
      ],
      methods: []
    },
    {
      name: 'PieceType',
      stereotype: 'enum',
      fields: [
        'KING',
        'QUEEN',
        'ROOK',
        'BISHOP',
        'KNIGHT',
        'PAWN'
      ],
      methods: []
    },
    {
      name: 'ChessRepository',
      fields: [
        '- games: ConcurrentHashMap<Long, Game>'
      ],
      methods: [
        '+ save(game): void',
        '+ get(id): Game',
        '+ nextId(): long'
      ]
    }
  ],
  relationships: [
    {
      from: 'ChessService',
      to: 'ChessRepository',
      label: 'uses'
    },
    {
      from: 'ChessService',
      to: 'Game',
      label: 'manages'
    },
    {
      from: 'Game',
      to: 'Player',
      label: 'has 2'
    },
    {
      from: 'Game',
      to: 'GameStatus',
      label: 'has state'
    },
    {
      from: 'Game',
      to: 'Move',
      label: 'has many'
    }
  ]
};
