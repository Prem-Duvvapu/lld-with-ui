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
      name: 'Game',
      description: 'Core domain entity: id, the player list, current-turn index, the snake/ladder maps, its own DiceRoller, GameState, winner, and the last roll/message shown in the UI.'
    },
    {
      name: 'Player',
      description: 'A participant: name, board position (0-100), and token color.'
    },
    {
      name: 'DiceRoller',
      description: 'Strategy interface — roll(): int. RandomDiceRoller (production, a Spring bean) wraps java.util.Random; FixedDiceRoller (tests and, potentially, scripted demos) replays a fixed sequence, repeating its last value once exhausted.'
    },
    {
      name: 'GameState',
      description: 'Enum tracking session lifecycle: WAITING, IN_PROGRESS, FINISHED.'
    },
    {
      name: 'SnakeLaddersException hierarchy',
      description: 'Abstract module base (never thrown directly) plus three concrete, typed failures: GameNotFoundException (404), InvalidPlayerCountException (400, only 2-4 players supported), GameAlreadyFinishedException (409).'
    },
    {
      name: 'SimEvent',
      description: 'One telemetry row in the /sim/* engine\'s event log — actor, description, the die value rolled, a snapshot of every player\'s position, and status — so the demo tab can replay a scripted game step by step.'
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
