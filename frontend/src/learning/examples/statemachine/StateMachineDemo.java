package com.lld.learning.examples.statemachine;

public final class StateMachineDemo {
    public static void main(String[] args) {
        Reservation reservation = new Reservation();
        show("draft", reservation);
        reservation.hold(10);
        show("held", reservation);
        reservation.inspect(11);
        show("internal inspect", reservation);
        reservation.renew(12);
        show("external renew", reservation);
        try { reservation.confirm(22); }
        catch (IllegalStateException e) { System.out.println("confirm rejected: " + e.getMessage()); }
        show("unchanged after rejection", reservation);
        reservation.expire(22);
        show("expired", reservation);
        try { reservation.hold(23); }
        catch (IllegalStateException e) { System.out.println("hold rejected: " + e.getMessage()); }
        show("still terminated", reservation);

        Reservation confirmed = new Reservation();
        confirmed.hold(30);
        confirmed.confirm(39);
        show("confirmed before deadline", confirmed);
        Reservation cancelledDraft = new Reservation();
        cancelledDraft.cancel(0);
        show("cancelled draft", cancelledDraft);
    }

    private static void show(String label, Reservation r) {
        System.out.println(label + ": " + r.state() + " expiry=" + r.expiresAtMinute()
                + " entries=" + r.heldEntries() + " exits=" + r.heldExits()
                + " inspections=" + r.inspections() + " last=" + r.lastMinute()
                + " terminated=" + r.isTerminated());
    }
}
