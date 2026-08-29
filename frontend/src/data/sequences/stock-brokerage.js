// Sequence diagram content for stock-brokerage (Zerodha / Stock Broker).
// Grounded directly in StockBrokerService, OrderExecutionEngine, and Matching Engine (BUY/SELL order matching).
export default {
  title: 'Stock Brokerage — Limit Order Placement & Matching Engine Execution',
  description:
    'How StockBrokerService processes limit orders. When a BUY order is placed, the order matching engine checks the order book for matching SELL limits, executes trade fills atomically under symbol locks, and updates user portfolio holdings and fund balances.',
  flows: [
    {
      id: 'order-matching-flow',
      label: 'Limit BUY order matches existing SELL in Order Book → Trade executed',
      description:
        'Alice places a limit BUY order for 10 shares of RELIANCE at ₹2500. The matching engine finds an existing SELL order from Bob at ₹2500, executes the trade, transfers ₹25,000 from Alice\'s funds to Bob, and updates share allocations.',
      participants: [
        { id: 'trader', name: 'Buyer\n(Alice)', kind: 'actor' },
        { id: 'controller', name: 'StockBroker\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'StockBroker\nService', kind: 'component', stereotype: 'facade' },
        { id: 'symLock', name: 'symbolLock\n("RELIANCE")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'matchingEngine', name: 'OrderMatching\nEngine', kind: 'component' },
        { id: 'orderBook', name: 'OrderBook\n("RELIANCE")', kind: 'store' },
        { id: 'portfolio', name: 'Portfolio &\nLedger', kind: 'store' },
      ],
      steps: [
        { from: 'trader', to: 'controller', text: 'POST /api/stock-broker/orders {userId: "alice", symbol: "RELIANCE", type: "BUY", qty: 10, price: 2500.0}' },
        { from: 'controller', to: 'service', text: 'placeOrder("alice", "RELIANCE", BUY, 10, 2500.0)', activate: 'service' },
        { from: 'service', to: 'portfolio', text: 'checkAndBlockFunds("alice", ₹25,000.0) ✓' },
        { from: 'service', to: 'symLock', text: 'lock.lock() — ACQUIRED', activate: 'symLock' },
        { from: 'service', to: 'matchingEngine', text: 'matchOrder(Order {BUY, 10 @ 2500})', activate: 'matchingEngine' },
        { from: 'matchingEngine', to: 'orderBook', text: 'getSellOrders() → found Order#S-12 {Bob, 10 @ ₹2500}' },
        { from: 'matchingEngine', to: 'matchingEngine', text: 'prices match (2500 == 2500) → create Trade {qty: 10, price: 2500}' },
        { from: 'matchingEngine', to: 'orderBook', text: 'removeMatchedOrder("S-12")' },
        { from: 'matchingEngine', to: 'portfolio', text: 'creditShares("alice", "RELIANCE", 10) ; creditFunds("bob", ₹25,000)' },
        { from: 'matchingEngine', to: 'service', text: 'TradeResult {EXECUTED, tradeId: "TRD-889"}', type: 'return', deactivate: 'matchingEngine' },
        { from: 'service', to: 'symLock', text: 'lock.unlock()', deactivate: 'symLock' },
        { from: 'service', to: 'controller', text: 'return OrderResponse {status: FILLED, tradeId: "TRD-889"}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'trader', text: '200 OK — Order matched & filled (10 RELIANCE @ ₹2500)', type: 'return' },
      ],
    },
  ],
};
