package com.lld.movieticket.model;

public class Show {
    private long id;
    private long movieId;
    private String screen;
    private String showTime;
    private int availableSeats;
    private int totalSeats;

    public Show() {}

    public Show(long id, long movieId, String screen, String showTime, int availableSeats, int totalSeats) {
        this.id = id;
        this.movieId = movieId;
        this.screen = screen;
        this.showTime = showTime;
        this.availableSeats = availableSeats;
        this.totalSeats = totalSeats;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public long getMovieId() { return movieId; }
    public void setMovieId(long movieId) { this.movieId = movieId; }

    public String getScreen() { return screen; }
    public void setScreen(String screen) { this.screen = screen; }

    public String getShowTime() { return showTime; }
    public void setShowTime(String showTime) { this.showTime = showTime; }

    public int getAvailableSeats() { return availableSeats; }
    public void setAvailableSeats(int availableSeats) { this.availableSeats = availableSeats; }

    public int getTotalSeats() { return totalSeats; }
    public void setTotalSeats(int totalSeats) { this.totalSeats = totalSeats; }
}
