// classDiagrams — restaurant
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Restaurant — Class Diagram',
  classes: [
    {
      name: 'Restaurant',
      fields: [
        '- id: String',
        '- name: String',
        '- location: String',
        '- menu: Menu'
      ],
      methods: [
        '+ open(): void',
        '+ close(): void',
        '+ addMenuItem(item): void'
      ]
    },
    {
      name: 'Menu',
      fields: [
        '- items: List<MenuItem>',
        '- categories: List<String>'
      ],
      methods: [
        '+ addItem(item): void',
        '+ getItemsByCategory(cat): List<MenuItem>'
      ]
    },
    {
      name: 'Order',
      fields: [
        '- id: String',
        '- items: List<MenuItem>',
        '- tableNo: int',
        '- status: OrderStatus',
        '- chef: Chef',
        '- waiter: Waiter',
        '- totalAmount: double'
      ],
      methods: [
        '+ addItem(item): void',
        '+ nextStatus(): void',
        '+ calculateTotal(): double'
      ]
    },
    {
      name: 'Chef',
      fields: [
        '- id: String',
        '- name: String',
        '- specialization: String',
        '- orders: List<Order>'
      ],
      methods: [
        '+ prepareOrder(order): void',
        '+ completeOrder(order): void'
      ]
    },
    {
      name: 'Waiter',
      fields: [
        '- id: String',
        '- name: String',
        '- assignedTables: List<Integer>'
      ],
      methods: [
        '+ takeOrder(table, items): Order',
        '+ serveOrder(order): void'
      ]
    },
    {
      name: 'Payment',
      fields: [
        '- id: String',
        '- order: Order',
        '- amount: double',
        '- method: String',
        '- tip: double',
        '- timestamp: LocalDateTime'
      ],
      methods: [
        '+ process(): boolean',
        '+ split(numPeople): List<Double>'
      ]
    },
    {
      name: 'OrderStatus',
      stereotype: 'enum',
      fields: [
        'PLACED',
        'PREPARING',
        'READY',
        'SERVED',
        'PAID'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Restaurant',
      to: 'Menu',
      label: 'has'
    },
    {
      from: 'Order',
      to: 'Menu',
      label: 'references'
    },
    {
      from: 'Order',
      to: 'Chef',
      label: 'assigned to'
    },
    {
      from: 'Order',
      to: 'Waiter',
      label: 'served by'
    },
    {
      from: 'Order',
      to: 'OrderStatus',
      label: 'has state'
    },
    {
      from: 'Order',
      to: 'Payment',
      label: 'generates'
    }
  ]
};
