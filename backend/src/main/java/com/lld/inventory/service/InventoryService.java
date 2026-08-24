package com.lld.inventory.service;

import com.lld.inventory.exception.InsufficientStockException;
import com.lld.inventory.exception.InvalidStockOperationException;
import com.lld.inventory.exception.ProductNotFoundException;
import com.lld.inventory.model.Category;
import com.lld.inventory.model.InventoryEvent;
import com.lld.inventory.model.Product;
import com.lld.inventory.model.StockAlert;
import com.lld.inventory.model.StockMovement;
import com.lld.inventory.model.Supplier;
import com.lld.inventory.observer.InAppStockAlertObserver;
import com.lld.inventory.observer.LoggingStockAlertObserver;
import com.lld.inventory.observer.StockAlertNotifier;
import com.lld.inventory.repository.InventoryRepository;
import com.lld.inventory.strategy.ReorderPolicy;
import com.lld.inventory.strategy.ReorderStrategy;
import com.lld.inventory.strategy.ReorderStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class InventoryService {

    /** Live module state. */
    private final InventoryRepository repository;
    private final StockAlertNotifier notifier;
    private final InAppStockAlertObserver inAppObserver;

    /**
     * Isolated sim sandbox — a second repository plus a second notifier wired to
     * FRESH observer instances, so sandbox sells/alerts never touch live data.
     * volatile because simReset() swaps the sandbox for a re-seeded one while
     * request threads may be reading.
     */
    private volatile InventoryRepository simRepository;
    private volatile StockAlertNotifier simNotifier;
    private volatile InAppStockAlertObserver simInAppObserver;

    private final ReorderStrategyFactory reorderFactory;

    /**
     * Per-product fair locks. Lock ordering: exactly ONE product lock is ever
     * held at a time (never nested), so no ordering rule is needed — the same
     * argument as uber's DriverAssignmentService. The stock check-then-act
     * ("read level, decide, write level" plus the low-stock crossing detection)
     * happens entirely inside the lock, which is what stops two concurrent
     * sales of the last unit from both succeeding. Unrelated products never
     * contend on these locks.
     */
    private final ConcurrentHashMap<Long, ReentrantLock> productLocks = new ConcurrentHashMap<>();

    public InventoryService(InventoryRepository repository,
                            StockAlertNotifier notifier,
                            InAppStockAlertObserver inAppObserver,
                            ReorderStrategyFactory reorderFactory) {
        this.repository = repository;
        this.notifier = notifier;
        this.inAppObserver = inAppObserver;
        this.reorderFactory = reorderFactory;
        resetSandbox();
    }

    // ------------------------------------------------------------- live API

    public Product addProduct(Product product) {
        if (product.getSku() == null || product.getSku().isBlank()) {
            throw new InvalidStockOperationException("Product SKU is required");
        }
        if (product.getCurrentStock() < 0 || product.getReorderLevel() < 0) {
            throw new InvalidStockOperationException("Stock levels cannot be negative");
        }
        Product saved = Product.builder()
                .id(repository.nextProductId())
                .sku(product.getSku())
                .name(product.getName())
                .category(product.getCategory() == null ? Category.OTHER : product.getCategory())
                .unitPrice(product.getUnitPrice())
                .currentStock(product.getCurrentStock())
                .reorderLevel(product.getReorderLevel())
                .supplierId(product.getSupplierId())
                .build();
        repository.addProduct(saved);
        logEvent(repository, InventoryEvent.EventType.PRODUCT_ADDED,
                "Product added: " + saved.getSku() + " (" + saved.getName() + "), stock=" + saved.getCurrentStock());
        return saved;
    }

    public List<Product> getProducts(String category) {
        if (category != null && !category.isEmpty()) {
            try {
                return repository.findProductsByCategory(Category.valueOf(category.toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new InvalidStockOperationException("Unknown category: " + category);
            }
        }
        return repository.findAllProducts();
    }

    public StockMovement updateStock(long productId, int quantity, String type, String reason) {
        return doUpdateStock(repository, notifier, productId,
                requirePositive(quantity), parseType(type), reason);
    }

    public List<Product> getLowStockItems(int threshold) {
        return repository.findAllProducts().stream()
                .filter(p -> p.getCurrentStock() <= threshold)
                .collect(Collectors.toList());
    }

    public List<StockAlert> getAlerts() {
        return inAppObserver.recentAlerts();
    }

    public List<InventoryEvent> getEvents() {
        return repository.findAllEvents();
    }

    public StockMovement transferStock(long productId, String fromLocation, String toLocation, int quantity) {
        return doUpdateStock(repository, notifier, productId,
                requirePositive(quantity), StockMovement.StockMovementType.TRANSFER,
                "Transfer from " + fromLocation + " to " + toLocation);
    }

    /** Executes a reorder policy for one product through the Strategy pattern. */
    public StockMovement reorder(long productId, ReorderPolicy policy) {
        ReorderStrategy strategy = requireStrategy(policy);
        ReentrantLock lock = lockFor(productId);
        lock.lock();
        try {
            Product product = requireProduct(repository, productId);
            int quantity = strategy.reorderQuantity(product); // may reject (e.g. MinRestock above level)
            applyInbound(repository, product, quantity);
            StockMovement movement = buildMovement(repository, productId, StockMovement.StockMovementType.INBOUND,
                    quantity, "Auto-reorder via " + strategy.name() + " policy");
            emitAlert(repository, notifier, product, StockAlert.AlertType.REORDER_PLACED,
                    StockMovement.StockMovementType.INBOUND, quantity,
                    strategy.name() + " reordered " + quantity + " units of " + product.getName());
            logEvent(repository, InventoryEvent.EventType.REORDER_PLACED,
                    strategy.name() + " reorder for " + product.getSku() + ": +" + quantity + " units");
            return movement;
        } finally {
            lock.unlock();
        }
    }

    public List<StockMovement> getStockMovements(long productId) {
        requireProduct(repository, productId);
        return repository.findMovementsByProductId(productId);
    }

    public List<Supplier> getSuppliers() {
        return repository.findAllSuppliers();
    }

    // ------------------------------------------------------------ sim API

    public void simReset() {
        resetSandbox();
    }

    public Map<String, Object> simState() {
        Map<String, Object> state = new HashMap<>();
        state.put("products", simRepository.findAllProducts());
        state.put("alerts", simInAppObserver.recentAlerts());
        state.put("movementCount", simRepository.countMovements());
        state.put("observers", simNotifier.observerCount());
        return state;
    }

    public StockMovement simSell(long productId, int quantity) {
        return doUpdateStock(simRepository, simNotifier, productId,
                requirePositive(quantity), StockMovement.StockMovementType.OUTBOUND, "Simulated sale");
    }

    public StockMovement simRestock(long productId, int quantity) {
        return doUpdateStock(simRepository, simNotifier, productId,
                requirePositive(quantity), StockMovement.StockMovementType.INBOUND, "Simulated supplier restock");
    }

    public StockMovement simTransfer(long productId, int quantity) {
        return doUpdateStock(simRepository, simNotifier, productId,
                requirePositive(quantity), StockMovement.StockMovementType.TRANSFER,
                "Simulated warehouse transfer A -> B");
    }

    public StockMovement simReorder(long productId, ReorderPolicy policy) {
        ReorderStrategy strategy = requireStrategy(policy);
        ReentrantLock lock = lockFor(productId);
        lock.lock();
        try {
            Product product = requireProduct(simRepository, productId);
            int quantity = strategy.reorderQuantity(product);
            applyInbound(simRepository, product, quantity);
            StockMovement movement = buildMovement(simRepository, productId, StockMovement.StockMovementType.INBOUND,
                    quantity, "SIM auto-reorder via " + strategy.name());
            emitAlert(simRepository, simNotifier, product, StockAlert.AlertType.REORDER_PLACED,
                    StockMovement.StockMovementType.INBOUND, quantity,
                    "SIM: " + strategy.name() + " reordered " + quantity + " units of " + product.getName());
            logEvent(simRepository, InventoryEvent.EventType.REORDER_PLACED,
                    "SIM " + strategy.name() + " reorder for " + product.getSku() + ": +" + quantity);
            return movement;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Fires {@code buyers} concurrent single-unit purchases at one product via a
     * CountDownLatch so they genuinely race. Exactly min(stock-at-race-start,
     * buyers) succeed — the rest are rejected with InsufficientStockException,
     * and stock never goes negative.
     */
    public Map<String, Object> simRace(long productId, int buyers) {
        if (buyers < 2 || buyers > 50) {
            throw new InvalidStockOperationException("buyers must be between 2 and 50");
        }
        Product product = requireProduct(simRepository, productId);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        Thread[] threads = new Thread[buyers];
        for (int i = 0; i < buyers; i++) {
            threads[i] = new Thread(() -> {
                try {
                    start.await();
                    doUpdateStock(simRepository, simNotifier, productId, 1,
                            StockMovement.StockMovementType.OUTBOUND, "Sim race buyer");
                    succeeded.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (InsufficientStockException | InvalidStockOperationException | ProductNotFoundException e) {
                    rejected.incrementAndGet();
                }
            }, "inventory-sim-buyer-" + i);
            threads[i].start();
        }
        start.countDown();
        for (Thread t : threads) {
            try {
                t.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        Product after = requireProduct(simRepository, productId);
        logEvent(simRepository, InventoryEvent.EventType.SIM_RACE,
                buyers + " concurrent buyers raced for " + product.getSku() + ": "
                        + succeeded.get() + " succeeded, " + rejected.get() + " rejected, "
                        + after.getCurrentStock() + " units remain");
        Map<String, Object> result = new HashMap<>();
        result.put("product", after.getName());
        result.put("sku", after.getSku());
        result.put("buyers", buyers);
        result.put("succeeded", succeeded.get());
        result.put("rejected", rejected.get());
        result.put("remainingStock", after.getCurrentStock());
        return result;
    }

    public List<StockAlert> simAlerts() {
        return simInAppObserver.recentAlerts();
    }

    public List<InventoryEvent> simEvents() {
        return simRepository.findAllEvents();
    }

    // ------------------------------------------------------- shared internals

    /**
     * The ONE stock-mutation path for live and sim alike (course-registration's
     * shared-doRegister idiom): the caller chooses the repository/notifier/feed
     * triple, so validation, stock arithmetic, crossing detection and alert
     * fan-out cannot drift apart between the two paths.
     */
    private StockMovement doUpdateStock(InventoryRepository repo, StockAlertNotifier targetNotifier,
                                        long productId, int quantity,
                                        StockMovement.StockMovementType type, String reason) {
        ReentrantLock lock = lockFor(productId);
        lock.lock();
        try {
            Product product = requireProduct(repo, productId);
            int before = product.getCurrentStock();
            boolean wasAtOrBelowLevel = product.isAtOrBelowReorderLevel();

            int after = switch (type) {
                case INBOUND -> before + quantity;
                case OUTBOUND, TRANSFER -> before - quantity;
            };
            if (after < 0) {
                throw new InsufficientStockException(product.getSku(), quantity, before);
            }
            product.setCurrentStock(after);
            repo.saveProduct(product);
            StockMovement movement = buildMovement(repo, productId, type, quantity, reason);

            // Crossing detection runs INSIDE the lock: computed from values read
            // under the same lock acquisition as the write, so two racers can
            // never both claim (or both miss) the same crossing.
            switch (type) {
                case OUTBOUND, TRANSFER -> {
                    if (after == 0) {
                        emitAlert(repo, targetNotifier, product, StockAlert.AlertType.OUT_OF_STOCK,
                                type, quantity, product.getName() + " is OUT OF STOCK");
                    } else if (!wasAtOrBelowLevel && after <= product.getReorderLevel()) {
                        emitAlert(repo, targetNotifier, product, StockAlert.AlertType.LOW_STOCK,
                                type, quantity, product.getName() + " crossed below reorder level ("
                                        + product.getReorderLevel() + ")");
                    }
                }
                case INBOUND -> {
                    if (wasAtOrBelowLevel && after > product.getReorderLevel()) {
                        emitAlert(repo, targetNotifier, product, StockAlert.AlertType.RESTOCKED,
                                type, quantity, product.getName() + " restocked above reorder level");
                    }
                }
            }
            return movement;
        } finally {
            lock.unlock();
        }
    }

    private void applyInbound(InventoryRepository repo, Product product, int quantity) {
        product.setCurrentStock(product.getCurrentStock() + quantity);
        repo.saveProduct(product);
    }

    /**
     * The in-app feed is itself one of {@code targetNotifier}'s registered observers
     * (see {@link #resetSandbox} and the live constructor call), so publishing once is
     * enough — it used to also be invoked directly here, which double-added every alert
     * to {@code InAppStockAlertObserver}'s deque.
     */
    private void emitAlert(InventoryRepository idRepo, StockAlertNotifier targetNotifier,
                           Product product, StockAlert.AlertType alertType,
                           StockMovement.StockMovementType movementType, int quantityChanged, String message) {
        StockAlert alert = StockAlert.builder()
                .id(idRepo.nextEventId())
                .type(alertType)
                .productId(product.getId())
                .sku(product.getSku())
                .productName(product.getName())
                .currentStock(product.getCurrentStock())
                .reorderLevel(product.getReorderLevel())
                .quantityChanged(quantityChanged)
                .movementType(movementType)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
        targetNotifier.publish(alert);   // fans out to every registered observer, including the in-app feed
    }

    private StockMovement buildMovement(InventoryRepository repo, long productId,
                                        StockMovement.StockMovementType type, int quantity, String reason) {
        StockMovement movement = StockMovement.builder()
                .id(repo.nextMovementId())
                .productId(productId)
                .type(type)
                .quantity(quantity)
                .timestamp(LocalDateTime.now())
                .reason(reason)
                .referenceId(type.name().charAt(0) + "MV-" + System.currentTimeMillis())
                .build();
        repo.addMovement(movement);
        logEvent(repo,
                type == StockMovement.StockMovementType.TRANSFER
                        ? InventoryEvent.EventType.TRANSFER
                        : InventoryEvent.EventType.STOCK_MOVED,
                type + " " + quantity + " unit(s) for product #" + productId + " (" + reason + ")");
        return movement;
    }

    private void logEvent(InventoryRepository repo, InventoryEvent.EventType type, String message) {
        repo.addEvent(InventoryEvent.builder()
                .id(repo.nextEventId())
                .type(type)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build());
    }

    private Product requireProduct(InventoryRepository repo, long productId) {
        Product product = repo.findProductById(productId);
        if (product == null) {
            throw new ProductNotFoundException(productId);
        }
        return product;
    }

    private ReorderStrategy requireStrategy(ReorderPolicy policy) {
        ReorderStrategy strategy = reorderFactory.forPolicy(policy);
        if (strategy == null) {
            throw new InvalidStockOperationException("Unknown reorder policy: " + policy);
        }
        return strategy;
    }

    private StockMovement.StockMovementType parseType(String type) {
        if (type == null || type.isBlank()) {
            throw new InvalidStockOperationException("Movement type is required (INBOUND/OUTBOUND)");
        }
        try {
            return StockMovement.StockMovementType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidStockOperationException("Unknown movement type: " + type);
        }
    }

    private int requirePositive(int quantity) {
        if (quantity <= 0) {
            throw new InvalidStockOperationException("Quantity must be positive, got " + quantity);
        }
        return quantity;
    }

    private ReentrantLock lockFor(long productId) {
        return productLocks.computeIfAbsent(productId, id -> new ReentrantLock(true));
    }

    private void resetSandbox() {
        InventoryRepository freshRepo = new InventoryRepository(); // constructor seeds demo data
        InAppStockAlertObserver freshFeed = new InAppStockAlertObserver();
        StockAlertNotifier freshNotifier = new StockAlertNotifier(
                List.of(freshFeed, new LoggingStockAlertObserver()));
        this.simRepository = freshRepo;
        this.simInAppObserver = freshFeed;
        this.simNotifier = freshNotifier;
    }
}
