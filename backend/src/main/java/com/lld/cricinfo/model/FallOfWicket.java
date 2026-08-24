package com.lld.cricinfo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FallOfWicket {
    private int wicketNumber;
    private String playerOutId;
    private String playerOutName;
    private int teamScoreAtFall;
    private String oversDisplay;
    private WicketType wicketType;
}
