# Walkthrough — LLD Case Studies Phase Completion

Completed end-to-end implementation and verification for two major LLD case studies:
1. **Pub/Sub System LLD (#27)**
2. **Online Shopping System (Shopping Cart LLD #19)**

---

## 1. Pub/Sub System LLD (Project #27)

### Changes Made
- **Backend Architecture (`com.lld.pubsub`)**:
  - `Message`: Core message object carrying id, topic, payload, publisher id, and epoch timestamp.
  - `Subscriber`: Interface defining `consume(Message)`. Provided 3 concrete implementations: `PrintSubscriber`, `LoggingSubscriber`, and `SlowSubscriber`.
  - `SubscriberWorker`: Dedicated per-subscriber worker thread running an `ArrayBlockingQueue<Message>` (capacity=50) to guarantee **strict FIFO message delivery ordering per subscriber**.
  - `Topic`: Subject managing `CopyOnWriteArrayList<SubscriberWorker>` to support lock-free publish iteration during concurrent subscriber joins/leaves.
  - `Broker`: Domain manager maintaining `ConcurrentHashMap<String, Topic>`.
  - `PubSubService`: Singleton Spring facade supporting dynamic topic creation, subscriber registration, publishing, and isolated simulation engine (`/api/pubsub/sim/*`).
  - `PubSubController`: REST controller annotated with `@CrossOrigin(origins = "*")`.
- **Backend Tests (`PubSubServiceTest`)**:
  - Verified topic creation, multi-subscriber message delivery, strict FIFO per-subscriber ordering, slow consumer isolation, and drop-and-reject backpressure handling under full queue conditions. **All 5 JUnit tests passed cleanly in 0.8s**.
- **Frontend UI (`src/lld/pubsub/`)**:
  - 5-tab React component (`PubSubPage.jsx` + `api.js`): Topics & Publishers, Subscribers & Inboxes, Interactive 2D Simulation, Class Diagram, Design Details.

---

## 2. Online Shopping System (Shopping Cart LLD #19)

### Changes Made
- **Backend Architecture (`com.lld.shoppingcart`)**:
  - **Models & Enums**: `Category`, `OrderStatus` (`PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`), `PaymentMethod` (`CREDIT_CARD`, `DEBIT_CARD`, `UPI`, `WALLET`), `User`, `Product` (with `AtomicInteger stockQuantity` and per-product `ReentrantLock`), `CartItem`, `Cart`, `OrderItem`, `Order`, `SimEvent`.
  - **Command Pattern (`com.lld.shoppingcart.command`)**: `CartCommand` interface (`execute()`, `undo()`), `AddItemCommand`, `RemoveItemCommand`, `UpdateQuantityCommand`. Enables single-step atomic Undo functionality.
  - **Payment Strategy Pattern (`com.lld.shoppingcart.payment`)**: `PaymentStrategy` interface with `CreditCardPaymentStrategy`, `DebitCardPaymentStrategy`, `UpiPaymentStrategy`, `WalletPaymentStrategy`, routed via `ShoppingCartPaymentProcessor`.
  - **Custom Exception Hierarchy (`com.lld.shoppingcart.exception`)**: `ProductNotFoundException` (404), `InsufficientStockException` (409), `CartEmptyException` (400), `PaymentFailedException` (422), `InvalidOrderStateException` (400).
  - **Service & Concurrency (`ShoppingCartService`)**:
    - **Deadlock Prevention**: Sorts required product locks by `productId` ascending before acquiring per-product `ReentrantLock` instances during checkout.
    - **Zero Overselling**: Atomic CAS check-and-decrement validation under lock.
    - **Idempotency Support**: Caches cached orders by idempotency key.
    - **Order Lifecycle & Restocking**: Restocks inventory when orders in `PLACED`/`PROCESSING` states are cancelled.
    - **Isolated Simulation Engine**: Surface at `/api/shoppingcart/sim/*`.
  - **Controller (`ShoppingCartController`)**: REST API annotated with `@CrossOrigin(origins = "*")`.
- **Backend Tests (`ShoppingCartServiceTest`)**:
  - Authored 5 JUnit tests including a **10-thread simultaneous checkout concurrency race condition test** on a low-stock product (2 units).
  - Verified **exactly 2 orders succeeded and 8 failed with `InsufficientStockException`**, leaving stock at 0 with zero negative overselling. **All 5 tests passed cleanly in 0.75s**.
- **Frontend UI (`src/lld/shoppingcart/`)**:
  - Built 7-tab React component (`ShoppingCartPage.jsx` + `api.js` using `apiFetch` helper): Shop Catalog, Cart & Checkout with Undo, Orders Timeline, Seller Dashboard, Interactive 2D Simulation, Class Diagram, Design Details.

---

## 3. Verification Results

### Automated Tests
1. **Pub/Sub System JUnit Test Suite**:
   ```bash
   wsl bash -c "cd backend && mvn test -Dtest=PubSubServiceTest"
   # Output: Tests run: 5, Failures: 0, Errors: 0, Skipped: 0 -> BUILD SUCCESS
   ```
2. **Shopping Cart System JUnit Test Suite**:
   ```bash
   wsl bash -c "cd backend && mvn test -Dtest=ShoppingCartServiceTest"
   # Output: Tests run: 5, Failures: 0, Errors: 0, Skipped: 0 -> BUILD SUCCESS
   ```
3. **Frontend Vite Production Build**:
   ```bash
   wsl bash -c "cd frontend && npm run build"
   # Output: 150 modules transformed -> built in 4.98s (0 errors)
   ```

---

## Summary of Completed Git Commits
- Commit `eec4e62`: `feat(pubsub): complete Pub/Sub System LLD module with Producer-Consumer per-subscriber worker queues, FIFO ordering, backpressure, and 5-tab UI`
