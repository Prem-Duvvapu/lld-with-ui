package com.lld.featureflag.controller;

import com.lld.featureflag.condition.RuleNodeDto;
import lombok.Data;

/** Request body for {@code POST /sim/rule} — the rule tree plus the simulation step metadata it belongs to. */
@Data
public class SimRuleRequest {
    private int step;
    private String label;
    private RuleNodeDto rule;
}
