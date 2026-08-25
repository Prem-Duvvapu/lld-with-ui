package com.lld.coffeemachine.service;

import com.lld.coffeemachine.config.CoffeeMachineInitializer;
import com.lld.coffeemachine.factory.CoffeeFactory;
import com.lld.coffeemachine.factory.CoffeeRecipe;
import com.lld.coffeemachine.model.*;
import com.lld.coffeemachine.store.IngredientStore;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class CoffeeMachineService {
    private final CoffeeMachine mainMachine = new CoffeeMachine("COFFEE-PROD-01", new IngredientStore(), new CoffeeFactory());

    // Isolated Simulation Engine Sandbox
    private final CoffeeMachine simMachine = new CoffeeMachine("COFFEE-SIM-01", new IngredientStore(), new CoffeeFactory());
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public CoffeeMachine getMainMachine() {
        return mainMachine;
    }

    public CoffeeMachine getSimMachine() {
        return simMachine;
    }

    // =========================================================================
    // PRODUCTION SERVICE OPERATIONS
    // =========================================================================

    public List<CoffeeRecipe> getMenu() {
        return mainMachine.getCoffeeFactory().getAllRecipes();
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("machineId", mainMachine.getMachineId());
        status.put("stateName", mainMachine.getCurrentState().getStateName());
        status.put("status", mainMachine.getCurrentState().getStatus());
        status.put("statusDescription", mainMachine.getCurrentState().getStatus().getDescription());
        status.put("currentOrder", mainMachine.getCurrentOrder());
        status.put("lowStockAlerts", mainMachine.getIngredientStore().getLowStockAlerts());
        status.put("totalOrdersCount", mainMachine.getOrderHistory().size());
        return status;
    }

    public Map<IngredientType, Integer> getInventory() {
        return mainMachine.getIngredientStore().getAllStock();
    }

    public Map<String, Object> getInventoryDetails() {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("stock", mainMachine.getIngredientStore().getAllStock());
        details.put("capacities", mainMachine.getIngredientStore().getCapacities());
        details.put("thresholds", mainMachine.getIngredientStore().getLowStockThresholds());
        details.put("lowStockAlerts", mainMachine.getIngredientStore().getLowStockAlerts());
        return details;
    }

    public CoffeeOrder startOrder(CoffeeType type) {
        return mainMachine.selectBaseCoffee(type);
    }

    public CoffeeOrder addCustomization(String customization) {
        return mainMachine.addCustomization(customization);
    }

    public CoffeeOrder insertPayment(double amount) {
        return mainMachine.insertPayment(amount);
    }

    public CoffeeOrder brew() {
        return mainMachine.brew();
    }

    public CoffeeOrder collectCoffee() {
        return mainMachine.collectCoffee();
    }

    public CoffeeOrder cancelOrder() {
        return mainMachine.cancel();
    }

    public void refillIngredient(IngredientType type, int amount) {
        mainMachine.getIngredientStore().refill(type, amount);
    }

    public List<CoffeeOrder> getOrders() {
        return new ArrayList<>(mainMachine.getOrderHistory());
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        CoffeeMachineInitializer.seedMachine(simMachine);
        simMachine.setCurrentState(simMachine.getIdleState());
        simMachine.setCurrentOrder(null);
        simMachine.setActiveComponent(null);

        SimEvent initEvent = new SimEvent(
                "SIM-EV-" + simEventIdGen.getAndIncrement(),
                1,
                "INITIALIZE",
                "Machine Initialized & Hoppers Stocked",
                "Bootstrapped COFFEE-SIM-01 with 7 fresh ingredient stores (Water: 3000ml, Milk: 2000ml, Beans: 1000g).",
                "SUCCESS"
        ).addDetail("state", simMachine.getCurrentState().getStateName());

        simEvents.add(initEvent);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simSelectBase(CoffeeType type, int step) {
        try {
            simMachine.selectBaseCoffee(type);
            CoffeeOrder order = simMachine.getCurrentOrder();

            SimEvent event = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "SELECT_BASE",
                    "Base Coffee Selected: " + type.getDisplayName(),
                    "Factory instantiated base " + type.getDisplayName() + " (₹" + order.getTotalPrice() + "). State transitioned to SELECTING.",
                    "SUCCESS"
            ).addDetail("baseCoffee", type.getDisplayName())
             .addDetail("price", order.getTotalPrice())
             .addDetail("state", simMachine.getCurrentState().getStateName());

            simEvents.add(event);
        } catch (Exception ex) {
            SimEvent errEvent = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "SELECT_BASE_ERROR",
                    "Base Selection Failed: " + type,
                    ex.getMessage(),
                    "ERROR"
            );
            simEvents.add(errEvent);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simAddCustomization(String addOn, int step) {
        try {
            simMachine.addCustomization(addOn);
            CoffeeOrder order = simMachine.getCurrentOrder();

            SimEvent event = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "ADD_CUSTOMIZATION",
                    "Decorator Chained: " + addOn,
                    "Wrapped order with " + addOn + " decorator. New total: ₹" + order.getTotalPrice() + " (" + order.getDescription() + ").",
                    "SUCCESS"
            ).addDetail("addOn", addOn)
             .addDetail("newPrice", order.getTotalPrice())
             .addDetail("description", order.getDescription())
             .addDetail("assembledIngredients", order.getRequiredIngredients());

            simEvents.add(event);
        } catch (Exception ex) {
            SimEvent errEvent = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "CUSTOMIZATION_ERROR",
                    "Decorator Chaining Failed",
                    ex.getMessage(),
                    "ERROR"
            );
            simEvents.add(errEvent);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simInsertPayment(double amount, int step) {
        try {
            simMachine.insertPayment(amount);
            CoffeeOrder order = simMachine.getCurrentOrder();

            SimEvent event = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "INSERT_PAYMENT",
                    "Cash Deposit: ₹" + amount,
                    "Inserted ₹" + amount + ". Total Paid: ₹" + order.getAmountPaid() + " (Price: ₹" + order.getTotalPrice() + ").",
                    "SUCCESS"
            ).addDetail("amountInserted", amount)
             .addDetail("totalPaid", order.getAmountPaid())
             .addDetail("totalPrice", order.getTotalPrice())
             .addDetail("state", simMachine.getCurrentState().getStateName());

            simEvents.add(event);
        } catch (Exception ex) {
            SimEvent errEvent = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "PAYMENT_ERROR",
                    "Payment Rejected",
                    ex.getMessage(),
                    "ERROR"
            );
            simEvents.add(errEvent);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simBrew(int step) {
        try {
            CoffeeOrder order = simMachine.brew();

            SimEvent event = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "BREW_COMPLETE",
                    "Brew Cycle Finished: " + order.getDescription(),
                    "Atomic multi-ingredient deduction succeeded without deadlocks. Change returned: ₹" + order.getChangeReturned(),
                    "SUCCESS"
            ).addDetail("description", order.getDescription())
             .addDetail("changeReturned", order.getChangeReturned())
             .addDetail("state", simMachine.getCurrentState().getStateName());

            simEvents.add(event);
        } catch (Exception ex) {
            SimEvent errEvent = new SimEvent(
                    "SIM-EV-" + simEventIdGen.getAndIncrement(),
                    step,
                    "BREW_ERROR",
                    "Brew Execution Exception",
                    ex.getMessage(),
                    "ERROR"
            );
            simEvents.add(errEvent);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simCollect(int step) {
        CoffeeOrder order = simMachine.collectCoffee();
        SimEvent event = new SimEvent(
                "SIM-EV-" + simEventIdGen.getAndIncrement(),
                step,
                "COLLECT_COFFEE",
                "Cup Retrieved by Customer",
                "Customer picked up " + (order != null ? order.getDescription() : "coffee") + ". Machine reset to IDLE.",
                "INFO"
        ).addDetail("state", simMachine.getCurrentState().getStateName());

        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simCancel(int step) {
        CoffeeOrder order = simMachine.cancel();
        SimEvent event = new SimEvent(
                "SIM-EV-" + simEventIdGen.getAndIncrement(),
                step,
                "CANCEL_ORDER",
                "Order Cancelled",
                (order != null ? order.getMessage() : "Order cancelled.") + (order != null && order.getChangeReturned() > 0 ? " Refund: ₹" + order.getChangeReturned() : ""),
                "WARNING"
        ).addDetail("refund", order != null ? order.getChangeReturned() : 0);

        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simRefill(IngredientType type, int amount, int step) {
        simMachine.getIngredientStore().refill(type, amount);
        int newStock = simMachine.getIngredientStore().getStock(type);

        SimEvent event = new SimEvent(
                "SIM-EV-" + simEventIdGen.getAndIncrement(),
                step,
                "REFILL_INGREDIENT",
                "Refilled " + type.name(),
                "Added " + amount + type.getUnit() + " of " + type.name() + ". New level: " + newStock + type.getUnit(),
                "INFO"
        ).addDetail("ingredient", type.name())
         .addDetail("newStock", newStock);

        simEvents.add(event);
        return getSimSnapshot();
    }

    /**
     * Deterministically pins one ingredient's stock to a demo level (capacity/threshold
     * untouched), so the simulation can reliably demonstrate the failure path — ordering a drink
     * whose recipe needs more of that ingredient than is on hand — without depending on how much
     * earlier demo steps happened to consume.
     */
    public synchronized Map<String, Object> simSetStock(IngredientType type, int level, int step) {
        IngredientStore store = simMachine.getIngredientStore();
        int capacity = store.getCapacities().getOrDefault(type, 2000);
        int threshold = store.getLowStockThresholds().getOrDefault(type, 100);
        store.initIngredient(type, level, capacity, threshold);

        SimEvent event = new SimEvent(
                "SIM-EV-" + simEventIdGen.getAndIncrement(),
                step,
                "SET_STOCK",
                "Hopper Pinned Low: " + type.name(),
                "Set " + type.name() + " to " + level + type.getUnit() + " for the insufficient-ingredient demo.",
                "WARNING"
        ).addDetail("ingredient", type.name())
         .addDetail("newStock", level);

        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simSimulateRace(int step) {
        // Demonstrate concurrent overlapping multi-ingredient locking
        // Order A needs {COFFEE_BEANS: 18, WATER: 60}
        // Order B needs {WATER: 60, MILK: 150}
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(2);
        List<String> results = new CopyOnWriteArrayList<>();

        Map<IngredientType, Integer> reqA = new EnumMap<>(IngredientType.class);
        reqA.put(IngredientType.COFFEE_BEANS, 18);
        reqA.put(IngredientType.WATER, 60);

        Map<IngredientType, Integer> reqB = new EnumMap<>(IngredientType.class);
        reqB.put(IngredientType.WATER, 60);
        reqB.put(IngredientType.MILK, 150);

        executor.submit(() -> {
            try {
                boolean ok = simMachine.getIngredientStore().checkAndDeductIngredients(reqA);
                results.add("Thread-A (Latte): Deducted {BEANS: 18g, WATER: 60ml} -> " + (ok ? "SUCCESS" : "FAILED"));
            } catch (Exception ex) {
                results.add("Thread-A Error: " + ex.getMessage());
            } finally {
                latch.countDown();
            }
        });

        executor.submit(() -> {
            try {
                boolean ok = simMachine.getIngredientStore().checkAndDeductIngredients(reqB);
                results.add("Thread-B (Steamer): Deducted {WATER: 60ml, MILK: 150ml} -> " + (ok ? "SUCCESS" : "FAILED"));
            } catch (Exception ex) {
                results.add("Thread-B Error: " + ex.getMessage());
            } finally {
                latch.countDown();
            }
        });

        try {
            latch.await();
        } catch (InterruptedException ignored) {}
        executor.shutdown();

        SimEvent event = new SimEvent(
                "SIM-EV-" + simEventIdGen.getAndIncrement(),
                step,
                "CONCURRENCY_RACE",
                "Overlapping Multi-Ingredient Race Resolved",
                "Dispatched 2 concurrent threads requesting overlapping hoppers. Ascending enum lock acquisition completed with zero deadlocks: " + String.join("; ", results),
                "SUCCESS"
        ).addDetail("raceResults", results);

        simEvents.add(event);
        return getSimSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return new ArrayList<>(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("machineId", simMachine.getMachineId());
        snapshot.put("stateName", simMachine.getCurrentState().getStateName());
        snapshot.put("status", simMachine.getCurrentState().getStatus());
        snapshot.put("currentOrder", simMachine.getCurrentOrder());
        snapshot.put("inventory", simMachine.getIngredientStore().getAllStock());
        snapshot.put("capacities", simMachine.getIngredientStore().getCapacities());
        snapshot.put("lowStockAlerts", simMachine.getIngredientStore().getLowStockAlerts());
        snapshot.put("events", new ArrayList<>(simEvents));
        return snapshot;
    }
}