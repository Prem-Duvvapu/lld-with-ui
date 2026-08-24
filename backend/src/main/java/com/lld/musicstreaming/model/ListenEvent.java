package com.lld.musicstreaming.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListenEvent {
    private String songId;
    private Genre genre;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
