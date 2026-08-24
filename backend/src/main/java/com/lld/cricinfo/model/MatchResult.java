package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResult {
    private ResultType resultType;
    private String winningTeamId;
    private String winningTeamName;
    private int margin;
    private String summary;
}
