package com.lld.locker.repository;

import com.lld.locker.exception.LockerBankNotFoundException;
import com.lld.locker.exception.LockerNotFoundException;
import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerBank;
import com.lld.locker.model.LockerSize;
import com.lld.locker.model.Parcel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class LockerRepositoryTest {

    private LockerRepository repository;

    @BeforeEach
    void setUp() {
        repository = new LockerRepository();
    }

    @Test
    void unknownBankThrowsLockerBankNotFoundException() {
        assertThrows(LockerBankNotFoundException.class, () -> repository.getBank("nope"));
    }

    @Test
    void unknownLockerThrowsLockerNotFoundException() {
        assertThrows(LockerNotFoundException.class, () -> repository.getLocker("nope"));
    }

    @Test
    void getLockersInBankFiltersByBankIdOnly() {
        repository.addBank(LockerBank.builder().id("B1").name("Bank 1").location("X").build());
        repository.addBank(LockerBank.builder().id("B2").name("Bank 2").location("Y").build());
        repository.addLocker(new Locker("L1", "B1", LockerSize.SMALL));
        repository.addLocker(new Locker("L2", "B1", LockerSize.MEDIUM));
        repository.addLocker(new Locker("L3", "B2", LockerSize.LARGE));

        assertEquals(2, repository.getLockersInBank("B1").size());
        assertEquals(1, repository.getLockersInBank("B2").size());
    }

    @Test
    void saveAndGetParcelRoundTrips() {
        Parcel pkg = Parcel.builder().id("PKG-1").size(LockerSize.SMALL).pickupCode("123456").build();
        repository.saveParcel(pkg);

        assertEquals(pkg, repository.getParcel("PKG-1"));
        assertNull(repository.getParcel("does-not-exist"));
    }

    @Test
    void resetWipesEverything() {
        repository.addBank(LockerBank.builder().id("B1").name("Bank 1").location("X").build());
        repository.addLocker(new Locker("L1", "B1", LockerSize.SMALL));
        repository.saveParcel(Parcel.builder().id("PKG-1").size(LockerSize.SMALL).build());

        repository.reset();

        assertTrue(repository.getAllBanks().isEmpty());
        assertTrue(repository.getAllLockers().isEmpty());
        assertTrue(repository.getAllParcels().isEmpty());
    }
}
