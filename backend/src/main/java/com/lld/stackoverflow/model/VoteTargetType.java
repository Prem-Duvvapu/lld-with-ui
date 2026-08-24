package com.lld.stackoverflow.model;

/**
 * Distinguishes which kind of post a vote or comment targets. Drives which
 * {@link com.lld.stackoverflow.strategy.ReputationStrategy} the
 * {@code ReputationStrategyFactory} resolves, and replaces the
 * case-insensitive "question"/"answer" string literals the endpoints used to
 * pass around.
 */
public enum VoteTargetType {
    QUESTION,
    ANSWER
}
