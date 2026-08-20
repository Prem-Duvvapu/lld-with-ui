// classDiagrams — coffee
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Coffee Vending Machine — Class Diagram',
  classes: [
    {
      name: 'CoffeeMachineService',
      stereotype: 'singleton',
      fields: [
        '- mainMachine: CoffeeMachine',
        '- simMachine: CoffeeMachine',
        '- simEvents: List<SimEvent>'
      ],
      methods: [
        '+ getMenu(): List<CoffeeRecipe>',
        '+ getStatus(): Map',
        '+ startOrder(type): CoffeeOrder',
        '+ addCustomization(addOn): CoffeeOrder',
        '+ insertPayment(amount): CoffeeOrder',
        '+ brew(): CoffeeOrder',
        '+ collectCoffee(): CoffeeOrder',
        '+ cancelOrder(): CoffeeOrder',
        '+ simReset(): Map',
        '+ simSimulateRace(step): Map'
      ]
    },
    {
      name: 'CoffeeMachine',
      fields: [
        '- machineId: String',
        '- ingredientStore: IngredientStore',
        '- coffeeFactory: CoffeeFactory',
        '- currentState: CoffeeMachineState',
        '- currentOrder: CoffeeOrder',
        '- activeComponent: CoffeeComponent',
        '- sessionLock: ReentrantLock',
        '- brewHeadLock: ReentrantLock'
      ],
      methods: [
        '+ selectBaseCoffee(type)',
        '+ addCustomization(addOn)',
        '+ wrapWithDecorator(addOn)',
        '+ insertPayment(amount)',
        '+ brew()',
        '+ collectCoffee()',
        '+ cancel()'
      ]
    },
    {
      name: 'CoffeeComponent',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getDescription(): String',
        '+ getPrice(): double',
        '+ getRequiredIngredients(): Map<IngredientType, Integer>'
      ]
    },
    {
      name: 'BaseCoffee',
      fields: [
        'implements CoffeeComponent',
        '- type: CoffeeType',
        '- description: String',
        '- price: double',
        '- baseIngredients: Map<IngredientType, Integer>'
      ],
      methods: [
        '+ getDescription()',
        '+ getPrice()',
        '+ getRequiredIngredients()'
      ]
    },
    {
      name: 'CoffeeDecorator',
      stereotype: 'abstract',
      fields: [
        'implements CoffeeComponent',
        '# decoratedCoffee: CoffeeComponent'
      ],
      methods: [
        '+ getDescription()',
        '+ getPrice()',
        '+ getRequiredIngredients()',
        '# getAddedIngredients(): Map'
      ]
    },
    {
      name: 'ExtraShotDecorator',
      fields: [
        'extends CoffeeDecorator',
        '- EXTRA_SHOT_PRICE: double'
      ],
      methods: [
        '+ getDescription()',
        '+ getPrice()',
        '+ getAddedIngredients()'
      ]
    },
    {
      name: 'WhippedCreamDecorator',
      fields: [
        'extends CoffeeDecorator',
        '- WHIPPED_CREAM_PRICE: double'
      ],
      methods: [
        '+ getDescription()',
        '+ getPrice()',
        '+ getAddedIngredients()'
      ]
    },
    {
      name: 'OatMilkDecorator',
      fields: [
        'extends CoffeeDecorator',
        '- OAT_MILK_PRICE: double'
      ],
      methods: [
        '+ getDescription()',
        '+ getPrice()',
        '+ getRequiredIngredients()'
      ]
    },
    {
      name: 'CoffeeFactory',
      stereotype: 'factory',
      fields: [
        '- recipeRegistry: ConcurrentHashMap<CoffeeType, CoffeeRecipe>'
      ],
      methods: [
        '+ registerRecipe(recipe): void',
        '+ createBaseCoffee(type): CoffeeComponent',
        '+ getAllRecipes(): List<CoffeeRecipe>'
      ]
    },
    {
      name: 'CoffeeRecipe',
      fields: [
        '- type: CoffeeType',
        '- name: String',
        '- description: String',
        '- basePrice: double',
        '- ingredients: Map<IngredientType, Integer>'
      ],
      methods: [
        '+ getIngredients()'
      ]
    },
    {
      name: 'IngredientStore',
      fields: [
        '- inventory: ConcurrentHashMap<IngredientType, AtomicInteger>',
        '- ingredientLocks: ConcurrentHashMap<IngredientType, ReentrantLock>',
        '- capacities: ConcurrentHashMap',
        '- lowStockThresholds: ConcurrentHashMap'
      ],
      methods: [
        '+ refill(type, amount): void',
        '+ checkAvailability(req): boolean',
        '+ checkAndDeductIngredients(req): boolean',
        '+ getLowStockAlerts(): List'
      ]
    },
    {
      name: 'CoffeeMachineState',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ selectBaseCoffee(m, type): void',
        '+ addCustomization(m, addOn): void',
        '+ insertPayment(m, amount): void',
        '+ brew(m): CoffeeOrder',
        '+ collectCoffee(m): CoffeeOrder',
        '+ cancel(m): CoffeeOrder'
      ]
    },
    {
      name: 'IdleState',
      fields: [
        'implements CoffeeMachineState'
      ],
      methods: [
        '+ selectBaseCoffee(m, type)'
      ]
    },
    {
      name: 'SelectingState',
      fields: [
        'implements CoffeeMachineState'
      ],
      methods: [
        '+ addCustomization(m, addOn)',
        '+ insertPayment(m, amount)'
      ]
    },
    {
      name: 'PaymentPendingState',
      fields: [
        'implements CoffeeMachineState'
      ],
      methods: [
        '+ insertPayment(m, amount)',
        '+ brew(m)',
        '+ cancel(m)'
      ]
    },
    {
      name: 'BrewingState',
      fields: [
        'implements CoffeeMachineState'
      ],
      methods: [
        '+ brew(m)'
      ]
    },
    {
      name: 'DispensedState',
      fields: [
        'implements CoffeeMachineState'
      ],
      methods: [
        '+ collectCoffee(m)'
      ]
    },
    {
      name: 'CoffeeOrder',
      fields: [
        '- orderId: long',
        '- baseCoffeeName: String',
        '- description: String',
        '- totalPrice: double',
        '- amountPaid: double',
        '- changeReturned: double',
        '- status: String',
        '- customizations: List<String>'
      ],
      methods: []
    },
    {
      name: 'IngredientType',
      stereotype: 'enum',
      fields: [
        'WATER',
        'MILK',
        'COFFEE_BEANS',
        'SUGAR',
        'WHIPPED_CREAM',
        'CARAMEL_SYRUP',
        'OAT_MILK'
      ],
      methods: [
        '+ getUnit(): String'
      ]
    }
  ],
  relationships: [
    {
      from: 'CoffeeMachineService',
      to: 'CoffeeMachine',
      label: 'manages'
    },
    {
      from: 'CoffeeMachine',
      to: 'CoffeeComponent',
      label: 'wraps active composition'
    },
    {
      from: 'CoffeeMachine',
      to: 'CoffeeMachineState',
      label: 'delegates lifecycle transitions'
    },
    {
      from: 'CoffeeMachine',
      to: 'CoffeeFactory',
      label: 'queries recipes'
    },
    {
      from: 'CoffeeMachine',
      to: 'IngredientStore',
      label: 'checks & deducts stores'
    },
    {
      from: 'BaseCoffee',
      to: 'CoffeeComponent',
      label: 'implements',
      dashed: true
    },
    {
      from: 'CoffeeDecorator',
      to: 'CoffeeComponent',
      label: 'implements & wraps',
      dashed: true
    },
    {
      from: 'ExtraShotDecorator',
      to: 'CoffeeDecorator',
      label: 'extends'
    },
    {
      from: 'WhippedCreamDecorator',
      to: 'CoffeeDecorator',
      label: 'extends'
    },
    {
      from: 'OatMilkDecorator',
      to: 'CoffeeDecorator',
      label: 'extends'
    },
    {
      from: 'IdleState',
      to: 'CoffeeMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'SelectingState',
      to: 'CoffeeMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'PaymentPendingState',
      to: 'CoffeeMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'BrewingState',
      to: 'CoffeeMachineState',
      label: 'implements',
      dashed: true
    },
    {
      from: 'DispensedState',
      to: 'CoffeeMachineState',
      label: 'implements',
      dashed: true
    }
  ]
};
