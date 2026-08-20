// designDetails — splitwise
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Splitwise Expense Sharing — Design Details',
  requirements: [
    'Multi-User & Group Management: Users can belong to multiple groups and create expenses across members.',
    'Flexible Split Strategies: Support EQUAL, PERCENTAGE (must sum to 100%), and EXACT (must sum to expense total) splits.',
    'Balance Ledger: Track pairwise net balances (who owes whom) with atomic updates.',
    'Debt Simplification: Algorithmically calculate minimal settlements required to clear all group debts.',
    'Settlement Processing: Support full and partial settlements between users.',
    'Simulation & Event Log: Real-time event log with full timeline replay.'
  ],
  entities: [
    {
      name: 'SplitwiseService',
      description: 'Central facade coordinating expense calculations, debt simplification, settlement, and event logging.',
      fields: [
        {
          name: 'repository',
          type: 'SplitwiseRepository',
          description: 'Primary production repository storing users, groups, expenses, and balance ledgers'
        },
        {
          name: 'simRepository',
          type: 'SplitwiseRepository',
          description: 'Isolated simulation repository for zero-side-effect sandbox execution'
        },
        {
          name: 'strategyFactory',
          type: 'SplitStrategyFactory',
          description: 'Factory resolving SplitType enum to appropriate SplitStrategy algorithm'
        },
        {
          name: 'eventLog',
          type: 'List<ExpenseEvent>',
          description: 'Thread-safe copy-on-write event stream for live audit replay'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Fine-grained mutex guarding atomic multi-user ledger updates and settlements'
        }
      ],
      methods: [
        {
          name: 'createUser(name, email)',
          returns: 'User',
          description: 'Registers a new user and emits USER_CREATED event'
        },
        {
          name: 'createGroup(name, memberIds)',
          returns: 'Group',
          description: 'Initializes a new expense group with member associations'
        },
        {
          name: 'addExpense(desc, amount, paidBy, groupId, splits)',
          returns: 'Expense',
          description: 'Validates and executes split calculation, updates balance ledger atomically, and logs event'
        },
        {
          name: 'settleUp(fromUser, toUser, groupId, amount)',
          returns: 'Settlement',
          description: 'Records settlement payment between two users and adjusts net balance ledger'
        },
        {
          name: 'getSimplifiedDebts(groupId)',
          returns: 'List<SuggestedSettlement>',
          description: 'Executes greedy Min-Cash-Flow graph algorithm reducing group debts to optimal transactions'
        },
        {
          name: 'getUserBalances(userId)',
          returns: 'Map<String, Double>',
          description: 'Fetches pairwise net owe/owed balances for a specific user'
        },
        {
          name: 'getEventLog()',
          returns: 'List<ExpenseEvent>',
          description: 'Returns full chronological activity feed with balance snapshots'
        }
      ]
    },
    {
      name: 'SplitStrategyFactory',
      description: 'Factory resolving SplitType enum to concrete SplitStrategy implementation.',
      fields: [
        {
          name: 'strategies',
          type: 'Map<SplitType, SplitStrategy>',
          description: 'Registry mapping SplitType enums to singleton SplitStrategy instances'
        }
      ],
      methods: [
        {
          name: 'getStrategy(type)',
          returns: 'SplitStrategy',
          description: 'Returns appropriate strategy (Equal, Percentage, Exact) for the given SplitType'
        }
      ]
    },
    {
      name: 'SplitStrategy (Interface)',
      description: 'Strategy interface defining calculateSplits method for expense distribution.',
      fields: [],
      methods: [
        {
          name: 'calculateSplits(amount, group, splitsInput, repository)',
          returns: 'List<Split>',
          description: 'Computes exact monetary share amount for each participating group member'
        }
      ]
    },
    {
      name: 'Expense',
      description: 'Domain model storing amount, paidBy user, group reference, splits list, and timestamp.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique expense identifier'
        },
        {
          name: 'description',
          type: 'String',
          description: 'Human-readable description/title of expense (e.g. "Dinner", "Goa Villa")'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Total monetary amount of expense in INR'
        },
        {
          name: 'paidBy',
          type: 'User',
          description: 'User entity who paid the upfront bill'
        },
        {
          name: 'groupId',
          type: 'long',
          description: 'ID of group containing this expense (0 for non-group)'
        },
        {
          name: 'splits',
          type: 'List<Split>',
          description: 'List of individual user split allocations'
        },
        {
          name: 'createdAt',
          type: 'LocalDateTime',
          description: 'Creation timestamp of the expense'
        }
      ],
      methods: [
        {
          name: 'getSplits()',
          returns: 'List<Split>',
          description: 'Returns member breakdown allocations'
        },
        {
          name: 'getAmount()',
          returns: 'double',
          description: 'Returns total expense bill'
        }
      ]
    },
    {
      name: 'Settlement',
      description: 'Domain model representing a balance settlement transfer from one user to another within a group.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique settlement identifier'
        },
        {
          name: 'fromUser',
          type: 'User',
          description: 'Debtor user paying off their balance'
        },
        {
          name: 'toUser',
          type: 'User',
          description: 'Creditor user receiving payment'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Settlement monetary amount in INR'
        },
        {
          name: 'groupId',
          type: 'long',
          description: 'Associated group ID for this settlement'
        },
        {
          name: 'timestamp',
          type: 'LocalDateTime',
          description: 'Timestamp when settlement was completed'
        }
      ],
      methods: [
        {
          name: 'getAmount()',
          returns: 'double',
          description: 'Returns settled payment amount'
        }
      ]
    },
    {
      name: 'ExpenseEvent',
      description: 'DTO capturing real-time telemetry event, actor, description, and balance snapshot for simulation timeline.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Sequential event sequence number'
        },
        {
          name: 'type',
          type: 'ExpenseEventType',
          description: 'Event category enum: USER_CREATED, GROUP_CREATED, MEMBER_ADDED, EXPENSE_ADDED, SETTLEMENT'
        },
        {
          name: 'actor',
          type: 'String',
          description: 'Name of the user initiating the action'
        },
        {
          name: 'description',
          type: 'String',
          description: 'Human-readable summary of what occurred'
        },
        {
          name: 'data',
          type: 'Map<String, Object>',
          description: 'Contextual payload details (e.g. expense ID, splits breakdown)'
        },
        {
          name: 'balanceSnapshot',
          type: 'Map<String, Double>',
          description: 'Complete pairwise ledger state snapshot immediately after event'
        },
        {
          name: 'timestamp',
          type: 'LocalDateTime',
          description: 'Timestamp of the event execution'
        }
      ],
      methods: []
    },
    {
      name: 'ExpenseEventType',
      description: 'Enum defining type-safe event categories emitted across the expense sharing lifecycle for real-time audit logging and replay.',
      fields: [
        {
          name: 'USER_CREATED',
          type: 'EnumConstant',
          description: 'Emitted when a new user joins the platform'
        },
        {
          name: 'GROUP_CREATED',
          type: 'EnumConstant',
          description: 'Emitted when an expense group is created'
        },
        {
          name: 'MEMBER_ADDED',
          type: 'EnumConstant',
          description: 'Emitted when a user is added to an existing group'
        },
        {
          name: 'EXPENSE_ADDED',
          type: 'EnumConstant',
          description: 'Emitted when a bill is added and split among participants'
        },
        {
          name: 'SETTLEMENT',
          type: 'EnumConstant',
          description: 'Emitted when a balance debt is settled between two members'
        }
      ],
      methods: []
    },
    {
      name: 'Split',
      description: 'Model capturing user, computed share amount, and percentage/exact metadata per expense participant.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Split record ID'
        },
        {
          name: 'user',
          type: 'User',
          description: 'User responsible for this split share'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Calculated exact monetary share amount'
        },
        {
          name: 'percentage',
          type: 'double',
          description: 'Percentage allocation (for percentage splits)'
        },
        {
          name: 'type',
          type: 'SplitType',
          description: 'EQUAL, PERCENTAGE, or EXACT'
        }
      ],
      methods: []
    },
    {
      name: 'Group',
      description: 'Domain model representing a shared expense group with member directory.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique group identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Group name (e.g. "Trip to Goa", "Flatmates")'
        },
        {
          name: 'members',
          type: 'List<User>',
          description: 'List of registered members in this group'
        }
      ],
      methods: [
        {
          name: 'addMember(user)',
          returns: 'void',
          description: 'Appends a new user to the group roster'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Encapsulates EQUAL, PERCENTAGE, and EXACT split calculation algorithms behind SplitStrategy interface.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'SplitStrategyFactory maps SplitType enum to appropriate strategy instance.'
    },
    {
      name: 'Facade Pattern',
      used: true,
      explanation: 'SplitwiseService acts as a unified facade for repository, strategies, debt simplification, and event logging.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'SplitwiseService handles orchestration, SplitStrategy classes handle split math, and SplitwiseRepository handles data storage.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'New split rules (e.g., share ratio/weight) can be added by implementing SplitStrategy without altering service code.'
    },
    {
      name: 'Dependency Inversion Principle (DIP)',
      description: 'SplitwiseService depends on SplitStrategy interface rather than concrete strategy implementations.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Balance ledger calculations and lock synchronizations are encapsulated within repository and service methods.'
    },
    {
      name: 'Polymorphism',
      description: 'Service invokes calculateSplits polymorphically across split strategies.'
    },
    {
      name: 'Abstraction',
      description: 'REST API exposes clean endpoints for users, groups, expenses, balances, and settlements.'
    }
  ],
  extensibility: [
    {
      area: 'Multi-Currency Support',
      description: 'Add currency code to Expense and real-time exchange rate conversion engine.',
      difficulty: 'Medium'
    },
    {
      area: 'Recurring Expenses',
      description: 'Add scheduled cron job for automated monthly rent/utility bill creation.',
      difficulty: 'Easy'
    },
    {
      area: 'Expense Itemization & Receipt Scanning',
      description: 'Allow line-item breakdown with OCR receipt image scanning integration.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Used single service-level ReentrantLock for balance ledger updates to eliminate multi-lock acquisition deadlock risk during multi-user splits.',
    'Implemented greedy min-cash-flow algorithm (producing ≤ N-1 transactions) for optimal performance instead of NP-hard subset-sum solver.',
    'Decoupled simulation state into an isolated simRepository engine to allow real API simulation without mutating main business data.'
  ],
  summary: 'Multi-actor expense sharing engine supporting group & non-group expenses, 3 split strategies (Equal, Percentage, Exact), balance ledger tracking, graph-based debt simplification, real-time event logging, and thread-safe settlement processing.',
  highlights: [
    'Extensible Strategy Pattern for split calculations (EqualSplitStrategy, PercentageSplitStrategy, ExactSplitStrategy) encapsulated by SplitStrategyFactory',
    'Graph-based greedy Min-Cash-Flow debt simplification algorithm reducing settlement transactions to O(N log N) time complexity',
    'Thread-safe ledger mutations using ConcurrentHashMap and fine-grained ReentrantLock',
    'Real-time event logging capturing balance snapshots for interactive 2D simulation replay'
  ]
};
