package com.lld.atm.service;

import com.lld.atm.model.Account;
import com.lld.atm.model.Card;
import com.lld.atm.repository.BankingRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AtmInitializer implements CommandLineRunner {

    private final BankingRepository bankingRepository;

    public AtmInitializer(BankingRepository bankingRepository) {
        this.bankingRepository = bankingRepository;
    }

    @Override
    public void run(String... args) {
        // Seed demo accounts
        Account acc1 = Account.builder().id("acc-1").accountNumber("1234567890").holderName("John Doe").balance(10000.0).build();
        Account acc2 = Account.builder().id("acc-2").accountNumber("9876543210").holderName("Jane Smith").balance(25000.0).build();
        Account acc3 = Account.builder().id("acc-3").accountNumber("5555666677").holderName("Alice Johnson").balance(1200.0).build(); // Low balance

        bankingRepository.addAccount(acc1);
        bankingRepository.addAccount(acc2);
        bankingRepository.addAccount(acc3);

        // Seed demo cards (Card Number -> PIN -> Account Number)
        Card card1 = Card.builder().cardNumber("1111222233334444").pin("1234").accountNumber("1234567890").build();
        Card card2 = Card.builder().cardNumber("5555666677778888").pin("4321").accountNumber("9876543210").build();
        Card card3 = Card.builder().cardNumber("9999888877776666").pin("0000").accountNumber("5555666677").build();

        bankingRepository.addCard(card1);
        bankingRepository.addCard(card2);
        bankingRepository.addCard(card3);
    }
}
