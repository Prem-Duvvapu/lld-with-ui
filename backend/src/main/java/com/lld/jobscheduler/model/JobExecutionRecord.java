package com.lld.jobscheduler.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** One line of a job's execution history: what fired, when, how it went, how long it "took". */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobExecutionRecord {
    private Instant firedAt;
    private JobExecutionOutcome status;
    private long durationMillis;
}
