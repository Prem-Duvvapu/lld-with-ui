// Sequence diagram content for minesweeper.
// Grounded directly in MinesweeperService, first-click mine placement guarantee,
// and recursive BFS/DFS flood-fill cell reveal.
export default {
  title: 'Minesweeper — First-Click Safety Guarantee & Flood-Fill Reveal',
  description:
    'How MinesweeperService ensures a fair game start and processes cascade reveals. The first click is guaranteed never to hit a mine by lazily generating or relocating mines, followed by recursive BFS/DFS flood-fill to reveal contiguous zero-mine regions.',
  flows: [
    {
      id: 'first-click-flood-fill',
      label: 'First click generates minefield & cascades empty region reveal',
      description:
        'Player clicks cell (3, 3) on a new Beginner 9x9 board. MinesweeperService ensures (3, 3) is safe, places 10 mines across other cells, calculates adjacent mine numbers, and cascades a BFS flood-fill opening up a 12-cell clearing.',
      participants: [
        { id: 'player', name: 'Player', kind: 'actor' },
        { id: 'controller', name: 'Minesweeper\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'Minesweeper\nService', kind: 'component', stereotype: 'facade' },
        { id: 'generator', name: 'BoardGenerator', kind: 'component' },
        { id: 'board', name: 'Board & Cells\n(9x9 Grid)', kind: 'store' },
      ],
      steps: [
        { from: 'player', to: 'controller', text: 'POST /api/minesweeper/games/{id}/reveal {row: 3, col: 3}' },
        { from: 'controller', to: 'service', text: 'revealCell(gameId, 3, 3)', activate: 'service' },
        { from: 'service', to: 'board', text: 'getGame(gameId) → Game {status: NOT_STARTED, isFirstClick: true}' },
        { from: 'service', to: 'generator', text: 'generateMinesExcluding(safeRow=3, safeCol=3, mineCount=10)', activate: 'generator' },
        { from: 'generator', to: 'generator', text: 'populate 10 random mines avoiding (3, 3) & compute neighbor counts' },
        { from: 'generator', to: 'service', text: 'Minefield populated ✓', type: 'return', deactivate: 'generator' },
        { from: 'service', to: 'service', text: 'bfsFloodFill(3, 3) — cell has adjacentMines = 0',
          detail: 'Since cell has 0 adjacent mines, recursively expands to all 8 neighboring cells until border numbers are reached.' },
        { from: 'service', to: 'board', text: 'markRevealed(12 contiguous cells) ; checkWinCondition()' },
        { from: 'board', to: 'service', text: 'unrevealedSafeCellsLeft = 60 > 0 (game continues)', type: 'return' },
        { from: 'service', to: 'controller', text: 'return GameResponse {status: IN_PROGRESS, revealedCount: 12}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'player', text: '200 OK — 12 cells cleared with opening boundary numbers', type: 'return' },
      ],
    },
  ],
};
