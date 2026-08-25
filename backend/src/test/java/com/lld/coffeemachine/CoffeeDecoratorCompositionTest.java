package com.lld.coffeemachine;

import com.lld.coffeemachine.decorator.*;
import com.lld.coffeemachine.factory.CoffeeFactory;
import com.lld.coffeemachine.model.CoffeeType;
import com.lld.coffeemachine.model.IngredientType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies the GoF Decorator stack composes correctly when THREE add-ons are stacked on one
 * order simultaneously — price, description and required-ingredients must all accumulate
 * correctly regardless of wrap order, and each decorator's added ingredients must merge rather
 * than overwrite the ones contributed by decorators wrapped earlier.
 */
@DisplayName("Coffee Machine Decorator Stack — Multiple Simultaneous Add-ons")
class CoffeeDecoratorCompositionTest {

    private final CoffeeFactory factory = new CoffeeFactory();

    @Test
    @DisplayName("Extra shot + caramel syrup + whipped cream all stack on one Latte")
    void tripleDecoratorStackComposesCorrectly() {
        CoffeeComponent base = factory.createBaseCoffee(CoffeeType.LATTE); // ₹120 (BEANS:18, WATER:60, MILK:150, SUGAR:10)

        CoffeeComponent order = new ExtraShotDecorator(base);       // +₹40 (BEANS:10, WATER:30)
        order = new CaramelSyrupDecorator(order);                   // +₹25 (CARAMEL_SYRUP:20)
        order = new WhippedCreamDecorator(order);                   // +₹30 (WHIPPED_CREAM:25)

        assertEquals(215.0, order.getPrice(), 0.001, "120 + 40 + 25 + 30 = 215");
        // CoffeeFactory.createBaseCoffee wires the recipe's display NAME into BaseCoffee's
        // description field (see CoffeeFactory#createBaseCoffee), not the recipe's prose blurb.
        assertEquals(
                "Caffe Latte, Extra Espresso Shot, Caramel Syrup, Whipped Cream",
                order.getDescription());

        Map<IngredientType, Integer> required = order.getRequiredIngredients();
        assertEquals(28, required.get(IngredientType.COFFEE_BEANS), "base 18g + extra shot 10g");
        assertEquals(90, required.get(IngredientType.WATER), "base 60ml + extra shot 30ml");
        assertEquals(150, required.get(IngredientType.MILK), "untouched by any of the three add-ons");
        assertEquals(10, required.get(IngredientType.SUGAR), "untouched base ingredient survives the stack");
        assertEquals(20, required.get(IngredientType.CARAMEL_SYRUP));
        assertEquals(25, required.get(IngredientType.WHIPPED_CREAM));
    }

    @Test
    @DisplayName("Wrap order does not change the final price or combined ingredients (decorator composition is order-independent for additive add-ons)")
    void wrapOrderIsIrrelevantToFinalTotals() {
        CoffeeComponent a = new WhippedCreamDecorator(
                new CaramelSyrupDecorator(
                        new ExtraShotDecorator(factory.createBaseCoffee(CoffeeType.ESPRESSO))));

        CoffeeComponent b = new ExtraShotDecorator(
                new WhippedCreamDecorator(
                        new CaramelSyrupDecorator(factory.createBaseCoffee(CoffeeType.ESPRESSO))));

        assertEquals(a.getPrice(), b.getPrice(), 0.001);
        assertEquals(a.getRequiredIngredients(), b.getRequiredIngredients());
    }

    @Test
    @DisplayName("Repeating the same add-on twice accumulates rather than overwrites")
    void repeatingSameAddOnAccumulates() {
        CoffeeComponent base = factory.createBaseCoffee(CoffeeType.AMERICANO); // BEANS:18, WATER:150
        CoffeeComponent doubleShot = new ExtraShotDecorator(new ExtraShotDecorator(base));

        Map<IngredientType, Integer> required = doubleShot.getRequiredIngredients();
        assertEquals(38, required.get(IngredientType.COFFEE_BEANS), "18 base + 10 + 10 for two extra shots");
        assertEquals(210, required.get(IngredientType.WATER), "150 base + 30 + 30 for two extra shots");
        assertEquals(90.0 + 40.0 + 40.0, doubleShot.getPrice(), 0.001);
    }

    @Test
    @DisplayName("End-to-end via CoffeeMachine.wrapWithDecorator: three add-ons chained through the real session flow")
    void tripleAddOnThroughRealMachineSessionFlow() {
        com.lld.coffeemachine.model.CoffeeMachine machine = new com.lld.coffeemachine.model.CoffeeMachine(
                "TEST-MACHINE", new com.lld.coffeemachine.store.IngredientStore(), factory);
        com.lld.coffeemachine.config.CoffeeMachineInitializer.seedMachine(machine);

        machine.selectBaseCoffee(CoffeeType.LATTE);
        machine.addCustomization("EXTRA_SHOT");
        machine.addCustomization("CARAMEL_SYRUP");
        com.lld.coffeemachine.model.CoffeeOrder order = machine.addCustomization("WHIPPED_CREAM");

        assertEquals(3, order.getCustomizations().size());
        assertEquals(215.0, order.getTotalPrice(), 0.001);
        assertTrue(order.getDescription().contains("Extra Espresso Shot"));
        assertTrue(order.getDescription().contains("Caramel Syrup"));
        assertTrue(order.getDescription().contains("Whipped Cream"));

        Map<String, Integer> required = order.getRequiredIngredients();
        assertEquals(28, required.get("COFFEE_BEANS"));
        assertEquals(20, required.get("CARAMEL_SYRUP"));
        assertEquals(25, required.get("WHIPPED_CREAM"));
    }
}
