package com.lld.stockbroker.model;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

/** One entry in the isolated `/sim/*` sandbox's telemetry event log. */
@Getter
@Builder
public class SimEvent {
    private final long id;
    private final String timestamp;
    private final String type;
    private final String actor;
    private final String description;
    private final Map<String, Object> data;
}
