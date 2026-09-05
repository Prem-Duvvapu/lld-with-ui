package com.lld.featureflag.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** The result of evaluating a flag for a {@link UserContext} — always carries an explanation, never silence. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResult {
    private boolean matched;
    private String explanation;
}
