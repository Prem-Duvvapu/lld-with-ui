// designDetails — atm
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'ATM System — Design Details',
  requirements: [
    'Live session lifecycle: one fair sessionLock protects admission, account/cassette work, settlement and response capture. All live phase changes use transitionTo and the singleton SessionState table. Ejection waits for admitted money movement before clearing the card/account.',
    'Live lock order is terminal → account → dispenser. A physical terminal has one authenticated account at a time; holding its lock across a command prevents ejection or card changes between admission and settlement. Account and cassette locks retain their independent storage and note-selection responsibilities.',
    'Cash inventory: CashDispenser locks the complete note calculation and deduction. getDispenserSnapshot holds its lock across both total and copied inventory; coordinated terminal snapshots also hold the live session lock across account/history capture.',
    'Dispense Strategy + Factory: an EnumMap selects two policies backed by ExactDenominationPlanner. MINIMIZE_NOTES finds the fewest notes, breaking ties by preferring more ₹2000, then ₹500, then ₹200 notes. CONSERVE_LARGE_NOTES lexicographically minimizes use of ₹2000, then ₹500, then ₹200 notes among exact feasible plans; it need not minimize the total note count.',
    'Withdrawal compensation: after debiting, the live service credits the amount back specifically when dispenseCash throws InsufficientCashException and records a FAILED transaction. This in-memory compensation is not a database transaction, crash recovery or a guarantee that every unexpected failure is rolled back.',
    'PIN attempts: authentication checks the submitted card against the inserted card and its phase before comparing the stored demo PIN. Wrong-card requests do not consume another card’s attempts. Wrong PIN increments and blocks at three; successful authentication resets attempts. Replaying a coordinated PIN request returns its original outcome without another increment.',
    'Request amounts: the controller accepts finite JSON numbers, not numeric strings. The service requires finite positive amounts; withdrawals must also be exact multiples of ₹100 within the int dispenser range before conversion. Deposits may be fractional ledger amounts and reject a non-finite resulting balance. Both credits and debits reject an amount that rounds away to the unchanged double balance before money or audit mutation. This is not a conversion to an exact monetary type. HTTP withdrawal mode defaults to MINIMIZE_NOTES when omitted/null; other values must match one of the two enum names.',
    'REST deposits are ledger credits: the controller passes null for notes, so a successful deposit does not replenish the cassette or verify a physical note total. The service method can add a supplied note map, but has no validation that its counts/value match the credited amount.',
    'Browser-owned terminal commands carry a tab token, process boot identifier, expected revision and request UUID. Other browsers see BUSY without account/card/history and cannot eject or mutate that owner’s session. Ten minutes of inactivity releases the slot when next observed; reads do not renew the lease.',
    'Request recovery: up to1024 command outcomes are retained per process. The same request/body replays its original receipt or failure without repeating money movement or a PIN attempt; changing its body is409. Every admitted attempt advances revision, so stale commands cannot execute again after eviction or a new session. A process boot identifier rejects old commands after restart. The journal is not durable storage.',
    'GET terminal request status is read-only. NOT_FOUND does not prove that an earlier request was cancelled or will not arrive. The browser may explicitly retry only its original body/key; it must not turn a lost withdrawal response into a fresh withdrawal.',
    'Sandbox isolation: /api/atm/sim/* uses its own BankingRepository, CashDispenser, accounts and cards, sharing strategy implementations with live dispensing. Mutations and detached state/event reads share the AtmService monitor and assign simState directly. Reset and response capture are one operation. A client request burst is processed serially; this is not a live account-lock race or enforcement through SessionStates.',
    'Domain errors use AtmException → DomainException and the shared ErrorResponse (error, code, status, timestamp). Invalid requests/session states and insufficient balance are 400; a well-formed incorrect PIN is 401; blocked card is 403; missing account/card is 404; insufficient cash is 409. Unexpected internal operation failures use a separate non-domain AtmOperationUncertainException and500 ErrorResponse; a cached500 stays an uncertain recovery outcome. Sandbox withdrawal responses include withdrawalOutcome (SUCCESS, REJECTED, INSUFFICIENT_BALANCE or DISPENSER_FAILED). A 200 response is not proof of approval; invalid insertion/authentication transitions use the shared typed error contract.'
  ],
  entities: [
    {
      name: 'AtmService',
      description: 'Spring @Service coordinating one live terminal under sessionLock and a separate sandbox under its own monitor. AtmLiveSessionCoordinator owns browser lease/revision and bounded request outcomes; the service owns money/state behavior.',
      fields: [
        {
          name: 'bankingRepository',
          type: 'BankingRepository',
          description: 'Injected live account/card store. The sandbox uses a different repository instance, simBankingRepository.'
        },
        {
          name: 'cashDispenser',
          type: 'CashDispenser',
          description: 'Injected live in-memory note cassette; no physical device driver is implemented.'
        },
        {
          name: 'currentState',
          type: 'ATMState',
          description: 'Volatile phase with every live update checked through transitionTo under the terminal lock. Read the coordinated snapshot for a coherent session/account/history view.'
        },
        {
          name: 'activeCard',
          type: 'Card',
          description: 'Live card selected by insertion; authenticate compares this object’s PIN.'
        },
        {
          name: 'activeAccount',
          type: 'Account',
          description: 'Account selected on card insertion, before PIN verification; money operations additionally check the session phase and account number.'
        },
        { name: 'sessionLock', type: 'ReentrantLock', description: 'Fair terminal lock held across live admission, money operations, ejection and coordinated snapshot capture; always acquired before account/cassette locks.' },
        { name: 'simBankingRepository', type: 'BankingRepository', description: 'Separate sandbox account/card store; never the injected live repository.' },
        { name: 'simCashDispenser', type: 'CashDispenser', description: 'Separate sandbox cassette using the shared strategy factory.' },
        { name: 'simState', type: 'ATMState', description: 'Sandbox phase directly assigned by synchronized mutation methods; no SessionStates table check.' }
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Private live transition: takes sessionLock reentrantly, checks SessionStates.of(currentState).canTransitionTo(target), and tracks legacy state changes for revision admission.' },
        { name: 'getSimSnapshots()', returns: 'Map<String, Object>', description: 'Captures state, detached accounts/cards/events/details and inventory under the sandbox mutation monitor. The state and legacy snapshots routes share this capture; no returned Account/Card/SimEvent is a live sandbox model.' },
        {
          name: 'insertCard(cardNumber)',
          returns: 'Map<String, Object>',
          description: 'Validates card existence, checks block status, and transitions to CARD_INSERTED'
        },
        {
          name: 'authenticate(cardNumber, pin)',
          returns: 'Account',
          description: 'Matches the submitted card to the inserted card, checks phase and PIN, and returns a detached Account. authenticateSnapshot captures its HTTP response and phase under the same terminal lock.'
        },
        {
          name: 'withdraw(accNum, amount, mode)',
          returns: 'WithdrawalTransaction',
          description: 'Holds terminal then account locks across admission, debit, exact dispensing, audit recording and settlement. Returns a detached receipt; compensates InsufficientCashException specifically, without promising general durable rollback.'
        },
        {
          name: 'deposit(accNum, amount, notes)',
          returns: 'DepositTransaction',
          description: 'Credits a valid positive amount under terminal/account locks and returns a detached receipt. HTTP supplies null notes, so it is a ledger-credit demo and leaves cassette inventory unchanged.'
        },
        {
          name: 'ejectCard()',
          returns: 'Map<String, Object>',
          description: 'Acquires the same terminal lock as money movement, waits for admitted work, then transitions through SESSION_ENDED to IDLE and clears references. Coordinated requests additionally require the owning browser and current revision.'
        }
      ]
    },
    {
      name: 'CashDispenser',
      description: 'In-memory note inventory protected by a fair ReentrantLock, with note selection delegated to a strategy. This models dispensing; it does not acknowledge real hardware delivery.',
      fields: [
        {
          name: 'noteInventory',
          type: 'Map<NoteDenomination, Integer>',
          description: 'Stock count of notes for ₹2000, ₹500, ₹200, ₹100'
        },
        {
          name: 'dispenserLock',
          type: 'ReentrantLock',
          description: 'Fair lock serializing inventory methods, including calculate-and-deduct across denominations.'
        },
        {
          name: 'strategyFactory',
          type: 'DenominationDispenseStrategyFactory',
          description: 'Selects an existing registered strategy for each dispenseCash(amount, mode) call; strategies are not newly constructed per withdrawal.'
        },
        {
          name: 'defaultMode',
          type: 'DispenseMode',
          description: 'Mode used when dispenseCash(amount) is called without an explicit mode'
        }
      ],
      methods: [
        {
          name: 'dispenseCash(amount, mode)',
          returns: 'Map<NoteDenomination, Integer>',
          description: 'Checks the long-valued cash total, computes an exact policy-optimal plan and deducts the completed note map under one lock. InsufficientCashException before deduction leaves inventory unchanged.'
        },
        {
          name: 'addNotes(denom, count)',
          returns: 'void',
          description: 'Adds a non-negative count for a non-null denomination under the dispenser lock; rejects per-denomination int overflow. Zero is accepted. It does not validate an amount-to-notes match.'
        },
        {
          name: 'getTotalCashAvailable()',
          returns: 'long',
          description: 'Sums denomination value × int count with long arithmetic under the dispenser lock. The total can exceed Integer.MAX_VALUE; separate inventory/total reads need not observe the same version.'
        }
      ]
    },
    {
      name: 'DenominationDispenseStrategy (Interface)',
      description: 'Strategy interface for selecting a note mix from inventory. Both registered implementations delegate to the exact planner with different objectives; the legacy GreedyDenominationDispenseStrategy name no longer describes a single-pass greedy algorithm.',
      fields: [],
      methods: [
        {
          name: 'calculateNotes(amount, availableInventory)',
          returns: 'Map<NoteDenomination, Integer>',
          description: 'Returns an exact policy-optimal note map without mutating the input. For valid positive int amounts divisible by ₹100 and valid non-negative inventories of the four supported denominations, InsufficientCashException means no exact combination exists.'
        }
      ]
    },
    {
      name: 'Account',
      description: 'Mutable account with a fair lock supplied to callers. getBalance/setBalance do not acquire it themselves; AtmService takes it around live money operations.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Account ID'
        },
        {
          name: 'accountNumber',
          type: 'String',
          description: 'Bank account number'
        },
        {
          name: 'holderName',
          type: 'String',
          description: 'Account holder legal name'
        },
        {
          name: 'balance',
          type: 'double',
          description: 'Current available balance in INR'
        },
        {
          name: 'accountLock',
          type: 'ReentrantLock',
          description: 'Fair per-account mutex used by cooperating service callers, not an automatic lock inside accessors.'
        }
      ],
      methods: [
        {
          name: 'getLock()',
          returns: 'ReentrantLock',
          description: 'Exposes the lock for callers to acquire around a complete balance workflow.'
        },
        {
          name: 'setBalance(balance)',
          returns: 'void',
          description: 'Plain assignment with no internal locking or validation; debit/credit arithmetic lives in AtmService.'
        }
      ]
    },
    {
      name: 'Card',
      description: 'Demo card with a plaintext PIN, atomic attempt counter and volatile block flag. AtmService owns PIN comparison and the three-attempt blocking decision.',
      fields: [
        {
          name: 'cardNumber',
          type: 'String',
          description: 'Card identifier; seeded live cards use 16 digits, while sandbox identifiers are CARD-SIM-1/2.'
        },
        {
          name: 'pin',
          type: 'String',
          description: 'Plaintext PIN exposed by a generated getter; request validation requires four ASCII digits. No PIN hashing is implemented.'
        },
        {
          name: 'accountNumber',
          type: 'String',
          description: 'Linked bank account number'
        },
        {
          name: 'failedPinAttempts',
          type: 'AtomicInteger',
          description: 'Consecutive failed PIN counter'
        },
        {
          name: 'isBlocked',
          type: 'boolean',
          description: 'Security block flag (set after 3 failed attempts)'
        }
      ],
      methods: [
        {
          name: 'incrementFailedAttempts()',
          returns: 'int',
          description: 'Atomically increments the counter and returns its value; the service must separately call blockCard.'
        },
        {
          name: 'blockCard()',
          returns: 'void',
          description: 'Sets the block flag; called separately after the service observes three failed PIN attempts.'
        },
        {
          name: 'resetFailedAttempts()',
          returns: 'void',
          description: 'Resets counter to 0 on successful authentication'
        }
      ]
    },
    {
      name: 'Transaction (Abstract)',
      description: 'Abstract transaction record base class for WithdrawalTransaction and DepositTransaction. Execution stays in AtmService; this class has no template execution method.',
      fields: [
        {
          name: 'transactionId',
          type: 'String',
          description: 'Unique transaction reference ID'
        },
        {
          name: 'accountNumber',
          type: 'String',
          description: 'Target bank account number'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Transaction monetary amount'
        },
        {
          name: 'status',
          type: 'String',
          description: 'SUCCESS by default; live withdrawal records balance/cash failures as FAILED. Validation/session rejections do not all produce a transaction record.'
        },
        {
          name: 'timestampEpoch',
          type: 'long',
          description: 'Construction time in epoch milliseconds'
        }
      ],
      methods: [
        {
          name: 'getTransactionId()',
          returns: 'String',
          description: 'Lombok-generated accessor for the transaction reference'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State Pattern',
      used: true,
      explanation: 'One singleton SessionState implementation per ATMState declares allowedNext. All live lifecycle and transaction phase changes consult transitionTo under the terminal lock. The isolated sandbox assigns simState directly under its mutation monitor and does not use this live transition table.'
    },
    {
      name: 'Strategy + Factory Pattern',
      used: true,
      explanation: 'An EnumMap registers the two Spring-managed strategies once. CashDispenser invokes calculateNotes through the selected interface. Both strategies share ExactDenominationPlanner, which applies their different objectives to complete feasible plans; the legacy Greedy class name is retained for compatibility.'
    },
    {
      name: 'Template Method Pattern',
      used: false,
      explanation: 'Transaction shares record fields and constructor initialization only. AtmService owns withdrawal and deposit execution; there is no template algorithm with overridable hooks here. KvReadTemplate in Key-Value Store is the verified Template Method example.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'AtmService and the injected CashDispenser have Spring singleton scope per application context. Separately, SessionStates holds explicit singleton instances with private constructors. The service also constructs a distinct sandbox CashDispenser, so the class does not have a global single-instance restriction.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'BankingRepository handles lookups/storage, CashDispenser protects note inventory, and AtmService coordinates workflows. The service also contains sandbox orchestration; the repository does not enforce session or ownership rules.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'A new note-selection implementation can leave CashDispenser unchanged, but introducing a selectable mode requires updating DispenseMode and the factory registration (and the controller’s advertised mode contract).'
    },
    {
      name: 'Dependency Inversion Principle (DIP)',
      description: 'CashDispenser receives a concrete strategy factory, then invokes the selected DenominationDispenseStrategy interface. Note calculation is polymorphic; factory construction still names the concrete implementations.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Private fields constrain access, but Account exposes a plain setBalance and its lock, while Card exposes a PIN getter. The service, rather than the entities alone, enforces the normal locking and authentication workflow.'
    },
    {
      name: 'Polymorphism',
      description: 'CashDispenser delegates note calculation polymorphically to strategy implementations.'
    },
    {
      name: 'Abstraction',
      description: 'REST endpoints delegate business behavior to Java. The coordinated terminal returns detached state/account/history/cassette captures; the sandbox uses its separate monitor. These boundaries are in-memory and provide no durable ledger or hardware acknowledgement.'
    }
  ],
  tradeoffs: [
    'Regression examples: with one ₹500 and three ₹200 notes and no ₹100 notes, both modes now dispense ₹600 as three ₹200 notes. With one each of ₹100/₹200/₹500, CONSERVE_LARGE_NOTES dispenses ₹500 as one ₹500 note. Independent count-enumeration tests check feasibility and both objectives, including bundle boundaries; they do not prove session authorization or atomic snapshots.',
    'One terminal serializes live command admission, work and settlement before ejection. This intentionally limits concurrency for its one active account. CashDispenser can still be exercised independently; a volatile phase alone would not provide the same lifecycle guarantee.',
    'Sandbox insertion requires IDLE, authentication requires the inserted card in CARD_INSERTED, and withdrawal requires AUTHENTICATED with the selected account. Wrong PIN replies retain the current phase or block the card. These checks protect the single demo terminal; they do not provide user identities or production authentication.',
    'Sandbox state/event reads share the mutation monitor with reset/mutations and return detached copies. Live coordinated state/account/history uses sessionLock and detached account/transaction copies; cassette totals/inventory share its own lock. Direct repository/model references remain internal mutable objects.',
    'The UI waits for every burst response, counts explicit approvals and then reads GET /api/atm/sim/state. Failed final reads retain the last confirmed view and require an explicit read-only Retry; no withdrawal is repeated automatically. A lost response remains an unknown outcome even after a fresh state read.',
    'Sandbox telemetry is an in-memory event list, not a durable audit log or concurrency proof. Mutations log selected outcomes; validation/lookup exceptions may add no event. Reset clears events but does not reset simEventIdGen. Events use local time-of-day strings, and the list has no size bound between resets.',
    'This is a teaching banking model: sandbox card responses expose demo PINs and money uses double. Coordinated live snapshots never include a PIN and history requires the authenticated account; browser ownership tokens coordinate visits and are not production identity verification. The outcome journal is bounded and in memory, with no durable ledger or hardware-delivery guarantee.',
    'Exact planning is specialized to ₹2000/₹500/₹200/₹100. Each count decomposes into a residue plus ₹2000 bundles of 1/4/10/20 notes: at most 800 residue vectors and four bundle-allocation steps per vector, independent of amount/inventory magnitude, with fixed scratch space. Equal-value bundles are allocated in objective order and complete candidates compared. Adding a denomination requires revisiting this proof and the fixed planner list; no arbitrary-currency optimality is claimed.'
  ],
  extensibility: [
    {
      area: 'Cheque & Cardless Cash Deposit',
      description: 'Add OCR cheque scanner and OTP-based cardless cash withdrawal support.',
      difficulty: 'Medium'
    },
    {
      area: 'Multi-Currency Dispenser',
      description: 'Would require currency-aware accounts/amounts, cassette inventory and strategies, request contracts and conversion rules; adding denomination enum constants alone is insufficient. No multi-currency behavior exists today.',
      difficulty: 'Medium'
    }
  ]
};
