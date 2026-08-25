package com.lld.concurrency.fizzbuzz.model;

/**
 * Every meaningful thing that happens inside {@link FizzBuzzPrinter} during a
 * run. Recorded in order by {@link TraceRecorder} so the frontend can replay a
 * real execution instead of animating a canned one.
 */
public enum EventType {
    /** The plain-number thread woke up and is checking whether it is its turn. */
    NUMBER_ATTEMPT,
    /** The plain-number thread printed the current number. */
    NUMBER_PRINTED,
    /** The fizz thread woke up and is checking whether it is its turn. */
    FIZZ_ATTEMPT,
    /** The fizz thread printed "Fizz". */
    FIZZ_PRINTED,
    /** The buzz thread woke up and is checking whether it is its turn. */
    BUZZ_ATTEMPT,
    /** The buzz thread printed "Buzz". */
    BUZZ_PRINTED,
    /** The fizzbuzz thread woke up and is checking whether it is its turn. */
    FIZZBUZZ_ATTEMPT,
    /** The fizzbuzz thread printed "FizzBuzz". */
    FIZZBUZZ_PRINTED
}
