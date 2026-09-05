---
name: lld-tests
description: Write the four required test flavours for an LLD module — service, strategy/unit, repository and concurrency — including deterministic race tests that actually fail without the fix. Use when the user asks to add, improve or fix tests for a module, or asks for test coverage.
---

# Write tests for an LLD module

Four flavours, all required. JUnit 5 + `spring-boot-starter-test`, in
`backend/src/test/java/com/lld/<key>/`.

```bash
mvn test -Dtest=<Module>ServiceTest                    # one class
mvn test -Dtest='<Module>ServiceTest#someTestMethod'   # one method
mvn test                                               # full suite
```

## 1. Service test — the happy paths and every rejection

Cover each facade method, then every way it can legitimately fail. The rejections matter more
than the successes: assert the **exception type and the HTTP status it maps to**, since that is
the contract the frontend depends on.

```java
@Test
void requestRide_rejectsWhenDriverAlreadyOnTrip() {
    assertThrows(DriverUnavailableException.class, () -> service.assign(ride, busyDriverId));
}
```

## 2. Strategy / unit test — the algorithm in isolation

Each strategy implementation directly, no Spring context. This is where the interesting
arithmetic lives, so test the edges:

- Rounding — do three-way splits of ₹100 sum back to exactly ₹100?
- Validation — percentages not summing to 100, exact splits not summing to the total
- Boundaries — zero, negative, single participant, maximum
- Every branch of the factory that resolves the strategy

## 3. Repository test — storage and lookup

CRUD, absent-key behaviour (empty vs null vs throw — assert which), and that the store is
genuinely a `ConcurrentHashMap`, not a `HashMap` that happens to work single-threaded.

## 4. Concurrency test — the one that earns its place

This is the flavour that catches real bugs. **It must fail if the lock is removed** — write it,
then verify by temporarily deleting the synchronization and watching it go red. A concurrency
test that passes against broken code is worse than none, because it certifies a race as fixed.

```java
@Test
void twoRidersRacingForOneDriver_onlyOneWins() throws Exception {
    int threads = 2;
    var start = new CountDownLatch(1);
    var done  = new CountDownLatch(threads);
    var wins  = new AtomicInteger();
    var pool  = Executors.newFixedThreadPool(threads);

    for (int i = 0; i < threads; i++) {
        pool.submit(() -> {
            try {
                start.await();                       // release together — maximise overlap
                service.assign(rides.get(i), driverId);
                wins.incrementAndGet();
            } catch (DriverUnavailableException expected) {
                // the loser — exactly what should happen
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });
    }

    start.countDown();
    assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish");
    pool.shutdown();

    assertEquals(1, wins.get(), "exactly one rider may claim the driver");
    assertEquals(ON_TRIP, repo.findDriver(driverId).getStatus());
}
```

**Rules for these:**
- `CountDownLatch` to release all threads simultaneously. Staggered starts do not race.
- Assert an **invariant**, not a timing — "exactly one winner", "balance equals sum of deposits",
  "no seat double-booked". Never assert on ordering or elapsed time.
- Always bound the wait (`await(5, TimeUnit.SECONDS)`) and assert it returned true, so a
  deadlock fails the test instead of hanging CI.
- Use enough threads to make the window real — 10+ for balance races, 2 is enough for a
  binary claim (winner vs. loser).
- **A single run of even a correctly-shaped 2-thread race is not a reliable regression guard —
  repeat it.** RCA-052 is the proof: a brand-new `/sim/*` engine test looped a two-different-
  drivers-one-ride race 25 times and caught a genuine, previously-shipped bug (a lock keyed on
  the wrong entity) on round 24 — the *existing* single-shot test for the identical scenario
  (`oneRideManyDrivers_bindsToOneDriver`) had been exercising that exact bug the whole time and
  never once reported it, because the unguarded window is nanoseconds wide and a lone attempt
  usually just doesn't land in it. Default every race test to a 100–300 round repeated form
  (see `UberConcurrencyTest.repeatedRaceNeverProducesTwoWinners` /
  `repeatedTwoDriverRaceForOneRideNeverProducesTwoWinners` for the pattern — fresh service/repo
  instances each round, latch-released together, assert the invariant every round) unless there's
  a specific, stated reason a single run suffices.
- `Thread.sleep` to "make the race happen" is a smell; latches are deterministic, sleeps are not.

The bug class this repo keeps producing is **check-then-act**: a read of state and a write that
depends on it, with no lock in between. Target those directly.

## Frontend tests

Vitest, in `frontend/src/__tests__/`. Two cross-cutting suites already guard structure:
`designDataCoverage.test.js` (every requested module id resolves; entry shape; no duplicate
barrel keys; no diagram edge pointing at an undeclared class) and `routing.test.js` (home cards,
routes, page files, catch-all). Add module-specific tests alongside `parkingApi.test.js` when a
page has logic worth testing.

```bash
npx vitest run src/__tests__/routing.test.js
npx vitest run -t "<substring of test name>"
```

## Rules

- **Never delete or weaken an existing test to make yours pass.** If one breaks, either you
  introduced a bug or the behaviour change is deliberate and the test needs updating *and*
  explaining.
- Deterministic only. No wall-clock assertions, no ordering assumptions, no reliance on
  `@PostConstruct` seed data that another test may have mutated.
- Name tests as behaviour: `twoRidersRacingForOneDriver_onlyOneWins`, not `testAssign2`.
- If writing a test uncovers a real bug — it happens regularly here — fix it, then add an
  `RCA.md` entry via the `rca` skill.

Report actual numbers: "backend 203 → 211 tests, all green." Never claim a suite passed without
running it.
