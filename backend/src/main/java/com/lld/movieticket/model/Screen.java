package com.lld.movieticket.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
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
}
