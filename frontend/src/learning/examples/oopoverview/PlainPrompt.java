package com.lld.learning.examples.oopoverview;

public class PlainPrompt implements PromptStyle {
    @Override
    public String format(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Prompt title is required");
        }
        return "Review: " + title.strip();
    }
}
