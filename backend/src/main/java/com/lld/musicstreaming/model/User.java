package com.lld.musicstreaming.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String id;
    private String name;
    private String email;
    @Builder.Default
    private Subscription subscription = Subscription.builder().build();
    @Builder.Default
    private List<String> playlistIds = new ArrayList<>();
    @Builder.Default
    private List<String> likedSongIds = new ArrayList<>();
    @Builder.Default
    private List<ListenEvent> listeningHistory = new ArrayList<>();
    @Builder.Default
    private List<String> downloadedSongIds = new ArrayList<>();
    /** Skips used against the current subscription's hourly skip allowance; reset on plan change. */
    @Builder.Default
    private int skipsUsedThisHour = 0;
}
