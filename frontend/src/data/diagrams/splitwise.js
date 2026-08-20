// classDiagrams — splitwise
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Splitwise Expense Sharing — Class Diagram',
  classes: [
    {
      name: 'SplitwiseService',
      stereotype: 'singleton',
      fields: [
        '- repository: SplitwiseRepository',
        '- strategyFactory: SplitStrategyFactory',
        '- eventLog: List<ExpenseEvent>',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ createUser(name, email): User',
        '+ createGroup(name, memberIds): Group',
        '+ addExpense(desc, amount, paidBy, groupId, splits): Expense',
        '+ settleUp(fromUser, toUser, groupId, amount): Settlement',
        '+ getSimplifiedDebts(groupId): List<SuggestedSettlement>'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: long',
        '- name: String',
        '- email: String'
      ],
      methods: []
    },
    {
      name: 'Group',
      fields: [
        '- id: long',
        '- name: String',
        '- members: List<User>'
      ],
      methods: []
    },
    {
      name: 'Expense',
      fields: [
        '- id: long',
        '- description: String',
        '- amount: double',
        '- paidBy: User',
        '- groupId: long',
        '- splits: List<Split>',
        '- createdAt: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'Split',
      fields: [
        '- id: long',
        '- user: User',
        '- amount: double',
        '- percentage: double',
        '- type: SplitType'
      ],
      methods: []
    },
    {
      name: 'SplitType',
      stereotype: 'enum',
      fields: [
        'EQUAL',
        'PERCENTAGE',
        'EXACT'
      ],
      methods: []
    },
    {
      name: 'Settlement',
      fields: [
        '- id: long',
        '- fromUser: User',
        '- toUser: User',
        '- amount: double',
        '- groupId: long',
        '- timestamp: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'ExpenseEvent',
      stereotype: 'dto',
      fields: [
        '- id: long',
        '- type: ExpenseEventType',
        '- actor: String',
        '- description: String',
        '- balanceSnapshot: Map',
        '- timestamp: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'ExpenseEventType',
      stereotype: 'enum',
      fields: [
        'USER_CREATED',
        'GROUP_CREATED',
        'MEMBER_ADDED',
        'EXPENSE_ADDED',
        'SETTLEMENT'
      ],
      methods: []
    },
    {
      name: 'SuggestedSettlement',
      stereotype: 'dto',
      fields: [
        '- fromUser: User',
        '- toUser: User',
        '- amount: double'
      ],
      methods: []
    },
    {
      name: 'SplitStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculateSplits(amount, group, splits, repo): List<Split>'
      ]
    },
    {
      name: 'EqualSplitStrategy',
      fields: [
        'implements SplitStrategy'
      ],
      methods: [
        '+ calculateSplits(...)'
      ]
    },
    {
      name: 'PercentageSplitStrategy',
      fields: [
        'implements SplitStrategy'
      ],
      methods: [
        '+ calculateSplits(...)'
      ]
    },
    {
      name: 'ExactSplitStrategy',
      fields: [
        'implements SplitStrategy'
      ],
      methods: [
        '+ calculateSplits(...)'
      ]
    },
    {
      name: 'SplitStrategyFactory',
      fields: [
        '- strategies: Map<SplitType, SplitStrategy>'
      ],
      methods: [
        '+ getStrategy(type): SplitStrategy'
      ]
    },
    {
      name: 'SplitwiseRepository',
      fields: [
        '- users: ConcurrentHashMap',
        '- groups: ConcurrentHashMap',
        '- expenses: ConcurrentHashMap',
        '- balances: ConcurrentHashMap',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ saveUser()',
        '+ saveGroup()',
        '+ saveExpense()',
        '+ updateBalance()',
        '+ getNetBalance()'
      ]
    }
  ],
  relationships: [
    {
      from: 'SplitwiseService',
      to: 'SplitwiseRepository',
      label: 'uses'
    },
    {
      from: 'SplitwiseService',
      to: 'SplitStrategyFactory',
      label: 'uses'
    },
    {
      from: 'SplitwiseService',
      to: 'ExpenseEvent',
      label: 'logs'
    },
    {
      from: 'SplitwiseService',
      to: 'SuggestedSettlement',
      label: 'calculates'
    },
    {
      from: 'EqualSplitStrategy',
      to: 'SplitStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'PercentageSplitStrategy',
      to: 'SplitStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'ExactSplitStrategy',
      to: 'SplitStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'SplitStrategyFactory',
      to: 'SplitStrategy',
      label: 'creates'
    },
    {
      from: 'Group',
      to: 'User',
      label: 'contains'
    },
    {
      from: 'Expense',
      to: 'User',
      label: 'paid by'
    },
    {
      from: 'Expense',
      to: 'Split',
      label: 'contains'
    },
    {
      from: 'Split',
      to: 'User',
      label: 'assigned to'
    },
    {
      from: 'Split',
      to: 'SplitType',
      label: 'has type'
    },
    {
      from: 'Settlement',
      to: 'User',
      label: 'from / to'
    }
  ]
};
