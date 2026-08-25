package com.lld.concurrency.fizzbuzz.model;

import java.util.function.Function;
import java.util.function.IntPredicate;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

/**
 * A genuine four-thread monitor coordination primitive built from scratch on one
 * {@link ReentrantLock} and one {@link Condition} — the classic "Multithreaded
 * FizzBuzz" solution.
 *
 * <p>All four threads (number, fizz, buzz, fizzbuzz) share one lock guarding a
 * single counter. Each thread loops: acquire the lock, and while the current
 * counter value is not the number this thread is responsible for, {@code await()}
 * on the shared condition (releasing the lock while parked, so the other threads
 * can make progress). When the counter finally matches this thread's predicate,
 * it prints, advances the counter, and {@code signalAll()}s every other thread to
 * re-check. Because the four predicates (multiple-of-15, multiple-of-3-only,
 * multiple-of-5-only, and "none of the above") are mutually exclusive and
 * collectively exhaustive over every integer, exactly one thread's predicate ever
 * matches a given counter value, so progress is always guaranteed — no two
 * threads can print the same number and no number is ever skipped.
 */
public final class FizzBuzzPrinter {

    private final int n;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition condition = lock.newCondition();
    private final StringBuilder result = new StringBuilder();
    private final TraceRecorder recorder;
    private int current = 1;

    public FizzBuzzPrinter(int n) {
        this(n, TraceRecorder.NOOP);
    }

    public FizzBuzzPrinter(int n, TraceRecorder recorder) {
        if (n <= 0) {
            throw new IllegalArgumentException("n must be positive, got " + n);
        }
        this.n = n;
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
    }

    /** Prints every 1..n number that is divisible by neither 3 nor 5. */
    public void number() throws InterruptedException {
        worker(v -> v % 3 != 0 && v % 5 != 0, String::valueOf, EventType.NUMBER_ATTEMPT, EventType.NUMBER_PRINTED);
    }

    /** Prints "Fizz" for every 1..n number divisible by 3 but not 5. */
    public void fizz() throws InterruptedException {
        worker(v -> v % 3 == 0 && v % 5 != 0, v -> "Fizz", EventType.FIZZ_ATTEMPT, EventType.FIZZ_PRINTED);
    }

    /** Prints "Buzz" for every 1..n number divisible by 5 but not 3. */
    public void buzz() throws InterruptedException {
        worker(v -> v % 5 == 0 && v % 3 != 0, v -> "Buzz", EventType.BUZZ_ATTEMPT, EventType.BUZZ_PRINTED);
    }

    /** Prints "FizzBuzz" for every 1..n number divisible by both 3 and 5. */
    public void fizzbuzz() throws InterruptedException {
        worker(v -> v % 15 == 0, v -> "FizzBuzz", EventType.FIZZBUZZ_ATTEMPT, EventType.FIZZBUZZ_PRINTED);
    }

    private void worker(IntPredicate matches, Function<Integer, String> formatter,
                         EventType attemptType, EventType printedType) throws InterruptedException {
        while (true) {
            lock.lock();
            try {
                recorder.record(attemptType, null, current);
                while (current <= n && !matches.test(current)) {
                    condition.await();
                    recorder.record(attemptType, null, current);
                }
                if (current > n) {
                    condition.signalAll();
                    return;
                }
                int value = current;
                String token = formatter.apply(value);
                append(token);
                current++;
                recorder.record(printedType, token, value);
                condition.signalAll();
            } finally {
                lock.unlock();
            }
        }
    }

    private void append(String token) {
        if (result.length() > 0) {
            result.append(' ');
        }
        result.append(token);
    }

    /** The fully assembled space-separated FizzBuzz output once every thread finishes. */
    public String getResult() {
        lock.lock();
        try {
            return result.toString();
        } finally {
            lock.unlock();
        }
    }

    public int getN() {
        return n;
    }
}
