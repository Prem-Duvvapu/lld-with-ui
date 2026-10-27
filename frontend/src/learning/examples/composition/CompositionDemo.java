package com.lld.learning.examples.composition;

import java.util.List;

public final class CompositionDemo {
    public static void main(String[] args) {
        Document draft = new Document("Draft");
        Document archive = new Document("Archive");
        System.out.println("Before: " + draft.getPages().size() + "/" + archive.getPages().size());
        Document.Page intro = draft.createPage("Hello");
        Document.Page appendix = draft.createPage("Notes");
        Document.Page archived = archive.createPage("Record");
        List<Document.Page> saved = draft.getPages();
        System.out.println("Created: " + draft.getPages().size() + "/" + archive.getPages().size());
        System.out.println("Intro owner: " + intro.getOwnerName());
        try {
            archive.revise(intro, "Stolen");
        } catch (IllegalArgumentException rejected) {
            System.out.println("Foreign edit: " + rejected.getMessage());
        }
        draft.revise(intro, "Hello Java");
        System.out.println("Owner edit: " + intro.read());
        System.out.println("Saved same intro: " + (saved.get(0) == intro));
        draft.removePage(appendix);
        System.out.println("Remaining draft pages: " + draft.getPages().size());
        try {
            appendix.read();
        } catch (IllegalStateException rejected) {
            System.out.println("Removed page read: " + rejected.getMessage());
        }
        draft.delete();
        System.out.println("Draft deleted: " + draft.isDeleted() + ", intro deleted: " + intro.isDeleted());
        System.out.println("Saved list size: " + saved.size() + ", same intro: " + (saved.get(0) == intro));
        try {
            saved.get(0).read();
        } catch (IllegalStateException rejected) {
            System.out.println("Saved page read: " + rejected.getMessage());
        }
        System.out.println("Archive still reads: " + archived.read());
    }
}
