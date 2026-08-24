package com.lld.stackoverflow;

import com.lld.stackoverflow.model.VoteTargetType;
import com.lld.stackoverflow.model.VoteType;
import com.lld.stackoverflow.strategy.AnswerReputationStrategy;
import com.lld.stackoverflow.strategy.QuestionReputationStrategy;
import com.lld.stackoverflow.strategy.ReputationStrategy;
import com.lld.stackoverflow.strategy.ReputationStrategyFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The reputation math in isolation, no repository or Spring context. Pins the exact
 * numbers so a future edit that quietly changes them is caught here, not in production.
 */
@DisplayName("StackOverflow Reputation Strategies")
class ReputationStrategyTest {

    @Test
    @DisplayName("A question upvote is worth 5, a downvote costs 2")
    void questionStrategyDeltas() {
        ReputationStrategy strategy = new QuestionReputationStrategy();
        assertEquals(5, strategy.deltaForVote(VoteType.UPVOTE));
        assertEquals(-2, strategy.deltaForVote(VoteType.DOWNVOTE));
    }

    @Test
    @DisplayName("An answer upvote is worth 10 — more than a question upvote — a downvote costs 2")
    void answerStrategyDeltas() {
        ReputationStrategy strategy = new AnswerReputationStrategy();
        assertEquals(10, strategy.deltaForVote(VoteType.UPVOTE));
        assertEquals(-2, strategy.deltaForVote(VoteType.DOWNVOTE));
    }

    @Test
    @DisplayName("The factory resolves QUESTION to the question strategy and ANSWER to the answer strategy")
    void factoryResolvesByTargetType() {
        assertInstanceOf(QuestionReputationStrategy.class, ReputationStrategyFactory.forTarget(VoteTargetType.QUESTION));
        assertInstanceOf(AnswerReputationStrategy.class, ReputationStrategyFactory.forTarget(VoteTargetType.ANSWER));
    }

    @Test
    @DisplayName("The factory always returns the same shared instance per target type — the strategies are stateless")
    void factoryReturnsSharedInstances() {
        assertSame(ReputationStrategyFactory.forTarget(VoteTargetType.QUESTION), ReputationStrategyFactory.forTarget(VoteTargetType.QUESTION));
        assertSame(ReputationStrategyFactory.forTarget(VoteTargetType.ANSWER), ReputationStrategyFactory.forTarget(VoteTargetType.ANSWER));
    }
}
