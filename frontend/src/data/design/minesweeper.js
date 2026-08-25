// designDetails — minesweeper
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Minesweeper — Design Details',
  tldr: [
    'Classic Minesweeper on an N x M grid with flood-fill reveal, flagging, and win/loss detection.',
    'First-click-safe: mines are placed lazily on the first reveal, excluding the clicked cell, so a player\'s opening click can never lose the game.',
    'Mine placement is a Strategy (MinePlacer): RandomMinePlacer in production, FixedMinePlacer with an explicit layout in tests — the only way flood-fill shape, win/loss, and the first-click guarantee can be asserted deterministically.',
    'Typed exception contract (GameNotFoundException, GameOverException, InvalidCellException, InvalidBoardConfigException) replacing two real unhandled-failure paths: an out-of-bounds cell that threw a bare ArrayIndexOutOfBoundsException, and a mine count >= cell count that spun the placement loop forever.',
    'Per-game ReentrantLock (one per game id, not one for the whole module) around every reveal/flag.',
    'An isolated /api/minesweeper/sim/* engine — a separate MinesweeperRepository instance on a fixed 5x5/3-mine board — so replaying the demo can never corrupt a real match.'
  ],
  requirements: [
    'Classic Minesweeper game on a grid with N rows x M columns',
    'M mines are placed on the board (configurable difficulty) — lazily, on the first reveal, never on the clicked cell',
    'Revealing a cell: if it\'s a mine, the game ends LOST; otherwise it shows its adjacent-mine count',
    'Revealing a cell with 0 adjacent mines flood-fills — recursively reveals all connected zero-adjacency cells and the numbered cells bordering them, without cascading past a numbered cell',
    'Right-click (or long-press) toggles a flag on a hidden cell; a flagged cell cannot be revealed until un-flagged, and a revealed cell cannot be flagged',
    'Win condition: every non-mine cell has been revealed (WON)',
    'Board dimensions and mine count are validated: non-positive dimensions, a negative mine count, or mines >= total cells are all rejected up front',
    'Thread-safe concurrent access via a per-game ReentrantLock — reveal/flag operations (including the lazy first-reveal mine placement) are atomic per game, and unrelated games never contend for the same lock'
  ],
  entities: [
    {
      name: 'MinesweeperService',
      description: 'Facade for the whole module: board setup/validation, first-click-safe mine placement, flood-fill reveal, flagging, win/loss detection, and the isolated /sim/* engine.',
      fields: [
        {
          name: 'repository',
          type: 'MinesweeperRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'minePlacer',
          type: 'MinePlacer',
          description: 'Injected Strategy for choosing mine positions — RandomMinePlacer in production, FixedMinePlacer in tests'
        },
        {
          name: 'gameLocks',
          type: 'ConcurrentHashMap<Long, ReentrantLock>',
          description: 'One ReentrantLock per game id, taken for the whole read-validate-mutate span of reveal/flag — replaces a previous single module-wide lock'
        },
        {
          name: 'simRepository / simEventLog',
          type: 'MinesweeperRepository / List<SimEvent>',
          description: 'A second, fully independent repository and its own telemetry log backing /sim/*'
        }
      ],
      methods: [
        {
          name: 'createGame(rows, cols, mines)',
          returns: 'Game',
          description: 'Validates board config, then creates an empty (mine-free) board — mines are not placed yet'
        },
        {
          name: 'revealCell(gameId, row, col)',
          returns: 'Game',
          description: 'On the first reveal for this game, places all mines via MinePlacer (excluding this cell) and computes adjacency; then reveals — mine → LOST; 0-adjacency → flood-fill; checks win'
        },
        {
          name: 'flagCell(gameId, row, col)',
          returns: 'Game',
          description: 'Toggles flag on a hidden cell, tracks flag count'
        },
        {
          name: 'getGame(id)',
          returns: 'Game',
          description: 'Returns current game state, masking adjacentMines to -1 on unrevealed mine cells while the game is still PLAYING'
        }
      ]
    },
    {
      name: 'MinesweeperRepository',
      description: 'In-memory data store using ConcurrentHashMap for thread-safe game storage.',
      fields: [
        {
          name: 'games',
          type: 'ConcurrentHashMap<Long, Game>',
          description: 'All games indexed by ID'
        }
      ],
      methods: [
        { name: 'save(game)', returns: 'void', description: 'Stores/updates game in the map' },
        { name: 'get(id)', returns: 'Game', description: 'Retrieves game by ID' },
        { name: 'nextId()', returns: 'long', description: 'Atomically issues the next game id' }
      ]
    },
    {
      name: 'MinePlacer',
      description: 'Strategy interface for mine placement — place(board, rows, cols, totalMines, excludeRow, excludeCol). RandomMinePlacer (production, Spring bean) places uniformly at random, skipping the excluded cell; FixedMinePlacer (tests) places at an explicit, caller-given list of coordinates, ignoring the exclusion entirely so flood-fill/win/loss can be tested against a known board.',
      fields: [],
      methods: []
    },
    {
      name: 'Game',
      description: 'Central entity holding the Minesweeper board, game state, and statistics.',
      fields: [
        { name: 'id', type: 'long', description: 'Unique game identifier' },
        { name: 'board', type: 'Cell[][]', description: '2D array of cells (rows x cols)' },
        { name: 'rows', type: 'int', description: 'Number of rows' },
        { name: 'cols', type: 'int', description: 'Number of columns' },
        { name: 'totalMines', type: 'int', description: 'Total number of mines on the board' },
        { name: 'status', type: 'GameStatus', description: 'PLAYING, WON, or LOST' },
        { name: 'flagsUsed', type: 'int', description: 'Number of flags currently placed' },
        { name: 'revealedCount', type: 'int', description: 'Number of successfully revealed cells' },
        { name: 'firstClickDone', type: 'boolean', description: 'False until the first reveal places mines — the first-click-safe policy\'s state flag' }
      ],
      methods: []
    },
    {
      name: 'Cell',
      description: 'A single cell on the Minesweeper board with position and state.',
      fields: [
        { name: 'row', type: 'int', description: 'Row index (0-based)' },
        { name: 'col', type: 'int', description: 'Column index (0-based)' },
        { name: 'mine', type: 'boolean', description: 'Whether this cell contains a mine' },
        { name: 'revealed', type: 'boolean', description: 'Whether the cell has been revealed' },
        { name: 'flagged', type: 'boolean', description: 'Whether the cell is flagged (cannot be revealed while flagged)' },
        { name: 'adjacentMines', type: 'int', description: 'Count of mines in adjacent cells (0-8). Masked to -1 by getGame() on unrevealed mine cells while PLAYING' }
      ],
      methods: []
    },
    {
      name: 'MinesweeperException hierarchy',
      description: 'Abstract module base (never thrown directly) plus four concrete, typed failures: GameNotFoundException (404), GameOverException (409), InvalidCellException (400, out-of-bounds), InvalidBoardConfigException (400, bad dimensions or mines >= cell count).',
      fields: [],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'MinePlacer decouples "where mines go" from the reveal/flood-fill/win logic. RandomMinePlacer and FixedMinePlacer are interchangeable at construction time — the service never knows or cares which one it was given.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'MinesweeperRepository abstracts all data access behind semantic methods like save() and get(). The service never touches a map directly.'
    },
    {
      name: 'Facade Pattern',
      used: true,
      explanation: 'MinesweeperService is the single entry point the controller delegates to — board validation, per-game locking, lazy mine placement and win/loss all live here.'
    },
    {
      name: 'Sandboxed Simulation Instance',
      used: true,
      explanation: 'The /sim/* engine reuses the same MinePlacer bean and reveal/flag logic against a second, independent MinesweeperRepository instance on a fixed 5x5 board, so the demo tab can never touch a real game.'
    },
    {
      name: 'Exception Hierarchy',
      used: true,
      explanation: 'A per-module abstract base (MinesweeperException) lets the shared GlobalExceptionHandler map every concrete failure — including the two paths that used to be an unhandled 500/hang — to the right HTTP status.'
    },
    {
      name: 'Observer Pattern',
      used: false,
      explanation: 'The frontend polls for game state updates. A WebSocket-based observer would push cell-reveal and game-over events in real time without polling.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'MinesweeperService handles game orchestration; MinePlacer handles exactly one thing (where mines go); MinesweeperRepository handles storage; MinesweeperController handles HTTP mapping.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new mine-placement strategy (e.g. a symmetric or difficulty-curved layout) is a new MinePlacer implementation — revealCell/flood-fill/win logic never change.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'MinesweeperService depends on the MinePlacer and MinesweeperRepository abstractions, not on java.util.Random or ConcurrentHashMap directly — the exact gap that made deterministic testing impossible before this build-out.'
    },
    {
      name: 'Fail Fast',
      description: 'Board config (dimensions, mine count) and cell bounds are validated at the boundary, before any state mutation — replacing two previously-unhandled failure paths (an infinite placement loop; a bare ArrayIndexOutOfBoundsException) with typed 400s.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Cell State Protection',
      description: 'Cell state (revealed, flagged, mine) is only modified through controlled service methods (revealCell, flagCell). External code cannot accidentally expose mines or modify the board.',
      alternative: 'Could expose cell fields as public. Controlled mutation via service ensures game rules are always enforced (can\'t flag a revealed cell, can\'t reveal a flagged cell).'
    },
    {
      name: 'Recursion — Flood-Fill Algorithm',
      description: 'When a cell with 0 adjacent mines is revealed, the service recursively reveals all 8 neighboring cells, stopping at any numbered (non-zero) cell — that cell is still revealed, just not cascaded past. Bounds are checked before every array access.',
      alternative: 'Could use an iterative queue-based BFS. Recursion is chosen because it\'s simpler and the board size is small (max ~256 cells at Expert), so stack depth is not a concern.'
    },
    {
      name: '2D Array Composition',
      description: 'The board is a 2D array of Cell objects. Game contains the board, not extends it. This composition approach allows the board to be easily accessed via grid coordinates.',
      alternative: 'Could use a flat array with index = row * cols + col. 2D array is chosen because it makes coordinate-based operations (neighbor lookup, flood-fill) more intuitive.'
    }
  ],
  extensibility: [
    {
      area: 'New Difficulty Levels',
      description: 'Add a new preset to the frontend selector with custom rows/cols/mines. The backend already accepts these as parameters and validates them.',
      difficulty: 'Easy'
    },
    {
      area: 'Timer / Leaderboard',
      description: 'Add a timer field to Game, track completion time, and store best times per difficulty. revealCell would stop the timer on WON/LOST.',
      difficulty: 'Medium'
    },
    {
      area: 'Chord Reveal',
      description: 'If a revealed number cell has N flagged neighbors and N = adjacentMines, auto-reveal its remaining neighbors — reduces repetitive clicking.',
      difficulty: 'Medium'
    },
    {
      area: 'Wider first-click-safe opening',
      description: 'The current policy excludes only the clicked cell from mine placement. Excluding its full 3x3 neighborhood as well would guarantee an opening cascade on the first click, at the cost of a slightly weaker random distribution near the edges of small boards.',
      difficulty: 'Easy'
    },
    {
      area: 'Database Persistence',
      description: 'Implement a JPA-backed MinesweeperRepository and swap it in via Spring @Profile — the service layer is unchanged since it only depends on the repository\'s save/get/nextId contract.',
      difficulty: 'Medium'
    }
  ]
};
