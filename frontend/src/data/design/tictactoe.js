// designDetails — tictactoe
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Tic Tac Toe Game — Low-Level System Design',
  tldr: [
    'Multi-mode game engine supporting 2-Player local matches (Human vs Human) and AI Opponents (Human vs AI).',
    'Strategy Pattern for AI Move Generation encapsulating Random and Unbeatable Minimax search strategies.',
    'State Machine order lifecycle: IN_PROGRESS ➔ WON (with 2D line coordinate calculation) or DRAW.',
    'Thread-safe session isolation using ConcurrentHashMap repository protected by per-game ReentrantLock instances.',
    'Full move history log supporting Step-by-Step replay and atomic Undo functionality.'
  ],
  requirements: [
    'Players can configure 2-player local matches or play against an AI Bot with customizable difficulty levels.',
    'The board validates valid grid moves, turns, and auto-detects winning rows, columns, or diagonals.',
    'The engine computes exact winning cell coordinates (startRow, startCol, endRow, endCol) for visual highlight.',
    'Supports Step-by-Step move history tracking, match replay, and move undoing.',
    'Handles concurrent move execution safely across multiple simultaneous game sessions.'
  ],
  entities: [
    {
      name: 'Game',
      description: 'Core domain entity managing board grid, current turn player, game mode, difficulty, move count, and status.'
    },
    {
      name: 'Player',
      description: 'Represents a participant with player name and assigned symbol (X or O).'
    },
    {
      name: 'Move',
      description: 'Value object recording move index, player name, symbol, row/col coordinates, and timestamp.'
    },
    {
      name: 'AIMoveStrategy',
      description: 'Strategy interface computing optimal next move based on current game board state.'
    },
    {
      name: 'GameState',
      description: 'Enum tracking session lifecycle: IN_PROGRESS, WON, DRAW, ABANDONED.'
    },
    {
      name: 'GameMode',
      description: 'Enum specifying HUMAN_VS_HUMAN or HUMAN_VS_AI match types.'
    },
    {
      name: 'AIDifficulty',
      description: 'Enum defining AI strategy: EASY (Random) vs UNBEATABLE (Minimax algorithm).'
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Encapsulates AI move calculation algorithms (RandomAIMoveStrategy vs MinimaxAIMoveStrategy) selected dynamically based on difficulty.'
    },
    {
      name: 'State Pattern',
      used: true,
      explanation: 'Manages formal GameState transitions (IN_PROGRESS ➔ WON / DRAW) and prevents invalid moves after game termination.'
    },
    {
      name: 'Command Pattern',
      used: true,
      explanation: 'Encapsulates board moves as Move objects to support Undo functionality and move history replay.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'Instantiates Game instances with appropriate player symbols and strategy objects.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'TicTacToeService manages game state transitions, GameRepository handles storage, and AIMoveStrategy focuses exclusively on move calculation.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'New AI strategies (e.g. Monte Carlo Tree Search or N×N grid algorithms) can be plugged in without modifying core service logic.'
    },
    {
      name: 'Interface Segregation Principle (ISP)',
      description: 'AIMoveStrategy exposes a clean, targeted interface (findBestMove) for AI engines.'
    },
    {
      name: 'Dependency Inversion Principle (DIP)',
      description: 'Service relies on strategy abstractions rather than concrete Minimax implementations.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Board grid state, move validation rules, and winning line detection logic are encapsulated within atomic domain methods.'
    },
    {
      name: 'Abstraction',
      description: 'REST Controllers abstract backend concurrency locks and AI Minimax computation from frontend UI components.'
    },
    {
      name: 'Polymorphism',
      description: 'TicTacToeService invokes findBestMove() polymorphically regardless of whether the AI strategy is Random or Minimax.'
    }
  ],
  extensibility: [
    {
      area: 'N×N Customizable Grid Size',
      description: 'Extend board data structure and win checking strategy to support 4×4 or 5×5 grid sizes with configurable K-in-a-row win conditions.',
      difficulty: 'Medium'
    },
    {
      area: 'WebSocket Real-Time Multiplayer',
      description: 'Replace polling with STOMP/WebSocket topics for real-time remote 2-player matchmaking.',
      difficulty: 'Hard'
    },
    {
      area: 'Leaderboard & ELO Rating System',
      description: 'Track player win/loss statistics and compute dynamic ELO rating scores across games.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Used O(1) win checking using row, col, and diagonal count arrays.'
  ]
};
