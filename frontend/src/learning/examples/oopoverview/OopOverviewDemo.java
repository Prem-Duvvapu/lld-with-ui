package com.lld.learning.examples.oopoverview;

import java.util.List;

public final class OopOverviewDemo {
    public static void main(String[] args) {
        Topic topic = new Topic("Objects");
        StudyPlan focus = new StudyPlan("Focus");
        StudyPlan weekend = new StudyPlan("Weekend", 1);
        StudyPlan alias = focus;
        System.out.println("default capacity = " + StudyPlan.DEFAULT_CAPACITY);
        System.out.println("alias == focus = " + (alias == focus));

        StudyPlan.Entry first = focus.add(topic);
        StudyPlan.Entry second = weekend.add(topic);
        List<StudyPlan.Entry> saved = focus.entries();
        System.out.println("same entry = " + (first == second));
        System.out.println("same topic = " + (first.topic() == second.topic()));

        PromptStyle style = new HintedPrompt();
        String earlier = first.prompt(style);
        System.out.println("first prompt = " + earlier);
        try {
            focus.add(topic);
        } catch (IllegalArgumentException rejected) {
            System.out.println("duplicate = " + rejected.getMessage());
        }
        System.out.println("focus size after rejection = " + focus.entries().size());

        topic.rename("References");
        alias.archive();
        System.out.println("focus = " + focus.state() + ", size = " + focus.entries().size());
        System.out.println("saved size = " + saved.size() + ", retired = " + saved.get(0).isRetired());
        try {
            saved.get(0).prompt(style);
        } catch (IllegalStateException rejected) {
            System.out.println("saved prompt = " + rejected.getMessage());
        }
        System.out.println("weekend prompt = " + second.prompt(style));
        System.out.println("earlier text = " + earlier);
    }
}
