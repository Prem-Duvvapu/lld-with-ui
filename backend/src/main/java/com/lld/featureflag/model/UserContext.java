package com.lld.featureflag.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * The evaluation input: everything a {@link com.lld.featureflag.condition.Condition} tree can
 * key off. {@code attributes} is deliberately an open key/value bag (e.g. {@code plan=premium})
 * rather than a fixed set of fields, so new targeting dimensions never require a model change —
 * only a new {@link com.lld.featureflag.condition.Condition} implementation.
 *
 * <p>Note: this class mixes {@code @Data}/{@code @NoArgsConstructor} with {@code @Builder} but
 * deliberately does <em>not</em> use {@code @Builder.Default} — that annotation moves a field's
 * default out of every constructor and into the builder only, which would silently leave
 * {@code attributes} {@code null} after Jackson deserializes a request body (Jackson uses the
 * no-args constructor, not the builder). Callers that read {@code attributes} null-check instead.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserContext {
    private String userId;
    private String country;
    private Map<String, String> attributes;
}
