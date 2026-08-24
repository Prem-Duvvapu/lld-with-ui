package com.lld.stackoverflow.strategy;

import com.lld.stackoverflow.model.VoteTargetType;

/**
 * Resolves the {@link ReputationStrategy} for a vote target. Both strategies are
 * stateless, so one shared instance of each is enough — the factory exists so
 * {@code VotingService} never has to switch on {@link VoteTargetType} itself.
 */
public class ReputationStrategyFactory {
    private static final ReputationStrategy QUESTION = new QuestionReputationStrategy();
    private static final ReputationStrategy ANSWER = new AnswerReputationStrategy();

    private ReputationStrategyFactory() {
    }

    public static ReputationStrategy forTarget(VoteTargetType targetType) {
        return switch (targetType) {
            case QUESTION -> QUESTION;
            case ANSWER -> ANSWER;
        };
    }
}
