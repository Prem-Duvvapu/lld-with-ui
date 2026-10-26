package com.lld.learning.examples;

public final class HintedPracticeQuestion extends OpenPracticeQuestion {
    public final String badge = "hinted";

    public static String category() {
        return "hinted";
    }

    @Override
    public String ask(String topic) {
        return super.ask(topic) + " (hint: " + hint() + ")";
    }

    public String hint() {
        return "name one object";
    }
}
