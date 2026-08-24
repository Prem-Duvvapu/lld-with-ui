package com.lld.musicstreaming.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Song {
    private String id;
    private String title;
    private String artistId;
    private String artistName;
    private String albumId;
    private String albumTitle;
    private Genre genre;
    private int duration; // seconds
    private String audioUrl;
    private int trackNumber;
    @Builder.Default
    private long playCount = 0;
}
