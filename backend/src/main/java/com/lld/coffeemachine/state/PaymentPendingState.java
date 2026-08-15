package com.lld.coffeemachine.state;

import com.lld.coffeemachine.exception.InsufficientPaymentException;
import com.lld.coffeemachine.exception.InvalidStateOperationException;
import com.lld.coffeemachine.model.*;

public class PaymentPendingState implements CoffeeMachineState {

    @Override
    public void selectBaseCoffee(CoffeeMachine machine, CoffeeType type) {
        throw new InvalidStateOperationException("Cannot change base coffee while in payment phase. Please cancel order first.");
    }

    @Override
    public void addCustomization(CoffeeMachine machine, String customizationType) {
        throw new InvalidStateOperationException("Cannot modify customizations while in payment phase. Please cancel order first.");
    }

    @Override
    public void insertPayment(CoffeeMachine machine, double amount) {
        CoffeeOrder order = machine.getCurrentOrder();
        if (order != null) {
            order.setAmountPaid(order.getAmountPaid() + amount);
            double remaining = order.getTotalPrice() - order.getAmountPaid();
            if (remaining > 0) {
                order.setMessage("Inserted ₹" + amount + ". Remaining: ₹" + remaining);
            } else {
                order.setMessage("Payment satisfied! (₹" + order.getAmountPaid() + " / ₹" + order.getTotalPrice() + "). Ready to brew.");
            }
        }
    }

    @Override
    public CoffeeOrder brew(CoffeeMachine machine) {
        CoffeeOrder order = machine.getCurrentOrder();
        if (order == null) {
            machine.setCurrentState(machine.getIdleState());
            throw new InvalidStateOperationException("No active order to brew.");
        }

        if (order.getAmountPaid() < order.getTotalPrice()) {
            double shortfall = order.getTotalPrice() - order.getAmountPaid();
            throw new InsufficientPaymentException("Insufficient payment: Paid ₹" + order.getAmountPaid() + ", required ₹" + order.getTotalPrice() + " (Shortfall: ₹" + shortfall + ")");
        }

        machine.setCurrentState(machine.getBrewingState());
        return machine.getBrewingState().brew(machine);
    }

    @Override
    public CoffeeOrder collectCoffee(CoffeeMachine machine) {
        throw new InvalidStateOperationException("Coffee is not yet brewed. Please brew first.");
    }

    @Override
    public CoffeeOrder cancel(CoffeeMachine machine) {
        CoffeeOrder order = machine.getCurrentOrder();
        if (order != null) {
            if (order.getAmountPaid() > 0) {
                order.setChangeReturned(order.getAmountPaid());
                order.setStatus("REFUNDED");
                order.setMessage("Order cancelled. Full refund of ₹" + order.getAmountPaid() + " dispensed.");
            } else {
                order.setStatus("CANCELLED");
                order.setMessage("Order cancelled.");
            }
            machine.getOrderHistory().add(order);
        }
        machine.setCurrentOrder(null);
        machine.setActiveComponent(null);
        machine.setCurrentState(machine.getIdleState());
        return order;
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.PAYMENT_PENDING;
    }

    @Override
    public String getStateName() {
        return "PAYMENT_PENDING";
    }
}
