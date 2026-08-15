package com.lld.library.model;

public class BookCopy {
    private final String copyId;
    private final String isbn;
    private final String rackLocation;
    private volatile boolean isAvailable;

    public BookCopy(String copyId, String isbn, String rackLocation) {
        this.copyId = copyId;
        this.isbn = isbn;
        this.rackLocation = rackLocation != null ? rackLocation : "Rack-General";
        this.isAvailable = true;
    }

    public String getCopyId() {
        return copyId;
    }

    public String getIsbn() {
        return isbn;
    }

    public String getRackLocation() {
        return rackLocation;
    }

    public boolean isAvailable() {
        return isAvailable;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }
}
