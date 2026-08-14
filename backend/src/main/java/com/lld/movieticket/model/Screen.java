package com.lld.movieticket.model;

public class Screen {
    private long id;
    private long theaterId;
    private String name;
    private int totalRows;
    private int totalCols;

    public Screen() {}

    public Screen(long id, long theaterId, String name, int totalRows, int totalCols) {
        this.id = id;
        this.theaterId = theaterId;
        this.name = name;
        this.totalRows = totalRows;
        this.totalCols = totalCols;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public long getTheaterId() { return theaterId; }
    public void setTheaterId(long theaterId) { this.theaterId = theaterId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getTotalRows() { return totalRows; }
    public void setTotalRows(int totalRows) { this.totalRows = totalRows; }

    public int getTotalCols() { return totalCols; }
    public void setTotalCols(int totalCols) { this.totalCols = totalCols; }
}
