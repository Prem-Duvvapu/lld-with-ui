package com.lld.movieticket.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Show {
    private long id;
    private long movieId;
    private long theaterId;
    private long screenId;
    private String screen;
    private String showTime;
    private String date;
    private int availableSeats;
    private int totalSeats;

    public Show() {}

    public Show(long id, long movieId, long theaterId, long screenId, String screen, String showTime, String date, int availableSeats, int totalSeats) {
        this.id = id;
        this.movieId = movieId;
        this.theaterId = theaterId;
        this.screenId = screenId;
        this.screen = screen;
        this.showTime = showTime;
        this.date = date;
        this.availableSeats = availableSeats;
        this.totalSeats = totalSeats;
    }

    public Show(long id, long movieId, String screen, String showTime, int availableSeats, int totalSeats) {
        this(id, movieId, 1L, 1L, screen, showTime, "Today", availableSeats, totalSeats);
    }
}
