// Sequence diagram content for coffee (Coffee Machine).
// Grounded directly in CoffeeMachineService, CoffeeMachine state machine, and CoffeeFactory:
// Order lifecycle: IdleState -> SelectingState -> PaymentPendingState -> BrewingState -> DispensedState.
export default {
  title: 'Coffee Machine — Order Lifecycle & State Machine Transitions',
  description:
    'How CoffeeMachine manages beverage creation across strict state transitions: recipe selection via CoffeeFactory, decorator customization, payment processing, ingredient validation & deduction, and brewing.',
  flows: [
    {
      id: 'coffee-order-lifecycle',
      label: 'End-to-end Espresso order & brew lifecycle',
      description:
        'Customer selects an Espresso, inserts payment, machine checks and deducts water & beans from IngredientStore, transitions through BrewingState, and completes in DispensedState.',
      participants: [
        { id: 'customer', name: 'Customer', kind: 'actor' },
        { id: 'controller', name: 'CoffeeMachine\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'CoffeeMachine\nService', kind: 'component', stereotype: 'facade' },
        { id: 'machine', name: 'CoffeeMachine\n(Context)', kind: 'component' },
        { id: 'factory', name: 'CoffeeFactory', kind: 'component', stereotype: 'factory' },
        { id: 'store', name: 'IngredientStore', kind: 'store' },
        { id: 'state', name: 'Current State\n(State Pattern)', kind: 'component', stereotype: 'state' },
      ],
      steps: [
        { from: 'customer', to: 'controller', text: 'POST /api/coffee/order/start {type: "ESPRESSO"}' },
        { from: 'controller', to: 'service', text: 'startOrder(CoffeeType.ESPRESSO)', activate: 'service' },
        { from: 'service', to: 'machine', text: 'selectBaseCoffee(ESPRESSO)', activate: 'machine' },
        { from: 'machine', to: 'factory', text: 'createRecipe(ESPRESSO)' },
        { from: 'factory', to: 'machine', text: 'CoffeeRecipe {price: 120.0, reqs: {WATER: 50, BEANS: 18}}', type: 'return' },
        { from: 'machine', to: 'state', text: 'transitionTo(SelectingState)' },
        { from: 'machine', to: 'service', text: 'CoffeeOrder {status: CREATED, price: 120.0}', type: 'return', deactivate: 'machine' },
        { from: 'service', to: 'controller', text: 'return order', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'customer', text: '200 OK — Order created (Price: ₹120.00)', type: 'return' },
        { from: 'customer', to: 'controller', text: 'POST /api/coffee/order/pay {amount: 150.0}' },
        { from: 'controller', to: 'service', text: 'insertPayment(150.0)', activate: 'service' },
        { from: 'service', to: 'machine', text: 'insertPayment(150.0)', activate: 'machine' },
        { from: 'machine', to: 'state', text: 'transitionTo(PaymentPendingState) → PAID (change: ₹30.00)' },
        { from: 'machine', to: 'service', text: 'return order (PAID)', type: 'return', deactivate: 'machine' },
        { from: 'service', to: 'controller', text: 'return order', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'customer', text: '200 OK — Payment accepted (Change: ₹30.00)', type: 'return' },
        { from: 'customer', to: 'controller', text: 'POST /api/coffee/order/brew' },
        { from: 'controller', to: 'service', text: 'brew()', activate: 'service' },
        { from: 'service', to: 'machine', text: 'brew()', activate: 'machine' },
        { from: 'machine', to: 'store', text: 'checkAndDeductIngredients({WATER: 50, BEANS: 18})' },
        { from: 'store', to: 'machine', text: 'Ingredients deducted successfully ✓', type: 'return' },
        { from: 'machine', to: 'state', text: 'transitionTo(BrewingState) → DispensedState' },
        { from: 'machine', to: 'service', text: 'CoffeeOrder {status: DISPENSED}', type: 'return', deactivate: 'machine' },
        { from: 'service', to: 'controller', text: 'return order', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'customer', text: '200 OK — Fresh Espresso brewed & dispensed!', type: 'return' },
      ],
    },
  ],
};
