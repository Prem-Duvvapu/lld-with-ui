package com.lld.coffeemachine.config;

import com.lld.coffeemachine.model.CoffeeMachine;
import com.lld.coffeemachine.model.IngredientType;
import com.lld.coffeemachine.service.CoffeeMachineService;
import com.lld.coffeemachine.store.IngredientStore;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class CoffeeMachineInitializer implements CommandLineRunner {
    private final CoffeeMachineService service;

    public CoffeeMachineInitializer(CoffeeMachineService service) {
        this.service = service;
    }

    @Override
    public void run(String... args) {
        seedMachine(service.getMainMachine());
        service.simReset();
    }

    public static void seedMachine(CoffeeMachine machine) {
        IngredientStore store = machine.getIngredientStore();

        // High-capacity commercial espresso machine hoppers
        store.initIngredient(IngredientType.WATER, 3000, 5000, 500);
        store.initIngredient(IngredientType.MILK, 2000, 3000, 300);
        store.initIngredient(IngredientType.COFFEE_BEANS, 1000, 2000, 100);
        store.initIngredient(IngredientType.SUGAR, 800, 1000, 100);
        store.initIngredient(IngredientType.WHIPPED_CREAM, 500, 1000, 50);
        store.initIngredient(IngredientType.CARAMEL_SYRUP, 500, 1000, 50);
        store.initIngredient(IngredientType.OAT_MILK, 1000, 2000, 200);
    }
}
