package com.lld.coffeemachine.state;

import com.lld.coffeemachine.decorator.CoffeeComponent;
import com.lld.coffeemachine.exception.InvalidStateOperationException;
import com.lld.coffeemachine.model.*;

import java.util.concurrent.locks.ReentrantLock;

public class BrewingState implements CoffeeMachineState {

    @Override
    public void selectBaseCoffee(CoffeeMachine machine, CoffeeType type) {
        throw new InvalidStateOperationException("Machine is currently brewing. Please wait.");
    }

    @Override
    public void addCustomization(CoffeeMachine machine, String customizationType) {
        throw new InvalidStateOperationException("Machine is currently brewing. Please wait.");
    }

    @Override
    public void insertPayment(CoffeeMachine machine, double amount) {
        throw new InvalidStateOperationException("Machine is currently brewing. Payment already processed.");
    }

    @Override
    public CoffeeOrder brew(CoffeeMachine machine) {
        CoffeeOrder order = machine.getCurrentOrder();
        CoffeeComponent active = machine.getActiveComponent();

        if (order == null || active == null) {
            machine.setCurrentState(machine.getIdleState());
            throw new InvalidStateOperationException("No active order context for brewing.");
        }

        ReentrantLock brewLock = machine.getBrewHeadLock();
        brewLock.lock();
        try {
            order.setStatus("BREWING");
            order.setMessage("Dispensing ground beans, steaming milk, and extracting espresso...");

            // Deadlock-free multi-ingredient check and atomic decrement
            machine.getIngredientStore().checkAndDeductIngredients(active.getRequiredIngredients());

            // Calculate change due
            double changeDue = Math.max(0.0, order.getAmountPaid() - order.getTotalPrice());
            order.setChangeReturned(changeDue);
            order.setStatus("DISPENSED");
            order.setMessage("Fresh " + order.getDescription() + " brewed successfully! Change returned: ₹" + changeDue);

            machine.getOrderHistory().add(order);
            machine.setCurrentState(machine.getDispensedState());
            return order;
        } catch (Exception ex) {
            order.setStatus("FAILED");
            order.setMessage("Brew failed: " + ex.getMessage() + ". Full refund: ₹" + order.getAmountPaid());
            order.setChangeReturned(order.getAmountPaid());
            machine.getOrderHistory().add(order);
            machine.setCurrentOrder(null);
            machine.setActiveComponent(null);
            machine.setCurrentState(machine.getIdleState());
            throw ex;
        } finally {
            brewLock.unlock();
        }
    }

    @Override
    public CoffeeOrder collectCoffee(CoffeeMachine machine) {
        throw new InvalidStateOperationException("Coffee is actively brewing. Please wait until dispense finishes.");
    }

    @Override
    public CoffeeOrder cancel(CoffeeMachine machine) {
        throw new InvalidStateOperationException("Cannot cancel order while coffee is brewing.");
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.BREWING;
    }

    @Override
    public String getStateName() {
        return "BREWING";
    }
}
