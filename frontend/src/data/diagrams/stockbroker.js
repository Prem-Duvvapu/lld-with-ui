// classDiagrams — stockbroker
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
// Grounded directly in backend/src/main/java/com/lld/stockbroker/** — every class/field/method
// below exists in the real code.

export default {
  title: 'Stock Brokerage Platform — Class Diagram',
  classes: [
    {
      name: 'StockBrokerService',
      stereotype: 'facade',
      fields: [
        '- stocks: Map<String, Stock>',
        '- accounts: Map<String, Account>',
        '- orderBooks: Map<String, OrderBook>',
        '- ordersById: Map<String, Order>',
        '- symbolLocks: Map<String, ReentrantLock>',
        '- strategyFactory: OrderExecutionStrategyFactory',
      ],
      methods: [
        '+ registerStock(symbol, name, initialPrice): Stock',
        '+ createAccount(userId, name, email, initialDeposit): Account',
        '+ placeOrder(accountId, symbol, side, type, price, quantity): Order',
        '+ cancelOrder(orderId): Order',
        '+ simReset() / simPlaceOrder(...) / simCancelOrder(orderId)',
      ],
    },
    {
      name: 'OrderFactory',
      stereotype: 'factory',
      fields: [],
      methods: [
        '+ createOrder(orderId, accountId, symbol, side, type, price, quantity): Order',
      ],
    },
    {
      name: 'OrderExecutionStrategyFactory',
      stereotype: 'factory',
      fields: ['- strategies: EnumMap<OrderType, OrderExecutionStrategy>'],
      methods: ['+ forType(type): OrderExecutionStrategy'],
    },
    {
      name: 'OrderExecutionStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ execute(order, book, accounts, stock): List<Trade>',
        '+ guardSelfTrade(order, book): void',
      ],
    },
    {
      name: 'MarketExecutionStrategy',
      fields: ['implements OrderExecutionStrategy'],
      methods: ['+ execute(order, book, accounts, stock): List<Trade>'],
    },
    {
      name: 'LimitExecutionStrategy',
      fields: ['implements OrderExecutionStrategy'],
      methods: ['+ execute(order, book, accounts, stock): List<Trade>'],
    },
    {
      name: 'StockPriceObserver',
      stereotype: 'interface',
      fields: [],
      methods: ['+ onPriceUpdate(symbol, oldPrice, newPrice, volume, timestamp): void'],
    },
    {
      name: 'InAppPriceObserver',
      fields: ['- recentQuotes: List<Map>', 'implements StockPriceObserver'],
      methods: ['+ onPriceUpdate(...): void', '+ getRecentQuotes(): List<Map>'],
    },
    {
      name: 'LoggingPriceObserver',
      fields: ['implements StockPriceObserver'],
      methods: ['+ onPriceUpdate(...): void'],
    },
    {
      name: 'Stock',
      fields: [
        '- symbol: String',
        '- name: String',
        '- currentPrice: double',
        '- observers: List<StockPriceObserver>',
      ],
      methods: [
        '+ registerObserver(observer): void',
        '+ notifyPriceUpdate(oldPrice, newPrice, volume): void',
      ],
    },
    {
      name: 'Account',
      fields: [
        '- accountId: String',
        '- userId: String',
        '- portfolio: Portfolio',
        '- cashBalance: double',
        '- reservedBalance: double',
        '- accountLock: ReentrantLock',
      ],
      methods: [
        '+ reserveFunds(amount): void',
        '+ releaseReservedFunds(amount): void',
        '+ settleBuy(executedCost, reservedCostToRelease): void',
        '+ settleSell(proceeds): void',
        '+ getAvailableBalance(): double',
      ],
    },
    {
      name: 'Portfolio',
      fields: ['- accountId: String', '- holdings: Map<String, Holding>'],
      methods: [
        '+ reserveShares(symbol, qty): void',
        '+ releaseReservedShares(symbol, qty): void',
        '+ executeBuy(symbol, qty, price): void',
        '+ executeSell(symbol, qty): void',
      ],
    },
    {
      name: 'Holding',
      fields: [
        '- symbol: String',
        '- quantity: int',
        '- reservedQuantity: int',
        '- avgBuyPrice: double',
      ],
      methods: [
        '+ reserveShares(qty): void',
        '+ deductShares(qty): void',
        '+ addShares(qty, executionPrice): void',
        '+ getAvailableQuantity(): int',
      ],
    },
    {
      name: 'Order',
      stereotype: 'abstract',
      fields: [
        '- orderId: String',
        '- accountId: String',
        '- symbol: String',
        '- side: OrderSide',
        '- type: OrderType',
        '- limitPrice: double',
        '- totalQuantity: int',
        '- filledQuantity: AtomicInteger',
        '- status: OrderStatus',
      ],
      methods: [
        '+ fill(qty): void',
        '+ getRemainingQuantity(): int',
      ],
    },
    {
      name: 'BuyOrder',
      fields: ['extends Order'],
      methods: [],
    },
    {
      name: 'SellOrder',
      fields: ['extends Order'],
      methods: [],
    },
    {
      name: 'OrderBook',
      fields: [
        '- symbol: String',
        '- bids: NavigableMap<Double, Queue<Order>>',
        '- asks: NavigableMap<Double, Queue<Order>>',
        '- tradeHistory: List<Trade>',
      ],
      methods: [
        '+ addRestingOrder(order): void',
        '+ removeOrder(order): boolean',
        '+ getDepthSnapshot(maxLevels): Map',
        '+ calculateSpread(): double',
      ],
    },
    {
      name: 'Trade',
      fields: [
        '- tradeId: String',
        '- symbol: String',
        '- buyOrderId / sellOrderId: String',
        '- buyerAccountId / sellerAccountId: String',
        '- price: double',
        '- quantity: int',
      ],
      methods: [],
    },
    {
      name: 'User',
      fields: ['- userId: String', '- name: String', '- email: String', '- accountId: String'],
      methods: [],
    },
    {
      name: 'OrderSide',
      stereotype: 'enum',
      fields: ['BUY', 'SELL'],
      methods: [],
    },
    {
      name: 'OrderType',
      stereotype: 'enum',
      fields: ['MARKET', 'LIMIT'],
      methods: [],
    },
    {
      name: 'OrderStatus',
      stereotype: 'enum',
      fields: ['PENDING', 'PARTIALLY_FILLED', 'EXECUTED', 'CANCELLED', 'REJECTED'],
      methods: [],
    },
    {
      name: 'StockBrokerException',
      stereotype: 'exception',
      fields: ['extends DomainException'],
      methods: [],
    },
  ],
  relationships: [
    { from: 'StockBrokerService', to: 'OrderFactory', label: 'creates orders via' },
    { from: 'StockBrokerService', to: 'OrderExecutionStrategyFactory', label: 'resolves strategy via' },
    { from: 'StockBrokerService', to: 'OrderBook', label: 'owns one per symbol' },
    { from: 'StockBrokerService', to: 'Account', label: 'owns' },
    { from: 'OrderExecutionStrategyFactory', to: 'OrderExecutionStrategy', label: 'resolves OrderType to' },
    { from: 'MarketExecutionStrategy', to: 'OrderExecutionStrategy', label: 'implements' },
    { from: 'LimitExecutionStrategy', to: 'OrderExecutionStrategy', label: 'implements' },
    { from: 'OrderExecutionStrategy', to: 'OrderBook', label: 'matches against' },
    { from: 'OrderExecutionStrategy', to: 'Account', label: 'settles trades on' },
    { from: 'OrderExecutionStrategy', to: 'Stock', label: 'notifies price update on' },
    { from: 'OrderFactory', to: 'BuyOrder', label: 'creates' },
    { from: 'OrderFactory', to: 'SellOrder', label: 'creates' },
    { from: 'BuyOrder', to: 'Order', label: 'extends' },
    { from: 'SellOrder', to: 'Order', label: 'extends' },
    { from: 'OrderBook', to: 'Order', label: 'holds bids/asks of' },
    { from: 'OrderBook', to: 'Trade', label: 'records' },
    { from: 'Stock', to: 'StockPriceObserver', label: 'notifies' },
    { from: 'InAppPriceObserver', to: 'StockPriceObserver', label: 'implements' },
    { from: 'LoggingPriceObserver', to: 'StockPriceObserver', label: 'implements' },
    { from: 'Account', to: 'Portfolio', label: 'has' },
    { from: 'Portfolio', to: 'Holding', label: 'has many' },
    { from: 'Order', to: 'OrderSide', label: 'has' },
    { from: 'Order', to: 'OrderType', label: 'has' },
    { from: 'Order', to: 'OrderStatus', label: 'has' },
  ],
};
