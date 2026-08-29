// Sequence diagram content for restaurant.
// Grounded directly in RestaurantService, TableAllocationService (capacity matching + table locks),
// and KitchenService (order preparation pipeline).
export default {
  title: 'Restaurant — Table Allocation, Order Placement & Kitchen Lifecycle',
  description:
    'How RestaurantService coordinates dining workflows across services: matching party size to optimal available tables, placing multi-item orders, dispatching kitchen tickets with status transitions, and calculating final bills.',
  flows: [
    {
      id: 'table-and-order-flow',
      label: 'Table allocation → Order dispatch → Kitchen preparation',
      description:
        'A party of 4 requests seating. TableAllocationService locks and claims Table T-04 (Capacity: 4). Customer places an order, KitchenService receives the order ticket and transitions it to PREPARING, and table status updates to ORDER_PLACED.',
      participants: [
        { id: 'guest', name: 'Guest / Waiter', kind: 'actor' },
        { id: 'controller', name: 'Restaurant\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'RestaurantService', kind: 'component', stereotype: 'facade' },
        { id: 'tableAlloc', name: 'TableAllocation\nService', kind: 'component' },
        { id: 'kitchen', name: 'KitchenService', kind: 'component' },
        { id: 'repo', name: 'Restaurant\nRepository', kind: 'store' },
      ],
      steps: [
        { from: 'guest', to: 'controller', text: 'POST /api/restaurant/tables/assign {partySize: 4, customerName: "David"}' },
        { from: 'controller', to: 'service', text: 'assignTable(4, "David")', activate: 'service' },
        { from: 'service', to: 'tableAlloc', text: 'findAndOccupyTable(4, "David")', activate: 'tableAlloc' },
        { from: 'tableAlloc', to: 'repo', text: 'getAvailableTables() → [T-02(2), T-04(4), T-08(8)]' },
        { from: 'tableAlloc', to: 'tableAlloc', text: 'matchOptimalTable(partySize=4) → Table T-04' },
        { from: 'tableAlloc', to: 'repo', text: 'updateTableStatus("T-04", OCCUPIED, occupiedBy="David")' },
        { from: 'tableAlloc', to: 'service', text: 'Table T-04 (OCCUPIED)', type: 'return', deactivate: 'tableAlloc' },
        { from: 'service', to: 'controller', text: 'return table', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'guest', text: '200 OK — Seated at Table T-04', type: 'return' },
        { from: 'guest', to: 'controller', text: 'POST /api/restaurant/orders {tableId: "T-04", items: [{itemId: "PASTA", qty: 2}, {itemId: "PIZZA", qty: 1}]}' },
        { from: 'controller', to: 'service', text: 'createOrder("T-04", items)', activate: 'service' },
        { from: 'service', to: 'kitchen', text: 'dispatchKitchenTicket("ORD-101", items)', activate: 'kitchen' },
        { from: 'kitchen', to: 'kitchen', text: 'createTicket("K-TKT-101", status=PREPARING)' },
        { from: 'kitchen', to: 'service', text: 'Ticket K-TKT-101 queued', type: 'return', deactivate: 'kitchen' },
        { from: 'service', to: 'repo', text: 'saveOrder(Order {id: "ORD-101", table: "T-04", total: ₹850.0, status: PREPARING})' },
        { from: 'service', to: 'controller', text: 'return Order ORD-101', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'guest', text: '200 OK — Order ORD-101 placed & cooking in kitchen', type: 'return' },
      ],
    },
  ],
};
