package com.lld.learning.examples.sequence;

import java.util.ArrayList;
import java.util.List;

/** Records selected messages around real calls; this is not a UML interpreter. */
public final class InteractionTrace {
    public record Message(String kind, String from, String to, String text) {
        public String line() { return kind + " " + from + " -> " + to + ": " + text; }
    }

    private final List<Message> messages = new ArrayList<>();

    public void call(String from, String to, String text) {
        messages.add(new Message("call", from, to, text));
    }

    public void reply(String from, String to, String text) {
        messages.add(new Message("return", from, to, text));
    }

    public List<Message> messages() { return List.copyOf(messages); }
    public void clear() { messages.clear(); }
}
