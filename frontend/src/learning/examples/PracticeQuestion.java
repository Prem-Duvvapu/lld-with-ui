package com.lld.learning.examples;

public interface PracticeQuestion {
    /**
     * Reject null or blank topics with IllegalArgumentException.
     * Return a nonblank question containing the stripped topic, without changing state.
     */
    String ask(String topic);
}
