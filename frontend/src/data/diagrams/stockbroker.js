// classDiagrams — stockbroker
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Stock Brokerage — Class Diagram',
  classes: [
    {
      name: 'Account',
      fields: [
        '- id: String',
        '- username: String',
        '- email: String',
        '- balance: double',
        '- portfolio: Portfolio',
        '- orders: List<Order>'
      ],
      methods: [
        '+ deposit(amount): void',
        '+ withdraw(amount): void',
        '+ placeOrder(stock, qty, type): Order'
      ]
    },
    {
      name: 'Stock',
      fields: [
        '- symbol: String',
        '- name: String',
        '- currentPrice: double',
        '- market: String'
      ],
      methods: [
        '+ updatePrice(newPrice): void'
      ]
    },
    {
      name: 'Order',
      fields: [
        '- id: String',
        '- account: Account',
        '- stock: Stock',
        '- quantity: int',
        '- price: double',
        '- type: OrderType',
        '- status: OrderStatus',
        '- timestamp: LocalDateTime'
      ],
      methods: [
        '+ execute(): void',
        '+ cancel(): void',
        '+ getTotalValue(): double'
      ]
    },
    {
      name: 'Portfolio',
      fields: [
        '- account: Account',
        '- holdings: Map<Stock, Integer>',
        '- totalValue: double'
      ],
      methods: [
        '+ addStock(stock, qty): void',
        '+ removeStock(stock, qty): void',
        '+ getNetWorth(): double'
      ]
    },
    {
      name: 'MarketData',
      stereotype: 'singleton',
      fields: [
        '- stocks: Map<String, Stock>',
        '- priceHistory: Map<String, List<Double>>'
      ],
      methods: [
        '+ getPrice(symbol): double',
        '+ updatePrice(symbol, price): void',
        '+ getHistory(symbol): List<Double>'
      ]
    },
    {
      name: 'OrderType',
      stereotype: 'enum',
      fields: [
        'BUY',
        'SELL',
        'LIMIT_BUY',
        'LIMIT_SELL',
        'STOP_LOSS'
      ],
      methods: []
    },
    {
      name: 'OrderStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'EXECUTED',
        'PARTIALLY_FILLED',
        'CANCELLED',
        'REJECTED'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Account',
      to: 'Portfolio',
      label: 'has'
    },
    {
      from: 'Account',
      to: 'Order',
      label: 'places'
    },
    {
      from: 'Order',
      to: 'Stock',
      label: 'trades'
    },
    {
      from: 'Order',
      to: 'OrderType',
      label: 'has type'
    },
    {
      from: 'Order',
      to: 'OrderStatus',
      label: 'has status'
    },
    {
      from: 'Portfolio',
      to: 'Stock',
      label: 'holds'
    },
    {
      from: 'MarketData',
      to: 'Stock',
      label: 'tracks'
    }
  ]
};
