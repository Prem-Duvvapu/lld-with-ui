package com.lld.learning.examples;

public class AbstractionDemo {
    public static String show(TopicLabel label, String topic) {
        return "Study: " + label.render(topic);
    }

    public static void main(String[] args) {
        TopicLabel ellipsis = new EllipsisTopicLabel(8);
        TopicLabel clipped = new ClippedTopicLabel(8);
        System.out.println(show(ellipsis, " Encapsulation "));
        System.out.println(show(clipped, " Encapsulation "));
        System.out.println(show(ellipsis, " OOP "));
        System.out.println(show(clipped, " OOP "));
        try {
            show(ellipsis, "   ");
        } catch (IllegalArgumentException failure) {
            System.out.println("blank: " + failure.getMessage());
        }
        try {
            new EllipsisTopicLabel(3);
        } catch (IllegalArgumentException failure) {
            System.out.println("limit: " + failure.getMessage());
        }
    }
}
