// designDetails — stockbroker
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Online Stock Brokerage Platform — Design Details',
  tldr: [
    'In-memory Order Book matching engine with Price-Time Priority and partial fill execution',
    'Strategy Pattern for Market Orders (immediate liquidity sweep) and Limit Orders (resting in book depth)',
    'Observer Pattern for real-time stock price ticker updates upon matched trade execution',
    'Atomic fund and share reservation preventing double-commitment across concurrent resting limit orders',
    'Per-stock symbol ReentrantLock serialization guaranteeing sequential order book mutation while allowing concurrent trading across distinct tickers'
  ],
  requirements: [
    'Account management — users can open trading accounts with balance, portfolio, and transaction history',
    'Market data ingestion — real-time stock prices, bid/ask spreads, and market indices from exchange feed',
    'Order placement — users can place BUY/SELL orders with order types: MARKET, LIMIT, STOP_LOSS',
    'Order matching engine — matches buy and sell orders by price-time priority, executes trades when orders cross',
    'Order states: PENDING, VALIDATED, PLACED, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED',
    'Portfolio tracking — user portfolio shows holdings with current P&L, average buy price, and allocation',
    'Portfolio and watchlist management — users can create watchlists, view portfolio performance charts',
    'Transaction history — complete audit trail of all trades, deposits, withdrawals with timestamps'
  ],
  entities: [
    {
      name: 'BrokerageService',
      description: 'Core orchestrator managing accounts, order placement, portfolio queries, and transaction recording.',
      fields: [
        {
          name: 'accountRepo',
          type: 'Repository<Account>',
          description: 'Data store for user accounts'
        },
        {
          name: 'orderRepo',
          type: 'Repository<Order>',
          description: 'Data store for all orders'
        },
        {
          name: 'matchingEngine',
          type: 'MatchingEngine',
          description: 'Executes order matching and trade execution'
        },
        {
          name: 'marketDataProvider',
          type: 'MarketDataProvider',
          description: 'Source of real-time stock prices'
        }
      ],
      methods: [
        {
          name: 'placeOrder(accountId, stock, quantity, type, price)',
          returns: 'Order',
          description: 'Validates and places a trade order'
        },
        {
          name: 'cancelOrder(orderId)',
          returns: 'void',
          description: 'Cancels an open order if not yet filled'
        },
        {
          name: 'getPortfolio(accountId)',
          returns: 'Portfolio',
          description: 'Returns current holdings with P&L'
        },
        {
          name: 'getOrderHistory(accountId)',
          returns: 'List<Order>',
          description: 'Returns all past orders for the account'
        }
      ]
    },
    {
      name: 'Account',
      description: 'User trading account with cash balance, portfolio holdings, and transaction log.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique account identifier'
        },
        {
          name: 'user',
          type: 'User',
          description: 'Account owner'
        },
        {
          name: 'balance',
          type: 'double',
          description: 'Available cash balance'
        },
        {
          name: 'holdings',
          type: 'Map<Stock, Integer>',
          description: 'Current stock holdings (stock to shares)'
        },
        {
          name: 'transactions',
          type: 'List<Transaction>',
          description: 'All deposits, withdrawals, and trades'
        }
      ],
      methods: [
        {
          name: 'deposit(amount)',
          returns: 'void',
          description: 'Adds cash to account balance'
        },
        {
          name: 'withdraw(amount)',
          returns: 'boolean',
          description: 'Withdraws cash if sufficient balance'
        },
        {
          name: 'getPortfolioValue()',
          returns: 'double',
          description: 'Calculates total value (cash + holdings market value)'
        }
      ]
    },
    {
      name: 'Order',
      description: 'Trade order to buy or sell a stock. Has type, status, price, quantity, and execution details.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique order identifier'
        },
        {
          name: 'account',
          type: 'Account',
          description: 'Account placing the order'
        },
        {
          name: 'stock',
          type: 'Stock',
          description: 'Stock symbol and company'
        },
        {
          name: 'side',
          type: 'OrderSide',
          description: 'BUY or SELL'
        },
        {
          name: 'type',
          type: 'OrderType',
          description: 'MARKET, LIMIT, STOP_LOSS'
        },
        {
          name: 'quantity',
          type: 'int',
          description: 'Number of shares'
        },
        {
          name: 'filledQuantity',
          type: 'int',
          description: 'Shares executed so far'
        },
        {
          name: 'price',
          type: 'double',
          description: 'Limit price (for LIMIT/STOP orders)'
        },
        {
          name: 'status',
          type: 'OrderStatus',
          description: 'PENDING, VALIDATED, PLACED, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED'
        },
        {
          name: 'timestamp',
          type: 'LocalDateTime',
          description: 'When the order was placed'
        }
      ],
      methods: [
        {
          name: 'fill(quantity, price)',
          returns: 'void',
          description: 'Executes a partial/full fill of the order'
        },
        {
          name: 'cancel()',
          returns: 'void',
          description: 'Cancels the order if not fully filled'
        },
        {
          name: 'isFilled()',
          returns: 'boolean',
          description: 'Returns true if all shares are executed'
        }
      ]
    },
    {
      name: 'MatchingEngine',
      description: 'Matches buy and sell orders by price-time priority. Maintains order books (bid/ask) per stock.',
      fields: [
        {
          name: 'orderBooks',
          type: 'Map<String, OrderBook>',
          description: 'Order book per stock symbol'
        }
      ],
      methods: [
        {
          name: 'placeOrder(order)',
          returns: 'Trade',
          description: 'Adds order to book and attempts matching. Returns trade if executed.'
        },
        {
          name: 'cancelOrder(orderId)',
          returns: 'void',
          description: 'Removes order from book'
        },
        {
          name: 'getOrderBook(stock)',
          returns: 'OrderBook',
          description: 'Returns current bid/ask levels for a stock'
        }
      ]
    },
    {
      name: 'OrderBook',
      description: 'Price-time prioritized list of buy and sell orders for a single stock. Buy orders sorted by price descending, sells by price ascending.',
      fields: [
        {
          name: 'stock',
          type: 'Stock',
          description: 'Stock this order book belongs to'
        },
        {
          name: 'bids',
          type: 'PriorityQueue<Order>',
          description: 'Buy orders (highest price first)'
        },
        {
          name: 'asks',
          type: 'PriorityQueue<Order>',
          description: 'Sell orders (lowest price first)'
        }
      ],
      methods: [
        {
          name: 'addOrder(order)',
          returns: 'void',
          description: 'Adds order to appropriate queue and attempts matching'
        },
        {
          name: 'match()',
          returns: 'List<Trade>',
          description: 'Matches bids and asks where bid price >= ask price'
        },
        {
          name: 'getBestBid()',
          returns: 'Order',
          description: 'Returns highest buy order'
        },
        {
          name: 'getBestAsk()',
          returns: 'Order',
          description: 'Returns lowest sell order'
        }
      ]
    },
    {
      name: 'Stock',
      description: 'Stock instrument with symbol, company name, current market price, and other metadata.',
      fields: [
        {
          name: 'symbol',
          type: 'String',
          description: 'Ticker symbol (e.g., AAPL, GOOGL)'
        },
        {
          name: 'companyName',
          type: 'String',
          description: 'Full company name'
        },
        {
          name: 'currentPrice',
          type: 'double',
          description: 'Last traded price'
        },
        {
          name: 'openPrice',
          type: 'double',
          description: 'Today\'s opening price'
        },
        {
          name: 'dayHigh',
          type: 'double',
          description: 'Today\'s highest price'
        },
        {
          name: 'dayLow',
          type: 'double',
          description: 'Today\'s lowest price'
        }
      ],
      methods: [
        {
          name: 'updatePrice(newPrice)',
          returns: 'void',
          description: 'Updates market price and triggers observers'
        },
        {
          name: 'getDayChange()',
          returns: 'double',
          description: 'Returns percentage change from open'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Order Book Pattern',
      usage: 'Price-Time Priority matching engine maintaining sorted bid/ask levels.'
    },
    {
      name: 'Strategy Pattern',
      usage: 'OrderExecutionStrategy with MarketExecutionStrategy and LimitExecutionStrategy.'
    },
    {
      name: 'Observer Pattern',
      usage: 'StockPriceObserver for real-time stock quote feeds upon trade settlement.'
    },
    {
      name: 'Factory Pattern',
      usage: 'OrderFactory creating typed BuyOrder and SellOrder instances.'
    },
    {
      name: 'Singleton Pattern',
      usage: 'StockBrokerService managed as a Spring Singleton.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Account manages balance and holdings. Order tracks trade request. MatchingEngine executes matching. OrderBook maintains bid/ask queues. Stock holds market data. Each has one job.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New order types implement Order interface with validation. New matching strategies implement MatchingStrategy. New market data sources implement MarketDataProvider. Core services unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'BrokerageService depends on MatchingEngine and MarketDataProvider abstractions. MatchingEngine depends on OrderBook. OrderBook depends on Order. High-level logic doesn\'t depend on low-level implementations.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Order validation (sufficient balance for BUY, sufficient holdings for SELL) is centralized in BrokerageService. Order book maintenance (add, remove, match) is in OrderBook.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'Price-time priority matching is the simplest fair matching algorithm. Order book is two priority queues (bids max-heap, asks min-heap). No complex auction or dark pool logic.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Order Types',
      description: 'Order interface with MarketOrder (executes at current price), LimitOrder (executes only at or better than limit), StopLossOrder (triggers market order when price hits stop). Each validates and executes differently.',
      alternative: 'Could use single Order class with type field and switch. Polymorphism encapsulates type-specific behavior cleanly.'
    },
    {
      name: 'Encapsulation — Order Book',
      description: 'OrderBook encapsulates bid/ask queues and matching logic. External code cannot directly add/remove from internal queues — must go through addOrder() and cancelOrder().',
      alternative: 'Could expose queues directly. Encapsulation ensures matching invariants (price-time priority) are maintained.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Account has-a Map of holdings, List of transactions. Order has-a Account and Stock. OrderBook has-a PriorityQueue of Orders. System built by composing entities.',
      alternative: 'Could create hierarchy of account types (BasicAccount extends Account). Composition is chosen because accounts differ in features, not behavior.'
    }
  ],
  extensibility: [
    {
      area: 'New Order Type',
      description: 'Implement Order interface (e.g., StopLimitOrder, TrailingStopOrder, IcebergOrder). Add to OrderFactory. MatchingEngine handles new types without modification.',
      difficulty: 'Medium'
    },
    {
      area: 'Real-time Market Data WebSocket',
      description: 'Connect to exchange WebSocket feed. MarketDataProvider pushes price updates to observers (portfolio, watchlists). Replaces polling with push-based updates.',
      difficulty: 'Medium'
    },
    {
      area: 'Margin Trading',
      description: 'Add margin account type with leverage, margin requirements, and interest calculation. Extends Account with borrowing capability. Collateral monitoring prevents margin call violations.',
      difficulty: 'Hard'
    },
    {
      area: 'Automated Trading / Alerts',
      description: 'Add Alert entity with conditions (price above/below, volume spike). AlertService monitors market data and triggers actions (email, SMS, auto-order). Existing order placement reused.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Serialized matching engine per stock symbol using dedicated ReentrantLocks, achieving high throughput without multithreaded tree race conditions.',
    'Implemented atomic check-and-reserve for funds and shares under account mutexes, eliminating negative balances or short-sell oversubscription.',
    'Adopted Maker price priority (resting order price) for matched limit and market executions.'
  ],
  solid: [
    {
      principle: 'Single Responsibility Principle',
      details: 'OrderBook handles matching; Account manages balance reservations; Strategies encapsulate order type behaviors.'
    },
    {
      principle: 'Open/Closed Principle',
      details: 'New order types (e.g. Stop-Loss, IOC, FOK) can be added by implementing OrderExecutionStrategy without modifying StockBrokerService.'
    }
  ]
};
