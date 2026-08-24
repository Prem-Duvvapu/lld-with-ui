package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentaryEntry {
    private String matchId;
    private int inningsIndex;
    private int overNumber;
    private int ballInOver;
    private String text;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
