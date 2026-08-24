package com.lld.musicstreaming.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Album {
    private String id;
    private String title;
    private String artistId;
    private String artistName;
    private int releaseYear;
    private String coverArt;
}
