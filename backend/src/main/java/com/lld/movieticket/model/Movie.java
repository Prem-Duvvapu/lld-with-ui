package com.lld.movieticket.model;

public class Movie {
    private long id;
    private String title;
    private String genre;
    private int duration;
    private double rating;
    private String language;
    private String posterEmoji;

    public Movie() {}

    public Movie(long id, String title, String genre, int duration, double rating, String language, String posterEmoji) {
        this.id = id;
        this.title = title;
        this.genre = genre;
        this.duration = duration;
        this.rating = rating;
        this.language = language;
        this.posterEmoji = posterEmoji;
    }

    public Movie(long id, String title, String genre, int duration, double rating) {
        this(id, title, genre, duration, rating, "English", "🎬");
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }

    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getPosterEmoji() { return posterEmoji; }
    public void setPosterEmoji(String posterEmoji) { this.posterEmoji = posterEmoji; }
}
