package com.lld.learning.examples;

public final class StudyCardDemo {
    public static void main(String[] arguments) {
        StudyCard first = new StudyCard("Objects");
        StudyCard second = new StudyCard("Objects");
        first.review();

        StudyCard alias = first;
        alias.review();

        System.out.println("first: " + first.getTopic() + ", reviews=" + first.getReviewCount());
        System.out.println("second: " + second.getTopic() + ", reviews=" + second.getReviewCount());
        System.out.println("first == alias: " + (first == alias));
        System.out.println("first == second: " + (first == second));
    }
}
