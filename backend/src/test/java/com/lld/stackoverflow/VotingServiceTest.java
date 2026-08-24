package com.lld.stackoverflow;

import com.lld.stackoverflow.exception.*;
import com.lld.stackoverflow.model.*;
import com.lld.stackoverflow.repository.StackOverflowRepository;
import com.lld.stackoverflow.service.VotingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pins the exact voting and reputation rules: upvote/downvote deltas as they reach a
 * post's author, self-vote rejection, vote-change idempotency, and the one-time
 * accepted-answer bonus. This is also where the deterministic question -> answer ->
 * user lock ordering documented on {@link VotingService} is exercised sequentially;
 * {@code StackOverflowConcurrencyTest} exercises it under real contention.
 */
@DisplayName("StackOverflow Voting & Reputation Rules")
class VotingServiceTest {

    private StackOverflowRepository repository;
    private VotingService votingService;

    @BeforeEach
    void setUp() {
        repository = new StackOverflowRepository();
        votingService = new VotingService(repository);

        repository.saveUser(User.builder().id("U1").username("alice").email("a@x.com").reputation(100).build());
        repository.saveUser(User.builder().id("U2").username("bob").email("b@x.com").reputation(100).build());
        repository.saveUser(User.builder().id("U3").username("carol").email("c@x.com").reputation(100).build());

        repository.saveQuestion(Question.builder().id("Q-1").title("t").body("b")
                .authorId("U1").authorName("alice").build());
        repository.saveAnswer("Q-1", Answer.builder().id("A-1").body("body")
                .authorId("U2").authorName("bob").questionId("Q-1").build());
    }

    @Test
    @DisplayName("Upvoting a question raises its score by 1 and its author's reputation by 5")
    void questionUpvoteDeltas() {
        Question q = votingService.voteQuestion("Q-1", "U2", VoteType.UPVOTE);
        assertEquals(1, q.getScore());
        assertEquals(105, repository.getUser("U1").getReputation());
    }

    @Test
    @DisplayName("Downvoting a question drops its score by 1 and its author's reputation by 2")
    void questionDownvoteDeltas() {
        Question q = votingService.voteQuestion("Q-1", "U2", VoteType.DOWNVOTE);
        assertEquals(-1, q.getScore());
        assertEquals(98, repository.getUser("U1").getReputation());
    }

    @Test
    @DisplayName("Upvoting an answer raises its score by 1 and its author's reputation by 10")
    void answerUpvoteDeltas() {
        Answer a = votingService.voteAnswer("A-1", "U1", VoteType.UPVOTE);
        assertEquals(1, a.getScore());
        assertEquals(110, repository.getUser("U2").getReputation());
    }

    @Test
    @DisplayName("Downvoting an answer drops its score by 1 and its author's reputation by 2")
    void answerDownvoteDeltas() {
        Answer a = votingService.voteAnswer("A-1", "U1", VoteType.DOWNVOTE);
        assertEquals(-1, a.getScore());
        assertEquals(98, repository.getUser("U2").getReputation());
    }

    @Test
    @DisplayName("A user cannot upvote their own question")
    void selfVoteOnOwnQuestionRejected() {
        assertThrows(SelfVoteException.class, () -> votingService.voteQuestion("Q-1", "U1", VoteType.UPVOTE));
        assertEquals(0, repository.getQuestion("Q-1").getScore(), "a rejected vote must not touch the score");
        assertEquals(100, repository.getUser("U1").getReputation());
    }

    @Test
    @DisplayName("A user cannot vote on their own answer")
    void selfVoteOnOwnAnswerRejected() {
        assertThrows(SelfVoteException.class, () -> votingService.voteAnswer("A-1", "U2", VoteType.UPVOTE));
        assertEquals(0, repository.getAnswer("A-1").getScore());
        assertEquals(100, repository.getUser("U2").getReputation());
    }

    @Test
    @DisplayName("Repeating the identical vote is a no-op — reputation is not double-counted")
    void repeatingIdenticalVoteIsIdempotent() {
        votingService.voteAnswer("A-1", "U1", VoteType.UPVOTE);
        Answer a = votingService.voteAnswer("A-1", "U1", VoteType.UPVOTE);

        assertEquals(1, a.getScore(), "score must not double-count the repeat");
        assertEquals(110, repository.getUser("U2").getReputation(), "reputation must not double-count the repeat");
    }

    @Test
    @DisplayName("Changing a vote from upvote to downvote applies only the net delta, once")
    void changingVoteAppliesOnlyTheDelta() {
        votingService.voteAnswer("A-1", "U1", VoteType.UPVOTE);
        Answer a = votingService.voteAnswer("A-1", "U1", VoteType.DOWNVOTE);

        // score: +1 (upvote) then flips to -1 (downvote) = net -2 from the change, -1 overall
        assertEquals(-1, a.getScore());
        // reputation: 100 base, +10 from the upvote (-> 110), then the change to downvote applies
        // net delta (-2) - (+10) = -12, so 110 - 12 = 98 overall.
        assertEquals(98, repository.getUser("U2").getReputation());
    }

