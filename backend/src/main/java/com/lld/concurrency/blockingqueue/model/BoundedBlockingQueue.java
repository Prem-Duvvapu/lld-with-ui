package com.lld.concurrency.blockingqueue.model;

import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

/**
 * A genuine bounded blocking queue built from scratch on {@link ReentrantLock} and
 * two {@link Condition}s — deliberately not a wrapper around
 * {@code java.util.concurrent.LinkedBlockingQueue} or {@code ArrayBlockingQueue}.
 * The whole point of this class is to demonstrate the producer/consumer primitive
 * itself: a single lock guarding a fixed-size circular buffer, {@code notFull} for
 * producers waiting on space, {@code notEmpty} for consumers waiting on data.
 *
 * <p>Both wait loops use {@code while}, not {@code if}, so a spurious wakeup from
 * {@link Condition#await()} re-checks the real condition instead of proceeding on
 * a false signal.
 *
 * <p>Every attempt, success, and block is reported to a {@link TraceRecorder} while
 * the lock is held, so the reported queue size is always exactly what the thread
 * observed at that instant — never a race with a concurrent mutator.
 */
public final class BoundedBlockingQueue<T> {

    private final Object[] items;
    private final int capacity;
    private int count;
    private int putIndex;
    private int takeIndex;

    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    private final TraceRecorder recorder;

    public BoundedBlockingQueue(int capacity) {
        this(capacity, TraceRecorder.NOOP);
    }

    public BoundedBlockingQueue(int capacity, TraceRecorder recorder) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("capacity must be positive, got " + capacity);
        }
        this.capacity = capacity;
        this.items = new Object[capacity];
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
    }

    /**
     * Blocks the calling thread until there is room, then inserts {@code item}.
     * Genuinely parks on {@code notFull.await()} while the buffer is at capacity —
     * this is real thread suspension via the {@link Condition}, not a busy-wait.
     */
    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            String itemLabel = String.valueOf(item);
            recorder.record(EventType.ENQUEUE_ATTEMPT, itemLabel, count);
            while (count == capacity) {
                recorder.record(EventType.QUEUE_FULL, itemLabel, count);
                recorder.record(EventType.ENQUEUE_BLOCKED, itemLabel, count);
                notFull.await();
            }
            items[putIndex] = item;
            putIndex = (putIndex + 1) % capacity;
            count++;
            recorder.record(EventType.ENQUEUE_SUCCESS, itemLabel, count);
            notEmpty.signal();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Blocks the calling thread until an item is available, then removes and
     * returns it. Genuinely parks on {@code notEmpty.await()} while the buffer is
     * empty.
     */
    @SuppressWarnings("unchecked")
    public T take() throws InterruptedException {
        lock.lock();
        try {
            recorder.record(EventType.DEQUEUE_ATTEMPT, null, count);
            while (count == 0) {
                recorder.record(EventType.QUEUE_EMPTY, null, count);
                recorder.record(EventType.DEQUEUE_BLOCKED, null, count);
                notEmpty.await();
            }
            T item = (T) items[takeIndex];
            items[takeIndex] = null;
            takeIndex = (takeIndex + 1) % capacity;
            count--;
            recorder.record(EventType.DEQUEUE_SUCCESS, String.valueOf(item), count);
            notFull.signal();
            return item;
        } finally {
            lock.unlock();
        }
    }

    public int size() {
        lock.lock();
        try {
            return count;
        } finally {
            lock.unlock();
        }
    }

    public int capacity() {
        return capacity;
    }
}
