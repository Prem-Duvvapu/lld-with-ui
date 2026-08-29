package com.lld.atm.repository;

import com.lld.atm.exception.AccountNotFoundException;
import com.lld.atm.model.Account;
import com.lld.atm.model.Card;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for live ATM state — {@code ConcurrentHashMap} throughout, the same shape as
 * {@code AirlineRepository}/{@code ConcertTicketRepository}. Pure CRUD: no session, locking or
 * business-rule logic lives here — that all belongs to {@code AtmService}, which owns a second,
 * independently constructed instance of this class for its isolated {@code /sim/*} sandbox so a
 * demo run can never mutate a real seeded account or card.
 */
@Repository
public class BankingRepository {

    private final Map<String, Account> accounts = new ConcurrentHashMap<>();
    private final Map<String, Card> cards = new ConcurrentHashMap<>();

    public void addAccount(Account account) {
        accounts.put(account.getAccountNumber(), account);
    }

    public void addCard(Card card) {
        cards.put(card.getCardNumber(), card);
    }

    public Account getAccount(String accountNumber) {
        Account acc = accounts.get(accountNumber);
        if (acc == null) {
            throw new AccountNotFoundException("Account not found: " + accountNumber);
        }
        return acc;
    }

    public Card getCard(String cardNumber) {
        Card card = cards.get(cardNumber);
        if (card == null) {
            throw new AccountNotFoundException("Card not found: " + cardNumber);
        }
        return card;
    }

    public Card getCardByAccountNumber(String accountNumber) {
        return cards.values().stream()
                .filter(c -> c.getAccountNumber().equals(accountNumber))
                .findFirst()
                .orElse(null);
    }

    public List<Account> getAllAccounts() {
        return new ArrayList<>(accounts.values());
    }

    public List<Card> getAllCards() {
        return new ArrayList<>(cards.values());
    }
}
