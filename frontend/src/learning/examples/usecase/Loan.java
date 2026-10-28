package com.lld.learning.examples.usecase;

/** One title represents one physical copy; days are offsets from the demo's day zero. */
public final class Loan {
    private final String memberId;
    private final String title;
    private int dueDay = 14;
    private boolean renewed;
    private boolean active = true;

    Loan(String memberId, String title) {
        this.memberId = memberId;
        this.title = title;
    }

    public String memberId() { return memberId; }
    public String title() { return title; }
    public int dueDay() { return dueDay; }
    public boolean renewed() { return renewed; }
    public boolean active() { return active; }

    void renew() {
        if (!active || renewed) throw new IllegalStateException("Loan cannot be renewed");
        dueDay += 7;
        renewed = true;
    }

    void close() {
        if (!active) throw new IllegalStateException("Loan already returned");
        active = false;
    }
}
