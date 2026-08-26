// designDetails — ludo
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Ludo — Design Details',
  requirements: [
    'Exactly 4 players (RED/GREEN/BLUE/YELLOW), 4 tokens each, on one shared 52-cell circular track',
    'A token still HOME may only leave on a roll of exactly 6, and lands on its color start square',
    'A token cannot advance onto a square already held by another of the SAME player\'s ACTIVE tokens',
    'Landing on an opponent token on a non-safe square captures it — sent back HOME immediately',
    '8 safe squares (4 start squares + 4 star squares) are immune to capture',
    'A token needs the EXACT remaining roll to reach its home cell; an overshoot is rejected outright and the token stays put (no partial move, no wraparound)',
    'Rolling a 6 grants the same player another roll, uncapped — the "three sixes forfeits" house rule is intentionally out of scope',
    'A pending roll must be spent on a move before the next roll is accepted — no free re-rolls',
    'A player with no legal move on their roll has the turn auto-passed to the next player',
    'A player wins when all 4 of their tokens reach FINISHED',
    'Each game is guarded by its own lock, so unrelated games never contend with each other'
  ],
  entities: [
    {
      name: 'LudoService',
      description: 'Facade for the whole module: game setup, dice rolls, token movement (captures, safe spots, exact-count home entry) and the isolated /sim/* demo engine. The controller only translates HTTP; every rule lives here or in Token#transitionTo.',
      fields: [
        { name: 'repository', type: 'LudoRepository', description: 'Live game storage, injected via constructor' },
        { name: 'diceRoller', type: 'DiceRoller', description: 'Injected dice strategy — RandomDiceRoller in production, FixedDiceRoller in tests' },
        { name: 'gameLocks', type: 'ConcurrentHashMap<Long, ReentrantLock>', description: 'One lazily-created lock per live game id — replaces a former single module-wide lock' },
        { name: 'simRepository', type: 'LudoRepository', description: 'A second, fully independent repository backing /sim/* so the demo cannot corrupt real games' },
        { name: 'simEventLog', type: 'List<SimEvent>', description: 'Telemetry feed for the interactive simulation tab' }
      ],
      methods: [
        { name: 'createGame(playerNames)', returns: 'Game', description: 'Validates exactly 4 non-blank names, builds 4 players with 4 HOME tokens each' },
        { name: 'rollDice(gameId)', returns: 'Game', description: 'Rolls under the game lock; auto-passes the turn if the roll has no legal move; rejects a second roll before the pending one is spent' },
        { name: 'moveToken(gameId, playerIndex, tokenIndex)', returns: 'Game', description: 'Applies the roll to one token: leave-home, on-track advance, capture, exact-count finish, or a rejected illegal move — the board is left unchanged on rejection' },
        { name: 'getGame(gameId)', returns: 'Game', description: 'Returns current game state or throws GameNotFoundException' }
      ]
    },
    {
      name: 'Game',
      description: 'One 4-player match: 4 Players and their 4 Tokens each, on one shared 52-cell circular track. There is no separate home-column lane — each color\'s home cell is the single track cell one step behind its own start cell, reached only by an exact-count roll.',
      fields: [
        { name: 'id', type: 'long', description: 'Unique game identifier' },
        { name: 'players', type: 'List<Player>', description: '4 players, fixed RED/GREEN/BLUE/YELLOW seats' },
        { name: 'tokens', type: 'List<List<Token>>', description: '4x4: 4 tokens per player' },
        { name: 'currentPlayerIndex', type: 'int', description: 'Whose turn it is (0-3)' },
        { name: 'diceValue', type: 'int', description: 'Pending, unspent roll — 0 means no roll is pending' },
        { name: 'status', type: 'GameStatus', description: 'PLAYING or FINISHED' },
        { name: 'winner', type: 'String', description: 'Winner name once status is FINISHED' }
      ],
      methods: []
    },
    {
      name: 'Token',
      description: 'One of a player\'s 4 tokens. transitionTo(status) is the single place its lifecycle status ever changes — it delegates legality to the TokenState for the current status.',
      fields: [
        { name: 'id', type: 'int', description: 'Token index within player set (0-3)' },
        { name: 'color', type: 'String', description: 'Owner color' },
        { name: 'position', type: 'int', description: '-1 while HOME; a track cell (0-51) while ACTIVE or FINISHED' },
        { name: 'status', type: 'TokenStatus', description: 'HOME, ACTIVE, or FINISHED — the state-machine phase' }
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Validates target against the current TokenState\'s allowedNext() and applies it, or throws InvalidMoveException' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State Pattern — Token Lifecycle',
      used: true,
      explanation: 'com.lld.ludo.state: one singleton class per TokenStatus (HomeState, ActiveState, FinishedState), each declaring its own allowedNext() set — the same shape as taskmanagement.state.TaskState / trafficsignal.state.SignalState. HOME -> ACTIVE only on a 6; ACTIVE -> HOME on capture or -> FINISHED on exact entry; FINISHED is terminal. Token#transitionTo is the single enforcement point — an illegal jump (e.g. a FINISHED token asked to move) throws InvalidMoveException and leaves status unchanged.'
    },
    {
      name: 'Strategy Pattern — Dice Roller',
      used: true,
      explanation: 'DiceRoller (roll(): int) — RandomDiceRoller (production, a genuine 1-6 uniform roll) and FixedDiceRoller (tests — a fixed sequence, repeating the last value once exhausted), the same idiom as snakeladders.dice.DiceRoller and minesweeper.strategy.MinePlacer. This is what makes "roll a 6 to leave home" and exact-count home entry deterministically testable at all — the previous design called a bare, unseeded Random directly.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'LudoRepository encapsulates all data access behind semantic id/save/get methods. It is a bare wrapper with no independent behaviour, so its coverage is merged into LudoServiceTest rather than duplicated in its own suite.'
    },
    {
      name: 'Facade Pattern',
      used: true,
      explanation: 'LudoService is the single entry point the controller calls; it hides the interplay between the state machine, the dice strategy, capture/safe-spot rules and per-game locking behind a handful of methods.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'LudoService receives LudoRepository and DiceRoller via constructor injection, decoupling it from both storage and randomness — the property that makes deterministic tests possible.'
    }
  ],
  principles: [
    { name: 'Single Responsibility (SRP)', description: 'LudoService orchestrates; LudoRepository stores; Game/Player/Token are data; TokenState implementations own lifecycle legality; DiceRoller owns randomness. Each has exactly one reason to change.' },
    { name: 'Open/Closed (OCP)', description: 'A new TokenStatus phase (e.g. a shielded/invulnerable state) would mean adding one new TokenState implementation and registering it in TokenStates — existing states are never modified.' },
    { name: 'Dependency Inversion (DIP)', description: 'LudoService depends on the DiceRoller and LudoRepository abstractions, never on java.util.Random or ConcurrentHashMap directly — production wiring and test wiring differ only in which implementation is injected.' },
    { name: 'Liskov Substitution (LSP)', description: 'Every TokenState implementation honors the same contract (allowedNext(), isTerminal(), canTransitionTo()) — Token#transitionTo never needs to know which concrete state it is holding.' },
    { name: 'Encapsulation', description: 'A token\'s status never changes except through transitionTo, which itself only ever runs under the owning game\'s lock inside LudoService — no code path can leave a token in an invalid state.' }
  ],
  oopConcepts: [
    {
      name: 'State Pattern over ad-hoc boolean flags',
      description: 'The original model tracked lifecycle with two independent booleans (isHome, isFinished), which can drift out of sync (e.g. both false and true simultaneously is nonsensical but was not prevented by the type system). A single TokenStatus enum plus a State object per value makes an invalid combination unrepresentable.',
      alternative: 'Could keep booleans and add manual guard clauses everywhere they are read. The state machine is chosen because it enforces the transition table in one place instead of at every call site.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Game contains Lists of Players and Tokens; Player does not extend Token, and Game does not extend a Board base class. This models the real-world "has-a" relationship directly.',
      alternative: 'Could model Token as a subclass per color. Composition is chosen because color is just data (a field), not a behavioral specialization.'
    },
    {
      name: 'Value Objects — Board Geometry Constants',
      description: 'START_POSITIONS, SAFE_SPOTS, TRACK_SIZE, COLORS live as static constants on Game — a single source of truth for the fixed 4-color board layout.',
      alternative: 'Could externalize into configuration. Constants are chosen because the board geometry is fixed and compile-time, never runtime-configurable in this module.'
    },
    {
      name: 'Immutable Roll Outcome',
      description: 'The internal RollOutcome record (game, rolledValue, turnPassed) returned by doRoll is immutable — it exists purely so the sim engine can log the exact value rolled even when the turn auto-passed and diceValue was reset to 0 for the next player.',
      alternative: 'Could recompute the rolled value from log side-effects. A record is chosen because it is the simplest way to return two related-but-distinct facts from one atomic operation.'
    }
  ],
  extensibility: [
    { area: 'Home Column / Final Stretch', description: 'Give each color its own private 6-cell home lane instead of sharing the last stretch of the main track. Token would need a lane flag; stepsToHome would branch on it.', difficulty: 'Medium' },
    { area: 'Three-Sixes Forfeit', description: 'Track consecutive sixes per turn on Game; on the third, send the just-moved token back home and pass the turn instead of granting a fourth roll.', difficulty: 'Easy' },
    { area: '2-3 Player Games', description: 'Currently locked to exactly 4 seats (InvalidPlayerCountException). Supporting fewer players means marking unused seats inactive rather than assigning them a Player, and skipping inactive seats in nextTurn.', difficulty: 'Medium' },
    { area: 'Online Multiplayer', description: 'Add WebSocket push so all 4 browsers see rolls/moves live instead of polling GET /games/{id}.', difficulty: 'Hard' },
    { area: 'Bot Players', description: 'A LudoBot implementing a token-choice policy (prioritize captures, then furthest-advanced, then leaving home) that calls the same moveToken endpoint a human would.', difficulty: 'Medium' },
    { area: 'Database Persistence', description: 'A JPA-backed LudoRepository implementing the same nextId/save/get contract — LudoService is unchanged because it only depends on the interface shape, not ConcurrentHashMap.', difficulty: 'Medium' }
  ],
  tradeoffs: [
    'Chose one shared 52-cell track with no separate home-column lane, keeping the board model simple, over the classic per-color home stretch, at the cost of a less faithful recreation of the physical board — documented explicitly rather than left ambiguous.',
    'Locked player count to exactly 4 (InvalidPlayerCountException on anything else) rather than supporting 2-4 like real Ludo, because the board constants (START_POSITIONS, SAFE_SPOTS, the 4-color palette) are compile-time and a variable seat count would need an "inactive seat" concept the rest of the module does not have yet.',
    'An illegal move (overshoot, blocked square, wrong turn) is rejected as a complete no-op that leaves the board and the pending roll untouched, rather than silently clamping or auto-selecting another token — the player keeps the same roll and may retry with a different token, mirroring how the physical game actually plays.',
    'One ReentrantLock per game (not a single global lock) trades a small amount of per-game lock-object bookkeeping for the ability to run unrelated games fully in parallel — verified by LudoConcurrencyTest\'s disjoint-games case.',
    'The die is rolled inside the per-game lock, not before it, so "is a roll pending" and "record this roll" are one atomic step — rolling outside the lock and writing the result inside it would reopen the exact race the lock exists to close.'
  ],
  summary: 'A 4-player Ludo engine built around an explicit token-lifecycle state machine (HOME -> ACTIVE -> FINISHED, with capture looping ACTIVE back to HOME) and an injectable dice strategy that makes every rule — roll-a-6-to-leave-home, safe-square capture immunity, and exact-count home entry — deterministically testable. A per-game lock isolates concurrent games from each other while keeping each game\'s roll-then-move sequence atomic, and an isolated /sim/* sandbox drives the interactive demo without ever touching live game state.',
  highlights: [
    'Token lifecycle modeled as a real State pattern (HomeState/ActiveState/FinishedState), not boolean flags — an illegal transition (moving a FINISHED token, skipping HOME straight to FINISHED) is structurally rejected by Token#transitionTo, not by scattered if-checks.',
    'Exact-count home entry is enforced by comparing the roll against stepsToHome before any position math runs — an overshoot is a full no-op, closing a real overshoot-wraps-the-token-around bug found while writing this module\'s first tests (see RCA-020).',
    'Dice rolling is injectable (DiceRoller / RandomDiceRoller / FixedDiceRoller), the same idiom as snakeladders and minesweeper — the only reason "roll a 6" and "roll exactly N to finish" can be pinned in a test at all.',
    'Per-game ReentrantLocks (not one module-wide lock) let unrelated games run fully concurrently, while the roll itself happens inside the lock so two racing calls can never both spend the same pending roll — proven by LudoConcurrencyTest.'
  ]
};
