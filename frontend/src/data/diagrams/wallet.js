// classDiagrams — wallet
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Digital Wallet — Class Diagram',
  classes: [
    {
      name: 'WalletService',
      fields: [
        '- repository: WalletRepository',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ createWallet(userId, name): Wallet',
        '+ getBalance(id): double',
        '+ addFunds(id, amt, method): Map',
        '+ sendMoney(from, to, amt, desc): Map',
        '+ getTransactions(id): List<Transaction>'
      ]
    },
    {
      name: 'Wallet',
      fields: [
        '- id: long',
        '- userId: String',
        '- userName: String',
        '- balance: double',
        '- currency: String',
        '- createdAt: LocalDateTime'
      ],
      methods: [
        '+ setBalance(b): void'
      ]
    },
    {
      name: 'Transaction',
      fields: [
        '- id: long',
        '- fromWalletId: Long',
        '- toWalletId: Long',
        '- amount: double',
        '- type: String (CREDIT/DEBIT/TRANSFER)',
        '- status: String (PENDING/COMPLETED/FAILED)',
        '- timestamp: LocalDateTime',
        '- description: String'
      ],
      methods: []
    },
    {
      name: 'PaymentMethod',
      stereotype: 'enum',
      fields: [
        'UPI',
        'CARD',
        'BANK_TRANSFER',
        'WALLET_BALANCE'
      ],
      methods: []
    },
    {
      name: 'WalletRepository',
      fields: [
        '- wallets: ConcurrentHashMap',
        '- transactions: ConcurrentHashMap',
        '- walletIdGen: AtomicLong',
        '- txnIdGen: AtomicLong'
      ],
      methods: [
        '+ findWalletById(id): Wallet',
        '+ saveWallet(w): Wallet',
        '+ addTransaction(t): void',
        '+ getTransactionsByWalletId(id): List'
      ]
    }
  ],
  relationships: [
    {
      from: 'WalletService',
      to: 'WalletRepository',
      label: 'uses'
    },
    {
      from: 'WalletService',
      to: 'Wallet',
      label: 'manages'
    },
    {
      from: 'WalletService',
      to: 'Transaction',
      label: 'creates'
    },
    {
      from: 'Transaction',
      to: 'Wallet',
      label: 'references (from/to)'
    }
  ]
};
