package com.lld.blackjack.model;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class SimEvent {
    private long id;
    private String timestamp;
    private String type;
    private String actor;
    private String description;
    private Map<String, Object> details;
}
