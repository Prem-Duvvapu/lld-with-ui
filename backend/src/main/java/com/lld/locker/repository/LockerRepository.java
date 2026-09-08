package com.lld.locker.repository;

import com.lld.locker.exception.LockerBankNotFoundException;
import com.lld.locker.exception.LockerNotFoundException;
import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerBank;
import com.lld.locker.model.Parcel;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * In-memory store for live locker-network state — pure CRUD, the same shape as
 * {@code atm.repository.BankingRepository}. No allocation logic or locking lives here; that
 * belongs to {@code LockerService}, which owns a second, independently constructed instance of
 * this class for its isolated {@code /sim/*} sandbox.
 */
@Repository
public class LockerRepository {

    private final Map<String, LockerBank> banks = new ConcurrentHashMap<>();
    private final Map<String, Locker> lockers = new ConcurrentHashMap<>();
    private final Map<String, Parcel> parcels = new ConcurrentHashMap<>();

    /** Wipes every bank/locker/package. Used only by {@code LockerService}'s isolated sim sandbox. */
    public void reset() {
        banks.clear();
        lockers.clear();
        parcels.clear();
    }

    public void addBank(LockerBank bank) {
        banks.put(bank.getId(), bank);
    }

    public void addLocker(Locker locker) {
        lockers.put(locker.getId(), locker);
    }

    public LockerBank getBank(String bankId) {
        LockerBank bank = banks.get(bankId);
        if (bank == null) {
            throw new LockerBankNotFoundException("Locker bank not found: " + bankId);
        }
        return bank;
    }

    public Locker getLocker(String lockerId) {
        Locker locker = lockers.get(lockerId);
        if (locker == null) {
            throw new LockerNotFoundException("Locker not found: " + lockerId);
        }
        return locker;
    }

    public List<Locker> getLockersInBank(String bankId) {
        return lockers.values().stream()
                .filter(l -> l.getBankId().equals(bankId))
                .collect(Collectors.toList());
    }

    public List<LockerBank> getAllBanks() {
        return new ArrayList<>(banks.values());
    }

    public List<Locker> getAllLockers() {
        return new ArrayList<>(lockers.values());
    }

    public void saveParcel(Parcel pkg) {
        parcels.put(pkg.getId(), pkg);
    }

    public Parcel getParcel(String parcelId) {
        return parcels.get(parcelId);
    }

    public List<Parcel> getAllParcels() {
        return new ArrayList<>(parcels.values());
    }
}
