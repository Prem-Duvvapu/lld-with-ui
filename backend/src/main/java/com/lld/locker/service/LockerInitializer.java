package com.lld.locker.service;

import com.lld.locker.model.AllocationPolicy;
import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerBank;
import com.lld.locker.model.LockerSize;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds two demo locker banks with a realistic size mix and a couple of already-deposited packages. */
@Component
public class LockerInitializer implements CommandLineRunner {

    private final LockerService lockerService;

    public LockerInitializer(LockerService lockerService) {
        this.lockerService = lockerService;
    }

    @Override
    public void run(String... args) {
        LockerBank downtown = LockerBank.builder().id("BANK-1").name("Downtown Plaza").location("123 Market St").build();
        LockerBank campus = LockerBank.builder().id("BANK-2").name("University Campus").location("45 College Ave").build();
        lockerService.addBank(downtown);
        lockerService.addBank(campus);

        lockerService.addLocker(new Locker("L-101", downtown.getId(), LockerSize.SMALL));
        lockerService.addLocker(new Locker("L-102", downtown.getId(), LockerSize.SMALL));
        lockerService.addLocker(new Locker("L-103", downtown.getId(), LockerSize.MEDIUM));
        lockerService.addLocker(new Locker("L-104", downtown.getId(), LockerSize.MEDIUM));
        lockerService.addLocker(new Locker("L-105", downtown.getId(), LockerSize.LARGE));

        lockerService.addLocker(new Locker("L-201", campus.getId(), LockerSize.SMALL));
        lockerService.addLocker(new Locker("L-202", campus.getId(), LockerSize.MEDIUM));
        lockerService.addLocker(new Locker("L-203", campus.getId(), LockerSize.LARGE));

        // A couple of already-occupied lockers so the UI shows something meaningful on first load.
        lockerService.deposit(downtown.getId(), LockerSize.SMALL, "Courier-Amir", "Recipient-Priya", AllocationPolicy.SMALLEST_FIT);
        lockerService.deposit(campus.getId(), LockerSize.MEDIUM, "Courier-Diego", "Recipient-Wei", AllocationPolicy.SMALLEST_FIT);
    }
}
