package com.lld.movieticket.model;

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

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public long getMovieId() { return movieId; }
    public void setMovieId(long movieId) { this.movieId = movieId; }

    public long getTheaterId() { return theaterId; }
    public void setTheaterId(long theaterId) { this.theaterId = theaterId; }

    public long getScreenId() { return screenId; }
    public void setScreenId(long screenId) { this.screenId = screenId; }

    public String getScreen() { return screen; }
    public void setScreen(String screen) { this.screen = screen; }

    public String getShowTime() { return showTime; }
    public void setShowTime(String showTime) { this.showTime = showTime; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public int getAvailableSeats() { return availableSeats; }
    public void setAvailableSeats(int availableSeats) { this.availableSeats = availableSeats; }

    public int getTotalSeats() { return totalSeats; }
    public void setTotalSeats(int totalSeats) { this.totalSeats = totalSeats; }
}
