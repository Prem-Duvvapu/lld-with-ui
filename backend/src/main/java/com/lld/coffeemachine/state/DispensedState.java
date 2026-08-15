package com.lld.coffeemachine.state;

import com.lld.coffeemachine.exception.InvalidStateOperationException;
import com.lld.coffeemachine.model.*;

public class DispensedState implements CoffeeMachineState {

    @Override
    public void selectBaseCoffee(CoffeeMachine machine, CoffeeType type) {
        throw new InvalidStateOperationException("Please collect the brewed coffee from the dispenser tray before placing a new order.");
    }

    @Override
    public void addCustomization(CoffeeMachine machine, String customizationType) {
        throw new InvalidStateOperationException("Coffee already brewed and dispensed.");
    }

    @Override
    public void insertPayment(CoffeeMachine machine, double amount) {
        throw new InvalidStateOperationException("Please collect your coffee and change first.");
    }

    @Override
    public CoffeeOrder brew(CoffeeMachine machine) {
        throw new InvalidStateOperationException("Coffee already brewed and waiting in dispenser tray.");
    }

    @Override
    public CoffeeOrder collectCoffee(CoffeeMachine machine) {
        CoffeeOrder order = machine.getCurrentOrder();
        if (order != null) {
            order.setMessage("Coffee collected! Enjoy your " + order.getDescription() + ".");
        }
        machine.setCurrentOrder(null);
        machine.setActiveComponent(null);
        machine.setCurrentState(machine.getIdleState());
        return order;
    }

    @Override
    public CoffeeOrder cancel(CoffeeMachine machine) {
        // Automatically acts as collect
        return collectCoffee(machine);
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.DISPENSED;
    }

    @Override
    public String getStateName() {
        return "DISPENSED";
    }
}
