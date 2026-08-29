// Sequence diagram content for snakeladders.
// Grounded directly in SnakeLaddersService, Dice rolling, Snake/Ladder board jumps,
// and exact-100 win condition.
export default {
  title: 'Snake & Ladders — Turn Cycle, Jump Encounters & Exact-100 Win Rule',
  description:
    'How SnakeLaddersService coordinates multiplayer turns, deterministic/random dice rolls, board jump resolution (snakes and ladders), and the exact-100 bounce/no-move win rule.',
  flows: [
    {
      id: 'snake-and-ladder-turn',
      label: 'Dice roll → Ladder climb → Exact win rule check',
      description:
        'Player 1 (Alice) rolls a 4 from position 24, lands on square 28 where a Ladder climbs to square 84. Next turn, from square 97, rolling a 5 exceeds 100 and holds position per the exact-100 rule.',
      participants: [
        { id: 'player', name: 'Player 1\n(Alice)', kind: 'actor' },
        { id: 'controller', name: 'SnakeLadders\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'SnakeLadders\nService', kind: 'component', stereotype: 'facade' },
        { id: 'dice', name: 'Dice\n(1–6)', kind: 'component' },
        { id: 'board', name: 'Board & Jumps\n(100 Squares)', kind: 'store' },
      ],
      steps: [
        { from: 'player', to: 'controller', text: 'POST /api/snakeladders/games/{id}/roll' },
        { from: 'controller', to: 'service', text: 'rollAndMove(gameId)', activate: 'service' },
        { from: 'service', to: 'dice', text: 'roll()', activate: 'dice' },
        { from: 'dice', to: 'service', text: 'return diceValue = 4', type: 'return', deactivate: 'dice' },
        { from: 'service', to: 'board', text: 'getPlayerPosition("Alice") → pos = 24' },
        { from: 'service', to: 'service', text: 'intermediatePos = 24 + 4 = 28' },
        { from: 'service', to: 'board', text: 'getJumpAt(28)' },
        { from: 'board', to: 'service', text: 'Ladder {start: 28, end: 84} (CLIMB)', type: 'return' },
        { from: 'service', to: 'board', text: 'updatePlayerPosition("Alice", 84)' },
        { from: 'service', to: 'service', text: 'checkWin(84 == 100) → false ; advanceTurnTo(Bob)' },
        { from: 'service', to: 'controller', text: 'return MoveResult {player: "Alice", roll: 4, from: 24, to: 84, jump: "LADDER", winner: null}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'player', text: '200 OK — Climbed ladder from 28 to 84! Bob\'s turn.', type: 'return' },
      ],
    },
  ],
};
