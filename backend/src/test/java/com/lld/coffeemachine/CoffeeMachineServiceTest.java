package com.lld.coffeemachine;

import com.lld.coffeemachine.config.CoffeeMachineInitializer;
import com.lld.coffeemachine.decorator.CoffeeComponent;
import com.lld.coffeemachine.decorator.ExtraShotDecorator;
import com.lld.coffeemachine.decorator.OatMilkDecorator;
import com.lld.coffeemachine.decorator.WhippedCreamDecorator;
import com.lld.coffeemachine.exception.InsufficientIngredientException;
import com.lld.coffeemachine.exception.InsufficientPaymentException;
import com.lld.coffeemachine.factory.CoffeeFactory;
import com.lld.coffeemachine.model.*;
import com.lld.coffeemachine.service.CoffeeMachineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class CoffeeMachineServiceTest {

    private CoffeeMachineService service;

    @BeforeEach
    void setUp() {
        service = new CoffeeMachineService();
        CoffeeMachineInitializer.seedMachine(service.getMainMachine());
        service.getMainMachine().setCurrentState(service.getMainMachine().getIdleState());
        service.getMainMachine().setCurrentOrder(null);
        service.getMainMachine().setActiveComponent(null);
    }

    @Test
    @DisplayName("Should initialize machine with 5 base recipes and full ingredient stock")
    void testInitialState() {
        assertEquals(5, service.getMenu().size(), "Should have 5 recipes registered");
        Map<String, Object> status = service.getStatus();
        assertEquals("IDLE", status.get("stateName"));

        Map<IngredientType, Integer> inv = service.getInventory();
        assertEquals(3000, inv.get(IngredientType.WATER));
        assertEquals(1000, inv.get(IngredientType.COFFEE_BEANS));
    }

    @Test
    @DisplayName("Should select base coffee and transition to SELECTING state")
    void testBaseCoffeeSelection() {
        CoffeeOrder order = service.startOrder(CoffeeType.LATTE);
        assertNotNull(order);
        assertEquals("Caffe Latte", order.getBaseCoffeeName());
        assertEquals(120.0, order.getTotalPrice());

        Map<String, Object> status = service.getStatus();
        assertEquals("SELECTING", status.get("stateName"));
    }

    @Test
    @DisplayName("Should dynamically compose Decorator customization chain (Latte + Extra Shot + Whipped Cream)")
    void testDecoratorCustomizationChain() {
        service.startOrder(CoffeeType.LATTE); // ₹120 (BEANS: 18g, WATER: 60ml, MILK: 150ml)
        service.addCustomization("EXTRA_SHOT"); // +₹40 (BEANS: 10g, WATER: 30ml)
        CoffeeOrder order = service.addCustomization("WHIPPED_CREAM"); // +₹30 (WHIPPED_CREAM: 25g)

        assertNotNull(order);
        assertEquals(190.0, order.getTotalPrice(), "Total price should be 120 + 40 + 30 = 190");
        assertTrue(order.getDescription().contains("Extra Espresso Shot"));
        assertTrue(order.getDescription().contains("Whipped Cream"));
        assertEquals(2, order.getCustomizations().size());

        Map<String, Integer> req = order.getRequiredIngredients();
        assertEquals(28, req.get("COFFEE_BEANS"), "18g + 10g extra shot = 28g beans");
        assertEquals(90, req.get("WATER"), "60ml + 30ml extra shot = 90ml water");
        assertEquals(150, req.get("MILK"));
        assertEquals(25, req.get("WHIPPED_CREAM"));
    }

    @Test
    @DisplayName("Should substitute dairy milk with oat milk when OatMilkDecorator is applied")
    void testOatMilkSubstitutionDecorator() {
        CoffeeFactory factory = new CoffeeFactory();
        CoffeeComponent cappuccino = factory.createBaseCoffee(CoffeeType.CAPPUCCINO);
        CoffeeComponent oatCappuccino = new OatMilkDecorator(cappuccino);

        assertEquals(165.0, oatCappuccino.getPrice(), "130 + 35 = 165");
        Map<IngredientType, Integer> ingredients = oatCappuccino.getRequiredIngredients();
        assertNull(ingredients.get(IngredientType.MILK), "Standard dairy milk must be removed");
        assertEquals(100, ingredients.get(IngredientType.OAT_MILK), "Substituted with 100ml oat milk");
    }

    @Test
    @DisplayName("Should process payment, execute atomic multi-lock brew, and return change")
    void testFullSessionPaymentAndBrew() {
        service.startOrder(CoffeeType.ESPRESSO); // ₹80
        service.insertPayment(100.0); // Paid ₹100

        CoffeeOrder brewed = service.brew();
        assertNotNull(brewed);
        assertEquals("DISPENSED", brewed.getStatus());
        assertEquals(20.0, brewed.getChangeReturned(), "Change should be 100 - 80 = 20");

        // Verify inventory deduction
        Map<IngredientType, Integer> inv = service.getInventory();
        assertEquals(1000 - 18, inv.get(IngredientType.COFFEE_BEANS));
        assertEquals(3000 - 50, inv.get(IngredientType.WATER));

        // Customer collects coffee
        CoffeeOrder collected = service.collectCoffee();
        assertNotNull(collected);
        assertEquals("IDLE", service.getStatus().get("stateName"), "Machine resets to IDLE after collection");
    }

    @Test
    @DisplayName("Should reject brew if payment is insufficient")
    void testInsufficientPaymentThrowsException() {
        service.startOrder(CoffeeType.MOCHA); // ₹150
        service.insertPayment(100.0); // Underpaid by ₹50

        assertThrows(InsufficientPaymentException.class, () -> service.brew());
    }

    @Test
    @DisplayName("Should throw InsufficientIngredientException when ingredient hoppers are depleted")
    void testInsufficientIngredientThrowsException() {
        // Drain coffee beans to 0
        service.getMainMachine().getIngredientStore().initIngredient(IngredientType.COFFEE_BEANS, 0, 2000, 100);

        assertThrows(InsufficientIngredientException.class, () -> service.startOrder(CoffeeType.ESPRESSO));
    }

    @Test
    @DisplayName("Should refund customer payment on cancellation")
    void testCancelOrderWithFullRefund() {
        service.startOrder(CoffeeType.AMERICANO); // ₹90
        service.insertPayment(100.0);

        CoffeeOrder cancelled = service.cancelOrder();
        assertNotNull(cancelled);
        assertEquals("REFUNDED", cancelled.getStatus());
        assertEquals(100.0, cancelled.getChangeReturned(), "Full refund of ₹100 returned");
        assertEquals("IDLE", service.getStatus().get("stateName"));
    }

    @Test
    @DisplayName("Should handle concurrent overlapping ingredient deductions without deadlock")
    void testDeadlockFreeConcurrentMultiIngredientDeduction() throws InterruptedException {
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    Map<IngredientType, Integer> req = new java.util.EnumMap<>(IngredientType.class);
                    if (index % 2 == 0) {
                        req.put(IngredientType.COFFEE_BEANS, 18);
                        req.put(IngredientType.WATER, 60);
                    } else {
                        req.put(IngredientType.WATER, 60);
                        req.put(IngredientType.MILK, 100);
                    }
                    boolean ok = service.getMainMachine().getIngredientStore().checkAndDeductIngredients(req);
                    if (ok) successCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertEquals(10, successCount.get(), "All 10 overlapping orders must succeed without deadlock");
    }

    @Test
    @DisplayName("simSetStock pins the sim sandbox's ingredient level so the insufficient-ingredient demo step is deterministic")
    void simSetStockPinsIngredientDeterministically() {
        service.simReset();
        Map<String, Object> snap = service.simSetStock(IngredientType.CARAMEL_SYRUP, 5, 7);
        assertNotNull(snap);

        @SuppressWarnings("unchecked")
        Map<IngredientType, Integer> inventory = (Map<IngredientType, Integer>) snap.get("inventory");
        assertEquals(5, inventory.get(IngredientType.CARAMEL_SYRUP));

        // Mocha needs 20ml of Caramel Syrup; with only 5ml pinned, selecting it must be rejected
        // before any state changes — this is the sim's failure-path demo step.
        assertThrows(InsufficientIngredientException.class, () -> service.simSelectBase(CoffeeType.MOCHA, 7));
        assertEquals("IDLE", service.getSimMachine().getCurrentState().getStateName(),
                "a rejected selection must not leave the sandbox mid-transition");

        // The event log must have recorded the rejection, not silently swallowed it.
        boolean hasErrorEvent = service.simGetEvents().stream()
                .anyMatch(e -> "SELECT_BASE_ERROR".equals(e.getEventType()) && "ERROR".equals(e.getStatus()));
        assertTrue(hasErrorEvent, "the rejection must be visible in the telemetry event log");
    }

    @Test
    @DisplayName("Should execute simulation scenario and record telemetry events")
    void testSimulationScenarioFlow() {
        Map<String, Object> resetSnap = service.simReset();
        assertNotNull(resetSnap);

        Map<String, Object> selectSnap = service.simSelectBase(CoffeeType.LATTE, 2);
        assertNotNull(selectSnap);

        Map<String, Object> customSnap = service.simAddCustomization("EXTRA_SHOT", 3);
        assertNotNull(customSnap);

        Map<String, Object> paySnap = service.simInsertPayment(200.0, 4);
        assertNotNull(paySnap);

        Map<String, Object> brewSnap = service.simBrew(5);
        assertNotNull(brewSnap);

        Map<String, Object> raceSnap = service.simSimulateRace(8);
        assertNotNull(raceSnap);

        List<SimEvent> events = service.simGetEvents();
        assertTrue(events.size() >= 5, "Should record full telemetry timeline");
    }
}
