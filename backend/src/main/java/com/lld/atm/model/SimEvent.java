package com.lld.atm.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** One entry in the isolated `/sim/*` sandbox's telemetry log, matching {@code pubsub.model.SimEvent}. */
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
    private Map<String, Object> details;
}
