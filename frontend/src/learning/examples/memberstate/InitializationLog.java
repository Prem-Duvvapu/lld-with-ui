package com.lld.learning.examples.memberstate;

import java.util.ArrayList;
import java.util.List;

/** Independent observer, so reading the log need not initialize StudyCounter. */
public final class InitializationLog {
    private static final List<String> EVENTS = new ArrayList<>();
    private InitializationLog() { }

    public static void record(String event) { EVENTS.add(event); }
    public static List<String> snapshot() { return List.copyOf(EVENTS); }
}
