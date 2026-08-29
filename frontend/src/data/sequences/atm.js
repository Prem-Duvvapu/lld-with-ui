// Sequence diagram content for atm.
// Grounded directly in AtmService#withdraw and
// AtmConcurrencyTest#tenConcurrentWithdrawalsOnSameAccount_exactlyOneSucceedsNoOverdraw: two
// customers racing a withdrawal against the SAME account, where only one has enough balance left
// once the first debit lands. A class diagram shows Account owns a lock; it does not show why that
// lock has to be re-checked from inside, not just acquired.
export default {
  title: 'ATM — Two Concurrent Withdrawals on One Account (Per-Account Lock, Re-Checked Inside)',
  description:
    'Account holds a fair ReentrantLock (accountLock), but simply acquiring it before withdrawing is not enough on its own — the balance has to be re-read AFTER the lock is held, not before, or two threads that both read a sufficient balance while unlocked could both proceed to debit. This sequence follows two threads calling withdraw() on the same account with a balance that can satisfy only one of the two requested amounts, showing exactly where the second thread blocks and what it sees once it finally acquires the lock.',
  flows: [
    {
      id: 'concurrent-withdrawal-same-account',
      label: 'Thread A and Thread B both withdraw from the same account — only one succeeds',
      description:
        'Account "AC-1001" has balance ₹3000. Thread A requests ₹2000, Thread B requests ₹2000, started together via a CountDownLatch (see AtmConcurrencyTest). Whichever thread wins the race to acquire accountLock debits the balance to ₹1000 and proceeds to the cash dispenser; the loser blocks on the lock, then re-reads the now-updated balance once it gets in and is correctly rejected with InsufficientBalanceException — never allowed to overdraw using a balance value it read before the first debit.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(withdraw ₹2000)', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\n(withdraw ₹2000)', kind: 'actor' },
        { id: 'service', name: 'AtmService', kind: 'component', stereotype: 'facade' },
        { id: 'account', name: 'Account\n("AC-1001")', kind: 'component' },
        { id: 'lock', name: 'accountLock\n(ReentrantLock, fair)', kind: 'component', stereotype: 'lock' },
        { id: 'dispenser', name: 'CashDispenser', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['account'], text: 'balance = ₹3000 — enough for ONE ₹2000 withdrawal, not both.' },
        { from: 'threadA', to: 'service', text: 'withdraw("AC-1001", 2000)' },
        { from: 'threadB', to: 'service', text: 'withdraw("AC-1001", 2000)  — arrives ~simultaneously' },
        { from: 'service', to: 'lock', text: '[Thread A] acc.getLock().lock()  — acquired', activate: 'lock' },
        { from: 'service', to: 'lock', text: '[Thread B] acc.getLock().lock()  — BLOCKS, A holds it' },
        { from: 'service', to: 'account', text: '[A] re-read balance INSIDE the lock -> ₹3000' },
        { from: 'service', to: 'account', text: '[A] balance >= 2000 ? yes -> setBalance(1000)' },
        { from: 'service', to: 'dispenser', text: '[A] dispenseCash(2000, MINIMIZE_NOTES)' },
        { from: 'dispenser', to: 'service', text: 'return note breakdown', type: 'return' },
        { from: 'service', to: 'lock', text: '[A] acc.getLock().unlock()', deactivate: 'lock' },
        { from: 'service', to: 'threadA', text: 'return WithdrawalTransaction(SUCCESS)', type: 'return' },
        { from: 'lock', to: 'service', text: '[Thread B] lock() finally returns — B is now inside', activate: 'lock' },
        { type: 'note', over: ['account'], text: 'This is the step a lock alone does not guarantee: B must re-read balance NOW, not use whatever it saw before blocking.' },
        { from: 'service', to: 'account', text: '[B] re-read balance INSIDE the lock -> ₹1000  (A\'s debit already landed)' },
        { from: 'service', to: 'account', text: '[B] balance >= 2000 ? NO' },
        { from: 'service', to: 'lock', text: '[B] acc.getLock().unlock()', deactivate: 'lock' },
        { from: 'service', to: 'threadB', text: 'throw InsufficientBalanceException(409)', type: 'return' },
        { type: 'note', over: ['threadA', 'threadB'], text: 'Exactly one success, one clean rejection, balance ends at ₹1000 — never ₹-1000 (overdrawn) or ₹3000 (lost update). See AtmConcurrencyTest#tenConcurrentWithdrawalsOnSameAccount_exactlyOneSucceedsNoOverdraw, run at 10 threads.' },
      ],
    },
  ],
};