    @Test
    @DisplayName("Changing a vote back to its original value returns score and reputation to their prior values")
    void changingVoteBackIsARoundTrip() {
        votingService.voteAnswer("A-1", "U1", VoteType.UPVOTE);
        votingService.voteAnswer("A-1", "U1", VoteType.DOWNVOTE);
        Answer a = votingService.voteAnswer("A-1", "U1", VoteType.UPVOTE);

        assertEquals(1, a.getScore());
        assertEquals(110, repository.getUser("U2").getReputation());
    }

    @Test
    @DisplayName("Voting on an unknown question or answer is rejected, not silently ignored")
    void votingOnUnknownPostIsRejected() {
        assertThrows(QuestionNotFoundException.class, () -> votingService.voteQuestion("Q-GHOST", "U2", VoteType.UPVOTE));
        assertThrows(AnswerNotFoundException.class, () -> votingService.voteAnswer("A-GHOST", "U1", VoteType.UPVOTE));
    }

    @Test
    @DisplayName("Voting as an unregistered user is rejected")
    void votingAsUnknownUserIsRejected() {
        assertThrows(UserNotFoundException.class, () -> votingService.voteAnswer("A-1", "GHOST", VoteType.UPVOTE));
    }

    @Test
    @DisplayName("Accepting an answer awards a one-time 15-point bonus and marks the question ANSWERED")
    void acceptingAnswerAwardsBonusOnce() {
        Question q = votingService.acceptAnswer("Q-1", "A-1", "U1");
        assertTrue(repository.getAnswer("A-1").isAccepted());
        assertEquals(QuestionStatus.ANSWERED, q.getStatus());
        assertEquals(115, repository.getUser("U2").getReputation());
    }

    @Test
    @DisplayName("Accepting the same answer twice does not re-award the bonus — this is the bug the prior AcceptedAnswerReputationStrategy had")
    void reacceptingSameAnswerDoesNotDoubleAward() {
        votingService.acceptAnswer("Q-1", "A-1", "U1");
        votingService.acceptAnswer("Q-1", "A-1", "U1");
        assertEquals(115, repository.getUser("U2").getReputation(), "the bonus must be awarded exactly once");
    }

    @Test
    @DisplayName("Voting on an already-accepted answer applies the normal answer strategy, not a flat re-award of the bonus")
    void votingOnAcceptedAnswerUsesNormalStrategy() {
        votingService.acceptAnswer("Q-1", "A-1", "U1");
        int afterAccept = repository.getUser("U2").getReputation();

        votingService.voteAnswer("A-1", "U1", VoteType.UPVOTE);
        assertEquals(afterAccept + 10, repository.getUser("U2").getReputation(),
                "a vote on an accepted answer must apply the normal +10 upvote delta, not another +15 bonus");
    }

    @Test
    @DisplayName("Accepting a different answer moves the accepted flag without re-scoring the previous one")
    void acceptingReplacesThePreviousAcceptedAnswer() {
        repository.saveAnswer("Q-1", Answer.builder().id("A-2").body("second")
                .authorId("U3").authorName("carol").questionId("Q-1").build());

        votingService.acceptAnswer("Q-1", "A-1", "U1");
        votingService.acceptAnswer("Q-1", "A-2", "U1");

        assertFalse(repository.getAnswer("A-1").isAccepted());
        assertTrue(repository.getAnswer("A-2").isAccepted());
        assertEquals(115, repository.getUser("U2").getReputation(), "bob keeps the bonus he already earned");
        assertEquals(115, repository.getUser("U3").getReputation(), "carol earns her own bonus");
    }

    @Test
    @DisplayName("Only the question's author may accept an answer")
    void onlyAuthorMayAccept() {
        assertThrows(NotQuestionAuthorException.class, () -> votingService.acceptAnswer("Q-1", "A-1", "U2"));
    }

    @Test
    @DisplayName("Accepting an answer that does not belong to the question is rejected")
    void acceptingAnswerFromAnotherQuestionIsRejected() {
        repository.saveQuestion(Question.builder().id("Q-2").title("t2").body("b2")
                .authorId("U3").authorName("carol").build());
        assertThrows(AnswerNotFoundException.class, () -> votingService.acceptAnswer("Q-2", "A-1", "U3"));
    }

    @Test
    @DisplayName("Only the question's author may close it, and closing twice is rejected")
    void closeQuestionRules() {
        assertThrows(NotQuestionAuthorException.class, () -> votingService.closeQuestion("Q-1", "U2"));

        Question q = votingService.closeQuestion("Q-1", "U1");
        assertEquals(QuestionStatus.CLOSED, q.getStatus());

        assertThrows(InvalidQuestionTransitionException.class, () -> votingService.closeQuestion("Q-1", "U1"));
    }

    @Test
    @DisplayName("A closed question refuses to accept an answer")
    void closedQuestionRefusesAccept() {
        votingService.closeQuestion("Q-1", "U1");
        assertThrows(QuestionClosedException.class, () -> votingService.acceptAnswer("Q-1", "A-1", "U1"));
    }
}
