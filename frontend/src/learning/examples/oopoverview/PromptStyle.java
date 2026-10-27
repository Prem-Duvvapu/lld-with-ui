package com.lld.learning.examples.oopoverview;

public interface PromptStyle {
    /** Reject null/blank input; return a nonblank prompt using the stripped title. */
    String format(String title);
}
