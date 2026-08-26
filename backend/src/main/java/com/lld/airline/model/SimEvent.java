package com.lld.airline.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimEvent {
    private long id;
    private String timestamp;
    private String type;
    private String actor;
    private String description;
    private Map<String, Object> data;
}
