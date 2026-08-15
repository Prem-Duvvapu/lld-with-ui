package com.lld.vendingmachine.state;

import com.lld.vendingmachine.model.Denomination;
import com.lld.vendingmachine.model.MachineStatus;
import com.lld.vendingmachine.model.Transaction;
import com.lld.vendingmachine.model.VendingMachine;

public interface VendingMachineState {
    void selectProduct(VendingMachine machine, String slotCode);
    void insertMoney(VendingMachine machine, Denomination denomination);
    Transaction dispense(VendingMachine machine);
    Transaction cancelTransaction(VendingMachine machine);
    String getStateName();
    MachineStatus getStatus();
}
