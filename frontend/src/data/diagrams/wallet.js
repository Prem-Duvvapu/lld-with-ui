// classDiagrams — wallet
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Digital Wallet — Class Diagram',
  classes: [
    {
      name: 'WalletController',
      stereotype: 'controller',
      fields: [],
      methods: [
        '+ createWallet(req): Wallet',
        '+ addFunds(id, req): Map',
        '+ withdraw(id, req): Map',
        '+ sendMoney(req): Map',
        '+ getCommandLog(): List<String>'
      ]
    },
    {
      name: 'WalletService',
      fields: [
        '- repository: WalletRepository',
        '- walletLocks: ConcurrentHashMap<Long, ReentrantLock>',
        '- commandLog: List<WalletCommand>',
        '- simRepository: WalletRepository'
      ],
      methods: [
        '+ createWallet(userId, name): Wallet',
        '+ addFunds(id, amt, method): Map',
        '+ withdrawFunds(id, amt, desc): Map',
        '+ sendMoney(from, to, amt, desc): Map',
        '+ getTransactions(id): List<Transaction>',
        '+ getCommandLog(): List<String>',
        '+ simReset() / simCredit() / simDebit() / simTransfer() / simRace()'
      ]
    },
    {
      name: 'WalletCommand',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ execute(): Transaction',
        '+ describe(): String'
      ]
    },
    {
      name: 'CreditCommand',
      fields: [
        '- repository: WalletRepository',
        '- walletLock: ReentrantLock',
        '- walletId: long',
        '- amount: double',
        '- paymentMethod: String'
      ],
      methods: [
        '+ execute(): Transaction'
      ]
    },
    {
      name: 'DebitCommand',
      fields: [
        '- repository: WalletRepository',
        '- walletLock: ReentrantLock',
        '- walletId: long',
        '- amount: double'
      ],
      methods: [
        '+ execute(): Transaction'
      ]
    },
    {
      name: 'TransferCommand',
      fields: [
        '- repository: WalletRepository',
        '- lockProvider: LongFunction<ReentrantLock>',
        '- fromWalletId: long',
        '- toWalletId: long',
        '- amount: double'
      ],
      methods: [
        '+ execute(): Transaction  // locks min(id) then max(id)'
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
        '- walletId: Long',
        '- amount: double',
        '- type: Type (CREDIT/DEBIT/TRANSFER)',
        '- status: Status (COMPLETED/FAILED)',
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
        '- wallets: ConcurrentHashMap<Long, Wallet>',
        '- transactions: ConcurrentHashMap<Long, List<Transaction>>',
        '- walletIdGen: AtomicLong',
        '- transactionIdGen: AtomicLong'
      ],
      methods: [
        '+ findWalletById(id): Wallet',
        '+ saveWallet(w): Wallet',
        '+ addTransaction(t): void',
        '+ totalBalance(): double',
        '+ getTransactionsByWalletId(id): List'
      ]
    },
    {
      name: 'WalletException',
      stereotype: 'abstract',
      fields: [],
      methods: []
    },
    {
      name: 'WalletNotFoundException',
      fields: ['404'],
      methods: []
    },
    {
      name: 'InsufficientBalanceException',
      fields: ['409'],
      methods: []
    },
    {
      name: 'InvalidAmountException',
      fields: ['400'],
      methods: []
    },
    {
      name: 'SelfTransferException',
      fields: ['400'],
      methods: []
    },
    {
      name: 'WalletSimEvent',
      fields: [
        '- id: String',
        '- stepNumber: int',
        '- eventType: String',
        '- status: String',
        '- details: Map<String, Object>'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'WalletController', to: 'WalletService', label: 'delegates to' },
    { from: 'WalletService', to: 'WalletRepository', label: 'uses (live)' },
    { from: 'WalletService', to: 'WalletCommand', label: 'builds & executes' },
    { from: 'WalletService', to: 'WalletSimEvent', label: 'logs (sim)' },
    { from: 'CreditCommand', to: 'WalletCommand', label: 'implements' },
    { from: 'DebitCommand', to: 'WalletCommand', label: 'implements' },
    { from: 'TransferCommand', to: 'WalletCommand', label: 'implements' },
    { from: 'CreditCommand', to: 'WalletRepository', label: 'mutates' },
    { from: 'DebitCommand', to: 'WalletRepository', label: 'mutates' },
    { from: 'TransferCommand', to: 'WalletRepository', label: 'mutates (2 wallets)' },
    { from: 'CreditCommand', to: 'Transaction', label: 'creates' },
    { from: 'DebitCommand', to: 'Transaction', label: 'creates' },
    { from: 'TransferCommand', to: 'Transaction', label: 'creates' },
    { from: 'WalletRepository', to: 'Wallet', label: 'stores' },
    { from: 'Transaction', to: 'Wallet', label: 'references (from/to)' },
    { from: 'CreditCommand', to: 'PaymentMethod', label: 'records' },
    { from: 'WalletNotFoundException', to: 'WalletException', label: 'extends' },
    { from: 'InsufficientBalanceException', to: 'WalletException', label: 'extends' },
    { from: 'InvalidAmountException', to: 'WalletException', label: 'extends' },
    { from: 'SelfTransferException', to: 'WalletException', label: 'extends' },
    { from: 'DebitCommand', to: 'InsufficientBalanceException', label: 'throws' },
    { from: 'TransferCommand', to: 'InsufficientBalanceException', label: 'throws' },
    { from: 'TransferCommand', to: 'SelfTransferException', label: 'throws' }
  ]
};
