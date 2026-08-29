// Sequence diagram content for inventory.
// Grounded directly in InventoryService#decrementStock, StockAlertNotifier, and
// ReorderStrategyFactory / EoqReorderStrategy:
// Decrementing stock below threshold notifies observers and triggers strategy-driven reorder recommendation.
export default {
  title: 'Inventory — Stock Decrement & Strategy-Based Restock Alert',
  description:
    'How decrementStock() triggers low-stock observer alerts and computes the replenishment quantity via ReorderStrategyFactory without branching on ReorderPolicy. The class diagram shows the Observer and Strategy interfaces, but the sequence diagram reveals the notification fan-out and decoupled reorder calculation during live inventory mutations.',
  flows: [
    {
      id: 'low-stock-alert-flow',
      label: 'Stock decrement triggers low-stock alert & EOQ reorder calculation',
      description:
        'A customer purchase drops product PRD-001 (Laptop) below its threshold of 10 units. InventoryService updates stock atomically under a product lock, fires StockAlertNotifier, which fans out to InAppStockAlertObserver and LoggingStockAlertObserver, and queries ReorderStrategyFactory to compute replenishment quantity using EoqReorderStrategy.',
      participants: [
        { id: 'client', name: 'Order Service\n/ Client', kind: 'actor' },
        { id: 'controller', name: 'InventoryController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'InventoryService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'productLock("PRD-001")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'InventoryRepository', kind: 'store' },
        { id: 'notifier', name: 'StockAlertNotifier', kind: 'component', stereotype: 'observer' },
        { id: 'factory', name: 'ReorderStrategy\nFactory', kind: 'component', stereotype: 'factory' },
        { id: 'strategy', name: 'EoqReorder\nStrategy', kind: 'component', stereotype: 'strategy' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/inventory/products/PRD-001/decrement {quantity: 5}',
          detail: 'Client requests stock decrement of 5 units for product PRD-001.' },
        { from: 'controller', to: 'service', text: 'decrementStock("PRD-001", 5)', activate: 'service',
          detail: 'InventoryController delegates straight to the facade service.' },
        { from: 'service', to: 'lock', text: 'lock.lock() — acquire product lock', activate: 'lock' },
        { from: 'service', to: 'repo', text: 'getProduct("PRD-001")' },
        { from: 'repo', to: 'service', text: 'Product {id: "PRD-001", stock: 12, threshold: 10}', type: 'return' },
        { from: 'service', to: 'service', text: 'newStock = 12 - 5 = 7 (threshold=10 → LOW STOCK)' },
        { from: 'service', to: 'repo', text: 'updateStock("PRD-001", 7)' },
        { from: 'service', to: 'lock', text: 'lock.unlock()', deactivate: 'lock' },
        { type: 'note', over: ['service', 'notifier'], text: 'Stock crossed below threshold. Fan out alert to registered observers.' },
        { from: 'service', to: 'notifier', text: 'notifyObservers(StockAlertEvent(PRD-001, 7, 10))', activate: 'notifier' },
        { from: 'notifier', to: 'notifier', text: 'InAppStockAlertObserver.onLowStock(event) — publish in-app alert' },
        { from: 'notifier', to: 'notifier', text: 'LoggingStockAlertObserver.onLowStock(event) — audit log warning' },
        { from: 'notifier', to: 'service', text: 'notification complete', type: 'return', deactivate: 'notifier' },
        { from: 'service', to: 'factory', text: 'getStrategy(ReorderPolicy.EOQ)', activate: 'factory' },
        { from: 'factory', to: 'service', text: 'return EoqReorderStrategy instance', type: 'return', deactivate: 'factory' },
        { from: 'service', to: 'strategy', text: 'calculateReorderQuantity(product, policyConfig)', activate: 'strategy' },
        { from: 'strategy', to: 'service', text: 'return recommendedQty = 50', type: 'return', deactivate: 'strategy' },
        { from: 'service', to: 'controller', text: 'return StockUpdateResponse {stock: 7, lowStock: true, reorderQty: 50}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK {productId: "PRD-001", currentStock: 7, lowStock: true, reorderQty: 50}', type: 'return' },
      ],
    },
  ],
};
