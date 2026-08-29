// Sequence diagram content for tictactoe.
// Grounded directly in TicTacToeService#makeMove and TicTacToeConcurrencyTest:
// Two players racing to occupy the same cell on the same game; ReentrantLock ensures exactly one wins.
export default {
  title: 'Tic Tac Toe — Atomic Move Resolution & Win Scan',
  description:
    'How TicTacToeService serializes concurrent moves on the same game using a per-game ReentrantLock. When two moves arrive simultaneously for the same cell, the lock guarantees that one is accepted while the other is rejected with CellOccupiedException (422), followed by atomic win-line scanning.',
  flows: [
    {
      id: 'concurrent-move-race',
      label: 'Two players race to occupy the same cell',
      description:
        'Player X (Alice) and Player O (Bob) submit moves to cell (1, 1) near-simultaneously (TicTacToeConcurrencyTest). The per-game lock held across status check, turn check, cell occupancy, symbol placement, and win scan ensures only Alice gets the cell while Bob receives a 422 rule violation.',
      participants: [
        { id: 'playerA', name: 'Player X\n(Alice)', kind: 'actor' },
        { id: 'playerB', name: 'Player O\n(Bob)', kind: 'actor' },
        { id: 'controller', name: 'TicTacToeController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'TicTacToeService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'gameLock(id)', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'game', name: 'Game & Board', kind: 'store' },
      ],
      steps: [
        { from: 'playerA', to: 'controller', text: 'POST /api/tictactoe/games/{id}/move {row: 1, col: 1, symbol: "X"}' },
        { from: 'controller', to: 'service', text: 'makeMove(gameId, 1, 1, "X")', activate: 'service' },
        { from: 'playerB', to: 'controller', text: 'POST /api/tictactoe/games/{id}/move {row: 1, col: 1, symbol: "O"}' },
        { from: 'controller', to: 'service', text: 'makeMove(gameId, 1, 1, "O")' },
        { from: 'service', to: 'lock', text: '[Alice] lock.lock() — ACQUIRED', activate: 'lock' },
        { from: 'service', to: 'lock', text: '[Bob] lock.lock() — BLOCKS (waiting for Alice)' },
        { from: 'service', to: 'game', text: '[Alice] getGame(gameId) → status=IN_PROGRESS, currentTurn=X' },
        { from: 'service', to: 'game', text: '[Alice] board.isCellEmpty(1, 1) → true' },
        { from: 'service', to: 'game', text: '[Alice] board.placeSymbol(1, 1, "X") ; recordMove()' },
        { from: 'service', to: 'game', text: '[Alice] board.checkWinner(1, 1) → no winner yet' },
        { from: 'service', to: 'game', text: '[Alice] game.setTurn(O)' },
        { from: 'service', to: 'lock', text: '[Alice] lock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'controller', text: '[Alice] return GameResponse {status: IN_PROGRESS, turn: O}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'playerA', text: '200 OK — Move placed at (1, 1)', type: 'return' },
        { type: 'note', over: ['lock'], text: 'Lock freed. Bob\'s thread unblocks and acquires the lock.' },
        { from: 'service', to: 'lock', text: '[Bob] lock.lock() — ACQUIRED', activate: 'lock' },
        { from: 'service', to: 'game', text: '[Bob] getGame(gameId) → status=IN_PROGRESS, currentTurn=O' },
        { from: 'service', to: 'game', text: '[Bob] board.isCellEmpty(1, 1) → false (occupied by X)',
          detail: 'Bob re-reads cell state inside the lock — seeing the post-Alice board.' },
        { from: 'service', to: 'service', text: '[Bob] throw CellOccupiedException("Cell (1,1) is already occupied")' },
        { from: 'service', to: 'lock', text: '[Bob] lock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'controller', text: '[Bob] propagate CellOccupiedException', type: 'return' },
        { from: 'controller', to: 'playerB', text: '422 Unprocessable — Cell occupied', type: 'return' },
      ],
    },
  ],
};
