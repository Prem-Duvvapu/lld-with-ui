package com.lld.learning.examples;

import java.util.ArrayList;
import java.util.List;

public class ConstructorDemo {
    public static void main(String[] args) {
        List<String> trace = new ArrayList<>();
        FocusedSession session = new FocusedSession(" Objects ", trace);
        trace.forEach(System.out::println);
        System.out.println("created: " + session.getTopic() + ", minutes=" + session.getMinutes());
        session.extend(5);
        System.out.println("extended minutes=" + session.getMinutes());
    }
}
