package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Match {
    private String id;
    private Team teamA;
    private Team teamB;
    private String venue;
    private LocalDateTime matchDate;
    private MatchFormat format;
    @Builder.Default
    private MatchStatus status = MatchStatus.UPCOMING;

    private String tossWinnerTeamId;
    private TossChoice tossChoice;

    @Builder.Default
    private List<Innings> innings = new ArrayList<>();
    @Builder.Default
    private int currentInningsIndex = -1;

    private MatchResult result;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public Innings currentInnings() {
        if (currentInningsIndex < 0 || currentInningsIndex >= innings.size()) return null;
        return innings.get(currentInningsIndex);
    }

    /** Sum of runs across every completed-or-in-progress innings this team has batted. */
    public int teamTotalRuns(String teamId) {
        return innings.stream()
                .filter(i -> i.getBattingTeamId().equals(teamId))
                .mapToInt(Innings::getTotalRuns)
                .sum();
    }

    public int inningsBattedBy(String teamId) {
        return (int) innings.stream().filter(i -> i.getBattingTeamId().equals(teamId)).count();
    }
}
