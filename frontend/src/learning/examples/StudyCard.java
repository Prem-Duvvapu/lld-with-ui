package com.lld.learning.examples;

public final class StudyCard {
    private final String topic;
    private int reviewCount;

    public StudyCard(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("A topic is required");
        }
        this.topic = topic;
    }

    public void review() {
        reviewCount++;
    }

    public String getTopic() {
        return topic;
    }

    public int getReviewCount() {
        return reviewCount;
    }
}
