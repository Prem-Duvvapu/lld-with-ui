package com.lld.coffeemachine.state;

import com.lld.coffeemachine.decorator.CoffeeComponent;
import com.lld.coffeemachine.exception.InsufficientIngredientException;
import com.lld.coffeemachine.exception.InvalidStateOperationException;
import com.lld.coffeemachine.model.*;

import java.util.HashMap;
import java.util.Map;

public class SelectingState implements CoffeeMachineState {

    @Override
    public void selectBaseCoffee(CoffeeMachine machine, CoffeeType type) {
        // Change base selection
        CoffeeComponent base = machine.getCoffeeFactory().createBaseCoffee(type);
        if (!machine.getIngredientStore().checkAvailability(base.getRequiredIngredients())) {
            throw new InsufficientIngredientException("Cannot select " + type.getDisplayName() + ": Missing required ingredients.");
        }

        CoffeeOrder order = machine.getCurrentOrder();
        if (order != null) {
            order.setBaseCoffeeName(type.getDisplayName());
            order.setDescription(base.getDescription());
            order.setTotalPrice(base.getPrice());
            order.getCustomizations().clear();

            Map<String, Integer> reqMap = new HashMap<>();
            base.getRequiredIngredients().forEach((k, v) -> reqMap.put(k.name(), v));
            order.setRequiredIngredients(reqMap);
            order.setMessage("Updated selection to " + base.getDescription() + " (₹" + base.getPrice() + ")");
        }
        machine.setActiveComponent(base);
    }

    @Override
    public void addCustomization(CoffeeMachine machine, String customizationType) {
        machine.wrapWithDecorator(customizationType);
    }

    @Override
    public void insertPayment(CoffeeMachine machine, double amount) {
        CoffeeOrder order = machine.getCurrentOrder();
        CoffeeComponent active = machine.getActiveComponent();

        if (order == null || active == null) {
            machine.setCurrentState(machine.getIdleState());
            throw new InvalidStateOperationException("Order context lost. Please restart selection.");
        }

        // Validate preliminary ingredient availability for the whole assembled decorator chain
        if (!machine.getIngredientStore().checkAvailability(active.getRequiredIngredients())) {
            throw new InsufficientIngredientException("Cannot proceed to payment: One or more customized ingredients are out of stock.");
        }

        order.setAmountPaid(order.getAmountPaid() + amount);
        double remaining = order.getTotalPrice() - order.getAmountPaid();

        if (remaining > 0) {
            order.setMessage("Inserted ₹" + amount + ". Remaining: ₹" + remaining);
        } else {
            order.setMessage("Payment satisfied! (₹" + order.getAmountPaid() + " / ₹" + order.getTotalPrice() + "). Ready to brew.");
        }

        machine.setCurrentState(machine.getPaymentPendingState());
    }

    @Override
    public CoffeeOrder brew(CoffeeMachine machine) {
        throw new InvalidStateOperationException("Please insert payment before brewing.");
    }

    @Override
    public CoffeeOrder collectCoffee(CoffeeMachine machine) {
        throw new InvalidStateOperationException("No coffee cup ready yet.");
    }

    @Override
    public CoffeeOrder cancel(CoffeeMachine machine) {
        CoffeeOrder order = machine.getCurrentOrder();
        if (order != null) {
            order.setStatus("CANCELLED");
            order.setMessage("Order cancelled by customer.");
            machine.getOrderHistory().add(order);
        }
        machine.setCurrentOrder(null);
        machine.setActiveComponent(null);
        machine.setCurrentState(machine.getIdleState());
        return order;
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.SELECTING;
    }

    @Override
    public String getStateName() {
        return "SELECTING";
    }
}
