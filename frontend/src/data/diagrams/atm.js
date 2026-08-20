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
        '- bankingService: BankingService',
        '- cashDispenser: CashDispenser',
        '- currentState: ATMState',
        '- activeCard: Card',
        '- activeAccount: Account'
      ],
      methods: [
        '+ insertCard(cardNumber): Map',
        '+ authenticate(cardNumber, pin): Account',
        '+ getBalance(accNum): double',
        '+ withdraw(accNum, amount): WithdrawalTransaction',
        '+ deposit(accNum, amount, notes): DepositTransaction',
        '+ ejectCard(): Map',
        '+ simReset()',
        '+ simWithdraw(...)'
      ]
    },
    {
      name: 'CashDispenser',
      fields: [
        '- noteInventory: ConcurrentHashMap<NoteDenomination, Integer>',
        '- dispenserLock: ReentrantLock',
        '- dispenseStrategy: DenominationDispenseStrategy'
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
      name: 'GreedyDenominationDispenseStrategy',
      fields: [
        'implements DenominationDispenseStrategy'
      ],
      methods: [
        '+ calculateNotes(amount, availableInventory): Map'
      ]
    },
    {
      name: 'BankingService',
      stereotype: 'service',
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
      to: 'BankingService',
      label: 'delegates account lookups'
    },
    {
      from: 'AtmService',
      to: 'ATMState',
      label: 'maintains session state'
    },
    {
      from: 'CashDispenser',
      to: 'DenominationDispenseStrategy',
      label: 'uses'
    },
    {
      from: 'GreedyDenominationDispenseStrategy',
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
