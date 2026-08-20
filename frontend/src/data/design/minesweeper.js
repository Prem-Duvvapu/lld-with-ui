// designDetails — minesweeper
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Minesweeper — Design Details',
  requirements: [
    'Classic Minesweeper game on a grid with N rows × M columns',
    'M mines are randomly placed on the board (configurable difficulty)',
    'Left-click to reveal a cell; if it\'s a mine → game over (LOST)',
    'If revealed cell has 0 adjacent mines → flood-fill (BFS) reveals all neighboring cells recursively',
    'If revealed cell has N adjacent mines → shows number N (1-8)',
    'Right-click to toggle a flag on a cell; flag counter tracks flags used vs total mines',
    'Win condition: all non-mine cells are revealed (WON)',
    'Thread-safe concurrent access via ReentrantLock — multiple reveal/flag operations are atomic'
  ],
  entities: [
    {
      name: 'MinesweeperService',
      description: 'Core business logic for Minesweeper. Handles game creation (mine placement + adjacency calculation), cell reveal (with flood-fill BFS), flag toggle, and win/loss detection.',
      fields: [
        {
          name: 'repository',
          type: 'MinesweeperRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures thread-safe game mutations'
        },
        {
          name: 'random',
          type: 'Random',
          description: 'Random number generator for mine placement'
        }
      ],
      methods: [
        {
          name: 'createGame(rows, cols, mines)',
          returns: 'Game',
          description: 'Creates board, randomly places mines, calculates adjacent counts for each cell'
        },
        {
          name: 'revealCell(gameId, row, col)',
          returns: 'Game',
          description: 'Reveals cell; if mine → LOST; if 0 adjacent → flood-fill; checks win condition'
        },
        {
          name: 'flagCell(gameId, row, col)',
          returns: 'Game',
          description: 'Toggles flag on cell (only on hidden cells), tracks flag count'
        },
        {
          name: 'getGame(id)',
          returns: 'Game',
          description: 'Returns current game state (hides mine positions while game is PLAYING)'
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
        {
          name: 'save(game)',
          returns: 'void',
          description: 'Stores/updates game in the map'
        },
        {
          name: 'get(id)',
          returns: 'Game',
          description: 'Retrieves game by ID'
        }
      ]
    },
    {
      name: 'Game',
      description: 'Central entity holding the Minesweeper board, game state, and statistics.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique game identifier'
        },
        {
          name: 'board',
          type: 'Cell[][]',
          description: '2D array of cells (rows × cols)'
        },
        {
          name: 'rows',
          type: 'int',
          description: 'Number of rows'
        },
        {
          name: 'cols',
          type: 'int',
          description: 'Number of columns'
        },
        {
          name: 'totalMines',
          type: 'int',
          description: 'Total number of mines on the board'
        },
        {
          name: 'status',
          type: 'GameStatus',
          description: 'PLAYING, WON, or LOST'
        },
        {
          name: 'flagsUsed',
          type: 'int',
          description: 'Number of flags currently placed'
        },
        {
          name: 'revealedCount',
          type: 'int',
          description: 'Number of successfully revealed cells'
        }
      ],
      methods: []
    },
    {
      name: 'Cell',
      description: 'A single cell on the Minesweeper board with position and state.',
      fields: [
        {
          name: 'row',
          type: 'int',
          description: 'Row index (0-based)'
        },
        {
          name: 'col',
          type: 'int',
          description: 'Column index (0-based)'
        },
        {
          name: 'isMine',
          type: 'boolean',
          description: 'Whether this cell contains a mine'
        },
        {
          name: 'isRevealed',
          type: 'boolean',
          description: 'Whether the cell has been revealed'
        },
        {
          name: 'isFlagged',
          type: 'boolean',
          description: 'Whether the cell is flagged (cannot be revealed while flagged)'
        },
        {
          name: 'adjacentMines',
          type: 'int',
          description: 'Count of mines in adjacent cells (0-8). -1 if this cell itself is a mine'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'MinesweeperRepository abstracts all data access behind semantic methods like save() and get(). The service never touches maps directly, keeping business logic clean and the data layer swappable.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring @Service and @Repository singletons ensure one consistent game state across all requests. Critical since all game data lives in memory.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'MinesweeperService receives MinesweeperRepository via constructor injection. Spring auto-wires the dependency, enabling easy testing with mock repositories.'
    },
    {
      name: 'Observer Pattern',
      used: false,
      explanation: 'The frontend polls for game state updates. A WebSocket-based observer would push cell reveal events and game-over notifications in real-time without polling.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'MinesweeperService handles game logic (mine placement, reveal, flood-fill, win/loss). MinesweeperRepository handles data storage. GameController handles HTTP mapping. Each has one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding new difficulty presets (rows/cols/mines combinations) requires no code changes to the core game logic. New cell states or game features can be added without modifying the existing reveal/flag flow.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Service depends on repository abstraction, not on ConcurrentHashMap directly. Spring injects the concrete implementation, enabling storage strategy swaps.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Flood-fill logic is a single recursive function reused for all zero-count reveals. Adjacent mine counting uses one loop structure. Win check is a single formula (revealed + mines = total).'
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
      description: 'When a cell with 0 adjacent mines is revealed, the service recursively reveals all 8 neighboring cells. If those also have 0 mines, the recursion continues (BFS-style). This mirrors the classic Minesweeper behavior.',
      alternative: 'Could use an iterative queue-based BFS. Recursion is chosen because it\'s simpler and the board size is small (max 256 cells), so stack overflow is not a concern.'
    },
    {
      name: '2D Array Composition',
      description: 'The board is a 2D array of Cell objects. The Game contains the board, not extends it. This composition approach allows the board to be easily accessed via grid coordinates.',
      alternative: 'Could use a flat array with index = row × cols + col. 2D array is chosen because it makes coordinate-based operations (neighbor lookup, flood-fill) more intuitive.'
    }
  ],
  extensibility: [
    {
      area: 'New Difficulty Levels',
      description: 'Add new preset to the frontend selector with custom rows/cols/mines. Backend already accepts these as parameters. No code changes needed.',
      difficulty: 'Easy'
    },
    {
      area: 'Timer / Leaderboard',
      description: 'Add timer field to Game. Track completion time. Frontend shows elapsed time. Leaderboard stores best times per difficulty. RevealCell stops timer on game over.',
      difficulty: 'Medium'
    },
    {
      area: 'First-Click Safety',
      description: 'Guarantee first reveal is never a mine. In createGame(), delay mine placement until first reveal. Place mines avoiding the first-click cell and its neighbors.',
      difficulty: 'Medium'
    },
    {
      area: 'Auto-Flag / Chord Reveal',
      description: 'Chord reveal: if a revealed number cell has N flagged neighbors and N = adjacentMines, auto-reveal remaining neighbors. Reduces repetitive clicking.',
      difficulty: 'Medium'
    },
    {
      area: 'Mine-Free Zones (Patterns)',
      description: 'Allow creating predefined patterns (e.g., guaranteed safe border). Useful for puzzles. Requires only changing mine placement logic in createGame().',
      difficulty: 'Easy'
    },
    {
      area: 'Database Persistence',
      description: 'Implement JpaMinesweeperRepository. Swap via Spring @Profile. Service layer unchanged.',
      difficulty: 'Medium'
    }
  ]
};
