// designDetails — vendingmachine
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Vending Machine — Design Details',
  requirements: [
    '12-slot physical matrix (3 rows × 4 columns: A1-A4 Beverages, B1-B4 Snacks, C1-C4 Confectionery/Fresh)',
    'State Pattern: IDLE → HAS_SELECTION → HAS_MONEY → DISPENSING → IDLE lifecycle management',
    'Dual-path workflow: Customer can either select slot first or deposit cash first',
    'Chain of Responsibility (CoR): Greedy descending denomination breakdown (₹500 → ₹100 → ₹50 → ₹20 → ₹10 → ₹5 → ₹2 → ₹1) with hopper availability bounds',
    'Atomic dispensing: Coil motor rotation, inventory decrement, change hopper deduction, and audit log',
    'Cancellation & Refund: Full cash refund dispensed via Chain of Responsibility if transaction is cancelled',
    'Edge Case Handling: OutOfStockException on empty slots, InsufficientPaymentException on underpayment, InsufficientChangeException on dry hopper',
    'Thread Safety: ReentrantLock guarding state transitions and hopper mutations, ConcurrentHashMap for slots and change box',
    'Isolated Simulation Sandbox: Independent /sim/* endpoints for 8-step educational walkthrough'
  ],
  entities: [
    {
      name: 'VendingMachine',
      description: 'Central domain model encapsulating current state, 12 inventory slots, change hopper, cashbox revenue, and thread-safe lock.',
      fields: [
        {
          name: 'machineId',
          type: 'String',
          description: 'Unique hardware machine identifier (e.g. VM-PROD-01)'
        },
        {
          name: 'currentState',
          type: 'VendingMachineState',
          description: 'Active State Pattern instance (IdleState, HasSelectionState, HasMoneyState, DispensingState)'
        },
        {
          name: 'slots',
          type: 'Map<String, Slot>',
          description: 'ConcurrentHashMap of 12 slots indexed by slot code (A1-C4)'
        },
        {
          name: 'changeInventory',
          type: 'Map<Denomination, AtomicInteger>',
          description: 'Hopper coin and banknote inventory per denomination'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Guarantees sequential state transitions and race-free inventory mutations'
        },
        {
          name: 'changeDispenserChain',
          type: 'ChangeDispenserChain',
          description: 'Chain of Responsibility handler pipeline for change calculation'
        }
      ],
      methods: [
        {
          name: 'selectProduct(slotCode)',
          returns: 'void',
          description: 'Delegates to currentState.selectProduct(this, slotCode)'
        },
        {
          name: 'insertMoney(denomination)',
          returns: 'void',
          description: 'Delegates to currentState.insertMoney(this, denomination)'
        },
        {
          name: 'dispense()',
          returns: 'Transaction',
          description: 'Delegates to currentState.dispense(this)'
        },
        {
          name: 'cancelTransaction()',
          returns: 'Transaction',
          description: 'Delegates to currentState.cancelTransaction(this)'
        },
        {
          name: 'refillChange(denomination, count)',
          returns: 'void',
          description: 'Restocks coin/bill hopper with thread safety'
        }
      ]
    },
    {
      name: 'VendingMachineState',
      description: 'State Pattern interface defining all allowable state transition actions.',
      fields: [],
      methods: [
        {
          name: 'selectProduct(machine, slotCode)',
          returns: 'void',
          description: 'Handles product selection for the given state'
        },
        {
          name: 'insertMoney(machine, denomination)',
          returns: 'void',
          description: 'Handles cash insertion for the given state'
        },
        {
          name: 'dispense(machine)',
          returns: 'Transaction',
          description: 'Handles item dispensing and change payout'
        },
        {
          name: 'cancelTransaction(machine)',
          returns: 'Transaction',
          description: 'Handles cancellation and refund calculation'
        },
        {
          name: 'getStatus()',
          returns: 'MachineStatus',
          description: 'Returns high-level status enum'
        }
      ]
    },
    {
      name: 'ChangeDispenseHandler',
      description: 'Abstract Chain of Responsibility handler for denomination-based change computation.',
      fields: [
        {
          name: 'nextHandler',
          type: 'ChangeDispenseHandler',
          description: 'Next denomination handler in the descending pipeline'
        },
        {
          name: 'denomination',
          type: 'Denomination',
          description: 'Specific coin/note handled (e.g. ₹500, ₹100, ₹50...)'
        }
      ],
      methods: [
        {
          name: 'setNext(handler)',
          returns: 'ChangeDispenseHandler',
          description: 'Links next handler in pipeline'
        },
        {
          name: 'handle(remaining, available, dispensed)',
          returns: 'void',
          description: 'Calculates maximum units dispensable from available inventory and passes remainder'
        }
      ]
    },
    {
      name: 'Slot',
      description: 'A physical vending machine slot containing product inventory and capacity metrics.',
      fields: [
        {
          name: 'code',
          type: 'String',
          description: 'Grid code (A1-A4, B1-B4, C1-C4)'
        },
        {
          name: 'row / col',
          type: 'int',
          description: 'Matrix coordinates'
        },
        {
          name: 'product',
          type: 'Product',
          description: 'Assigned product metadata'
        },
        {
          name: 'capacity',
          type: 'int',
          description: 'Max capacity per slot (10 items)'
        },
        {
          name: 'currentStock',
          type: 'int',
          description: 'Current available stock count'
        }
      ],
      methods: [
        {
          name: 'isAvailable()',
          returns: 'boolean',
          description: 'True if currentStock > 0 and product != null'
        },
        {
          name: 'decrementStock()',
          returns: 'void',
          description: 'Decrements stock count by 1 upon dispense'
        },
        {
          name: 'restock(amount)',
          returns: 'void',
          description: 'Adds inventory up to max capacity'
        }
      ]
    },
    {
      name: 'Transaction',
      description: 'Audit record and active state holder for a customer purchase lifecycle.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique transaction identifier'
        },
        {
          name: 'slotCode',
          type: 'String',
          description: 'Target slot code'
        },
        {
          name: 'itemPrice',
          type: 'double',
          description: 'Target price in INR'
        },
        {
          name: 'insertedAmount',
          type: 'double',
          description: 'Cumulative money deposited'
        },
        {
          name: 'changeAmount',
          type: 'double',
          description: 'Change returned to customer'
        },
        {
          name: 'changeBreakdown',
          type: 'Map<String, Integer>',
          description: 'Denomination counts returned (e.g. 1x ₹10, 1x ₹5)'
        },
        {
          name: 'status',
          type: 'String',
          description: 'PENDING, PAID, DISPENSED, REFUNDED, FAILED'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'State Pattern',
      used: true,
      explanation: 'Encapsulates state-dependent behavior into discrete classes (IdleState, HasSelectionState, HasMoneyState, DispensingState). Prevents illegal actions (e.g. dispensing without funds or choosing items while dispensing) at the type level without messy nested if/else blocks.'
    },
    {
      name: 'Chain of Responsibility (CoR)',
      used: true,
      explanation: 'Change calculation pipeline (ChangeDispenserChain) links denomination handlers in descending order (₹500 → ₹100 → ₹50 → ₹20 → ₹10 → ₹5 → ₹2 → ₹1). Each handler dispenses as many notes/coins as available in hopper and delegates remaining balance to the successor.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'VendingMachineService acts as a Spring-managed Singleton wrapping the primary physical VendingMachine instance and an isolated simMachine sandbox.'
    },
    {
      name: 'Command / Initializer Pattern',
      used: true,
      explanation: 'VendingMachineInitializer implements CommandLineRunner to bootstrap 12 catalog products, 12 matrix slots, and ₹3,550 in change hopper inventory on startup.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'VendingMachineState manages lifecycle transitions, ChangeDispenserChain computes change denominations, Slot tracks individual coil stock, and VendingMachineService exposes API boundaries.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'Adding new denominations or payment methods (e.g. UPI, QR, NFC) requires adding a new handler to the chain or new state without modifying existing core logic.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'All concrete state implementations (IdleState, HasSelectionState, HasMoneyState, DispensingState) can transparently substitute for VendingMachineState.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'VendingMachine depends on the abstract VendingMachineState interface and ChangeDispenseHandler base class rather than rigid concrete classes.'
    }
  ],
  oopConcepts: [
    {
      name: 'State Encapsulation',
      description: 'Transitions can only be triggered via authorized actions (selectProduct, insertMoney, dispense, cancelTransaction). The internal state reference is protected under ReentrantLock.',
      alternative: 'Could use boolean flags (isPaid, isSelected). Enum or State Pattern is chosen because it enforces clean finite-state-machine semantics.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'VendingMachine is composed of Slot instances, a ChangeDispenserChain, and an active VendingMachineState rather than inheriting from hardware classes.',
      alternative: 'Could make VendingMachine extend an inventory manager. Composition keeps domain boundaries clean and testable.'
    }
  ],
  extensibility: [
    {
      area: 'Digital UPI / NFC Payments',
      description: 'Add UPI QR generation to HasSelectionState with asynchronous payment webhook listener. Transitions directly to DISPENSING upon webhook confirmation.',
      difficulty: 'Easy'
    },
    {
      area: 'Temperature / Cooling Telemetry',
      description: 'Add IoT sensor observers for beverage refrigeration temperature alerts and power grid telemetry.',
      difficulty: 'Medium'
    },
    {
      area: 'Dynamic Surge / Expiry Pricing',
      description: 'Integrate PricingStrategy to discount items close to expiry date or apply peak hour pricing.',
      difficulty: 'Medium'
    }
  ]
};
