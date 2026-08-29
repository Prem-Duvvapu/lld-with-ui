package com.lld.atm.repository;

import com.lld.atm.exception.AccountNotFoundException;
import com.lld.atm.model.Account;
import com.lld.atm.model.Card;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * {@code BankingRepository} is a bare CRUD layer over two {@code ConcurrentHashMap}s (matching
 * {@code AirlineRepository}), so its own test coverage is purely the lookup/not-found contract —
 * everything session- or lock-related is covered by {@code AtmServiceTest}/{@code AtmConcurrencyTest}.
 */
public class BankingRepositoryTest {

    private BankingRepository repository;

    @BeforeEach
    public void setUp() {
        repository = new BankingRepository();
    }

    @Test
    public void addAndGetAccountRoundTrips() {
        Account acc = Account.builder().id("acc-1").accountNumber("ACC-1").holderName("Bob").balance(100.0).build();
        repository.addAccount(acc);

        Account found = repository.getAccount("ACC-1");
        assertEquals("Bob", found.getHolderName());
        assertEquals(100.0, found.getBalance());
    }

    @Test
    public void getAccountThrowsAccountNotFoundForUnknownNumber() {
        assertThrows(AccountNotFoundException.class, () -> repository.getAccount("NOPE"));
    }

    @Test
    public void addAndGetCardRoundTrips() {
        Card card = Card.builder().cardNumber("CARD-1").pin("1234").accountNumber("ACC-1").build();
        repository.addCard(card);

        Card found = repository.getCard("CARD-1");
        assertEquals("1234", found.getPin());
        assertEquals("ACC-1", found.getAccountNumber());
    }

    @Test
    public void getCardThrowsAccountNotFoundForUnknownCardNumber() {
        assertThrows(AccountNotFoundException.class, () -> repository.getCard("NOPE"));
    }

    @Test
    public void getCardByAccountNumberFindsTheLinkedCard() {
        Card card = Card.builder().cardNumber("CARD-2").pin("9999").accountNumber("ACC-2").build();
        repository.addCard(card);

        Card found = repository.getCardByAccountNumber("ACC-2");
        assertNotNull(found);
        assertEquals("CARD-2", found.getCardNumber());
    }

    @Test
    public void getCardByAccountNumberReturnsNullWhenNoCardIsLinked() {
        assertNull(repository.getCardByAccountNumber("NO-SUCH-ACCOUNT"));
    }

    @Test
    public void getAllAccountsAndCardsReturnIndependentSnapshots() {
        repository.addAccount(Account.builder().id("a1").accountNumber("A1").holderName("X").balance(1.0).build());
        repository.addCard(Card.builder().cardNumber("C1").pin("0000").accountNumber("A1").build());

        var accountsSnapshot = repository.getAllAccounts();
        assertEquals(1, accountsSnapshot.size());
        accountsSnapshot.clear(); // mutating the returned list must not touch the repository
        assertEquals(1, repository.getAllAccounts().size());

        assertEquals(1, repository.getAllCards().size());
    }
}
