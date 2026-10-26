package com.lld.learning.examples;

public class PolymorphismDemo {
    public static String present(PracticeQuestion question, String topic) {
        return question.ask(topic);
    }

    public static String select(OpenPracticeQuestion question) {
        return "open overload: " + question.ask(" Objects ");
    }

    public static String select(HintedPracticeQuestion question) {
        return "hinted overload: " + question.ask(" Objects ");
    }

    // Instance-qualified static calls are intentional here to expose hiding.
    // In application code, qualify category() with its class name instead.
    public static String baseMembers(OpenPracticeQuestion question) {
        return question.badge + "/" + question.category();
    }

    public static String childMembers(HintedPracticeQuestion question) {
        return question.badge + "/" + question.category();
    }

    public static void main(String[] args) {
        HintedPracticeQuestion hinted = new HintedPracticeQuestion();
        OpenPracticeQuestion base = hinted;
        PracticeQuestion role = hinted;
        System.out.println("plain: " + present(new OpenPracticeQuestion(), " Objects "));
        System.out.println("interface: " + present(role, " Objects "));
        System.out.println("superclass: " + base.ask(" Objects "));
        System.out.println(select(base));
        System.out.println(select(hinted));
        System.out.println("same object: " + (role == base && base == hinted));
        System.out.println("base members: " + baseMembers(base));
        System.out.println("child members: " + childMembers(hinted));
    }
}
