// classDiagrams — vendingmachine
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Vending Machine — Class Diagram',
  classes: [
    {
      name: 'VendingMachine',
      fields: [
        '- machineId: String',
        '- currentState: VendingMachineState',
        '- slots: Map<String, Slot>',
        '- changeInventory: Map<Denomination, AtomicInteger>',
        '- lock: ReentrantLock',
        '- changeDispenserChain: ChangeDispenserChain'
      ],
      methods: [
        '+ selectProduct(slotCode): void',
        '+ insertMoney(denomination): void',
        '+ dispense(): Transaction',
        '+ cancelTransaction(): Transaction',
        '+ refillChange(denom, count): void',
        '+ restockSlot(code, qty): void'
      ]
    },
    {
      name: 'VendingMachineState',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ selectProduct(machine, code): void',
        '+ insertMoney(machine, denom): void',
        '+ dispense(machine): Transaction',
        '+ cancelTransaction(machine): Transaction',
        '+ getStatus(): MachineStatus'
      ]
    },
    {
      name: 'IdleState',
      fields: [],
      methods: [
        '+ selectProduct(machine, code): void',
        '+ insertMoney(machine, denom): void',
        '+ dispense(machine): Transaction',
        '+ cancelTransaction(machine): Transaction'
      ]
    },
    {
      name: 'HasSelectionState',
      fields: [],
      methods: [
        '+ selectProduct(machine, code): void',
        '+ insertMoney(machine, denom): void',
        '+ dispense(machine): Transaction',
        '+ cancelTransaction(machine): Transaction'
      ]
    },
    {
      name: 'HasMoneyState',
      fields: [],
      methods: [
        '+ selectProduct(machine, code): void',
        '+ insertMoney(machine, denom): void',
        '+ dispense(machine): Transaction',
        '+ cancelTransaction(machine): Transaction'
      ]
    },
    {
      name: 'DispensingState',
      fields: [],
      methods: [
        '+ selectProduct(machine, code): void',
        '+ insertMoney(machine, denom): void',
        '+ dispense(machine): Transaction',
        '+ cancelTransaction(machine): Transaction'
      ]
    },
    {
      name: 'ChangeDispenseHandler',
      stereotype: 'abstract',
      fields: [
        '# nextHandler: ChangeDispenseHandler',
        '# denomination: Denomination'
      ],
      methods: [
        '+ setNext(handler): ChangeDispenseHandler',
        '+ handle(remaining, avail, dispensed): void'
      ]
    },
    {
      name: 'DenominationChangeHandler',
      fields: [],
      methods: [
        '+ handle(remaining, avail, dispensed): void'
      ]
    },
    {
      name: 'ChangeDispenserChain',
      fields: [
        '- chainHead: ChangeDispenseHandler'
      ],
      methods: [
        '+ calculateChange(amount, available): Map<Denomination, Integer>'
      ]
    },
    {
      name: 'Slot',
      fields: [
        '- code: String',
        '- row: int',
        '- col: int',
        '- product: Product',
        '- capacity: int',
        '- currentStock: int'
      ],
      methods: [
        '+ isAvailable(): boolean',
        '+ decrementStock(): void',
        '+ restock(qty): void'
      ]
    },
    {
      name: 'Product',
      fields: [
        '- id: long',
        '- code: String',
        '- name: String',
        '- price: double',
        '- category: String',
        '- emoji: String'
      ],
      methods: []
    },
    {
      name: 'Transaction',
      fields: [
        '- id: long',
        '- slotCode: String',
        '- itemPrice: double',
        '- insertedAmount: double',
        '- changeAmount: double',
        '- changeBreakdown: Map',
        '- status: String'
      ],
      methods: []
    },
    {
      name: 'Denomination',
      stereotype: 'enum',
      fields: [
        'COIN_1(1)',
        'COIN_2(2)',
        'COIN_5(5)',
        'COIN_10(10)',
        'NOTE_20(20)',
        'NOTE_50(50)',
        'NOTE_100(100)',
        'NOTE_500(500)'
      ],
      methods: [
        '+ getValue(): int',
        '+ getType(): String',
        '+ fromValue(val): Denomination'
      ]
    },
    {
      name: 'VendingMachineService',
      stereotype: 'service',
      fields: [
        '- mainMachine: VendingMachine',
        '- simMachine: VendingMachine',
        '- simEvents: List<SimEvent>'
      ],
      methods: [
        '+ getSlots(): List',
        '+ selectProduct(code): Transaction',
        '+ insertMoney(val): Transaction',
        '+ dispense(): Transaction',
        '+ simReset(): Map',
        '+ simDispense(step): Map'
      ]
    }
  ],
  relationships: [
    {
      from: 'VendingMachine',
      to: 'VendingMachineState',
      label: 'has state'
    },
    {
      from: 'IdleState',
      to: 'VendingMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'HasSelectionState',
      to: 'VendingMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'HasMoneyState',
      to: 'VendingMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'DispensingState',
      to: 'VendingMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'VendingMachine',
      to: 'Slot',
      label: 'manages (12)'
    },
    {
      from: 'Slot',
      to: 'Product',
      label: 'holds'
    },
    {
      from: 'VendingMachine',
      to: 'ChangeDispenserChain',
      label: 'uses'
    },
    {
      from: 'ChangeDispenserChain',
      to: 'ChangeDispenseHandler',
      label: 'starts with'
    },
    {
      from: 'DenominationChangeHandler',
      to: 'ChangeDispenseHandler',
      label: 'extends'
    },
    {
      from: 'ChangeDispenseHandler',
      to: 'ChangeDispenseHandler',
      label: 'next (CoR)'
    },
    {
      from: 'VendingMachine',
      to: 'Transaction',
      label: 'creates / records'
    },
    {
      from: 'VendingMachineService',
      to: 'VendingMachine',
      label: 'manages'
    }
  ]
};
