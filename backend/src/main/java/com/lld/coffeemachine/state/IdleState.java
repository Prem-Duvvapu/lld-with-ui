package com.lld.coffeemachine.state;

import com.lld.coffeemachine.decorator.CoffeeComponent;
import com.lld.coffeemachine.exception.InsufficientIngredientException;
import com.lld.coffeemachine.exception.InvalidStateOperationException;
import com.lld.coffeemachine.model.*;

import java.util.HashMap;
import java.util.Map;

public class IdleState implements CoffeeMachineState {

    @Override
    public void selectBaseCoffee(CoffeeMachine machine, CoffeeType type) {
        CoffeeComponent base = machine.getCoffeeFactory().createBaseCoffee(type);

        // Preliminary inventory check
        if (!machine.getIngredientStore().checkAvailability(base.getRequiredIngredients())) {
            throw new InsufficientIngredientException("Cannot select " + type.getDisplayName() + ": Missing one or more required ingredients.");
        }

        CoffeeOrder order = new CoffeeOrder(
                machine.nextOrderId(),
                type.getDisplayName(),
                base.getDescription(),
                base.getPrice()
        );

        Map<String, Integer> reqMap = new HashMap<>();
        base.getRequiredIngredients().forEach((k, v) -> reqMap.put(k.name(), v));
        order.setRequiredIngredients(reqMap);

        machine.setActiveComponent(base);
        machine.setCurrentOrder(order);
        machine.setCurrentState(machine.getSelectingState());
    }

    @Override
    public void addCustomization(CoffeeMachine machine, String customizationType) {
        throw new InvalidStateOperationException("Please select a base coffee before adding customizations.");
    }

    @Override
    public void insertPayment(CoffeeMachine machine, double amount) {
        throw new InvalidStateOperationException("Please select a coffee before inserting payment.");
    }

    @Override
    public CoffeeOrder brew(CoffeeMachine machine) {
        throw new InvalidStateOperationException("Cannot brew: Machine is IDLE. Please choose a coffee first.");
    }

    @Override
    public CoffeeOrder collectCoffee(CoffeeMachine machine) {
        throw new InvalidStateOperationException("No coffee cup waiting in dispenser.");
    }

    @Override
    public CoffeeOrder cancel(CoffeeMachine machine) {
        CoffeeOrder empty = new CoffeeOrder();
        empty.setStatus("IDLE");
        empty.setMessage("No active order to cancel.");
        return empty;
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.IDLE;
    }

    @Override
    public String getStateName() {
        return "IDLE";
    }
}
