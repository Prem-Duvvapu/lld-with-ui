// designDetails — atm
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'ATM System — Design Details',
  requirements: [
    'State Machine Session Lifecycle: one class per ATMState (IdleSessionState → CardInsertedSessionState → AuthenticatedSessionState → TransactionInProgressSessionState → DispensingSessionState → SessionEndedSessionState / CardBlockedSessionState), each declaring its own legal-next-states set, enforced by AtmService#transitionTo — the single place currentState is ever assigned.',
    'Fine-Grained Per-Account Concurrency: Fair ReentrantLock per Account preventing account overselling under simultaneous multi-thread withdrawal races.',
    'Hardware Cash Dispenser Locking: CashDispenser owns a dedicated ReentrantLock for note calculation and inventory updates.',
    'Denomination-Based Cash Dispensing: Strategy + Factory — DenominationDispenseStrategyFactory resolves MINIMIZE_NOTES (GreedyDenominationDispenseStrategy) or CONSERVE_LARGE_NOTES (ConserveLargeNotesDispenseStrategy) via an EnumMap, the same shape as inventory.strategy.ReorderStrategyFactory.',
    'Compensating Transaction & Atomicity: Automatically credit account balance back if cash dispenser hardware fails due to denomination mismatch after debiting.',
    'Card Security & PIN Lockout: Track failed PIN attempts and automatically block card (CARD_BLOCKED) after 3 consecutive failures.',
    'Isolated Concurrency Simulation: an isolated /api/atm/sim/* sandbox (separate BankingRepository + CashDispenser) driving the real state machine and dispense strategies, so the demo can never touch live accounts.'
  ],
  entities: [
    {
      name: 'AtmService',
      description: 'Spring @Service facade managing session state machine, PIN verification, withdrawal, deposit, and simulation engine.',
      fields: [
        {
          name: 'bankingRepository',
          type: 'BankingRepository',
          description: 'ConcurrentHashMap-backed store for accounts and cards, shared by the live session flow and the isolated sim sandbox'
        },
        {
          name: 'cashDispenser',
          type: 'CashDispenser',
          description: 'Physical cash dispenser hardware tracking note inventory'
        },
        {
          name: 'currentState',
          type: 'ATMState',
          description: 'Active session state in state machine lifecycle'
        },
        {
          name: 'activeCard',
          type: 'Card',
          description: 'Card currently inserted in terminal slot'
        },
        {
          name: 'activeAccount',
          type: 'Account',
          description: 'Authenticated customer bank account'
        }
      ],
      methods: [
        {
          name: 'insertCard(cardNumber)',
          returns: 'Map<String, Object>',
          description: 'Validates card existence, checks block status, and transitions to CARD_INSERTED'
        },
        {
          name: 'authenticate(cardNumber, pin)',
          returns: 'Account',
          description: 'Verifies PIN, tracks failed attempts (locks at 3), and transitions to AUTHENTICATED'
        },
        {
          name: 'withdraw(accNum, amount)',
          returns: 'WithdrawalTransaction',
          description: 'Debits account under lock, dispenses notes, handles compensating refund if notes missing'
        },
        {
          name: 'deposit(accNum, amount, notes)',
          returns: 'DepositTransaction',
          description: 'Accepts currency notes, adds to dispenser inventory, and credits account balance'
        },
        {
          name: 'ejectCard()',
          returns: 'Map<String, Object>',
          description: 'Ejects active card and resets state to IDLE'
        }
      ]
    },
    {
      name: 'CashDispenser',
      description: 'Hardware cash dispenser tracking note inventory with fair ReentrantLock and denomination strategy.',
      fields: [
        {
          name: 'noteInventory',
          type: 'Map<NoteDenomination, Integer>',
          description: 'Stock count of notes for ₹2000, ₹500, ₹200, ₹100'
        },
        {
          name: 'dispenserLock',
          type: 'ReentrantLock',
          description: 'Fair lock synchronizing physical note dispensing'
        },
        {
          name: 'dispenseStrategy',
          type: 'DenominationDispenseStrategy',
          description: 'Strategy calculating note breakdown'
        }
      ],
      methods: [
        {
          name: 'dispenseCash(amount)',
          returns: 'Map<NoteDenomination, Integer>',
          description: 'Calculates notes, verifies inventory availability, and deducts counts atomically'
        },
        {
          name: 'addNotes(denom, count)',
          returns: 'void',
          description: 'Restocks note hopper'
        },
        {
          name: 'getTotalCashAvailable()',
          returns: 'int',
          description: 'Calculates total INR cash value in dispenser'
        }
      ]
    },
    {
      name: 'DenominationDispenseStrategy (Interface)',
      description: 'Strategy interface computing optimal note counts per denomination for requested amounts.',
      fields: [],
      methods: [
        {
          name: 'calculateNotes(amount, availableInventory)',
          returns: 'Map<NoteDenomination, Integer>',
          description: 'Computes greedy note breakdown or throws exception if amount cannot be satisfied'
        }
      ]
    },
    {
      name: 'Account',
      description: 'Account entity with balance and per-account ReentrantLock for fine-grained thread safety.',
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
          description: 'Fair mutex preventing race conditions on concurrent balance mutations'
        }
      ],
      methods: [
        {
          name: 'debit(amount)',
          returns: 'boolean',
          description: 'Deducts funds if balance >= amount'
        },
        {
          name: 'credit(amount)',
          returns: 'void',
          description: 'Adds funds to account'
        }
      ]
    },
    {
      name: 'Card',
      description: 'Card model tracking card number, PIN, failed attempt counter, and block status.',
      fields: [
        {
          name: 'cardNumber',
          type: 'String',
          description: '16-digit debit card number'
        },
        {
          name: 'pin',
          type: 'String',
          description: 'Hashed/plain 4-digit PIN'
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
          description: 'Increments counter and blocks card if attempts >= 3'
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
      description: 'Abstract template base class for WithdrawalTransaction and DepositTransaction.',
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
          description: 'SUCCESS, FAILED, PENDING'
        },
        {
          name: 'timestampEpoch',
          type: 'long',
          description: 'Execution epoch millisecond'
        }
      ],
      methods: [
        {
          name: 'execute(bankingService, cashDispenser)',
          returns: 'void',
          description: 'Template method executing transaction lifecycle'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State Pattern',
      used: true,
      explanation: 'One SessionState implementation per ATMState, each declaring its own Set<ATMState> allowedNext(); AtmService#transitionTo is the single enforcement point, throwing InvalidSessionStateException for anything not in that set.'
    },
    {
      name: 'Strategy + Factory Pattern',
      used: true,
      explanation: 'DenominationDispenseStrategyFactory resolves DispenseMode to GreedyDenominationDispenseStrategy or ConserveLargeNotesDispenseStrategy via an EnumMap; CashDispenser never branches on the mode itself.'
    },
    {
      name: 'Template Method Pattern',
      used: true,
      explanation: 'Transaction abstract base class defines execution lifecycle for withdrawals and deposits.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'AtmService and CashDispenser managed as Spring singletons.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'BankingRepository stores accounts and cards; CashDispenser manages note inventory; AtmService coordinates session lifecycle.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'New note dispense strategies (e.g. DynamicDenominationBalanceStrategy) can be implemented without modifying CashDispenser.'
    },
    {
      name: 'Dependency Inversion Principle (DIP)',
      description: 'CashDispenser depends on DenominationDispenseStrategy interface.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Account lock synchronization and card PIN verification logic are strictly encapsulated inside entity methods.'
    },
    {
      name: 'Polymorphism',
      description: 'CashDispenser delegates note calculation polymorphically to strategy implementations.'
    },
    {
      name: 'Abstraction',
      description: 'REST API exposes clean endpoints for card insertion, PIN auth, withdrawals, deposits, and simulation snapshots.'
    }
  ],
  extensibility: [
    {
      area: 'Cheque & Cardless Cash Deposit',
      description: 'Add OCR cheque scanner and OTP-based cardless cash withdrawal support.',
      difficulty: 'Medium'
    },
    {
      area: 'Multi-Currency Dispenser',
      description: 'Extend NoteDenomination to support USD, EUR, and GBP currency notes with exchange rate conversion.',
      difficulty: 'Medium'
    }
  ]
};
