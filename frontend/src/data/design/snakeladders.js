// designDetails — snakeladders
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Snake & Ladders — Design Details',
  tldr: [
    'Turn-based, 2-4 player board game on a 100-cell board with 6 snakes and 11 ladders, exact-count win rule, and per-game move locking.',
    'Dice is a Strategy (DiceRoller): RandomDiceRoller in production, FixedDiceRoller replaying a pinned sequence in tests — the only way exact-landing, snake-bite and ladder-climb resolution can be asserted deterministically.',
    'Typed exception contract (GameNotFoundException, InvalidPlayerCountException, GameAlreadyFinishedException) mapped to real HTTP statuses instead of a silently-ignored bad request or a bare 500.',
    'Thread-safe per-game ReentrantLock (mirroring chess) around every roll, closing a real double-move race the module shipped without for its entire history.',
    'An isolated /api/snakeladders/sim/* engine — a separate GameRepository instance driving the interactive demo tab — so replaying the simulation can never corrupt a real match.'
  ],
  requirements: [
    '2 to 4 named players share one board; turns cycle in registration order and wrap around.',
    'Each turn rolls one die (1-6) and advances the current player by that many cells.',
    'Landing exactly on cell 100 wins immediately; overshooting 100 forfeits the roll — the player stays in place and the turn passes (the "exact-count" rule).',
    'Landing on a snake head slides the player down to its tail; landing on a ladder bottom climbs the player up to its top.',
    'Rolling on a game that has already produced a winner is rejected, not silently accepted.',
    'Handles concurrent roll requests for the same game safely, and reports precise, typed errors (bad player count, unknown game, game already finished) instead of a generic failure.'
  ],
  entities: [
    {
      name: 'SnakeLaddersService',
      description: 'Facade for the whole module: player setup, dice rolls, snake/ladder resolution, and the isolated /sim/* demo engine. The controller only translates HTTP; every rule lives here or in Game#rollAndMove().',
      fields: [
        { name: 'repository', type: 'GameRepository', description: 'Production repository holding every real match, injected via @Qualifier("snakeladdersGameRepository")' },
        { name: 'diceRoller', type: 'DiceRoller', description: 'Injected Spring bean — RandomDiceRoller in production' },
        { name: 'gameLocks', type: 'ConcurrentHashMap<String, ReentrantLock>', description: 'One lock per game id, created on first use via computeIfAbsent' },
        { name: 'simRepository', type: 'GameRepository', description: 'A second, independent repository instance backing /sim/* so the demo can never touch a real match' },
        { name: 'simEventLog', type: 'CopyOnWriteArrayList<SimEvent>', description: 'Append-only log of simulation steps, safe for concurrent read while the UI polls it' }
      ],
      methods: [
        { name: 'createGame(playerNames)', returns: 'Game', description: 'Validates 2-4 players, then creates and saves a new match with the default snakes/ladders' },
        { name: 'getGame(id)', returns: 'Game', description: 'Looks the game up, throwing GameNotFoundException when absent' },
        { name: 'rollDice(gameId)', returns: 'Game', description: 'Locks the game, rejects a roll on an already-FINISHED game via GameAlreadyFinishedException, otherwise delegates to Game#rollAndMove()' }
      ]
    },
    {
      name: 'Game',
      description: 'Core domain entity: id, the player list, current-turn index, the snake/ladder maps, its own DiceRoller, GameState, winner, and the last roll/message shown in the UI.',
      fields: [
        { name: 'id', type: 'String', description: 'Repository-assigned id' },
        { name: 'players', type: 'List<Player>', description: '2-4 players, fixed at construction in registration order' },
        { name: 'currentPlayerIndex', type: 'int', description: 'Index into players of whoever rolls next' },
        { name: 'snakes, ladders', type: 'Map<Integer, Integer>', description: 'Head→tail and bottom→top destination lookups' },
        { name: 'diceRoller', type: 'DiceRoller', description: 'Strategy supplying each roll — RandomDiceRoller in production, FixedDiceRoller in tests' },
        { name: 'state', type: 'GameState', description: 'WAITING, IN_PROGRESS, or FINISHED' },
        { name: 'winner', type: 'Player', description: 'Set only once state becomes FINISHED' },
        { name: 'lastDiceValue', type: 'int', description: 'The most recent roll, for the UI to display' },
        { name: 'lastMessage', type: 'String', description: 'Human-readable narration of the last roll\'s outcome' }
      ],
      methods: [
        { name: 'rollAndMove()', returns: 'int', description: 'Rolls for the current player and applies the exact-count/snake/ladder rules, returning the die value; a no-op returning -1 if the game is not IN_PROGRESS' },
        { name: 'getCurrentPlayer()', returns: 'Player', description: 'The player whose turn it is' }
      ]
    },
    {
      name: 'Player',
      description: 'A participant: name, board position (0-100), and token color.',
      fields: [
        { name: 'name', type: 'String', description: 'Display name supplied when the match is created' },
        { name: 'position', type: 'int', description: 'Current cell, 0 (not yet on the board) to 100' },
        { name: 'color', type: 'String', description: 'Hex token color assigned from a fixed 4-color palette' }
      ],
      methods: []
    },
    {
      name: 'DiceRoller',
      description: 'Strategy interface — roll(): int. RandomDiceRoller (production, a Spring bean) wraps java.util.Random; FixedDiceRoller (tests and, potentially, scripted demos) replays a fixed sequence, repeating its last value once exhausted.',
      fields: [],
      methods: [
        { name: 'roll()', returns: 'int', description: 'A value in [1, 6]. RandomDiceRoller: genuine uniform roll. FixedDiceRoller: next value in a pinned sequence, repeating the last once exhausted.' }
      ]
    },
    {
      name: 'GameRepository',
      description: 'ConcurrentHashMap-backed store keyed by generated match id — one instance for the live API, a second for /sim/*.',
      fields: [
        { name: 'games', type: 'ConcurrentHashMap<String, Game>', description: 'All matches this repository instance owns' },
        { name: 'counter', type: 'AtomicInteger', description: 'Source of the generated id sequence' }
      ],
      methods: [
        { name: 'generateId()', returns: 'String', description: 'Atomically increments the counter and formats the next match id' },
        { name: 'save(game)', returns: 'void', description: 'Upserts a match by its id' },
        { name: 'get(id)', returns: 'Game', description: 'Looks up a match by id, or null if absent' }
      ]
    },
    {
      name: 'GameState',
      description: 'Enum tracking session lifecycle: WAITING, IN_PROGRESS, FINISHED.',
      fields: [
        { name: 'WAITING', type: 'enum constant', description: 'Reserved for a pre-start lobby state; games are created directly IN_PROGRESS today' },
        { name: 'IN_PROGRESS', type: 'enum constant', description: 'Accepting rolls' },
        { name: 'FINISHED', type: 'enum constant', description: 'A player has landed exactly on cell 100' }
      ],
      methods: []
    },
    {
      name: 'SnakeLaddersException hierarchy',
      description: 'Abstract module base (never thrown directly) plus three concrete, typed failures: GameNotFoundException (404), InvalidPlayerCountException (400, only 2-4 players supported), GameAlreadyFinishedException (409).'
    },
    {
      name: 'SimEvent',
      description: 'One telemetry row in the /sim/* engine\'s event log — actor, description, the die value rolled, a snapshot of every player\'s position, and status — so the demo tab can replay a scripted game step by step.',
      fields: [
        { name: 'id', type: 'long', description: 'Monotonically increasing id from simEventIdGen' },
        { name: 'timestamp', type: 'String', description: 'Instant.now().toString() at the moment the step was applied' },
        { name: 'actor', type: 'String', description: 'Player name, or "system" for reset' },
        { name: 'description', type: 'String', description: 'Human-readable narration of the step' },
        { name: 'diceValue', type: 'int', description: 'The die value rolled for this step' },
        { name: 'playersSnapshot', type: 'List<Player>', description: 'Deep-copied player positions right after the step was applied' },
        { name: 'status', type: 'GameState', description: 'Match state right after the step' }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'DiceRoller decouples "how a roll value is produced" from Game.rollAndMove()\'s rule logic. RandomDiceRoller and FixedDiceRoller are interchangeable at construction time, which is what makes the exact-count/snake/ladder test suite deterministic instead of flaky.'
    },
    {
      name: 'Facade Pattern',
      used: true,
      explanation: 'SnakeLaddersService is the single entry point the controller delegates to — player-count validation, per-game locking, and the finished-game guard all live here, not in the controller or the model.'
    },
    {
      name: 'Sandboxed Simulation Instance',
      used: true,
      explanation: 'The /sim/* engine reuses the same DiceRoller bean and Game rules against a second, independent GameRepository instance, so the interactive demo tab can never read or mutate a real match — the same isolation shape as chess and tictactoe.'
    },
    {
      name: 'Exception Hierarchy',
      used: true,
      explanation: 'A per-module abstract base (SnakeLaddersException) lets the shared GlobalExceptionHandler map every concrete failure to the right HTTP status via @ResponseStatus.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'SnakeLaddersService owns setup validation and locking; Game owns the roll/move/win rules; DiceRoller owns nothing but producing a value 1-6.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'A new dice behavior (e.g. a loaded die, 2d6, a seeded-but-still-random roller for reproducible demos) is a new DiceRoller implementation — Game.rollAndMove() never changes.'
    },
    {
      name: 'Dependency Inversion Principle (DIP)',
      description: 'Game depends on the DiceRoller abstraction, never on java.util.Random directly — the exact gap that made this module untestable before this build-out.'
    },
    {
      name: 'Fail Fast',
      description: 'Player count (2-4) is validated at creation, not discovered as an IndexOutOfBoundsException three lines later when the token-color list runs out.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Snake-bite/ladder-climb resolution and the exact-count overshoot rule live entirely inside Game.rollAndMove() — the service never inspects the snake/ladder maps directly.'
    },
    {
      name: 'Abstraction',
      description: 'The REST layer exposes create/roll/get without exposing per-game locking or dice-roller wiring to the frontend.'
    },
    {
      name: 'Polymorphism',
      description: 'Game.rollAndMove() calls diceRoller.roll() polymorphically — it behaves identically whether the roller is genuinely random or a fixed test sequence.'
    }
  ],
  extensibility: [
    {
      area: 'Multi-dice support',
      description: 'A CompositeDiceRoller summing two DiceRoller instances would support 2d6 play without touching Game\'s move logic — the interface already returns a single int, so the composite just does the summing.',
      difficulty: 'Easy'
    },
    {
      area: 'House rules (extra turn on 6, snake/ladder chaining)',
      description: 'rollAndMove() would need an explicit "roll again" branch and a loop over successive snake/ladder maps — both are currently single-application-only by design.',
      difficulty: 'Medium'
    },
    {
      area: 'WebSocket Real-Time Multiplayer',
      description: 'Replace client polling with STOMP/WebSocket topics so all players see a roll the instant it happens.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Snakes and ladders are stored as plain Map<Integer,Integer> (destination lookup), not as Snake/Ladder value objects, even though those records exist in the codebase — O(1) lookup was prioritized over a richer domain model for a mapping this simple.',
    'One die is shared by every player each turn (a single DiceRoller instance on the Game), matching a real physical board game — a "give each player their own loaded die" house rule would need per-player rollers instead.',
    'FixedDiceRoller repeats its last value once its sequence is exhausted rather than throwing, so a test does not have to over-provision rolls it does not care about the exact value of — at the cost of a test silently reusing a stale roll if it under-provisions the sequence by mistake.'
  ]
};
