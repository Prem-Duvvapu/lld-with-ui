package com.lld.learning.examples;

import java.util.List;

public class EncapsulationDemo {
    public static void main(String[] args) {
        LeakyShelf leaky = new LeakyShelf();
        leaky.addTopic("Objects");
        leaky.topics.add("");
        System.out.println("leaky size=" + leaky.topics.size() + ", blank=" + leaky.topics.contains(""));

        ReadingShelf shelf = new ReadingShelf(2);
        shelf.addTopic("Objects");
        List<String> snapshot = shelf.getTopics();
        try {
            shelf.addTopic("");
        } catch (IllegalArgumentException rejected) {
            System.out.println("blank rejected; size=" + shelf.getTopics().size());
        }
        try {
            snapshot.add("");
        } catch (UnsupportedOperationException rejected) {
            System.out.println("snapshot mutation rejected");
        }
        shelf.addTopic("Interfaces");
        System.out.println("saved snapshot=" + snapshot);
        System.out.println("shelf=" + shelf.getTopics());
        try {
            shelf.addTopic("Enums");
        } catch (IllegalStateException rejected) {
            System.out.println("capacity rejected; size=" + shelf.getTopics().size());
        }
    }
}
