package com.lld.featureflag.controller;

import lombok.Data;

import java.util.Map;

/** Request body for {@code POST /sim/evaluate} — a simulated user plus the step it belongs to. */
@Data
public class SimEvaluateRequest {
    private int step;
    private String userLabel;
    private String userId;
    private String country;
    private Map<String, String> attributes;
}
