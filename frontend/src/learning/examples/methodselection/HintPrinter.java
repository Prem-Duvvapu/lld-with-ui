package com.lld.learning.examples.methodselection;

public class HintPrinter extends PromptPrinter {
    @Override
    public String print(String topic) {
        return "hint String: " + clean(topic) + " (name an object)";
    }

    // A child-only overload, not an override of print(String) or print(Object).
    public String print(StringBuilder topic) {
        return "hint builder: " + clean(topic == null ? null : topic.toString());
    }

    // Covariant return type; the override also omits the checked exception.
    @Override
    public HintPrinter copy() {
        return new HintPrinter();
    }
}
