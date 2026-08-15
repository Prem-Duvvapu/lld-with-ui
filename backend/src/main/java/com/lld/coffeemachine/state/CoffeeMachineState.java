package com.lld.coffeemachine.state;

import com.lld.coffeemachine.model.CoffeeMachine;
import com.lld.coffeemachine.model.CoffeeOrder;
import com.lld.coffeemachine.model.CoffeeType;
import com.lld.coffeemachine.model.MachineStatus;

public interface CoffeeMachineState {
    void selectBaseCoffee(CoffeeMachine machine, CoffeeType type);
    void addCustomization(CoffeeMachine machine, String customizationType);
    void insertPayment(CoffeeMachine machine, double amount);
    CoffeeOrder brew(CoffeeMachine machine);
    CoffeeOrder collectCoffee(CoffeeMachine machine);
    CoffeeOrder cancel(CoffeeMachine machine);
    MachineStatus getStatus();
    String getStateName();
}
