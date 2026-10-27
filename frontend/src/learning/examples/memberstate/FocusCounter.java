package com.lld.learning.examples.memberstate;

public class FocusCounter extends StudyCounter {
    public FocusCounter(String topic) { super(topic); }

    // Hides the base class method; it does not override it.
    public static String category() { return "focus"; }

    @Override
    public String description() { return "focus: " + topic(); }
}
