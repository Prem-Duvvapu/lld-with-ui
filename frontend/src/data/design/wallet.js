// designDetails — wallet
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Digital Wallet — Design Details',
  requirements: [
    'Digital wallet system supporting multiple users with individual wallet accounts',
    'Each wallet has: user ID, user name, balance in INR, creation timestamp',
    'Create wallet: new wallet with ₹0 starting balance and unique ID',
    'Add funds: deposit money via payment methods (UPI, CARD, BANK_TRANSFER, WALLET_BALANCE)',
    'Send money: transfer between wallets with balance validation and minimum amount checks',
    'Transaction history: complete log of all credits, debits, and transfers per wallet',
    'Transactions track: from/to wallet IDs, amount, type (CREDIT/DEBIT/TRANSFER), status (COMPLETED/FAILED), timestamp, description',
    'Thread-safe concurrent access — ReentrantLock prevents race conditions on transfers'
  ],
  entities: [
    {
      name: 'WalletService',
      description: 'Core business logic for wallet operations. Handles wallet creation, fund addition with payment method tracking, peer-to-peer transfers with balance validation, and transaction history retrieval.',
      fields: [
        {
          name: 'repository',
          type: 'WalletRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures atomic transfers and balance updates'
        }
      ],
      methods: [
        {
          name: 'createWallet(userId, userName)',
          returns: 'Wallet',
          description: 'Creates new wallet with ₹0 balance'
        },
        {
          name: 'getBalance(walletId)',
          returns: 'double',
          description: 'Returns current wallet balance'
        },
        {
          name: 'addFunds(walletId, amount, paymentMethod)',
          returns: 'Map',
          description: 'Adds money via specified payment method, records credit transaction'
        },
        {
          name: 'sendMoney(from, to, amount, description)',
          returns: 'Map',
          description: 'Validates balance, debits sender, credits recipient, records transfer'
        },
        {
          name: 'getTransactions(walletId)',
          returns: 'List<Transaction>',
          description: 'Returns complete transaction history for a wallet'
        }
      ]
    },
    {
      name: 'WalletRepository',
      description: 'In-memory data store with ConcurrentHashMap. Seeds 3 wallets (Alice: ₹5000, Bob: ₹3000, Charlie: ₹10000). Generates sequential IDs via AtomicLong.',
      fields: [
        {
          name: 'wallets',
          type: 'ConcurrentHashMap<Long, Wallet>',
          description: 'All wallets indexed by ID'
        },
        {
          name: 'transactions',
          type: 'ConcurrentHashMap<Long, List<Transaction>>',
          description: 'Transactions indexed by wallet ID'
        },
        {
          name: 'walletIdGen',
          type: 'AtomicLong',
          description: 'Sequential wallet ID generator'
        },
        {
          name: 'txnIdGen',
          type: 'AtomicLong',
          description: 'Sequential transaction ID generator'
        }
      ],
      methods: [
        {
          name: 'findWalletById(id)',
          returns: 'Wallet',
          description: 'O(1) wallet lookup'
        },
        {
          name: 'saveWallet(wallet)',
          returns: 'Wallet',
          description: 'Upserts wallet into map'
        },
        {
          name: 'addTransaction(txn)',
          returns: 'void',
          description: 'Thread-safe transaction storage per wallet'
        },
        {
          name: 'getTransactionsByWalletId(id)',
          returns: 'List<Transaction>',
          description: 'Returns transaction list for wallet'
        }
      ]
    },
    {
      name: 'Wallet',
      description: 'User wallet with balance and metadata. Balance is mutable only through controlled service operations.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique wallet identifier'
        },
        {
          name: 'userId',
          type: 'String',
          description: 'User\'s unique ID'
        },
        {
          name: 'userName',
          type: 'String',
          description: 'Display name of the wallet owner'
        },
        {
          name: 'balance',
          type: 'double',
          description: 'Current wallet balance in INR'
        },
        {
          name: 'currency',
          type: 'String',
          description: 'Currency code (INR)'
        },
        {
          name: 'createdAt',
          type: 'LocalDateTime',
          description: 'Timestamp of wallet creation'
        }
      ],
      methods: []
    },
    {
      name: 'Transaction',
      description: 'Record of a financial operation affecting one or two wallets.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique transaction ID'
        },
        {
          name: 'fromWalletId',
          type: 'Long',
          description: 'Source wallet (null for direct credits)'
        },
        {
          name: 'toWalletId',
          type: 'Long',
          description: 'Destination wallet (null for debits)'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Transaction amount'
        },
        {
          name: 'type',
          type: 'String',
          description: 'CREDIT, DEBIT, or TRANSFER'
        },
        {
          name: 'status',
          type: 'String',
          description: 'PENDING, COMPLETED, or FAILED'
        },
        {
          name: 'timestamp',
          type: 'LocalDateTime',
          description: 'When the transaction occurred'
        },
        {
          name: 'description',
          type: 'String',
          description: 'User-provided memo or system description'
        }
      ],
      methods: []
    },
    {
      name: 'PaymentMethod',
      stereotype: 'enum',
      description: 'Supported payment methods for adding funds to wallets.',
      fields: [
        {
          name: 'UPI',
          type: 'enum constant',
          description: 'Unified Payments Interface — instant bank transfer'
        },
        {
          name: 'CARD',
          type: 'enum constant',
          description: 'Credit or debit card payment'
        },
        {
          name: 'BANK_TRANSFER',
          type: 'enum constant',
          description: 'Direct bank account transfer (NEFT/RTGS)'
        },
        {
          name: 'WALLET_BALANCE',
          type: 'enum constant',
          description: 'Use existing wallet balance (internal)'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'WalletRepository abstracts all data access behind semantic methods. The service calls findWalletById(), saveWallet(), addTransaction() rather than manipulating ConcurrentHashMap directly.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring @Service and @Repository are singletons, ensuring a single consistent set of wallets and balances across all requests. Critical since all financial state lives in memory.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'WalletService receives WalletRepository via constructor injection. Spring auto-wires, enabling unit testing with mock repositories without needing to start the full Spring context.'
    },
    {
      name: 'Unit of Work',
      used: true,
      explanation: 'sendMoney() wraps debit and credit in a single ReentrantLock block, ensuring atomicity. If the debit succeeds but the credit fails (impossible with in-memory, but relevant for DB), the entire operation rolls back.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'WalletService handles business logic (balance validation, transfers). WalletRepository handles data persistence. Wallet/Transaction are pure data models. PaymentMethod is an enum type.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new payment method requires only adding an enum constant and updating frontend options. The fund addition logic remains unchanged. New transaction types can be added without structural changes.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Service depends on repository abstraction, not on ConcurrentHashMap. This allows swapping to a database-backed repository via Spring configuration without changing service code.'
    },
    {
      name: 'Encapsulation',
      description: 'Wallet balance is only modified through addFunds() and sendMoney() methods. External code cannot directly set wallet balances. Transactions are immutable after creation.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Financial Integrity',
      description: 'Wallet balance has no public setter — only the service can modify it through controlled operations that enforce business rules (sufficient balance for transfers, positive amounts).',
      alternative: 'Could expose setBalance(). Controlled mutation prevents unauthorized balance changes and ensures every balance change is accompanied by a transaction record.'
    },
    {
      name: 'Value Objects — Transaction Records',
      description: 'Transactions are immutable after creation. All fields are set at construction and never modified. This provides a reliable audit trail.',
      alternative: 'Could make transactions mutable. Immutability prevents accidental modification of financial records and makes the history tamper-evident.'
    },
    {
      name: 'Enum-based Type Safety — Payment Methods',
      description: 'PaymentMethod enum provides compile-time safety for supported payment types. New methods can be added without changing method signatures.',
      alternative: 'Could use strings for payment methods. Enum provides autocomplete, prevents typos, and makes the fixed set of options explicit.'
    }
  ],
  extensibility: [
    {
      area: 'Multi-Currency Support',
      description: 'Add Currency enum with exchange rates. Wallet gets a currency field. Add convertCurrency(walletId, targetCurrency) method. Transactions store both original and converted amounts.',
      difficulty: 'Medium'
    },
    {
      area: 'Transaction Limits',
      description: 'Add daily/monthly transaction limits per wallet. sendMoney() checks limits before processing. Repository tracks daily totals. Exceeded limits return FAILED status.',
      difficulty: 'Easy'
    },
    {
      area: 'Scheduled Transfers',
      description: 'Add ScheduledPayment entity with recurrence (daily/weekly/monthly). A scheduled job processes due payments. Uses existing sendMoney() for execution.',
      difficulty: 'Medium'
    },
    {
      area: 'Fraud Detection',
      description: 'Add FraudDetectionService that analyzes transaction patterns: unusual amounts, rapid successive transfers, multiple failed attempts. Flags suspicious transactions as PENDING for review.',
      difficulty: 'Hard'
    },
    {
      area: 'QR Code Payments',
      description: 'Generate QR codes for wallet IDs. Frontend scans QR to auto-fill recipient. Backend adds generateQR(walletId) and processQRPayment(scannedId, amount) endpoints.',
      difficulty: 'Easy'
    },
    {
      area: 'Interest on Balance',
      description: 'Add daily interest calculation (e.g., 4% APR). A scheduled job credits interest to all wallets daily. Interest transactions have special type "INTEREST".',
      difficulty: 'Medium'
    },
    {
      area: 'Database Persistence',
      description: 'Implement JpaLudoRepository. Game state serialized as JSON or relational. Swap via Spring profile. Service layer unchanged due to Dependency Injection.',
      difficulty: 'Medium'
    }
  ]
};
