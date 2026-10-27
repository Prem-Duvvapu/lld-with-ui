package com.lld.learning.examples.oopoverview;

/** Reuses validation and preserves the parent input contract. */
public final class HintedPrompt extends PlainPrompt {
    @Override
    public String format(String title) {
        return super.format(title) + " (give an example)";
    }
}
