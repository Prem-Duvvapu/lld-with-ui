// Sequence diagram content for stock-brokerage.
// Grounded directly in StockBrokerService#placeOrder, LimitExecutionStrategy#execute and
// StockBrokerConcurrencyTest#concurrentMatchingNeverDoubleFillsSameRestingOrder: two buyers
// racing to match the SAME resting sell order under the per-symbol ReentrantLock. A class diagram
// shows OrderBook holds a FIFO queue of orders; it does not show why the second thread has to
// re-read that queue's remaining quantity AFTER acquiring the lock, not before.
export default {
  title: 'Stock Brokerage — Two Buyers Racing One Resting Sell Order (Per-Symbol Lock)',
  description:
    'symbolLocks.get("TCS") is a fair ReentrantLock, one per symbol, acquired inside StockBrokerService#placeOrder before LimitExecutionStrategy is ever invoked. Two buyers place LIMIT orders concurrently against Bob\'s single 10-share resting SELL — total demand (16) exceeds the resting supply (10), so whichever thread wins the lock consumes shares first and the second thread MUST re-read the order\'s remaining quantity from inside the lock, not from a snapshot taken before it blocked, or the same shares could be matched twice.',
  flows: [
    {
      id: 'concurrent-matching-same-resting-order',
      label: 'Thread A and Thread B both BUY against Bob\'s one resting SELL — shares split exactly once each',
      description:
        'Bob rests a SELL LIMIT for 10 TCS @ ₹3800 (order S-1). Carol (Thread A) and Dave (Thread B) each place a BUY LIMIT for 8 TCS @ ₹3800, started together via a CountDownLatch (see StockBrokerConcurrencyTest). Each buyer first reserves funds on their OWN Account lock — independent, no contention there — then both threads race for symbolLocks.get("TCS"). Whichever wins matches first and takes 8 of Bob\'s 10 shares; the loser blocks, then re-reads the book once it gets in and correctly finds only 2 shares left, resting the other 6 as a new bid instead of also taking 8.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(Carol: BUY 8 @ ₹3800)', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\n(Dave: BUY 8 @ ₹3800)', kind: 'actor' },
        { id: 'service', name: 'StockBroker\nService', kind: 'component', stereotype: 'facade' },
        { id: 'symLock', name: 'symbolLocks\n.get("TCS")', kind: 'component', stereotype: 'lock' },
        { id: 'strategy', name: 'LimitExecution\nStrategy', kind: 'component' },
        { id: 'book', name: 'OrderBook\n("TCS")', kind: 'store' },
        { id: 'bob', name: 'Account\n(Bob, seller)', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['book'], text: 'Bob rests SELL S-1: 10 TCS @ ₹3800. asks[3800] = [S-1 remaining 10].' },
        { from: 'threadA', to: 'service', text: 'placeOrder("ACC-carol", "TCS", BUY, LIMIT, 3800, 8)' },
        { from: 'threadB', to: 'service', text: 'placeOrder("ACC-dave", "TCS", BUY, LIMIT, 3800, 8)  — arrives ~simultaneously' },
        { type: 'note', over: ['service'], text: '[A] and [B] each reserveFunds() on their OWN account lock first (Carol\'s / Dave\'s) — independent, no contention between the two buyers themselves.' },
        { from: 'service', to: 'symLock', text: '[A] lock.lock() — ACQUIRED', activate: 'symLock' },
        { from: 'service', to: 'symLock', text: '[B] lock.lock() — BLOCKS, A holds it' },
        { from: 'service', to: 'strategy', text: '[A] limitStrategy.execute(orderA, book, accounts, stock)', activate: 'strategy' },
        { from: 'strategy', to: 'book', text: '[A] asks.firstEntry() -> ₹3800, queue = [S-1 remaining 10]' },
        { from: 'strategy', to: 'strategy', text: '[A] matchQty = min(8, 10) = 8' },
        { from: 'strategy', to: 'bob', text: '[A] settleTrade: bob.settleSell(₹30,400) ; bob.portfolio.executeSell("TCS", 8)' },
        { from: 'strategy', to: 'book', text: '[A] S-1.fill(8) -> remaining 2 (PARTIALLY_FILLED, stays at the head of the queue)' },
        { from: 'strategy', to: 'service', text: 'return [Trade T-1: 8 @ ₹3800]', type: 'return', deactivate: 'strategy' },
        { from: 'service', to: 'symLock', text: '[A] lock.unlock()', deactivate: 'symLock' },
        { from: 'service', to: 'threadA', text: 'return OrderA {status: EXECUTED, filled: 8}', type: 'return' },
        { from: 'symLock', to: 'service', text: '[B] lock() finally returns — B is now inside', activate: 'symLock' },
        { type: 'note', over: ['book'], text: 'This is what the lock guarantees but a stale read would not: B must re-read the book NOW — S-1 shows remaining 2, not the 10 B may have seen before blocking.' },
        { from: 'service', to: 'strategy', text: '[B] limitStrategy.execute(orderB, book, accounts, stock)', activate: 'strategy' },
        { from: 'strategy', to: 'book', text: '[B] asks.firstEntry() -> ₹3800, queue = [S-1 remaining 2]' },
        { from: 'strategy', to: 'strategy', text: '[B] matchQty = min(8, 2) = 2' },
        { from: 'strategy', to: 'bob', text: '[B] settleTrade: bob.settleSell(₹7,600) ; bob.portfolio.executeSell("TCS", 2)' },
        { from: 'strategy', to: 'book', text: '[B] S-1.fill(2) -> remaining 0 -> EXECUTED, queue.poll() removes S-1' },
        { from: 'strategy', to: 'book', text: '[B] orderB.getRemainingQuantity() = 6 > 0 -> book.addRestingOrder(orderB) as a new bid @ ₹3800' },
        { from: 'strategy', to: 'service', text: 'return [Trade T-2: 2 @ ₹3800]', type: 'return', deactivate: 'strategy' },
        { from: 'service', to: 'symLock', text: '[B] lock.unlock()', deactivate: 'symLock' },
        { from: 'service', to: 'threadB', text: 'return OrderB {status: PARTIALLY_FILLED, filled: 2, remaining: 6}', type: 'return' },
        { type: 'note', over: ['threadA', 'threadB'], text: 'Bob\'s 10 shares split 8 + 2 — exactly once each, never double-counted, and B\'s unmatched 6 rests instead of vanishing. See StockBrokerConcurrencyTest#concurrentMatchingNeverDoubleFillsSameRestingOrder.' },
      ],
    },
  ],
};
