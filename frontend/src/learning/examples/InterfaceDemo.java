package com.lld.learning.examples;

public class InterfaceDemo {
    public static String present(MessageFormatter formatter, String text) {
        return formatter.format(text);
    }

    public static void main(String[] args) {
        MessageFormatter formatter = new PlainFormatter();
        System.out.println("plain=" + present(formatter, "  Hello  "));
        formatter = new TaggedFormatter("LLD");
        System.out.println("tagged=" + present(formatter, "  Hello  "));
    }
}
