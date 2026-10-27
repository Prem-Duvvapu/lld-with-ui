// Two representative callers from the ten-thread live-service race in
// backend/src/test/java/com/lld/atm/service/AtmConcurrencyTest.java.
// Source method: tenConcurrentWithdrawalsOnSameAccount_exactlyOneSucceedsNoOverdraw.
// The sandbox serializes mutation methods on the service monitor instead.
export default {
  title: 'ATM — Live Withdrawals Re-Check Session and Balance Under the Account Lock',
  description:
    'One terminal is already authenticated for RACE-1. Two representative callers request ₹600 from its ₹600 balance. Account locking serializes their checks and money movement; CashDispenser separately locks note selection and deduction. This example assumes sufficient notes and no concurrent ejection or card change. The separate exact-plan regressions cover ₹600 from three ₹200 notes when an available ₹500 would strand a naive largest-first attempt; that is not the inventory fixture of this race. It does not establish atomic session/account coordination: the live sessionLock is not held here, and setState writes transaction phases without the SessionStates gate.',
  flows: [
    {
      id: 'concurrent-withdrawal-same-account',
      label: 'Same account: one success, then insufficient balance',
      description:
        'The same-account withdrawal test in AtmConcurrencyTest starts ten callers with CountDownLatch: balance ₹600, each request ₹600, one expected success and nine InsufficientBalanceException failures (HTTP 400). This drawing shows A winning and B following; either caller can win. It follows live withdraw, not /sim/withdraw. A dispenser InsufficientCashException would take a different branch that credits the debit back and records failure; unexpected exceptions are not generally compensated.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(withdraw ₹600)', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\n(withdraw ₹600)', kind: 'actor' },
        { id: 'service', name: 'AtmService', kind: 'component', stereotype: 'facade' },
        { id: 'account', name: 'Account\n("RACE-1")', kind: 'component' },
        { id: 'lock', name: 'accountLock\n(ReentrantLock, fair)', kind: 'lock' },
        { id: 'dispenser', name: 'CashDispenser', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['service', 'account'], text: 'Authenticated for RACE-1; balance ₹600; no session changes during this flow.' },
        { from: 'threadA', to: 'service', text: 'withdraw("RACE-1", 600)' },
        { from: 'threadB', to: 'service', text: 'withdraw("RACE-1", 600)' },
        { from: 'service', to: 'service', text: 'Validate amount/mode and look up account', detail: 'Each call validates a finite positive multiple of ₹100 within int range and a non-null mode before conversion, then looks up the account. The two-argument overload selects MINIMIZE_NOTES. No balance is read for admission before accountLock.' },
        { from: 'service', to: 'lock', text: '[A] acc.getLock().lock() — acquired', activate: 'lock' },
        { from: 'service', to: 'lock', text: '[B] acc.getLock().lock() — waits for A' },
        { from: 'service', to: 'service', text: '[A] requireAuthenticatedSessionFor("RACE-1")', detail: 'Checks phase AUTHENTICATED or TRANSACTION_IN_PROGRESS and activeAccount number while holding the account lock. This does not acquire sessionLock; insertion/authentication/ejection use a different lock.' },
        { from: 'service', to: 'service', text: '[A] setState(TRANSACTION_IN_PROGRESS)', detail: 'Direct volatile phase assignment, not transitionTo and not a SessionStates.allowedNext check.' },
        { from: 'service', to: 'account', text: '[A] read balance ₹600; sufficient for ₹600' },
        { from: 'service', to: 'account', text: '[A] setBalance(0) — debit under accountLock' },
        { from: 'service', to: 'service', text: '[A] setState(DISPENSING)' },
        { from: 'service', to: 'dispenser', text: '[A] dispenseCash(600, MINIMIZE_NOTES)', activate: 'dispenser' },
        { from: 'dispenser', to: 'dispenser', text: 'Lock cassette; check long total; exact plan; deduct', detail: 'CashDispenser acquires dispenserLock while A still holds accountLock. It checks the long-valued total, selects the registered strategy and uses ExactDenominationPlanner before any deduction: at most 800 residue vectors with four policy-ordered bundle-allocation steps each. MINIMIZE_NOTES minimizes count with a larger-note tie break; CONSERVE_LARGE_NOTES minimizes ₹2000, then ₹500, then ₹200 usage. For valid inputs, no plan means InsufficientCashException, triggering the live compensation branch. This is account → dispenser lock ordering, not a terminal-wide session lock.' },
        { from: 'dispenser', to: 'service', text: 'Unlock cassette; return note breakdown', type: 'return', deactivate: 'dispenser' },
        { from: 'service', to: 'service', text: '[A] record SUCCESS; setState(AUTHENTICATED)' },
        { from: 'service', to: 'lock', text: '[A] unlock account in finally', deactivate: 'lock' },
        { from: 'service', to: 'threadA', text: 'Return WithdrawalTransaction(SUCCESS)', type: 'return' },
        { from: 'lock', to: 'service', text: '[B] lock() returns — B now owns accountLock', activate: 'lock' },
        { from: 'service', to: 'service', text: '[B] check session; setState(TRANSACTION_IN_PROGRESS)', detail: 'B repeats its own admission check after A restores AUTHENTICATED and releases the same account lock. No other session changes are assumed in this example.' },
        { from: 'service', to: 'account', text: '[B] re-read balance ₹0 — insufficient' },
        { from: 'service', to: 'service', text: '[B] record FAILED; setState(AUTHENTICATED)' },
        { from: 'service', to: 'lock', text: '[B] unlock account in finally', deactivate: 'lock' },
        { from: 'service', to: 'threadB', text: 'Throw InsufficientBalanceException (HTTP 400)', type: 'return' },
        { type: 'note', over: ['threadA', 'threadB', 'service'], text: 'Shown outcome: one debit, one balance rejection. Sandbox mutation calls are serialized separately.', detail: 'The ten-thread test asserts one success, nine balance failures and a final ₹0 balance. It does not test concurrent ejection or establish an atomic snapshot. /sim/* uses synchronized mutation methods, direct simState writes and event-based workflow failures; it is not this live race or the same state-table enforcement.' },
      ],
    },
  ],
};
