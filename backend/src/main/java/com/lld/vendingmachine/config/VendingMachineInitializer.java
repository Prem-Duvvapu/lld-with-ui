package com.lld.vendingmachine.config;

import com.lld.vendingmachine.model.Denomination;
import com.lld.vendingmachine.model.Product;
import com.lld.vendingmachine.model.Slot;
import com.lld.vendingmachine.model.VendingMachine;
import com.lld.vendingmachine.service.VendingMachineService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class VendingMachineInitializer implements CommandLineRunner {
    private final VendingMachineService service;

    public VendingMachineInitializer(VendingMachineService service) {
        this.service = service;
    }

    @Override
    public void run(String... args) {
        seedMachine(service.getMainMachine());
        service.simReset();
    }

    public static void seedMachine(VendingMachine machine) {
        // Clear existing slots if any
        machine.getSlots().clear();

        // Row A: Beverages
        Product pA1 = new Product(1L, "A1", "Coca-Cola 330ml", 30.0, "Beverage", "🥤");
        Product pA2 = new Product(2L, "A2", "Pepsi Black", 30.0, "Beverage", "🥤");
        Product pA3 = new Product(3L, "A3", "Sparkling Water", 20.0, "Beverage", "💧");
        Product pA4 = new Product(4L, "A4", "Tropicana Orange", 40.0, "Beverage", "🧃");

        machine.addSlot(new Slot(1L, "A1", 0, 0, pA1, 10, 8));
        machine.addSlot(new Slot(2L, "A2", 0, 1, pA2, 10, 6));
        machine.addSlot(new Slot(3L, "A3", 0, 2, pA3, 10, 0)); // Out of stock by default for demo
        machine.addSlot(new Slot(4L, "A4", 0, 3, pA4, 10, 7));

        // Row B: Snacks
        Product pB1 = new Product(5L, "B1", "Lays Classic Salted", 20.0, "Snack", "🥔");
        Product pB2 = new Product(6L, "B2", "Doritos Nacho Cheese", 35.0, "Snack", "🧀");
        Product pB3 = new Product(7L, "B3", "Roasted Almonds", 50.0, "Snack", "🥜");
        Product pB4 = new Product(8L, "B4", "Salted Pretzels", 25.0, "Snack", "🥨");

        machine.addSlot(new Slot(5L, "B1", 1, 0, pB1, 10, 8));
        machine.addSlot(new Slot(6L, "B2", 1, 1, pB2, 10, 5));
        machine.addSlot(new Slot(7L, "B3", 1, 2, pB3, 10, 4));
        machine.addSlot(new Slot(8L, "B4", 1, 3, pB4, 10, 6));

        // Row C: Confectionery & Fresh
        Product pC1 = new Product(9L, "C1", "KitKat 4-Finger", 25.0, "Confectionery", "🍫");
        Product pC2 = new Product(10L, "C2", "Snickers Peanut Bar", 45.0, "Confectionery", "🍫");
        Product pC3 = new Product(11L, "C3", "Mint Chews", 10.0, "Confectionery", "🍬");
        Product pC4 = new Product(12L, "C4", "Energy Granola Bar", 35.0, "Fresh", "🌾");

        machine.addSlot(new Slot(9L, "C1", 2, 0, pC1, 10, 10));
        machine.addSlot(new Slot(10L, "C2", 2, 1, pC2, 10, 5));
        machine.addSlot(new Slot(11L, "C3", 2, 2, pC3, 10, 12));
        machine.addSlot(new Slot(12L, "C4", 2, 3, pC4, 10, 7));

        // Seed Change Hopper Inventory
        machine.refillChange(Denomination.NOTE_500, 2);
        machine.refillChange(Denomination.NOTE_100, 10);
        machine.refillChange(Denomination.NOTE_50, 15);
        machine.refillChange(Denomination.NOTE_20, 25);
        machine.refillChange(Denomination.COIN_10, 50);
        machine.refillChange(Denomination.COIN_5, 60);
        machine.refillChange(Denomination.COIN_2, 50);
        machine.refillChange(Denomination.COIN_1, 50);
    }
}
