// Sequence diagram content for ludo.
// Grounded directly in LudoService#doMove and LudoConcurrencyTest#concurrentMoveSameToken_exactlyOneSucceeds:
// several actors race to spend the SAME pending roll on the SAME token at once, and the per-game
// lock plus the token's own state machine are what stop more than one of them from succeeding.
export default {
  title: 'Ludo — Racing to Spend One Pending Roll (Per-Game Lock + State Machine)',
  description:
    'A class diagram shows that Token#transitionTo enforces the HOME -> ACTIVE transition table — it does not show what happens when several requests try to spend the exact same roll on the exact same token at once. This sequence follows two concurrent moveToken calls for the same HOME token racing a shared, already-rolled 6, resolved by one ReentrantLock per game (LudoService#doMove) and the fact that a second call reads dice == 0 once the first has already spent it.',
  flows: [
    {
      id: 'concurrent-move-same-token',
      label: 'Two actors race to move the same HOME token out on the same rolled 6',
      description:
        'Player 0 has just rolled a 6 (diceValue = 6, one HOME token free to leave). Two near-simultaneous requests both call moveToken(gameId, 0, 0) on separate threads — e.g. a double-tap on the UI, or a retried request after a slow response. Only one may legally spend that roll; the state machine and the per-game lock together guarantee the other is rejected, not double-applied. See LudoConcurrencyTest#concurrentMoveSameToken_exactlyOneSucceeds.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(tap #1)', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\n(tap #2)', kind: 'actor' },
        { id: 'service', name: 'LudoService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'gameLocks\n(per-game ReentrantLock)', kind: 'store' },
        { id: 'token', name: 'Token #0\n(player 0)', kind: 'component' },
        { id: 'repo', name: 'LudoRepository', kind: 'store' },
      ],
      steps: [
        { type: 'note', over: ['token'], text: 'Token #0 starts this scene HOME. Game.diceValue = 6 (already rolled, unspent).' },
        { from: 'threadA', to: 'service', text: 'moveToken(gameId, 0, 0)' },
        { from: 'service', to: 'lock', text: 'gameLocks.computeIfAbsent(gameId).lock()  — ACQUIRED', activate: 'lock' },
        { from: 'threadB', to: 'service', text: 'moveToken(gameId, 0, 0)  — arrives concurrently' },
        { from: 'service', to: 'lock', text: 'gameLocks.computeIfAbsent(gameId).lock()  — BLOCKS (thread A holds it)',
          detail: 'Both threads resolve the SAME ReentrantLock instance from the same gameId key — thread B blocks here for the entire duration of thread A\'s critical section.' },
        { from: 'service', to: 'repo', text: '[thread A] requireGame(gameId) -> Game { diceValue: 6, currentPlayerIndex: 0 }' },
        { from: 'service', to: 'token', text: '[thread A] token.getStatus() == HOME -> moveOutOfHome(...)' },
        { from: 'service', to: 'token', text: '[thread A] isBlockedByOwnToken(startSquare)? no -> token.transitionTo(ACTIVE)' },
        { from: 'token', to: 'token', text: 'HomeState.canTransitionTo(ACTIVE) == true -> status = ACTIVE, position = startSquare',
          detail: 'Enforced once, inside Token#transitionTo — this is the single point that would throw InvalidMoveException if the token were not legally allowed to make this jump.' },
        { from: 'service', to: 'repo', text: '[thread A] game.setDiceValue(0) ; repo.save(game)' },
        { from: 'service', to: 'lock', text: '[thread A] unlock()', deactivate: 'lock' },
        { from: 'service', to: 'threadA', text: 'return Game { token#0: ACTIVE @ startSquare, diceValue: 0 }', type: 'return' },
        { type: 'note', over: ['lock'], text: 'Lock just freed — thread B, still waiting, acquires it now.' },
        { from: 'service', to: 'lock', text: '[thread B] lock()  — ACQUIRED (was blocked, now unblocks)', activate: 'lock' },
        { from: 'service', to: 'repo', text: '[thread B] requireGame(gameId) -> Game { diceValue: 0, currentPlayerIndex: 0 }',
          detail: 'Thread B is reading the POST-thread-A state — the lock guarantees this read cannot interleave with thread A\'s write.' },
        { from: 'service', to: 'service', text: '[thread B] dice = game.getDiceValue() == 0 -> throw InvalidMoveException("Roll the dice before moving a token")' },
        { from: 'service', to: 'lock', text: '[thread B] unlock()', deactivate: 'lock' },
        { from: 'service', to: 'threadB', text: '400 InvalidMoveException — the roll was already spent', type: 'return' },
        { type: 'note', over: ['service'], text: 'Exactly one thread ever observes diceValue == 6 and legally spends it. If the roll were read outside the lock (or the lock were per-module instead of per-game), both threads could observe diceValue == 6 simultaneously and both call transitionTo(ACTIVE) — harmless for THIS token since a second HOME->ACTIVE would be idempotent in effect, but the same race on a captured-token or exact-finish path would double-apply a state change the game never authorized.' },
      ],
    },
  ],
};
