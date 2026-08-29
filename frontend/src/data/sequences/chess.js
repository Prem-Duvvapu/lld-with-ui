// Sequence diagram content for chess.
// Grounded directly in ChessService#makeMove, PieceMoveStrategyFactory,
// and SquareAttackChecker / Checkmate detection.
export default {
  title: 'Chess — Move Validation & Check Detection Pipeline',
  description:
    'How ChessService validates a move across multiple layers: turn ownership, piece-specific movement rules via PieceMoveStrategyFactory, path obstructions, square attack simulation to reject moves leaving the moving king in check, and post-move check/checkmate detection.',
  flows: [
    {
      id: 'chess-move-validation',
      label: 'Move validation pipeline & king safety verification',
      description:
        'White player moves Knight from b1 to c3 (ChessServiceTest). ChessService fetches the game, verifies active turn, delegates to KnightMoveStrategy, simulates the prospective board state via SquareAttackChecker to confirm White king is not attacked, applies the move, and evaluates whether Black is now in check.',
      participants: [
        { id: 'player', name: 'White Player', kind: 'actor' },
        { id: 'controller', name: 'ChessController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ChessService', kind: 'component', stereotype: 'facade' },
        { id: 'factory', name: 'PieceMoveStrategy\nFactory', kind: 'component', stereotype: 'factory' },
        { id: 'strategy', name: 'KnightMove\nStrategy', kind: 'component', stereotype: 'strategy' },
        { id: 'checker', name: 'SquareAttack\nChecker', kind: 'component' },
        { id: 'game', name: 'Game / Board', kind: 'store' },
      ],
      steps: [
        { from: 'player', to: 'controller', text: 'POST /api/chess/games/{id}/move {from: "b1", to: "c3"}',
          detail: 'Player submits move coordinates in standard algebraic notation.' },
        { from: 'controller', to: 'service', text: 'makeMove(gameId, "b1", "c3")', activate: 'service',
          detail: 'Controller forwards to ChessService facade.' },
        { from: 'service', to: 'game', text: 'getGame(gameId)' },
        { from: 'game', to: 'service', text: 'Game {status: IN_PROGRESS, turn: WHITE, board}', type: 'return' },
        { from: 'service', to: 'service', text: 'validateTurn(WHITE) — matches piece color at b1 ✓' },
        { from: 'service', to: 'factory', text: 'getStrategy(PieceType.KNIGHT)', activate: 'factory' },
        { from: 'factory', to: 'service', text: 'return KnightMoveStrategy', type: 'return', deactivate: 'factory' },
        { from: 'service', to: 'strategy', text: 'isValidMove(board, from, to, context)', activate: 'strategy' },
        { from: 'strategy', to: 'strategy', text: 'verify L-shape offset: (dx=1, dy=2) or (dx=2, dy=1) ✓' },
        { from: 'strategy', to: 'strategy', text: 'verify target cell is empty or enemy piece ✓' },
        { from: 'strategy', to: 'service', text: 'return true', type: 'return', deactivate: 'strategy' },
        { type: 'note', over: ['service', 'checker'], text: 'Simulate move on cloned board to verify own King safety.' },
        { from: 'service', to: 'checker', text: 'isKingInCheckAfterMove(clonedBoard, WHITE)', activate: 'checker' },
        { from: 'checker', to: 'service', text: 'return false (White king is safe)', type: 'return', deactivate: 'checker' },
        { from: 'service', to: 'game', text: 'executeMove(from="b1", to="c3") ; recordHistory()' },
        { from: 'service', to: 'checker', text: 'isKingInCheck(board, BLACK)', activate: 'checker' },
        { from: 'checker', to: 'service', text: 'return false (Black king not in check)', type: 'return', deactivate: 'checker' },
        { from: 'service', to: 'game', text: 'switchTurn(BLACK)' },
        { from: 'service', to: 'controller', text: 'return GameResponse {status: IN_PROGRESS, turn: BLACK}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'player', text: '200 OK {move: "b1-c3", turn: "BLACK", inCheck: false}', type: 'return' },
      ],
    },
  ],
};
