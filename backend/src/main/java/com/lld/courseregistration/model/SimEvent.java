package com.lld.courseregistration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** One entry in the isolated simulation sandbox's event log — see CourseRegistrationService's sim* methods. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimEvent {
    private long id;
    private String timestamp;
    private String type;
    private String actor;
    private String message;
    private Map<String, Object> data;
}
