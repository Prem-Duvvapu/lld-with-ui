package com.lld.learning.examples.memberstate;

public class MembersDemo {
    // A static method can use instance members when given an explicit receiver.
    public static void completeOne(StudyCounter counter) { counter.complete(); }

    // Instance-qualified static calls below are intentional teaching contrasts.
    // In normal code, write StudyCounter.category() or FocusCounter.category().
    public static String throughBase(StudyCounter counter) {
        return counter.category() + " / " + counter.description();
    }

    public static String throughChild(FocusCounter counter) {
        return counter.category() + " / " + counter.description();
    }

    public static void main(String[] args) {
        System.out.println("constant: " + StudyCounter.DEFAULT_MINUTES);
        System.out.println("created before new: " + StudyCounter.createdCount());
        System.out.println("before new trace: " + String.join(" -> ", StudyCounter.initializationTrace()));
        StudyCounter first = new StudyCounter(" Objects ");
        FocusCounter second = new FocusCounter("Methods");
        System.out.println("created after new: " + StudyCounter.createdCount());
        System.out.println("initial completions: " + first.completed() + "/" + second.completed());
        first.complete();
        completeOne(first);
        System.out.println("later completions: " + first.completed() + "/" + second.completed());
        System.out.println("base view: " + throughBase(second));
        System.out.println("child view: " + throughChild(second));
        System.out.println("final trace: " + String.join(" -> ", StudyCounter.initializationTrace()));
    }
}
