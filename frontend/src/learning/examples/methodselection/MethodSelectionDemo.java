package com.lld.learning.examples.methodselection;

import java.io.IOException;

public class MethodSelectionDemo {
    public static String phase(long value) { return "long"; }
    public static String phase(Integer value) { return "Integer"; }
    public static String phase(int... values) { return "int... length=" + values.length; }

    public static String throughBase(PromptPrinter printer, String topic) {
        return printer.print(topic);
    }

    public static void main(String[] args) throws IOException {
        HintPrinter child = new HintPrinter();
        PromptPrinter base = child;
        String text = " Objects ";
        Object object = text;
        StringBuilder builder = new StringBuilder(text);

        System.out.println("same receiver: " + (base == child));
        System.out.println("String argument: " + throughBase(base, text));
        System.out.println("Object argument: " + base.print(object));
        System.out.println("base sees builder: " + base.print(builder));
        System.out.println("child sees builder: " + child.print(builder));
        System.out.println("phase(3): " + phase(3));
        System.out.println("phase(Integer): " + phase(Integer.valueOf(3)));
        System.out.println("phase(): " + phase());

        PromptPrinter copy = base.copy(); // Declared result is PromptPrinter.
        HintPrinter childCopy = child.copy(); // No IOException handling required here.
        System.out.println("base copy runtime: " + copy.getClass().getSimpleName());
        System.out.println("child copy runtime: " + childCopy.getClass().getSimpleName());
        System.out.println("fresh copy: " + (copy != child));
    }
}
