package com.lld.circuitbreaker.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** What happened when a caller attempted a call through a breaker. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallOutcome {
    private String serviceName;
    private boolean attempted;
    /** Null when {@code attempted} is false — the call was rejected before it could run. */
    private Boolean callSucceeded;
    private CircuitPhase phase;
}
