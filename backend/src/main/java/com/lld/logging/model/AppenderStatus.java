package com.lld.logging.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppenderStatus {
    private String name;
    private AppenderType type;
    private boolean enabled;
    private long logCount;
    private long fileSizeBytes;
    private int activeRotations;
    private String destination;
}
