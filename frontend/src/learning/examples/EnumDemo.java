package com.lld.learning.examples;

public class EnumDemo {
    public static void main(String[] args) {
        ReviewPriority priority = ReviewPriority.parse(" high ");
        System.out.println("priority=" + priority.name());
        System.out.println("weight=" + priority.getWeight());
        System.out.println("same constant=" + (priority == ReviewPriority.HIGH));
        try {
            ReviewPriority.parse("urgent");
        } catch (IllegalArgumentException rejected) {
            System.out.println("rejected=" + rejected.getMessage());
        }
    }
}
