package com.lld.pubsub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/** One entry in the isolated `/sim/*` sandbox's telemetry log. */
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
    private List<TopicSnapshot> topicSnapshots;
}
