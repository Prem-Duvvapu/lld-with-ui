package com.lld.musicstreaming.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Playlist {
    private String id;
    private String name;
    private String ownerId;
    @Builder.Default
    private List<String> songIds = new ArrayList<>();
    @Builder.Default
    private boolean isPublic = false;
    @Builder.Default
    private List<String> collaboratorIds = new ArrayList<>();
    @Builder.Default
    private Instant createdAt = Instant.now();
}
