// Sequence diagram content for vendingmachine.
// Grounded directly in VendingMachineService#purchase / selectProduct / insertMoney / dispense,
// and the State machine transitions (IdleState -> HasSelectionState -> HasMoneyState -> DispensingState).
export default {
  title: 'Vending Machine — State Machine Transitions & Change Calculation',
  description:
    'How VendingMachine manages an atomic purchase cycle across states: checking slot stock, validating inserted cash denominations, computing exact change, and dispensing the product while updating inventory.',
  flows: [
    {
      id: 'vending-machine-purchase',
      label: 'Atomic purchase: Selection → Payment → Change Return → Dispense',
      description:
        'Customer selects a beverage (Slot A1, Price ₹40), inserts ₹50 note (Denomination.FIFTY), machine calculates ₹10 change, deducts slot stock, and dispenses the item while transitioning back to IdleState.',
      participants: [
        { id: 'customer', name: 'Customer', kind: 'actor' },
        { id: 'controller', name: 'VendingMachine\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'VendingMachine\nService', kind: 'component', stereotype: 'facade' },
        { id: 'machine', name: 'VendingMachine\n(Context)', kind: 'component' },
        { id: 'state', name: 'Current State\n(State Pattern)', kind: 'component', stereotype: 'state' },
        { id: 'slot', name: 'Slot "A1"\n(Stock: 5)', kind: 'store' },
        { id: 'changeBox', name: 'ChangeInventory', kind: 'store' },
      ],
      steps: [
        { from: 'customer', to: 'controller', text: 'POST /api/vendingmachine/purchase {slotCode: "A1", denominations: [50]}' },
        { from: 'controller', to: 'service', text: 'purchase("A1", [50])', activate: 'service' },
        { from: 'service', to: 'machine', text: 'purchase("A1", [Denomination.FIFTY])', activate: 'machine' },
        { from: 'machine', to: 'slot', text: 'getSlot("A1") → Product("Soda", ₹40), stock=5' },
        { from: 'machine', to: 'state', text: 'transitionTo(HasSelectionState)' },
        { from: 'machine', to: 'machine', text: 'addMoney(FIFTY) → totalInserted = ₹50' },
        { from: 'machine', to: 'state', text: 'transitionTo(HasMoneyState)' },
        { from: 'machine', to: 'machine', text: 'changeNeeded = ₹50 - ₹40 = ₹10' },
        { from: 'machine', to: 'changeBox', text: 'dispenseChange(₹10) → [Denomination.TEN]' },
        { from: 'changeBox', to: 'machine', text: 'Change available: 1 x ₹10 note ✓', type: 'return' },
        { from: 'machine', to: 'state', text: 'transitionTo(DispensingState)' },
        { from: 'machine', to: 'slot', text: 'decrementStock() → stock becomes 4' },
        { from: 'machine', to: 'state', text: 'transitionTo(IdleState)' },
        { from: 'machine', to: 'service', text: 'Transaction {status: COMPLETED, item: "Soda", change: ₹10}', type: 'return', deactivate: 'machine' },
        { from: 'service', to: 'controller', text: 'return transaction', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'customer', text: '200 OK — Dispensed "Soda", returned ₹10 change', type: 'return' },
      ],
    },
  ],
};
