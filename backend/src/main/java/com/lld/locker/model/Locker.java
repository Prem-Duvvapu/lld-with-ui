package com.lld.locker.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.Getter;

import java.util.concurrent.locks.ReentrantLock;

/**
 * A single physical locker. {@code status} is mutated only through {@link #transitionTo}, the
 * one place a locker's lifecycle can move, matching the declared-transition-table idiom
 * ({@link LockerStatus#canTransitionTo}) used across the repo (e.g. {@code uber.model.Ride}).
 *
 * <p>{@code lockerLock} is a fair, per-locker {@code ReentrantLock} — the centerpiece of this
 * module's concurrency story. {@code LockerService#deposit} holds it across the whole
 * "is this locker still EMPTY? if so, claim it" sequence, not just the write, so two couriers
 * whose allocation scan both land on the same candidate locker can never both claim it. Lombok
 * {@code @Getter} only (matching {@code shoppingcart.model.Product}'s precedent): a mutable
 * {@code ReentrantLock} must never end up in a generated {@code equals}/{@code hashCode}, so it
 * is excluded via {@code @Getter(AccessLevel.NONE)} and exposed through a hand-written,
 * {@code @JsonIgnore}d getter instead.
 */
@Getter
public class Locker {
    private final String id;
    private final String bankId;
    private final LockerSize size;
    private volatile LockerStatus status;

    @Getter(AccessLevel.NONE)
    private final ReentrantLock lockerLock = new ReentrantLock(true);

    public Locker(String id, String bankId, LockerSize size) {
        this.id = id;
        this.bankId = bankId;
        this.size = size;
        this.status = LockerStatus.EMPTY;
    }

    /** The single enforcement point for this locker's lifecycle. Callers must already hold {@link #getLock()}. */
    public void transitionTo(LockerStatus target) {
        if (!status.canTransitionTo(target)) {
            throw new IllegalStateException("Locker " + id + " cannot move from " + status + " to " + target);
        }
        this.status = target;
    }

    @JsonIgnore
    public ReentrantLock getLock() {
        return lockerLock;
    }
}
