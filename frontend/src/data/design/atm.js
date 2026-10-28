// designDetails — atm
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'ATM System — Design Details',
  requirements: [
    'Live session lifecycle: insertCard, authenticate and ejectCard use transitionTo under sessionLock. It resolves a singleton SessionState and checks allowedNext. Withdraw/deposit instead use setState to write TRANSACTION_IN_PROGRESS, DISPENSING and AUTHENTICATED directly; the transition table does not enforce those internal updates.',
    'Per-account money movement: getBalance, withdraw and deposit acquire Account.getLock before checking the current session and matching account. Withdraw re-reads balance inside that lock, then acquires the dispenser lock through dispenseCash. The account lock does not serialize concurrent insertion/ejection, which use sessionLock.',
    'Cash inventory: CashDispenser holds one fair ReentrantLock across the total-cash check, note calculation and deduction. Its inventory getter returns a copy; total and inventory are separately locked reads, not one combined snapshot.',
    'Dispense Strategy + Factory: an EnumMap selects two policies backed by ExactDenominationPlanner. MINIMIZE_NOTES finds the fewest notes, breaking ties by preferring more ₹2000, then ₹500, then ₹200 notes. CONSERVE_LARGE_NOTES lexicographically minimizes use of ₹2000, then ₹500, then ₹200 notes among exact feasible plans; it need not minimize the total note count.',
    'Withdrawal compensation: after debiting, the live service credits the amount back specifically when dispenseCash throws InsufficientCashException and records a FAILED transaction. This in-memory compensation is not a database transaction, crash recovery or a guarantee that every unexpected failure is rolled back.',
    'PIN attempts: the service compares the active card’s stored plaintext PIN, increments its counter on a wrong PIN and calls blockCard at three failures. Card.incrementFailedAttempts only increments; it does not block by itself. Successful PIN verification resets attempts.',
    'Request amounts: the controller accepts finite JSON numbers, not numeric strings. The service requires finite positive amounts; withdrawals must also be exact multiples of ₹100 within the int dispenser range before conversion. Deposits may be fractional ledger amounts and reject a non-finite resulting balance. HTTP withdrawal mode defaults to MINIMIZE_NOTES when omitted/null; other values must match one of the two enum names.',
    'REST deposits are ledger credits: the controller passes null for notes, so a successful deposit does not replenish the cassette or verify a physical note total. The service method can add a supplied note map, but has no validation that its counts/value match the credited amount.',
    'Sandbox isolation: /api/atm/sim/* uses its own BankingRepository, CashDispenser, accounts and cards, sharing strategy implementations with live dispensing. Mutations and detached state/event reads share the AtmService monitor and assign simState directly. Reset and response capture are one operation. A client request burst is processed serially; this is not a live account-lock race or enforcement through SessionStates.',
    'Domain errors use AtmException → DomainException and the shared ErrorResponse (error, code, status, timestamp). Invalid requests/session states and insufficient balance are 400; a well-formed incorrect PIN is 401; blocked card is 403; missing account/card is 404; insufficient cash is 409. Sandbox withdrawal responses include withdrawalOutcome (SUCCESS, REJECTED, INSUFFICIENT_BALANCE or DISPENSER_FAILED). A 200 response is not proof of approval; invalid insertion/authentication transitions use the shared typed error contract.'
  ],
  entities: [
    {
      name: 'AtmService',
      description: 'Spring @Service coordinating one live terminal and a separate sandbox. Session lifecycle checks, account money movement and simulation mutation use different locking boundaries.',
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
          description: 'Volatile live phase, written by guarded transitionTo and direct internal setState; it is not an atomic snapshot of the session fields.'
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
        { name: 'sessionLock', type: 'ReentrantLock', description: 'Fair lock used by insertion/authentication/ejection, not held across withdrawal or deposit money movement.' },
        { name: 'simBankingRepository', type: 'BankingRepository', description: 'Separate sandbox account/card store; never the injected live repository.' },
        { name: 'simCashDispenser', type: 'CashDispenser', description: 'Separate sandbox cassette using the shared strategy factory.' },
        { name: 'simState', type: 'ATMState', description: 'Sandbox phase directly assigned by synchronized mutation methods; no SessionStates table check.' }
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Private lifecycle transition: takes sessionLock and checks SessionStates.of(currentState).canTransitionTo(target).' },
        { name: 'setState(target)', returns: 'void', description: 'Private direct phase assignment used by admitted money operations; no table check or sessionLock acquisition.' },
        { name: 'getSimSnapshots()', returns: 'Map<String, Object>', description: 'Captures state, detached accounts/cards/events/details and inventory under the sandbox mutation monitor. The state and legacy snapshots routes share this capture; no returned Account/Card/SimEvent is a live sandbox model.' },
        {
          name: 'insertCard(cardNumber)',
          returns: 'Map<String, Object>',
          description: 'Validates card existence, checks block status, and transitions to CARD_INSERTED'
        },
        {
          name: 'authenticate(cardNumber, pin)',
          returns: 'Account',
          description: 'Checks the active card’s PIN under sessionLock, tracks failures and uses transitionTo for authentication/blocking. If a card is already active, the supplied cardNumber is not checked against it.'
        },
        {
          name: 'withdraw(accNum, amount, mode)',
          returns: 'WithdrawalTransaction',
          description: 'Validates the amount/mode, holds the account lock across session/account checks, balance check, debit, dispense and recording; compensates InsufficientCashException only.'
        },
        {
          name: 'deposit(accNum, amount, notes)',
          returns: 'DepositTransaction',
          description: 'Credits a validated positive amount under the account lock; optionally adds supplied notes. The REST controller supplies null, so HTTP deposits leave note inventory unchanged.'
        },
        {
          name: 'ejectCard()',
          returns: 'Map<String, Object>',
          description: 'Under sessionLock, transitions through SESSION_ENDED to IDLE and clears active references. It does not wait for an account’s in-flight money operation.'
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
      explanation: 'One singleton SessionState implementation per ATMState declares allowedNext. Live insert/authenticate/eject consult it through transitionTo and reject illegal table transitions. Money operations bypass the table via setState, and sandbox methods assign simState directly. This is partial lifecycle enforcement, not a universal gate for every state write.'
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
      description: 'REST endpoints delegate session and money operations to the service. Sandbox state responses are detached captures under its mutation monitor. Live response maps retain their separate limitations; neither path is a durable transaction boundary.'
    }
  ],
  tradeoffs: [
    'Regression examples: with one ₹500 and three ₹200 notes and no ₹100 notes, both modes now dispense ₹600 as three ₹200 notes. With one each of ₹100/₹200/₹500, CONSERVE_LARGE_NOTES dispenses ₹500 as one ₹500 note. Independent count-enumeration tests check feasibility and both objectives, including bundle boundaries; they do not prove session authorization or atomic snapshots.',
    'Session/account coordination remains incomplete: sessionLock does not protect the account-locked admission check or setState. Ejection can clear the session while an admitted withdrawal continues, and the withdrawal can later overwrite IDLE with AUTHENTICATED. Do not infer an atomic session lifecycle from the volatile phase or the account lock.',
    'Sandbox insertion requires IDLE, authentication requires the inserted card in CARD_INSERTED, and withdrawal requires AUTHENTICATED with the selected account. Wrong PIN replies retain the current phase or block the card. These checks protect the single demo terminal; they do not provide user identities or production authentication.',
    'Sandbox state/event reads now share the mutation monitor, with detached model copies and copied event detail maps/lists. simReset holds that monitor across reseeding and response capture. This response cannot later change with sandbox mutation; the same guarantee has not been established for every live endpoint.',
    'The UI waits for every burst response, counts explicit approvals and then reads GET /api/atm/sim/state. Failed final reads retain the last confirmed view and require an explicit read-only Retry; no withdrawal is repeated automatically. A lost response remains an unknown outcome even after a fresh state read.',
    'Sandbox telemetry is an in-memory event list, not a durable audit log or concurrency proof. Mutations log selected outcomes; validation/lookup exceptions may add no event. Reset clears events but does not reset simEventIdGen. Events use local time-of-day strings, and the list has no size bound between resets.',
    'This is a teaching banking model: card getters expose plaintext PINs in sandbox card responses, live transaction-history reads have no session check, and money uses double rather than an exact monetary type. There is no production authentication, durable ledger, physical delivery acknowledgement or general recovery protocol.',
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
