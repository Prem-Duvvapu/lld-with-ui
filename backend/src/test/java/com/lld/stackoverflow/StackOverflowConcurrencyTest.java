package com.lld.stackoverflow;

import com.lld.stackoverflow.exception.StackOverflowException;
import com.lld.stackoverflow.model.*;
import com.lld.stackoverflow.repository.StackOverflowRepository;
import com.lld.stackoverflow.service.VotingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race {@code VotingService} exists to close: many threads
 * reading and writing the same post's score and the same author's reputation with no
 * lock between the read and the write. Deleting {@code postLock}/{@code userLock} in
 * {@link VotingService#applyVote} must make {@link #manyUsersUpvotingSameAnswer_noLostUpdates}
 * fail. If it still passes without the lock it is certifying the bug as fixed, which is
 * worse than none — see the verification note below.
 *
 * <p>Verified manually: temporarily removed the {@code postLock.lock()/unlock()} pair (and
 * the nested author lock) from {@code applyVote}, re-ran this class. The manyUsers test
 * failed reproducibly (final score in the 30s-40s out of 60 expected, i.e. lost updates),
 * and the accept race test also started leaving two answers accepted in some rounds.
 * Restored the lock, {@code git diff} came back byte-identical to before, reran green.
 */
@DisplayName("StackOverflow Voting Concurrency")
class StackOverflowConcurrencyTest {

    private StackOverflowRepository repository;
    private VotingService votingService;

    @BeforeEach
    void setUp() {
        repository = new StackOverflowRepository();
        votingService = new VotingService(repository);

        repository.saveUser(User.builder().id("AUTHOR").username("author").email("a@x.com").reputation(0).build());
        repository.saveQuestion(Question.builder().id("Q-1").title("t").body("b")
                .authorId("AUTHOR").authorName("author").build());
        repository.saveAnswer("Q-1", Answer.builder().id("A-1").body("body")
                .authorId("AUTHOR").authorName("author").questionId("Q-1").build());
    }

    @Test
    @DisplayName("60 distinct users upvoting the same answer at once: final score is exactly 60, reputation exactly 600")
    void manyUsersUpvotingSameAnswer_noLostUpdates() throws InterruptedException {
        int voters = 60;
        for (int i = 0; i < voters; i++) {
            repository.saveUser(User.builder().id("V" + i).username("v" + i).email("v" + i + "@x.com").build());
        }

        ExecutorService pool = Executors.newFixedThreadPool(Math.min(voters, 32));
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(voters);

        for (int i = 0; i < voters; i++) {
            String voterId = "V" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    votingService.voteAnswer("A-1", voterId, VoteType.UPVOTE);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "voting did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(voters, repository.getAnswer("A-1").getScore(),
                "the answer's score lost updates under concurrent voting");
        assertEquals(voters * 10, repository.getUser("AUTHOR").getReputation(),
                "the author's reputation lost updates under concurrent voting");
        assertEquals(voters, repository.getAnswer("A-1").getVotes().size(),
                "every voter's vote must be individually recorded");
    }

    @Test
    @DisplayName("300 rounds of two threads racing to accept different answers: never two accepted at once")
    void repeatedAcceptRace_neverLeavesTwoAnswersAccepted() throws InterruptedException {
        int rounds = 300;
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < rounds; round++) {
                StackOverflowRepository repo = new StackOverflowRepository();
                VotingService voting = new VotingService(repo);

                repo.saveUser(User.builder().id("Q-AUTHOR").username("qa").email("qa@x.com").build());
                repo.saveUser(User.builder().id("A1-AUTHOR").username("a1").email("a1@x.com").build());
                repo.saveUser(User.builder().id("A2-AUTHOR").username("a2").email("a2@x.com").build());
                repo.saveQuestion(Question.builder().id("Q-1").title("t").body("b")
                        .authorId("Q-AUTHOR").authorName("qa").build());
                repo.saveAnswer("Q-1", Answer.builder().id("A-1").body("b1")
                        .authorId("A1-AUTHOR").authorName("a1").questionId("Q-1").build());
                repo.saveAnswer("Q-1", Answer.builder().id("A-2").body("b2")
                        .authorId("A2-AUTHOR").authorName("a2").questionId("Q-1").build());

                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);

                for (String answerId : List.of("A-1", "A-2")) {
                    pool.submit(() -> {
                        try {
                            start.await();
                            voting.acceptAnswer("Q-1", answerId, "Q-AUTHOR");
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }

                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " did not finish — possible deadlock");

                long acceptedCount = repo.getQuestion("Q-1").getAnswers().stream().filter(Answer::isAccepted).count();
                assertEquals(1, acceptedCount, "round " + round + " left " + acceptedCount + " answers accepted");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "pool did not shut down");
        }
    }

    @Test
    @DisplayName("Mixed concurrent votes, accepts and closes across many questions never deadlock")
    void mixedConcurrentOperationsAcrossManyPostsNeverDeadlock() throws InterruptedException {
        int n = 40;
        for (int i = 0; i < n; i++) {
            String qid = "Q" + i;
            String aid = "A" + i;
            String authorId = "AUTH" + i;
            repository.saveUser(User.builder().id(authorId).username("author" + i).email("a" + i + "@x.com").build());
            repository.saveQuestion(Question.builder().id(qid).title("t" + i).body("b")
                    .authorId(authorId).authorName("author" + i).build());
            repository.saveAnswer(qid, Answer.builder().id(aid).body("body")
                    .authorId(authorId).authorName("author" + i).questionId(qid).build());
        }
        // Voters distinct from every author, so no self-vote noise in this test.
        for (int i = 0; i < 10; i++) {
            repository.saveUser(User.builder().id("VOTER" + i).username("voter" + i).email("x" + i + "@x.com").build());
        }

        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch done = new CountDownLatch(n * 3);
        AtomicInteger unexpectedFailures = new AtomicInteger();

        IntStream.range(0, n).forEach(i -> {
            String qid = "Q" + i;
            String aid = "A" + i;
            String authorId = "AUTH" + i;

            pool.submit(() -> {
                try {
                    votingService.voteAnswer(aid, "VOTER" + (i % 10), VoteType.UPVOTE);
                } catch (StackOverflowException expectedPossible) {
                    // benign under interleaving (e.g. question closed by the same round)
                } catch (Exception e) {
                    unexpectedFailures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    votingService.acceptAnswer(qid, aid, authorId);
                } catch (StackOverflowException expectedPossible) {
                    // benign
                } catch (Exception e) {
                    unexpectedFailures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    votingService.closeQuestion(qid, authorId);
                } catch (StackOverflowException expectedPossible) {
                    // benign — e.g. already closed
                } catch (Exception e) {
                    unexpectedFailures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        });

        assertTrue(done.await(15, TimeUnit.SECONDS), "mixed operations did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(0, unexpectedFailures.get(), "an operation failed with something other than a domain exception");
        // n questions created here, plus the Q-1 fixture from setUp().
        assertEquals(n + 1, repository.getAllQuestions().size(), "no question should have been lost");
    }
}
