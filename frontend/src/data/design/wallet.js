// designDetails — wallet
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Digital Wallet — Design Details',
  requirements: [
    'Digital wallet system supporting multiple users with individual wallet accounts',
    'Each wallet has: user ID, user name, balance in INR, creation timestamp',
    'Create wallet: new wallet with ₹0 starting balance and unique ID',
    'Credit (add funds): deposit money via payment methods (UPI, CARD, BANK_TRANSFER, WALLET_BALANCE)',
    'Debit (withdraw funds): remove money from a wallet, rejected if it would go negative',
    'Transfer (send money): move funds between two wallets with balance validation and self-transfer rejection',
    'Every credit, debit and transfer is modelled as an executable Command object; the command log IS the operational history',
    'Deadlock-free concurrent transfers: two wallets can be the target of many simultaneous transfers, in either direction, without corrupting balances or deadlocking',
    'Transaction history: complete per-wallet log of all credits, debits, and transfers, immutable after creation',
    'Isolated interactive simulation sandbox — a completely separate wallet repository so a demo run can never touch live balances',
  ],
  entities: [
    {
      name: 'WalletService',
      description: 'Facade the controller delegates to wholesale. Builds and executes WalletCommands against a per-wallet ReentrantLock map, appends every executed command to a command log, and owns a second, fully isolated WalletRepository + lock map for the /sim/* engine.',
      fields: [
        { name: 'repository', type: 'WalletRepository', description: 'Live data access layer, injected via constructor' },
        { name: 'walletLocks', type: 'ConcurrentHashMap<Long, ReentrantLock>', description: 'One lazily-created lock per wallet id (computeIfAbsent) — never a single global lock' },
        { name: 'commandLog', type: 'List<WalletCommand>', description: 'Every successfully executed command, in order — the transaction history is literally this list' },
        { name: 'simRepository', type: 'WalletRepository', description: 'Independent sandbox repository backing /sim/*, rebuilt from scratch on every simReset()' },
      ],
      methods: [
        { name: 'createWallet(userId, userName)', returns: 'Wallet', description: 'Creates a new wallet with ₹0 balance' },
        { name: 'addFunds(walletId, amount, paymentMethod)', returns: 'Map', description: 'Builds and executes a CreditCommand' },
        { name: 'withdrawFunds(walletId, amount, description)', returns: 'Map', description: 'Builds and executes a DebitCommand' },
        { name: 'sendMoney(from, to, amount, description)', returns: 'Map', description: 'Builds and executes a TransferCommand — see TransferCommand for the ascending-lock-order rule' },
        { name: 'getTransactions(walletId)', returns: 'List<Transaction>', description: 'Full per-wallet transaction history' },
        { name: 'getCommandLog()', returns: 'List<String>', description: "The Command pattern's execution log, human-readable" },
      ]
    },
    {
      name: 'WalletCommand',
      stereotype: 'interface',
      description: 'Command pattern contract: execute() performs the operation under the correct lock(s) and returns the Transaction it produced. describe() gives the sim/command log a readable label.',
      fields: [],
      methods: [
        { name: 'execute()', returns: 'Transaction', description: 'Performs the mutation and returns the resulting transaction record' },
        { name: 'describe()', returns: 'String', description: 'Default method — short label for the command log / sim event feed' },
      ]
    },
    {
      name: 'CreditCommand',
      description: 'Adds funds to exactly one wallet. Holds only that wallet\'s lock — a credit never touches a second wallet, so no lock ordering is needed.',
      fields: [
        { name: 'walletId', type: 'long', description: 'Wallet to credit' },
        { name: 'amount', type: 'double', description: 'Amount to add — rejected if <= 0' },
        { name: 'paymentMethod', type: 'String', description: 'UPI / CARD / BANK_TRANSFER / WALLET_BALANCE' },
      ],
      methods: [{ name: 'execute()', returns: 'Transaction', description: 'Locks the wallet, increases balance, records a CREDIT transaction' }],
    },
    {
      name: 'DebitCommand',
      description: 'Withdraws funds from exactly one wallet. Re-reads and re-checks the balance inside the lock, closing the classic check-then-act race.',
      fields: [
        { name: 'walletId', type: 'long', description: 'Wallet to debit' },
        { name: 'amount', type: 'double', description: 'Amount to remove — rejected if it would take the balance negative' },
      ],
      methods: [{ name: 'execute()', returns: 'Transaction', description: 'Locks the wallet, validates sufficient balance, decreases balance, records a DEBIT transaction' }],
    },
    {
      name: 'TransferCommand',
      description: 'Moves funds between two wallets atomically. The deadlock-free locking centerpiece: always locks min(fromId, toId) first, then max(fromId, toId), regardless of transfer direction, so no cycle of waiters can ever form between two concurrent opposite-direction transfers.',
      fields: [
        { name: 'fromWalletId', type: 'long', description: 'Sender wallet' },
        { name: 'toWalletId', type: 'long', description: 'Recipient wallet — must differ from fromWalletId' },
        { name: 'amount', type: 'double', description: 'Transfer amount — rejected if it exceeds the sender\'s balance' },
        { name: 'lockProvider', type: 'LongFunction<ReentrantLock>', description: 'Supplies the per-wallet lock for any wallet id, ascending-order acquisition' },
      ],
      methods: [{ name: 'execute()', returns: 'Transaction', description: 'lock(min(from,to)) -> lock(max(from,to)) -> validate -> move funds -> record a TRANSFER transaction -> unlock in reverse order' }],
    },
    {
      name: 'WalletRepository',
      description: 'In-memory data store with ConcurrentHashMap. Seeds 3 wallets (Alice: ₹5000, Bob: ₹3000, Charlie: ₹10000). Generates sequential IDs via AtomicLong. Instantiated a second time, independently, for the /sim/* sandbox.',
      fields: [
        { name: 'wallets', type: 'ConcurrentHashMap<Long, Wallet>', description: 'All wallets indexed by ID' },
        { name: 'transactions', type: 'ConcurrentHashMap<Long, List<Transaction>>', description: 'Transactions indexed by wallet ID — a TRANSFER is filed under both wallets' },
        { name: 'walletIdGen', type: 'AtomicLong', description: 'Sequential wallet ID generator' },
        { name: 'transactionIdGen', type: 'AtomicLong', description: 'Sequential transaction ID generator' },
      ],
      methods: [
        { name: 'findWalletById(id)', returns: 'Wallet', description: 'O(1) wallet lookup, null if absent' },
        { name: 'saveWallet(wallet)', returns: 'Wallet', description: 'Upserts wallet into the map' },
        { name: 'addTransaction(txn)', returns: 'void', description: 'Thread-safe transaction storage per wallet' },
        { name: 'totalBalance()', returns: 'double', description: 'Sum of every wallet\'s balance — used to assert conservation under concurrency' },
      ]
    },
    {
      name: 'Wallet',
      description: 'User wallet with balance and metadata. Balance is only ever mutated by a WalletCommand holding this wallet\'s lock.',
      fields: [
        { name: 'id', type: 'long', description: 'Unique wallet identifier' },
        { name: 'userId', type: 'String', description: 'User\'s unique ID' },
        { name: 'userName', type: 'String', description: 'Display name of the wallet owner' },
        { name: 'balance', type: 'double', description: 'Current wallet balance in INR' },
        { name: 'currency', type: 'String', description: 'Currency code (INR)' },
        { name: 'createdAt', type: 'LocalDateTime', description: 'Timestamp of wallet creation' },
      ],
      methods: []
    },
    {
      name: 'Transaction',
      description: 'Immutable-after-creation record of one command execution.',
      fields: [
        { name: 'id', type: 'long', description: 'Unique transaction ID' },
        { name: 'fromWalletId', type: 'Long', description: 'Source wallet (null for a credit)' },
        { name: 'toWalletId', type: 'Long', description: 'Destination wallet (null for a debit)' },
        { name: 'walletId', type: 'Long', description: 'The wallet this row is filed under' },
        { name: 'amount', type: 'double', description: 'Transaction amount' },
        { name: 'type', type: 'Transaction.Type', description: 'CREDIT, DEBIT, or TRANSFER (nested enum)' },
        { name: 'status', type: 'Transaction.Status', description: 'COMPLETED or FAILED (nested enum)' },
        { name: 'timestamp', type: 'LocalDateTime', description: 'When the transaction occurred' },
        { name: 'description', type: 'String', description: 'User-provided memo or system description' },
      ],
      methods: []
    },
    {
      name: 'PaymentMethod',
      stereotype: 'enum',
      description: 'Supported payment methods for crediting a wallet via CreditCommand.',
      fields: [
        { name: 'UPI', type: 'enum constant', description: 'Unified Payments Interface — instant bank transfer' },
        { name: 'CARD', type: 'enum constant', description: 'Credit or debit card payment' },
        { name: 'BANK_TRANSFER', type: 'enum constant', description: 'Direct bank account transfer (NEFT/RTGS)' },
        { name: 'WALLET_BALANCE', type: 'enum constant', description: 'Use existing wallet balance (internal)' },
      ],
      methods: []
    },
    {
      name: 'WalletException',
      stereotype: 'abstract',
      description: 'Base of the module\'s exception hierarchy, extends com.lld.config.DomainException so GlobalExceptionHandler maps every subclass to the right HTTP status automatically.',
      fields: [],
      methods: []
    },
  ],
  designPatterns: [
    {
      name: 'Command Pattern',
      used: true,
      explanation: 'CreditCommand, DebitCommand and TransferCommand each encapsulate one wallet mutation — the locking, validation and arithmetic for that operation live entirely inside the command, not scattered across WalletService methods. WalletService only builds a command, calls execute(), and appends it to commandLog, which IS the wallet\'s operational history.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'WalletRepository abstracts all data access behind semantic methods. The service calls findWalletById(), saveWallet(), addTransaction() rather than manipulating a ConcurrentHashMap directly — and the exact same class is instantiated a second time, independently, for the isolated /sim/* sandbox.'
    },
    {
      name: 'Per-Entity Lock (not a global lock)',
      used: true,
      explanation: 'One ReentrantLock per wallet id (lazily created via computeIfAbsent), the same idiom as InventoryService\'s per-product locks — replacing the single ReentrantLock that used to serialize every operation on every wallet, live or not, even between unrelated wallets.'
    },
    {
      name: 'Deadlock-Free Two-Lock Ordering',
      used: true,
      explanation: 'TransferCommand always acquires lock(min(fromId, toId)) before lock(max(fromId, toId)), never "from then to" — so a reverse-direction transfer racing the same pair of wallets acquires locks in the identical order and can never form a wait cycle.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'WalletService receives WalletRepository via constructor injection. Spring auto-wires the live bean; the sandbox repository is constructed directly (new WalletRepository()) so it never touches Spring\'s singleton.'
    },
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'WalletService orchestrates (builds commands, executes, logs). Each WalletCommand owns exactly one operation\'s validation and arithmetic. WalletRepository handles persistence. Wallet/Transaction are pure data models.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new wallet operation (e.g. a RefundCommand) means adding one new WalletCommand implementation — WalletService\'s existing methods and the lock-ordering discipline in TransferCommand are untouched.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'WalletService depends on the WalletCommand interface and the WalletRepository abstraction, not on ConcurrentHashMap or the concrete command classes\' internals.'
    },
    {
      name: 'Encapsulation',
      description: 'Wallet balance is only ever mutated inside a command\'s locked execute() — external code cannot directly set a balance without going through validation and lock acquisition.'
    },
  ],
  oopConcepts: [
    {
      name: 'Command Pattern — Encapsulated Operations',
      description: 'Each mutation (credit/debit/transfer) is its own object implementing WalletCommand, not a method with a switch on operation type.',
      alternative: 'Could inline all three operations as WalletService methods sharing one lock. The Command objects keep each operation\'s locking rule local to where it is used and make the execution log a natural byproduct of calling execute().'
    },
    {
      name: 'Per-Entity Locking — Fine-Grained Concurrency',
      description: 'A ConcurrentHashMap<Long, ReentrantLock> gives every wallet its own lock, so transfers between wallet 1&2 never block a credit to wallet 3.',
      alternative: 'A single global lock (the original implementation) serializes all wallets behind one mutex — correct but throughput collapses as wallet count grows.'
    },
    {
      name: 'Enum-based Type Safety — Transaction & Payment Types',
      description: 'Transaction.Type, Transaction.Status and PaymentMethod are enums, giving compile-time safety and eliminating stringly-typed comparisons.',
      alternative: 'Could use raw strings. Enums provide autocomplete, prevent typos, and make the fixed set of options explicit in the type system.'
    },
  ],
  extensibility: [
    {
      area: 'Undo / Reversal',
      description: 'WalletCommand could gain an undo() method (mirroring chess\'s MoveCommand) that reverses exactly what execute() did — a natural fit since each command already owns its own locking.',
      difficulty: 'Medium'
    },
    {
      area: 'Multi-Currency Support',
      description: 'Add a Currency enum with exchange rates. Wallet gets a currency field (already present). Add a ConvertCommand. Transactions store both original and converted amounts.',
      difficulty: 'Medium'
    },
    {
      area: 'Transaction Limits',
      description: 'CreditCommand/DebitCommand/TransferCommand each check a daily/monthly cap before mutating — the check lives inside the command, alongside the balance check it already performs.',
      difficulty: 'Easy'
    },
    {
      area: 'Scheduled Transfers',
      description: 'A ScheduledPayment entity with recurrence; a scheduled job builds and executes a TransferCommand when due — reusing the existing command, not a parallel code path.',
      difficulty: 'Medium'
    },
    {
      area: 'Fraud Detection',
      description: 'A FraudDetectionService inspects the commandLog for unusual patterns (rapid successive transfers, repeated failed debits) and can flag a wallet before its next command executes.',
      difficulty: 'Hard'
    },
    {
      area: 'Database Persistence',
      description: 'Implement a JPA-backed WalletRepository. WalletCommand and WalletService are unchanged — they depend only on the repository\'s method signatures, not on ConcurrentHashMap.',
      difficulty: 'Medium'
    },
  ]
};
