package com.lld.vendingmachine.service;

import com.lld.vendingmachine.config.VendingMachineInitializer;
import com.lld.vendingmachine.model.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class VendingMachineService {
    private final VendingMachine mainMachine = new VendingMachine("VM-PROD-01");

    // Isolated Simulation Sandbox
    private final VendingMachine simMachine = new VendingMachine("VM-SIM-01");
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public VendingMachine getMainMachine() {
        return mainMachine;
    }

    public VendingMachine getSimMachine() {
        return simMachine;
    }

    // =========================================================================
    // MAIN PRODUCTION MACHINE ENDPOINTS
    // =========================================================================

    public List<Slot> getSlots() {
        return mainMachine.getSlots().values().stream()
                .sorted(Comparator.comparingInt(Slot::getRow).thenComparingInt(Slot::getCol))
                .collect(Collectors.toList());
    }

    public List<Product> getProducts() {
        return mainMachine.getSlots().values().stream()
                .map(Slot::getProduct)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(Product::getCode))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("machineId", mainMachine.getMachineId());
        status.put("stateName", mainMachine.getCurrentState().getStateName());
        status.put("machineStatus", mainMachine.getCurrentState().getStatus());
        status.put("statusDescription", mainMachine.getCurrentState().getStatus().getDescription());
        status.put("currentTransaction", mainMachine.getCurrentTransaction());
        status.put("cashboxBalance", mainMachine.getCashboxBalance());
        status.put("totalSlots", mainMachine.getSlots().size());
        status.put("totalItemsInStock", mainMachine.getSlots().values().stream().mapToInt(Slot::getCurrentStock).sum());
        return status;
    }

    public Map<String, Integer> getChangeInventory() {
        Map<String, Integer> result = new LinkedHashMap<>();
        for (Denomination d : Denomination.values()) {
            result.put(d.name(), mainMachine.getChangeInventory().get(d).get());
        }
        return result;
    }

    public Transaction selectProduct(String slotCode) {
        mainMachine.selectProduct(slotCode);
        return mainMachine.getCurrentTransaction();
    }

    public Transaction insertMoney(int denominationValue) {
        Denomination denomination = Denomination.fromValue(denominationValue);
        mainMachine.insertMoney(denomination);
        return mainMachine.getCurrentTransaction();
    }

    public Transaction dispense() {
        return mainMachine.dispense();
    }

    public Transaction cancelTransaction() {
        return mainMachine.cancelTransaction();
    }

    public void restockSlot(String slotCode, int quantity) {
        mainMachine.restockSlot(slotCode, quantity);
    }

    public void refillChange(int denominationValue, int count) {
        Denomination denomination = Denomination.fromValue(denominationValue);
        mainMachine.refillChange(denomination, count);
    }

    public List<Transaction> getTransactionHistory() {
        return new ArrayList<>(mainMachine.getTransactionHistory());
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        VendingMachineInitializer.seedMachine(simMachine);
        simMachine.setCurrentState(simMachine.getIdleState());
        simMachine.setCurrentTransaction(null);

        SimEvent initEvent = new SimEvent(
                "EV-" + simEventIdGen.getAndIncrement(),
                1,
                "INITIALIZE",
                "Machine Initialized & Stock Loaded",
                "Vending machine initialized with 12 product slots (3x4 grid) and ₹3,550 loaded in change hopper.",
                "SUCCESS"
        ).addDetail("slotsCount", simMachine.getSlots().size())
         .addDetail("state", simMachine.getCurrentState().getStateName());

        simEvents.add(initEvent);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simSelectProduct(String slotCode, int stepNumber) {
        try {
            simMachine.selectProduct(slotCode);
            Transaction txn = simMachine.getCurrentTransaction();

            SimEvent event = new SimEvent(
                    "EV-" + simEventIdGen.getAndIncrement(),
                    stepNumber,
                    "SELECT_PRODUCT",
                    "Keypad Selection: " + slotCode,
                    "Customer selected " + txn.getProductName() + " in slot " + slotCode + " (Price: ₹" + txn.getItemPrice() + "). State transitioned to HAS_SELECTION.",
                    "SUCCESS"
            ).addDetail("slotCode", slotCode)
             .addDetail("productName", txn.getProductName())
             .addDetail("price", txn.getItemPrice())
             .addDetail("state", simMachine.getCurrentState().getStateName());

            simEvents.add(event);
        } catch (Exception ex) {
            SimEvent errEvent = new SimEvent(
                    "EV-" + simEventIdGen.getAndIncrement(),
                    stepNumber,
                    "SELECT_PRODUCT_ERROR",
                    "Selection Failed: " + slotCode,
                    ex.getMessage(),
                    "ERROR"
            ).addDetail("slotCode", slotCode)
             .addDetail("error", ex.getMessage());

            simEvents.add(errEvent);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simInsertMoney(int denominationValue, int stepNumber) {
        try {
            Denomination denom = Denomination.fromValue(denominationValue);
            simMachine.insertMoney(denom);
            Transaction txn = simMachine.getCurrentTransaction();

            double inserted = txn != null ? txn.getInsertedAmount() : denominationValue;
            double required = txn != null ? txn.getItemPrice() : 0.0;

            SimEvent event = new SimEvent(
                    "EV-" + simEventIdGen.getAndIncrement(),
                    stepNumber,
                    "INSERT_MONEY",
                    "Inserted " + denom.getType() + " ₹" + denom.getValue(),
                    "Validator accepted ₹" + denom.getValue() + ". Total inserted: ₹" + inserted + (required > 0 ? " (Target: ₹" + required + ")" : ""),
                    "SUCCESS"
            ).addDetail("denomination", denom.name())
             .addDetail("value", denom.getValue())
             .addDetail("totalInserted", inserted);

            simEvents.add(event);
        } catch (Exception ex) {
            SimEvent errEvent = new SimEvent(
                    "EV-" + simEventIdGen.getAndIncrement(),
                    stepNumber,
                    "INSERT_MONEY_ERROR",
                    "Cash Insertion Error",
                    ex.getMessage(),
                    "ERROR"
            );
            simEvents.add(errEvent);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simDispense(int stepNumber) {
        try {
            Transaction txn = simMachine.dispense();

            SimEvent event = new SimEvent(
                    "EV-" + simEventIdGen.getAndIncrement(),
                    stepNumber,
                    "DISPENSE_SUCCESS",
                    "Dispense Complete: " + txn.getProductName(),
                    "Coil rotated, product " + txn.getProductName() + " dropped to tray. Change returned: ₹" + txn.getChangeAmount() + " via Chain of Responsibility.",
                    "SUCCESS"
            ).addDetail("productName", txn.getProductName())
             .addDetail("slotCode", txn.getSlotCode())
             .addDetail("changeAmount", txn.getChangeAmount())
             .addDetail("changeBreakdown", txn.getChangeBreakdown());

            simEvents.add(event);
        } catch (Exception ex) {
            SimEvent errEvent = new SimEvent(
                    "EV-" + simEventIdGen.getAndIncrement(),
                    stepNumber,
                    "DISPENSE_ERROR",
                    "Dispense Exception Triggered",
                    ex.getMessage(),
                    "ERROR"
            ).addDetail("error", ex.getMessage());

            simEvents.add(errEvent);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simCancel(int stepNumber) {
        Transaction txn = simMachine.cancelTransaction();
        SimEvent event = new SimEvent(
                "EV-" + simEventIdGen.getAndIncrement(),
                stepNumber,
                "CANCEL_TRANSACTION",
                "Transaction Cancelled",
                txn.getMessage() + (txn.getChangeAmount() > 0 ? " Refund: ₹" + txn.getChangeAmount() : ""),
                "WARNING"
        ).addDetail("refundAmount", txn.getChangeAmount())
         .addDetail("changeBreakdown", txn.getChangeBreakdown());

        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simRestock(String slotCode, int quantity, int stepNumber) {
        simMachine.restockSlot(slotCode, quantity);
        Slot slot = simMachine.getSlot(slotCode);

        SimEvent event = new SimEvent(
                "EV-" + simEventIdGen.getAndIncrement(),
                stepNumber,
                "RESTOCK",
                "Restocked Slot " + slotCode,
                "Added " + quantity + " units to " + (slot != null ? slot.getProduct().getName() : slotCode) + ". New stock level: " + (slot != null ? slot.getCurrentStock() : 0),
                "INFO"
        ).addDetail("slotCode", slotCode)
         .addDetail("newStock", slot != null ? slot.getCurrentStock() : 0);

        simEvents.add(event);
        return getSimSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return new ArrayList<>(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("machineId", simMachine.getMachineId());
        snapshot.put("stateName", simMachine.getCurrentState().getStateName());
        snapshot.put("machineStatus", simMachine.getCurrentState().getStatus());
        snapshot.put("currentTransaction", simMachine.getCurrentTransaction());
        snapshot.put("cashboxBalance", simMachine.getCashboxBalance());

        List<Slot> slotsList = simMachine.getSlots().values().stream()
                .sorted(Comparator.comparingInt(Slot::getRow).thenComparingInt(Slot::getCol))
                .collect(Collectors.toList());
        snapshot.put("slots", slotsList);

        Map<String, Integer> changeMap = new LinkedHashMap<>();
        for (Denomination d : Denomination.values()) {
            changeMap.put(d.name(), simMachine.getChangeInventory().get(d).get());
        }
        snapshot.put("changeInventory", changeMap);
        snapshot.put("events", new ArrayList<>(simEvents));
        return snapshot;
    }
}
