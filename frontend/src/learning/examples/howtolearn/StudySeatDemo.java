package com.lld.learning.examples.howtolearn;

public class StudySeatDemo {
    public static void main(String[] args) {
        StudySeat seat = new StudySeat("S1");
        show("initial", seat);

        seat.reserve("Ada");
        show("after Ada reserves", seat);

        try {
            seat.reserve("Ben");
        } catch (IllegalStateException failure) {
            System.out.println("reserve Ben rejected: " + failure.getMessage());
        }
        show("after rejected reservation", seat);

        try {
            seat.cancel("Ben");
        } catch (IllegalStateException failure) {
            System.out.println("cancel Ben rejected: " + failure.getMessage());
        }
        show("after rejected cancellation", seat);

        seat.cancel("Ada");
        show("after Ada cancels", seat);
        seat.reserve("Ben");
        show("after Ben reserves", seat);
    }

    private static void show(String step, StudySeat seat) {
        System.out.println(step + ": " + seat.getSeatId()
                + ", reserved=" + seat.isReserved() + ", holder=" + seat.getReservedBy());
    }
}
