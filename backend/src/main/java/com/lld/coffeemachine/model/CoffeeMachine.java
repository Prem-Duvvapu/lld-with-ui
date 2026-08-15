package com.lld.coffeemachine.model;

import com.lld.coffeemachine.decorator.*;
import com.lld.coffeemachine.factory.CoffeeFactory;
import com.lld.coffeemachine.state.*;
import com.lld.coffeemachine.store.IngredientStore;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class CoffeeMachine {
    private final String machineId;
    private final IngredientStore ingredientStore;
    private final CoffeeFactory coffeeFactory;
    private final ReentrantLock sessionLock = new ReentrantLock();
    private final ReentrantLock brewHeadLock = new ReentrantLock();
    private final List<CoffeeOrder> orderHistory = new CopyOnWriteArrayList<>();
    private final AtomicLong orderIdGen = new AtomicLong(1001);

    // States
    private final IdleState idleState;
    private final SelectingState selectingState;
    private final PaymentPendingState paymentPendingState;
    private final BrewingState brewingState;
    private final DispensedState dispensedState;

    private volatile CoffeeMachineState currentState;
    private volatile CoffeeOrder currentOrder;
    private volatile CoffeeComponent activeComponent;

    public CoffeeMachine(String machineId, IngredientStore ingredientStore, CoffeeFactory coffeeFactory) {
        this.machineId = machineId;
        this.ingredientStore = ingredientStore != null ? ingredientStore : new IngredientStore();
        this.coffeeFactory = coffeeFactory != null ? coffeeFactory : new CoffeeFactory();

        this.idleState = new IdleState();
        this.selectingState = new SelectingState();
        this.paymentPendingState = new PaymentPendingState();
        this.brewingState = new BrewingState();
        this.dispensedState = new DispensedState();

        this.currentState = this.idleState;
    }

    public String getMachineId() { return machineId; }
    public IngredientStore getIngredientStore() { return ingredientStore; }
    public CoffeeFactory getCoffeeFactory() { return coffeeFactory; }
    public ReentrantLock getSessionLock() { return sessionLock; }
    public ReentrantLock getBrewHeadLock() { return brewHeadLock; }
    public List<CoffeeOrder> getOrderHistory() { return orderHistory; }

    public IdleState getIdleState() { return idleState; }
    public SelectingState getSelectingState() { return selectingState; }
    public PaymentPendingState getPaymentPendingState() { return paymentPendingState; }
    public BrewingState getBrewingState() { return brewingState; }
    public DispensedState getDispensedState() { return dispensedState; }

    public CoffeeMachineState getCurrentState() { return currentState; }
    public void setCurrentState(CoffeeMachineState currentState) { this.currentState = currentState; }

    public CoffeeOrder getCurrentOrder() { return currentOrder; }
    public void setCurrentOrder(CoffeeOrder currentOrder) { this.currentOrder = currentOrder; }

    public CoffeeComponent getActiveComponent() { return activeComponent; }
    public void setActiveComponent(CoffeeComponent activeComponent) { this.activeComponent = activeComponent; }

    public long nextOrderId() {
        return orderIdGen.getAndIncrement();
    }

    // State Pattern Delegated Operations
    public CoffeeOrder selectBaseCoffee(CoffeeType type) {
        sessionLock.lock();
        try {
            currentState.selectBaseCoffee(this, type);
            return currentOrder;
        } finally {
            sessionLock.unlock();
        }
    }

    public CoffeeOrder addCustomization(String customizationType) {
        sessionLock.lock();
        try {
            currentState.addCustomization(this, customizationType);
            return currentOrder;
        } finally {
            sessionLock.unlock();
        }
    }

    public CoffeeOrder insertPayment(double amount) {
        sessionLock.lock();
        try {
            currentState.insertPayment(this, amount);
            return currentOrder;
        } finally {
            sessionLock.unlock();
        }
    }

    public CoffeeOrder brew() {
        sessionLock.lock();
        try {
            return currentState.brew(this);
        } finally {
            sessionLock.unlock();
        }
    }

    public CoffeeOrder collectCoffee() {
        sessionLock.lock();
        try {
            return currentState.collectCoffee(this);
        } finally {
            sessionLock.unlock();
        }
    }

    public CoffeeOrder cancel() {
        sessionLock.lock();
        try {
            return currentState.cancel(this);
        } finally {
            sessionLock.unlock();
        }
    }

    public void wrapWithDecorator(String addOnName) {
        if (activeComponent == null || currentOrder == null) return;
        String normalized = addOnName.trim().toUpperCase().replace(" ", "_");

        CoffeeComponent wrapped;
        switch (normalized) {
            case "EXTRA_SHOT":
            case "SHOT":
            case "EXTRA_ESPRESSO_SHOT":
                wrapped = new ExtraShotDecorator(activeComponent);
                break;
            case "EXTRA_MILK":
            case "MILK":
            case "EXTRA_STEAMED_MILK":
                wrapped = new ExtraMilkDecorator(activeComponent);
                break;
            case "WHIPPED_CREAM":
            case "CREAM":
                wrapped = new WhippedCreamDecorator(activeComponent);
                break;
            case "CARAMEL_SYRUP":
            case "CARAMEL":
                wrapped = new CaramelSyrupDecorator(activeComponent);
                break;
            case "OAT_MILK":
            case "OAT_MILK_SUB":
            case "OATMILK":
                wrapped = new OatMilkDecorator(activeComponent);
                break;
            default:
                throw new IllegalArgumentException("Unknown customization add-on: " + addOnName);
        }

        this.activeComponent = wrapped;
        currentOrder.setDescription(wrapped.getDescription());
        currentOrder.setTotalPrice(wrapped.getPrice());
        currentOrder.getCustomizations().add(addOnName);

        Map<String, Integer> reqMap = new HashMap<>();
        wrapped.getRequiredIngredients().forEach((k, v) -> reqMap.put(k.name(), v));
        currentOrder.setRequiredIngredients(reqMap);
        currentOrder.setMessage("Customized: " + wrapped.getDescription() + " (Total: ₹" + wrapped.getPrice() + ")");
    }
}