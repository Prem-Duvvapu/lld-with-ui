package com.lld.atm.service;

import com.lld.atm.model.Account;
import com.lld.atm.model.Card;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AtmInitializer implements CommandLineRunner {

    private final BankingService bankingService;

    public AtmInitializer(BankingService bankingService) {
        this.bankingService = bankingService;
    }

    @Override
    public void run(String... args) {
        // Seed demo accounts
        Account acc1 = new Account("acc-1", "1234567890", "John Doe", 10000.0);
        Account acc2 = new Account("acc-2", "9876543210", "Jane Smith", 25000.0);
        Account acc3 = new Account("acc-3", "5555666677", "Alice Johnson", 1200.0); // Low balance

        bankingService.addAccount(acc1);
        bankingService.addAccount(acc2);
        bankingService.addAccount(acc3);

        // Seed demo cards (Card Number -> PIN -> Account Number)
        Card card1 = new Card("1111222233334444", "1234", "1234567890");
        Card card2 = new Card("5555666677778888", "4321", "9876543210");
        Card card3 = new Card("9999888877776666", "0000", "5555666677");

        bankingService.addCard(card1);
        bankingService.addCard(card2);
        bankingService.addCard(card3);
    }
}
