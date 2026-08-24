package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    private String id;
    private String name;
    private PlayerRole role;
    private BattingStyle battingStyle;
    private BowlingStyle bowlingStyle;
    @Builder.Default
    private CareerStats careerStats = CareerStats.builder().build();
}
