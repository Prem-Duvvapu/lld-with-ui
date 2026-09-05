package com.lld.featureflag.condition;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Wire shape for a rule tree, e.g.
 * {@code {"type":"AND","children":[{"type":"COUNTRY","value":"IN"},{"type":"PERCENTAGE","value":"10"}]}}.
 * Jackson deserializes request bodies straight into this — never into {@link Condition} itself,
 * since that is a plain interface with no polymorphic type info for Jackson to resolve.
 * {@link ConditionTreeBuilder#build(RuleNodeDto)} turns a validated tree of these into the real,
 * immutable {@link Condition} composite the service stores.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RuleNodeDto {
    /** COUNTRY | USERID | ATTRIBUTE | PERCENTAGE | AND | OR | NOT (case-insensitive). */
    private String type;
    /** COUNTRY's country code, ATTRIBUTE's value, or PERCENTAGE's integer (as text). */
    private String value;
    /** ATTRIBUTE's key. */
    private String key;
    /** USERID's allow-list. */
    private List<String> values;
    /** AND / OR's children, or NOT's single child. */
    private List<RuleNodeDto> children;
}
