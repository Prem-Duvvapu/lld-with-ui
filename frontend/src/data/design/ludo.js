// designDetails — ludo
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Ludo — Design Details',
  requirements: [
    'Four-player Ludo game with colored tokens: RED, GREEN, BLUE, YELLOW',
    'Each player has 4 tokens starting in their home base (position -1)',
    '52-cell circular track (positions 0-51) with 4 entry points at 0, 13, 26, 39',
    'Roll dice (1-6) to move: need a 6 to bring a token out of home',
    'Rolling a 6 grants an extra turn',
    'Captures: landing on an opponent token sends it back home',
    'Safe spots (8 total): opponents cannot capture tokens on safe positions',
    'Token cannot move to a square occupied by another own token',
    'Turn alternates between players; first to get all 4 tokens to the final cell wins',
    'Near win condition: token reaching the final cell before its starting position is marked finished',
    'Thread-safe game state via ReentrantLock'
  ],
  entities: [
    {
      name: 'LudoService',
      description: 'Core game logic for Ludo. Handles dice rolling, token movement, captures, turn management, and win detection. All state mutations are protected by ReentrantLock.',
      fields: [
        {
          name: 'repository',
          type: 'LudoRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures thread-safe game state mutations'
        },
        {
          name: 'random',
          type: 'Random',
          description: 'Random number generator for dice rolls'
        }
      ],
      methods: [
        {
          name: 'createGame(playerNames)',
          returns: 'Game',
          description: 'Creates new game with 4 players, 4 tokens each at home'
        },
        {
          name: 'rollDice(gameId)',
          returns: 'Game',
          description: 'Rolls dice (1-6), auto-advances if only one move available'
        },
        {
          name: 'moveToken(gameId, playerIndex, tokenIndex)',
          returns: 'Game',
          description: 'Moves selected token by current dice value, handles captures'
        },
        {
          name: 'getGame(gameId)',
          returns: 'Game',
          description: 'Returns current game state'
        }
      ]
    },
    {
      name: 'Game',
      description: 'Holds all game state: players, their tokens, current turn, dice value, and win status.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique game identifier'
        },
        {
          name: 'players',
          type: 'List<Player>',
          description: '4 players with name and color'
        },
        {
          name: 'tokens',
          type: 'List<List<Token>>',
          description: '4×4 grid: 4 tokens per player'
        },
        {
          name: 'currentPlayerIndex',
          type: 'int',
          description: 'Whose turn it is (0-3)'
        },
        {
          name: 'diceValue',
          type: 'int',
          description: 'Last rolled dice value (0 = not rolled)'
        },
        {
          name: 'status',
          type: 'GameStatus',
          description: 'PLAYING or FINISHED'
        },
        {
          name: 'winner',
          type: 'String',
          description: 'Winner name when status is FINISHED'
        }
      ],
      methods: []
    },
    {
      name: 'Token',
      description: 'Represents a single Ludo token with position tracking and state flags.',
      fields: [
        {
          name: 'id',
          type: 'int',
          description: 'Token index within player set (0-3)'
        },
        {
          name: 'color',
          type: 'String',
          description: 'Owner color (RED/GREEN/BLUE/YELLOW)'
        },
        {
          name: 'position',
          type: 'int',
          description: 'Track position. -1 = home, 0-51 = on track'
        },
        {
          name: 'isHome',
          type: 'boolean',
          description: 'True when token is in home base'
        },
        {
          name: 'isFinished',
          type: 'boolean',
          description: 'True when token has completed the circuit'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'LudoRepository encapsulates all data access behind semantic methods. The service never touches maps or locks directly, making the data layer independently testable and swappable.'
    },
    {
      name: 'Singleton Pattern (Spring)',
      used: true,
      explanation: '@Service and @Repository beans are Spring singletons, ensuring all requests share the same in-memory game state — critical since there is no database.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'LudoService receives LudoRepository via constructor injection. This decouples class creation from usage, enabling unit testing with mock repositories.'
    },
    {
      name: 'Strategy Pattern',
      used: false,
      explanation: 'Currently capture and safe-spot logic is inline. A CaptureStrategy interface with implementations (StandardCapture, SafeSpotProtection, HomeBaseImmunity) would make the capture rules configurable.'
    },
    {
      name: 'Observer Pattern',
      used: false,
      explanation: 'The frontend polls for state updates. A WebSocket-based observer would push dice roll results, captures, and win events to all connected clients in real-time.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'LudoService handles dice rolling, token movement, captures, and win detection. LudoRepository handles storage. Game/Token/Player are data models. Each has one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new rule variant (e.g., three 6s = penalty) requires only modifying rollDice() and moveToken(). The core game flow (roll → move → check win) stays the same.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'LudoService depends on LudoRepository abstraction, not on ConcurrentHashMap directly. This allows swapping to a database-backed repository without changing service logic.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Capture logic is centralized in captureAtPosition(). Safe spot checking is a single isSafeSpot() method. The 52-cell modulo arithmetic is computed once, not duplicated.'
    },
    {
      name: 'Encapsulation',
      description: 'Token position is only modified through LudoService.moveToken(). The repository\'s internal map is never exposed. Game state transitions (PLAYING → FINISHED) are controlled by the service.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — State Protection',
      description: 'Each token\'s position, home, and finished state are only modified through controlled service methods. The Game object\'s currentPlayerIndex and diceValue ensure turn integrity.',
      alternative: 'Could expose fields directly for performance. Encapsulation ensures that captures, safe spot checks, and turn order are never bypassed.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Game contains Lists of Players and Tokens (composition). Players don\'t extend Token — they own Tokens. This models the real-world relationship correctly.',
      alternative: 'Could make Game extend a Board class. Composition is chosen because a Game has a board, players, and state — it\'s not a specialized kind of board.'
    },
    {
      name: 'Value Objects — Constants',
      description: 'START_POSITIONS, SAFE_SPOTS, and TRACK_SIZE are static constants on the Game class, providing a single source of truth for board geometry.',
      alternative: 'Could use an external configuration file. Constants on Game are chosen because board geometry is fixed and compile-time, not runtime-configurable.'
    },
    {
      name: 'State Pattern — Game Status',
      description: 'GameStatus enum (PLAYING, FINISHED) drives what operations are allowed. When FINISHED, rollDice() and moveToken() reject further moves.',
      alternative: 'Could use a boolean isFinished. Enum is chosen because it naturally extends (WAITING, PLAYING, FINISHED) and is more readable than a boolean.'
    }
  ],
  extensibility: [
    {
      area: 'Special Dice Rules',
      description: 'Implement three-consecutive-6s penalty (return last moved token home). Add "roll again on 6" animation on frontend. Modify rollDice() to track consecutive 6s.',
      difficulty: 'Easy'
    },
    {
      area: 'Home Column / Final Stretch',
      description: 'Add 6-position home column per player. Tokens that complete a full lap enter their home column. Exact dice value needed to reach the center. Modify win condition.',
      difficulty: 'Medium'
    },
    {
      area: 'Online Multiplayer',
      description: 'Add WebSocket support. Each player connects from their own browser. Game waits for 4 players to join before starting. Turns are synchronized via server push.',
      difficulty: 'Hard'
    },
    {
      area: 'Game Lobby / Rooms',
      description: 'Add room codes, join/leave mechanics. LudoRepository becomes multi-game. Service adds joinGame(roomCode, playerName). Frontend shows lobby before game starts.',
      difficulty: 'Medium'
    },
    {
      area: 'Bot Players',
      description: 'Add LudoBot that auto-plays: picks best token to move (prioritize captures, advance furthest, bring new tokens out on 6). Can replace human player slots.',
      difficulty: 'Medium'
    },
    {
      area: 'Board Animations',
      description: 'Frontend improvements: animated token movement along the track, dice roll animation, capture explosion effect, victory confetti. No backend changes needed.',
      difficulty: 'Easy'
    },
    {
      area: 'Database Persistence',
      description: 'Implement JpaLudoRepository. Game state serialized as JSON or relational. Swap via Spring profile. Service layer unchanged due to Dependency Injection.',
      difficulty: 'Medium'
    }
  ]
};
