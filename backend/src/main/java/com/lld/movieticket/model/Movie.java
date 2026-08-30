package com.lld.movieticket.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
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
}
