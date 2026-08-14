# Walkthrough — LLD Case Studies Phase Completion

Completed end-to-end implementation and verification for three major LLD case studies and routing enhancements:
1. **ATM System LLD (#7 Parity Upgrade)**
2. **Pub/Sub System LLD (#27)**
3. **Online Shopping System (Shopping Cart LLD #19)**
4. **App Routing Fixes (Hotel Management, Airline, Inventory)**

---

## 1. ATM System LLD (Project #7 Parity Upgrade)

### Key Architectural Upgrades (`com.lld.atm`)
- **Session Lifecycle State Machine (`ATMState`)**:
  - Enforces explicit state transitions: `IDLE` $\rightarrow$ `CARD_INSERTED` $\rightarrow$ `AUTHENTICATED` $\rightarrow$ `TRANSACTION_IN_PROGRESS` $\rightarrow$ `DISPENSING` $\rightarrow$ `SESSION_ENDED` / `CARD_BLOCKED`.
  - Guard methods validate transition prerequisites and throw `InvalidSessionStateException` on out-of-sequence calls.
- **Strategy Pattern for Denomination Dispensing (`com.lld.atm.dispenser`)**:
  - `DenominationDispenseStrategy` interface implemented by `GreedyDenominationDispenseStrategy`.
  - Greedily selects largest currency note combinations across ₹2000, ₹500, ₹200, and ₹100 notes.
  - Rejects invalid denomination requests (e.g. ₹2300 requested when only ₹2000 notes exist) with `InsufficientCashException`.
- **Fine-Grained Per-Account Concurrency & Locks (`Account` & `BankingService`)**:
  - Replaced global repository locking with a fair per-account `ReentrantLock` in `Account`.
  - Prevents race conditions during simultaneous multi-thread balance inquiries and debits.
- **Hardware Cash Dispenser Locking & Compensating Transactions**:
  - `CashDispenser` owns a dedicated `ReentrantLock`.
  - **Atomicity Protocol**: If cash dispensing fails after debiting an account, `AtmService` automatically triggers a **compensating transaction** that credits the debited amount back to the account balance before throwing `InsufficientCashException`.
- **Card Security & PIN Attempt Lockout**:
  - `Card` tracks `failedPinAttempts` via `AtomicInteger`.
  - After 3 consecutive failed PIN attempts, `card.blockCard()` is called, transitioning session state to `CARD_BLOCKED` and throwing `CardBlockedException` (HTTP 403).
- **Template Method Pattern (`Transaction`)**:
  - Abstract `Transaction` base class with concrete `WithdrawalTransaction` and `DepositTransaction` subclasses.
- **Isolated Simulation Engine (`/api/atm/sim/*`)**:
  - Endpoints supporting 10-thread balance race simulation, denomination mismatch compensation, and 3-attempt PIN lockout.
- **React Frontend UI (`src/lld/atm/`)**:
  - 4-tab React component (`AtmPage.jsx` + `api.js` + `AtmPage.css`):
    1. `🏧 ATM Terminal`: Physical cabinet UI with 4-digit PIN keypad, card slot animation, balance inquiry, deposit, withdrawal, note breakdown chips, and printable transaction receipt modal.
    2. `🔒 Concurrency Simulation`: Step-by-step interactive visualizer for 10-thread balance races, denomination failure compensation, and PIN lockout.
    3. `📐 Class Diagram`: Interactive diagram rendering via `<ClassDiagram lldKey="atm" />`.
    4. `📋 Design Details`: Complete architecture breakdown via `<DesignDetails lldKey="atm" />`.

---

## 2. Pub/Sub System LLD (Project #27)

### Architecture (`com.lld.pubsub`)
- Dedicated per-subscriber worker thread running an `ArrayBlockingQueue<Message>` to guarantee **strict FIFO message delivery ordering per subscriber**.
- `CopyOnWriteArrayList<SubscriberWorker>` dispatches messages without locking subscribers during high-throughput publish iterations.
- Drop-and-reject backpressure policy emits `QueueFullException` simulation alerts without stalling publishers when a slow consumer's queue overflows.
- 5-tab React UI (`PubSubPage.jsx`): Topics & Publishers, Subscribers & Inboxes, Interactive 2D Simulation, Class Diagram, Design Details.

---

## 3. Online Shopping System (Shopping Cart LLD #19)

### Architecture (`com.lld.shoppingcart`)
- **Command Pattern**: `CartCommand` interface (`AddItemCommand`, `RemoveItemCommand`, `UpdateQuantityCommand`) supporting single-step atomic Undo functionality.
- **Strategy Pattern**: `PaymentStrategy` interface with `CreditCard`, `DebitCard`, `UPI`, and `Wallet` strategies routed via `ShoppingCartPaymentProcessor`.
- **Deadlock Prevention**: Ascending `productId` lock acquisition ordering on per-product `ReentrantLock` instances during checkout.
- 7-tab React UI (`ShoppingCartPage.jsx`): Shop Catalog, Cart & Checkout with Undo, Orders Timeline, Seller Dashboard, Interactive 2D Concurrency Simulation, Class Diagram, Design Details.

---

## 4. Verification Results

### Automated Backend Tests
- Executed full repository backend unit test suite:
  ```bash
  wsl bash -c "cd backend && mvn test"
  ```
- **Results**: **66 tests run, 0 failures, 0 errors** (`BUILD SUCCESS`).
  - `AtmServiceTest`: 5/5 passed (including 10-thread simultaneous withdrawal race test and compensating credit refund test).
  - `ShoppingCartServiceTest`: 5/5 passed.
  - `PubSubServiceTest`: 5/5 passed.
  - `ParkingLotServiceTest`: 18/18 passed.
  - `MovieTicketServiceTest`: 7/7 passed.
  - `SplitwiseServiceTest`: 7/7 passed.
  - `ElevatorConcurrencyTest` / `LookScanDispatchStrategyTest`: 6/6 passed.
  - `TicTacToeServiceTest`: 5/5 passed.
  - `LruCacheServiceTest`: 5/5 passed.
  - `ZomatoServiceTest`: 3/3 passed.

### Automated Frontend Production Build
- Executed Vite production bundle compilation:
  ```bash
  wsl bash -c "cd frontend && npm run build"
  ```
- **Result**: **151 modules transformed cleanly in 9.42s with 0 build errors**.

---

## 5. Git Commit & Push Summary

All changes committed and pushed to git repository `main`:
1. `c49f84a`: `fix(routing): add route alias for hotel-management, airline-reservation, and inventory-management in App.jsx`
2. Next: `feat(atm): complete ATM System LLD parity upgrade with session state machine, denomination dispensing strategy, fine-grained per-account ReentrantLocks, compensating transactions, and 4-tab React UI`
