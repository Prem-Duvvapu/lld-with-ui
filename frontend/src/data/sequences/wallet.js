// Sequence diagram content for digital wallet.
// Grounded directly in TransferCommand and WalletConcurrencyTest#concurrentTransfersConserveTotal:
// two opposite-direction transfers race the same pair of wallets, and the ascending-wallet-id
// lock order is what stops them from deadlocking.
export default {
  title: 'Digital Wallet — Concurrent Transfer (Deadlock-Free Locking)',
  description:
    'A class diagram shows that TransferCommand holds a lock per wallet — it does not show the order those locks are taken in, which is the entire reason two opposite-direction transfers racing the same wallet pair do not deadlock. This sequence follows wallet 1 -> wallet 2 and wallet 2 -> wallet 1 arriving on separate threads at the same instant, both resolved by the same lockFor() map on WalletService.',
  flows: [
    {
      id: 'concurrent-opposite-transfers',
      label: 'Two opposite-direction transfers race the same wallet pair',
      description:
        'Alice (wallet 1, ₹5000) and Bob (wallet 2, ₹3000) each send the other money at the same moment — Alice pays Bob ₹300, Bob pays Alice ₹100, on separate request threads. Both TransferCommand instances ask the same WalletService::lockFor for locks on wallets 1 and 2. The only reason this cannot deadlock is that both commands compute min(1,2)=1 and max(1,2)=2 independently and lock 1 before 2, no matter which one is "from" — see WalletConcurrencyTest#bidirectionalTransfersNeverDeadlockAndConserveTotal.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(Alice -> Bob)', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\n(Bob -> Alice)', kind: 'actor' },
        { id: 'service', name: 'WalletService', kind: 'component', stereotype: 'facade' },
        { id: 'cmdA', name: 'TransferCommand\n(1 -> 2, ₹300)', kind: 'component', stereotype: 'command' },
        { id: 'cmdB', name: 'TransferCommand\n(2 -> 1, ₹100)', kind: 'component', stereotype: 'command' },
        { id: 'repo', name: 'WalletRepository', kind: 'store' },
      ],
      steps: [
        { from: 'threadA', to: 'service', text: 'sendMoney(from=1, to=2, amount=300)',
          detail: 'WalletService#sendMoney builds one TransferCommand per call, passing this::lockFor as the lock provider — the command decides lock order itself, WalletService never reasons about ordering.' },
        { from: 'service', to: 'cmdA', text: 'new TransferCommand(repo, lockFor, 1, 2, 300).execute()', activate: 'cmdA' },
        { from: 'threadB', to: 'service', text: 'sendMoney(from=2, to=1, amount=100)  — arrives concurrently' },
        { from: 'service', to: 'cmdB', text: 'new TransferCommand(repo, lockFor, 2, 1, 100).execute()', activate: 'cmdB' },
        { from: 'cmdA', to: 'cmdA', text: 'firstId = min(1,2) = 1;  secondId = max(1,2) = 2',
          detail: 'Computed from the wallet ids alone, not from which one is "from" — this is what makes the order the same for both threads regardless of transfer direction.' },
        { from: 'cmdB', to: 'cmdB', text: 'firstId = min(2,1) = 1;  secondId = max(2,1) = 2',
          detail: 'Bob->Alice computes the identical firstId/secondId as Alice->Bob. Both commands now agree: lock 1 first, lock 2 second.' },
        { type: 'note', over: ['cmdA', 'cmdB'], text: 'Suppose Thread A wins the race for lock(1) by a few nanoseconds.' },
        { from: 'cmdA', to: 'repo', text: 'lockFor(1).lock()  — ACQUIRED' },
        { from: 'cmdB', to: 'repo', text: 'lockFor(1).lock()  — BLOCKS (thread A holds it)',
          detail: 'Thread B blocks here, waiting only on lock 1. It has not yet attempted lock 2, so it cannot be holding a lock that thread A needs — this is precisely what prevents the classic "each holds one, waits on the other" deadlock cycle.' },
        { from: 'cmdA', to: 'repo', text: 'lockFor(2).lock()  — ACQUIRED (uncontended)' },
        { from: 'cmdA', to: 'repo', text: 'from=wallet(1) balance 5000 >= 300 ✓ ; debit 1, credit 2' },
        { from: 'repo', to: 'cmdA', text: 'wallet1.balance=4700, wallet2.balance=3300', type: 'return' },
        { from: 'cmdA', to: 'repo', text: 'addTransaction(TRANSFER #1->2, ₹300)' },
        { from: 'cmdA', to: 'repo', text: 'lockFor(2).unlock() ; lockFor(1).unlock()',
          detail: 'Unlocked in reverse acquisition order (2 then 1) — not required for correctness here, but keeps the discipline symmetric with acquisition.' },
        { from: 'cmdA', to: 'service', text: 'return Transaction#1', type: 'return', deactivate: 'cmdA' },
        { from: 'service', to: 'threadA', text: '{fromBalance:4700, toBalance:3300}', type: 'return' },
        { type: 'note', over: ['cmdB'], text: 'Lock 1 just freed — thread B, still waiting, acquires it now.' },
        { from: 'cmdB', to: 'repo', text: 'lockFor(1).lock()  — ACQUIRED (was blocked, now unblocks)' },
        { from: 'cmdB', to: 'repo', text: 'lockFor(2).lock()  — ACQUIRED' },
        { from: 'cmdB', to: 'repo', text: 'from=wallet(2) balance 3300 >= 100 ✓ ; debit 2, credit 1' },
        { from: 'repo', to: 'cmdB', text: 'wallet2.balance=3200, wallet1.balance=4800', type: 'return' },
        { from: 'cmdB', to: 'repo', text: 'addTransaction(TRANSFER #2->1, ₹100)' },
        { from: 'cmdB', to: 'repo', text: 'lockFor(2).unlock() ; lockFor(1).unlock()' },
        { from: 'cmdB', to: 'service', text: 'return Transaction#2', type: 'return', deactivate: 'cmdB' },
        { from: 'service', to: 'threadB', text: '{fromBalance:3200, toBalance:4800}', type: 'return' },
        { type: 'note', over: ['service'], text: 'Combined total before: 5000+3000=8000. After: 4800+3200=8000 — conserved exactly, and neither thread ever waited on a lock the other was about to request, so no deadlock was possible regardless of scheduling.' },
      ],
    },
  ],
};
