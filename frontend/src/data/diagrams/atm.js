// classDiagrams — atm
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'ATM System — Class Diagram',
  classes: [
    {
      name: 'AtmService',
      stereotype: 'singleton',
      fields: [
        '- bankingRepository: BankingRepository',
        '- cashDispenser: CashDispenser',
        '- currentState: ATMState',
        '- activeCard: Card',
        '- activeAccount: Account',
        '- sessionLock: ReentrantLock'
      ],
      methods: [
        '+ insertCard(cardNumber): Map',
        '+ authenticate(cardNumber, pin): Account',
        '+ getBalance(accNum): double',
        '+ withdraw(accNum, amount): WithdrawalTransaction',
        '+ deposit(accNum, amount, notes): DepositTransaction',
        '+ ejectCard(): Map',
        '- transitionTo(target: ATMState): void  // the only place currentState is ever assigned'
      ]
    },
    {
      name: 'SessionState',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getStatus(): ATMState',
        '+ allowedNext(): Set<ATMState>',
        '+ canTransitionTo(target): boolean'
      ]
    },
    {
      name: 'SessionStates',
      stereotype: 'resolver',
      fields: [],
      methods: [
        '+ of(status: ATMState): SessionState  // EnumMap of the 7 singleton states'
      ]
    },
    {
      name: 'CashDispenser',
      fields: [
        '- noteInventory: ConcurrentHashMap<NoteDenomination, Integer>',
        '- dispenserLock: ReentrantLock',
        '- strategyFactory: DenominationDispenseStrategyFactory',
        '- defaultMode: DispenseMode'
      ],
      methods: [
        '+ getTotalCashAvailable(): int',
        '+ getInventory(): Map',
        '+ addNotes(denom, count): void',
        '+ setNoteCount(denom, count): void',
        '+ dispenseCash(amount): Map'
      ]
    },
    {
      name: 'DenominationDispenseStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculateNotes(amount, availableInventory): Map'
      ]
    },
    {
      name: 'DenominationDispenseStrategyFactory',
      stereotype: 'factory',
      fields: [],
      methods: [
        '+ forMode(mode: DispenseMode): DenominationDispenseStrategy'
      ]
    },
    {
      name: 'DispenseMode',
      stereotype: 'enum',
      fields: ['MINIMIZE_NOTES', 'CONSERVE_LARGE_NOTES'],
      methods: []
    },
    {
      name: 'GreedyDenominationDispenseStrategy',
      fields: [
        'implements DenominationDispenseStrategy'
      ],
      methods: [
        '+ calculateNotes(amount, availableInventory): Map  // largest denomination first'
      ]
    },
    {
      name: 'ConserveLargeNotesDispenseStrategy',
      fields: [
        'implements DenominationDispenseStrategy'
      ],
      methods: [
        '+ calculateNotes(amount, availableInventory): Map  // smallest denomination first'
      ]
    },
    {
      name: 'BankingRepository',
      stereotype: 'repository',
      fields: [
        '- accounts: ConcurrentHashMap<String, Account>',
        '- cards: ConcurrentHashMap<String, Card>'
      ],
      methods: [
        '+ addAccount(account): void',
        '+ addCard(card): void',
        '+ getAccount(accountNumber): Account',
        '+ getCard(cardNumber): Card',
        '+ getCardByAccountNumber(accountNumber): Card',
        '+ getAllAccounts(): List<Account>',
        '+ getAllCards(): List<Card>'
      ]
    },
    {
      name: 'Account',
      fields: [
        '- id: String',
        '- accountNumber: String',
        '- holderName: String',
        '- balance: double',
        '- accountLock: ReentrantLock'
      ],
      methods: [
        '+ getLock(): ReentrantLock',
        '+ getBalance(): double',
        '+ setBalance(b): void'
      ]
    },
    {
      name: 'Card',
      fields: [
        '- cardNumber: String',
        '- pin: String',
        '- accountNumber: String',
        '- failedPinAttempts: AtomicInteger',
        '- isBlocked: boolean'
      ],
      methods: [
        '+ incrementFailedAttempts(): int',
        '+ blockCard(): void'
      ]
    },
    {
      name: 'ATMState',
      stereotype: 'enum',
      fields: [
        'IDLE',
        'CARD_INSERTED',
        'AUTHENTICATED',
        'TRANSACTION_IN_PROGRESS',
        'DISPENSING',
        'SESSION_ENDED',
        'CARD_BLOCKED'
      ],
      methods: []
    },
    {
      name: 'NoteDenomination',
      stereotype: 'enum',
      fields: [
        'TWO_THOUSAND(2000)',
        'FIVE_HUNDRED(500)',
        'TWO_HUNDRED(200)',
        'ONE_HUNDRED(100)'
      ],
      methods: [
        '+ getValue(): int'
      ]
    },
    {
      name: 'Transaction',
      stereotype: 'abstract',
      fields: [
        '- transactionId: String',
        '- accountNumber: String',
        '- amount: double',
        '- timestampEpoch: long',
        '- status: String',
        '- failureReason: String'
      ],
      methods: [
        '+ execute(bankingService, cashDispenser)'
      ]
    },
    {
      name: 'WithdrawalTransaction',
      fields: [
        'extends Transaction',
        '- dispensedNotes: Map<NoteDenomination, Integer>'
      ],
      methods: []
    },
    {
      name: 'DepositTransaction',
      fields: [
        'extends Transaction',
        '- depositedNotes: Map<NoteDenomination, Integer>'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'AtmService',
      to: 'CashDispenser',
      label: 'controls hardware dispenser'
    },
    {
      from: 'AtmService',
      to: 'BankingRepository',
      label: 'delegates account lookups'
    },
    {
      from: 'AtmService',
      to: 'SessionStates',
      label: 'resolves current phase via'
    },
    {
      from: 'SessionStates',
      to: 'SessionState',
      label: 'creates'
    },
    {
      from: 'SessionState',
      to: 'ATMState',
      label: 'describes'
    },
    {
      from: 'CashDispenser',
      to: 'DenominationDispenseStrategyFactory',
      label: 'resolves via'
    },
    {
      from: 'DenominationDispenseStrategyFactory',
      to: 'DenominationDispenseStrategy',
      label: 'creates'
    },
    {
      from: 'DenominationDispenseStrategyFactory',
      to: 'DispenseMode',
      label: 'keyed by'
    },
    {
      from: 'GreedyDenominationDispenseStrategy',
      to: 'DenominationDispenseStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'ConserveLargeNotesDispenseStrategy',
      to: 'DenominationDispenseStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'WithdrawalTransaction',
      to: 'Transaction',
      label: 'extends'
    },
    {
      from: 'DepositTransaction',
      to: 'Transaction',
      label: 'extends'
    }
  ]
};
