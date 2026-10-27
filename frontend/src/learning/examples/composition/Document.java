package com.lld.learning.examples.composition;

import java.util.ArrayList;
import java.util.List;

/** Single-threaded domain contract: pages never transfer; deletion retires their content. */
public final class Document {
    private final String name;
    private final List<Page> pages = new ArrayList<>();
    private boolean deleted;

    public Document(String name) {
        this.name = required(name, "Document name");
    }

    public String getName() { return name; }
    public boolean isDeleted() { return deleted; }
    public List<Page> getPages() { return List.copyOf(pages); }

    public Page createPage(String text) {
        requireActive();
        Page page = new Page(this, required(text, "Page text"));
        pages.add(page);
        return page;
    }

    public void revise(Page page, String text) {
        requireOwnedActive(page);
        String validText = required(text, "Page text");
        page.text = validText;
    }

    // This domain deletes a removed page; it offers no detach-and-transfer operation.
    public void removePage(Page page) {
        requireOwnedActive(page);
        page.retire();
        pages.remove(page);
    }

    public void delete() {
        if (deleted) return;
        for (Page page : pages) page.retire();
        pages.clear();
        deleted = true;
    }

    private void requireOwnedActive(Page page) {
        requireActive();
        if (page == null) throw new IllegalArgumentException("Page is required");
        if (page.owner != this) throw new IllegalArgumentException("Page belongs to another document");
        page.requireActive();
        if (!pages.contains(page)) throw new IllegalArgumentException("Page is not in this document");
    }

    private void requireActive() {
        if (deleted) throw new IllegalStateException("Document is deleted");
    }

    private static String required(String value, String label) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(label + " is required");
        return value.trim();
    }

    // Nested for private access control; nesting alone does not create ownership semantics.
    public static final class Page {
        private final Document owner;
        private String text;
        private boolean deleted;

        private Page(Document owner, String text) {
            this.owner = owner;
            this.text = text;
        }

        // Metadata stays readable after domain deletion; content does not.
        public String getOwnerName() { return owner.getName(); }
        public boolean isDeleted() { return deleted; }

        public String read() {
            requireActive();
            return text;
        }

        private void requireActive() {
            if (deleted) throw new IllegalStateException("Page is deleted");
        }

        private void retire() {
            text = "";
            deleted = true;
        }
    }
}
