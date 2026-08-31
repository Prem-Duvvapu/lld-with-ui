// designDetails — coffee
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Fixed (2026-08-31, RCA-044) — designPatterns/principles/extensibility asserted a
// `CoffeeRepository` class, constructor-injected into CoffeeMachineService, handling all data
// access. No such class exists: the module has no repository package at all: state lives
// directly on the CoffeeMachine model, constructed with `new` inside CoffeeMachineService, not
// injected. The two patterns this module actually centers on — Decorator (CoffeeComponent/
// CoffeeDecorator) and Factory (CoffeeFactory) — were never listed at all. Rewritten to describe
// the real architecture.

export default {
  title: 'Coffee Vending Machine — Design Details',
  requirements: [
    'Coffee vending machine with 6 ingredients: Coffee Beans, Milk, Water, Sugar, Chocolate, Cream',
    '5 preset beverages: Espresso (₹120), Latte (₹150), Cappuccino (₹160), Mocha (₹180), Americano (₹130)',
    'Each beverage has a recipe specifying exact ingredient quantities needed',
    'Select beverage: checks if all ingredients are sufficient, reserves the selection',
    'Brew: consumes ingredients from inventory, transitions machine through IDLE → BREWING → COMPLETE',
    'Machine status: IDLE (ready), BREWING (in progress), COMPLETE (ready to serve), ERROR (insufficient)',
    'Refill ingredient: restocks any ingredient by specified amount, machine must be IDLE to reset from error',
    'Orders history: tracks all brewing attempts with status (PREPARING/COMPLETED/FAILED)',
    'Thread-safe concurrent access — multiple users can operate without race conditions on ingredient inventory'
  ],
  entities: [
    {
      name: 'CoffeeMachineService',
      description: 'Spring Singleton facade orchestrating production coffee machine operations and isolated simulation sandbox.',
      fields: [
        {
          name: 'mainMachine',
          type: 'CoffeeMachine',
          description: 'Primary production coffee machine instance'
        },
        {
          name: 'simMachine',
          type: 'CoffeeMachine',
          description: 'Isolated simulation sandbox machine instance'
        },
        {
          name: 'simEvents',
          type: 'List<SimEvent>',
          description: 'Thread-safe copy-on-write event stream for simulation telemetry'
        }
      ],
      methods: [
        {
          name: 'getMenu()',
          returns: 'List<CoffeeRecipe>',
          description: 'Fetches all registered coffee recipes from factory'
        },
        {
          name: 'startOrder(type)',
          returns: 'CoffeeOrder',
          description: 'Initiates a new base coffee order and transitions to SELECTING'
        },
        {
          name: 'addCustomization(addOn)',
          returns: 'CoffeeOrder',
          description: 'Chains a new Decorator add-on to the active coffee component'
        },
        {
          name: 'insertPayment(amount)',
          returns: 'CoffeeOrder',
          description: 'Accepts cash deposit and validates balance against order total'
        },
        {
          name: 'brew()',
          returns: 'CoffeeOrder',
          description: 'Acquires brew head, deducts multi-ingredient stock atomically, and dispenses cup'
        },
        {
          name: 'collectCoffee()',
          returns: 'CoffeeOrder',
          description: 'Customer picks up coffee cup and change; resets state to IDLE'
        }
      ]
    },
    {
      name: 'CoffeeComponent (Interface)',
      description: 'Base interface in Decorator Pattern defining the uniform contract for coffees and customizations.',
      fields: [],
      methods: [
        {
          name: 'getDescription()',
          returns: 'String',
          description: 'Returns combined description of base coffee and all chained add-ons'
        },
        {
          name: 'getPrice()',
          returns: 'double',
          description: 'Returns cumulative price of base coffee plus all decorator price deltas'
        },
        {
          name: 'getRequiredIngredients()',
          returns: 'Map<IngredientType, Integer>',
          description: 'Aggregates all ingredient requirements across the entire decorator chain'
        }
      ]
    },
    {
      name: 'CoffeeDecorator (Abstract)',
      description: 'Abstract decorator wrapping an inner CoffeeComponent, delegating core methods and combining added ingredients.',
      fields: [
        {
          name: 'decoratedCoffee',
          type: 'CoffeeComponent',
          description: 'Wrapped inner coffee component'
        }
      ],
      methods: [
        {
          name: 'getAddedIngredients()',
          returns: 'Map<IngredientType, Integer>',
          description: 'Abstract method defining this decorator\'s specific ingredient delta'
        }
      ]
    },
    {
      name: 'CoffeeFactory',
      description: 'Factory pattern implementation maintaining a dynamic registry of CoffeeRecipes and instantiating BaseCoffee components.',
      fields: [
        {
          name: 'recipeRegistry',
          type: 'Map<CoffeeType, CoffeeRecipe>',
          description: 'Thread-safe registry mapping coffee types to ingredient formulas'
        }
      ],
      methods: [
        {
          name: 'registerRecipe(recipe)',
          returns: 'void',
          description: 'Registers or updates a coffee recipe at runtime'
        },
        {
          name: 'createBaseCoffee(type)',
          returns: 'CoffeeComponent',
          description: 'Instantiates a new BaseCoffee for the given CoffeeType'
        }
      ]
    },
    {
      name: 'IngredientStore',
      description: 'Thread-safe inventory repository managing 7 hoppers with fine-grained per-ingredient ReentrantLocks.',
      fields: [
        {
          name: 'inventory',
          type: 'Map<IngredientType, AtomicInteger>',
          description: 'Current stock levels per ingredient'
        },
        {
          name: 'ingredientLocks',
          type: 'Map<IngredientType, ReentrantLock>',
          description: 'Individual mutexes for each ingredient hopper'
        }
      ],
      methods: [
        {
          name: 'checkAndDeductIngredients(required)',
          returns: 'boolean',
          description: 'Acquires locks in ascending enum order, verifies all quantities, and decrements atomically'
        },
        {
          name: 'refill(type, amount)',
          returns: 'void',
          description: 'Refills a specific ingredient hopper up to max capacity'
        }
      ]
    },
    {
      name: 'CoffeeMachineState (Interface)',
      description: 'State Pattern contract governing hardware session state transitions and operation validity.',
      fields: [],
      methods: [
        {
          name: 'selectBaseCoffee(m, type)',
          returns: 'void',
          description: 'Validates selection and transitions to SelectingState'
        },
        {
          name: 'addCustomization(m, addOn)',
          returns: 'void',
          description: 'Chains decorator in SelectingState'
        },
        {
          name: 'insertPayment(m, amount)',
          returns: 'void',
          description: 'Records payment and transitions to PaymentPendingState'
        },
        {
          name: 'brew(m)',
          returns: 'CoffeeOrder',
          description: 'Executes brew cycle in BrewingState and transitions to DispensedState'
        },
        {
          name: 'collectCoffee(m)',
          returns: 'CoffeeOrder',
          description: 'Collects cup in DispensedState and resets to IdleState'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Decorator Pattern',
      used: true,
      explanation: 'CoffeeComponent is the shared interface for both BaseCoffee and every add-on. Each concrete decorator (CaramelSyrupDecorator, ExtraMilkDecorator, ExtraShotDecorator, OatMilkDecorator, WhippedCreamDecorator) wraps an inner CoffeeComponent and adds its own price delta and ingredient requirements — getDescription()/getPrice()/getRequiredIngredients() walk the whole chain. Customizations stack in any combination without a combinatorial explosion of subclasses.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'CoffeeFactory holds a CoffeeType -> CoffeeRecipe registry (seeded with the 5 defaults in its constructor, extensible at runtime via registerRecipe()) and turns a CoffeeType into a freshly-built BaseCoffee via createBaseCoffee() — the caller never constructs a CoffeeComponent directly.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'CoffeeMachineService is a Spring @Service singleton bean, so its mainMachine field is the one shared production machine state for every request — there is exactly one physical machine, so there must be exactly one in-memory instance.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'CoffeeMachineInitializer (a CommandLineRunner) receives CoffeeMachineService via constructor injection so it can seed mainMachine\'s ingredient hoppers at boot. The machine and simulation state themselves are plain fields constructed with `new` inside the service, not injected — there is no repository layer to inject.'
    },
    {
      name: 'State Machine Pattern',
      used: true,
      explanation: 'Machine status transitions through a clear lifecycle: IDLE → selected → BREWING → COMPLETE → IDLE (or ERROR → IDLE after reset). The service enforces valid transitions — you cannot brew while already brewing.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'CoffeeMachineService orchestrates one shared machine\'s lifecycle. IngredientStore owns stock and per-ingredient locking. CoffeeFactory owns recipe lookup. CoffeeDecorator subclasses own their own price/ingredient delta. Nothing else touches the inventory maps directly.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new beverage requires only registering a new CoffeeRecipe with CoffeeFactory (in registerDefaultRecipes() or at runtime via registerRecipe()). The brewing logic in CoffeeMachine/CoffeeMachineService is unchanged. New ingredients can be added to the IngredientType enum without structural changes.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'CoffeeMachine\'s active order depends on the CoffeeComponent interface, not concrete BaseCoffee/decorator classes — any chain of decorators substitutes transparently. Each machine state depends on the CoffeeMachineState interface, not on a concrete IdleState/BrewingState/etc.'
    },
    {
      name: 'Encapsulation',
      description: 'Ingredient inventory is only modified through controlled service methods (brew consumes, refill restocks). Machine status transitions are enforced by service logic, preventing invalid states.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Inventory Protection',
      description: 'Ingredient levels are only modified through brew() and refillIngredient() methods. External code cannot directly add or remove ingredients from the machine, ensuring inventory integrity.',
      alternative: 'Could expose the inventory map directly. Encapsulation prevents accidental inventory corruption and ensures all mutations go through validation.'
    },
    {
      name: 'Enum-based Type Safety',
      description: 'Ingredient is an enum with 6 fixed constants. Recipe maps use Ingredient as keys, providing compile-time safety. Invalid ingredient names cannot accidentally be used.',
      alternative: 'Could use strings for ingredient names. Enum is chosen because it provides type safety, autocomplete, and prevents typos like "coffe" vs "coffee".'
    },
    {
      name: 'Polymorphism — Recipe-based Dispatching',
      description: 'Each beverage has its own recipe map. The same brew() code iterates over the recipe and consumes ingredients, regardless of which beverage is selected.',
      alternative: 'Could have per-beverage subclasses with custom brew() methods. Map-based recipe is more data-driven and makes adding new beverages trivial.'
    }
  ],
  extensibility: [
    {
      area: 'New Beverages',
      description: 'Register a new CoffeeRecipe with CoffeeFactory (either in registerDefaultRecipes() or at runtime via registerRecipe()) with a CoffeeType, name, price, and ingredient map. The brewing code handles it automatically. Frontend just needs to display it.',
      difficulty: 'Easy'
    },
    {
      area: 'Custom Recipe Creator',
      description: 'Add an API endpoint to create custom beverages. Validate ingredient availability. Store custom beverages in a separate map. The existing brew() logic handles any recipe.',
      difficulty: 'Medium'
    },
    {
      area: 'Temperature Control',
      description: 'Add temperature setting per beverage. Machine model gets a heater element. Brew() sets temperature based on beverage type. Frontend shows temperature gauge.',
      difficulty: 'Medium'
    },
    {
      area: 'Payment Integration',
      description: 'Add payment validation before brewing. Machine only brews after payment confirmed. Add coin/bill acceptor simulation. Frontend shows payment UI before brew button.',
      difficulty: 'Medium'
    },
    {
      area: 'Maintenance Alerts',
      description: 'Add threshold warnings when ingredients run low (<20%). Machine automatically switches to ERROR when any ingredient reaches 0. Frontend shows restock alerts.',
      difficulty: 'Easy'
    },
    {
      area: 'Multi-Machine Support',
      description: 'Replace CoffeeMachineService\'s single mainMachine field with a Map<String, CoffeeMachine>. Every service method takes a machineId parameter instead of implicitly operating on the one instance. Frontend adds a machine selector.',
      difficulty: 'Hard'
    }
  ],
  solid: [
    {
      principle: 'S — Single Responsibility',
      description: 'IngredientStore manages stock and locking; CoffeeFactory handles recipe creation; CoffeeDecorator handles price/ingredient customization; State classes manage session transitions.'
    },
    {
      principle: 'O — Open/Closed',
      description: 'New decorators (e.g. HazelnutSyrup, SoyMilk) or new coffee types (e.g. FlatWhite, Cortado) can be added without modifying existing core classes.'
    },
    {
      principle: 'L — Liskov Substitution',
      description: 'BaseCoffee and all CoffeeDecorator classes conform to CoffeeComponent and can be substituted transparently in any recipe calculation.'
    },
    {
      principle: 'I — Interface Segregation',
      description: 'CoffeeComponent, CoffeeMachineState, and REST interfaces provide concise, purposeful contracts without fat abstractions.'
    },
    {
      principle: 'D — Dependency Inversion',
      description: 'CoffeeMachine depends on the CoffeeComponent interface and CoffeeMachineState abstraction rather than hardcoded concrete states or drinks.'
    }
  ],
  concurrency: [
    {
      mechanism: 'Ascending Enum Lock Ordering',
      description: 'Multi-ingredient deduction sorts required IngredientType enums in natural ordinal order before acquisition, eliminating circular wait and preventing deadlocks between concurrent orders with overlapping ingredients.'
    },
    {
      mechanism: 'Physical Brew Head Mutex',
      description: 'A single ReentrantLock brewHeadLock guarantees that only one cup can brew on the physical nozzle at any moment, preventing mid-brew session collisions.'
    },
    {
      mechanism: 'Atomic Stock Check-and-Deduct',
      description: 'All required ingredients are validated simultaneously under multi-lock protection before any decrement occurs, preventing partial deduction on inventory exhaustion.'
    }
  ]
};
