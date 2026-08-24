package com.lld.cricinfo.model;

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
public class Team {
    private String id;
    private String name;
    private String shortName;
    @Builder.Default
    private List<Player> players = new ArrayList<>();
    private String captainId;
}
