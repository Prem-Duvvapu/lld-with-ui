package com.lld.stackoverflow.service;

import com.lld.stackoverflow.exception.*;
import com.lld.stackoverflow.model.*;
import com.lld.stackoverflow.repository.StackOverflowRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.time.Instant;

/**
 * Facade for the live module: owns question/answer/comment authoring and
 * delegates every vote, accept and close to {@link VotingService}, which owns
 * the deterministic lock ordering those compound mutations need. See that
 * class's javadoc for the full ordering proof.
 *
 * <p>{@link #postAnswer} and {@link #addComment} also touch two entities (a
 * post's child collection and the author's reputation) so they follow the
 * same post-then-user lock discipline directly against the repository.
 */
@Service
public class StackOverflowService {

    static final int QUESTION_REWARD = 5;
    static final int ANSWER_REWARD = 10;
    static final int COMMENT_REWARD = 2;

    private final StackOverflowRepository repository;
    private final VotingService votingService;

    // Isolated simulation sandbox — separate repository and voting-service instance
    // so the /sim/* demo can never mutate the live module's data.
    private final StackOverflowRepository simRepository = new StackOverflowRepository();
    private final VotingService simVotingService = new VotingService(simRepository);
    private final List<StackOverflowEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventSeq = new AtomicLong(0);

    public StackOverflowService(StackOverflowRepository repository, VotingService votingService) {
        this.repository = repository;
        this.votingService = votingService;
    }

    public List<Question> getQuestions(String keyword, String tag, String userId) {
        if (keyword == null && tag == null && userId == null) {
            return repository.getAllQuestions();
        }
        return repository.searchQuestions(keyword, tag, userId);
    }

    public Question getQuestion(String id) {
        Question q = requireQuestion(id);
        q.incrementView();
        return q;
    }

    public Question postQuestion(String title, String body, String authorId, List<String> tags) {
        User user = requireUser(authorId);
        List<String> tagList = tags == null ? List.of() : tags;
        for (String tag : tagList) {
            if (!repository.tagExists(tag)) {
                throw new TagNotFoundException("Unknown tag: " + tag);
            }
        }

        Question question = Question.builder()
                .id(repository.generateQuestionId())
                .title(title)
                .body(body)
                .authorId(authorId)
                .authorName(user.getUsername())
                .tags(tagList)
                .build();
        repository.saveQuestion(question);

        rewardAuthor(authorId, QUESTION_REWARD);
        return question;
    }

    public Answer postAnswer(String questionId, String body, String authorId) {
        Question q = requireQuestion(questionId);
        User user = requireUser(authorId);

        Answer answer = Answer.builder()
                .id(repository.generateAnswerId())
                .body(body)
                .authorId(authorId)
                .authorName(user.getUsername())
                .questionId(questionId)
                .build();

        // The question's answer list is mutated here and iterated by VotingService's
        // acceptAnswer — both go through the question's post lock so an accept can
        // never observe a torn list.
        ReentrantLock questionLock = repository.postLock(questionId);
        questionLock.lock();
        try {
            if (q.getStatus() == QuestionStatus.CLOSED) {
                throw new QuestionClosedException("Question " + questionId + " is closed to new answers");
            }
            repository.saveAnswer(questionId, answer);
        } finally {
            questionLock.unlock();
        }

        rewardAuthor(authorId, ANSWER_REWARD);
        return answer;
    }

    public Comment addComment(VoteTargetType targetType, String targetId, String body, String authorId) {
        User user = requireUser(authorId);
        Comment comment = Comment.builder()
                .id(repository.generateCommentId())
                .body(body)
                .authorId(authorId)
                .authorName(user.getUsername())
                .build();

        ReentrantLock postLock = repository.postLock(targetId);
        postLock.lock();
        try {
            if (targetType == VoteTargetType.QUESTION) {
                requireQuestion(targetId).addComment(comment);
            } else {
                requireAnswer(targetId).addComment(comment);
            }
        } finally {
            postLock.unlock();
        }

        rewardAuthor(authorId, COMMENT_REWARD);
        return comment;
    }

    private void rewardAuthor(String authorId, int amount) {
        ReentrantLock authorLock = repository.userLock(authorId);
        authorLock.lock();
        try {
            User author = repository.getUser(authorId);
            if (author != null) {
                author.setReputation(author.getReputation() + amount);
            }
        } finally {
            authorLock.unlock();
        }
    }

    public Question voteQuestion(String questionId, String userId, String voteTypeRaw) {
        return votingService.voteQuestion(questionId, userId, parseVoteType(voteTypeRaw));
    }

    public Answer voteAnswer(String answerId, String userId, String voteTypeRaw) {
        return votingService.voteAnswer(answerId, userId, parseVoteType(voteTypeRaw));
    }

    public Question acceptAnswer(String questionId, String answerId, String userId) {
        return votingService.acceptAnswer(questionId, answerId, userId);
    }

    public Question closeQuestion(String questionId, String userId) {
        return votingService.closeQuestion(questionId, userId);
    }

    private VoteType parseVoteType(String raw) {
        if (raw == null) {
            throw new InvalidVoteTypeException("voteType is required");
        }
        try {
            return VoteType.valueOf(raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new InvalidVoteTypeException("Invalid vote type: " + raw + " (expected UPVOTE or DOWNVOTE)");
        }
    }

    public User getUser(String id) {
        return requireUser(id);
    }

    public List<Tag> getTags() {
        return repository.getAllTags();
    }

    public List<User> getUsers() {
        return repository.getAllUsers();
    }

    private Question requireQuestion(String id) {
        Question q = repository.getQuestion(id);
        if (q == null) {
            throw new QuestionNotFoundException("Question not found: " + id);
        }
        return q;
    }

    private Answer requireAnswer(String id) {
        Answer a = repository.getAnswer(id);
        if (a == null) {
            throw new AnswerNotFoundException("Answer not found: " + id);
        }
        return a;
    }

    private User requireUser(String id) {
        User u = repository.getUser(id);
        if (u == null) {
            throw new UserNotFoundException("User not found: " + id);
        }
        return u;
    }

    // ------------------------------------------------------------------
    // Simulation sandbox (/api/stackoverflow/sim/*)
    //
    // A scripted 8-step walkthrough: ask, answer, an upvote that moves score
    // and reputation together, a self-vote rejected by the same guard the
    // live module uses, an accept, a concurrent-vote race that proves the
    // per-answer lock loses no updates, and a close that then refuses a new
    // answer. Runs entirely against simRepository/simVotingService, so it can
    // never touch the data the operational tabs show.
    // ------------------------------------------------------------------

    public void simReset() {
        simRepository.seed();
        simEventLog.clear();
        simEventSeq.set(0);
        addSimEvent("RESET", "System", "Sandbox reset and reseeded", Map.of());
    }

    public Map<String, Object> simState() {
        return Map.of(
                "questions", simRepository.getAllQuestions(),
                "users", simRepository.getAllUsers(),
                "tags", simRepository.getAllTags()
        );
    }

    public Question simAsk() {
        User alice = simRepository.getUser("U1");
        Question question = Question.builder()
                .id(simRepository.generateQuestionId())
                .title("How does the JVM garbage collector work?")
                .body("I keep hearing about G1 vs ZGC but don't understand when each kicks in.")
                .authorId("U1")
                .authorName(alice.getUsername())
                .tags(List.of("java"))
                .build();
        simRepository.saveQuestion(question);
        rewardSimAuthor("U1", QUESTION_REWARD);
        addSimEvent("ASK", alice.getUsername(), alice.getUsername() + " asked \"" + question.getTitle() + "\"",
                Map.of("questionId", question.getId()));
        return question;
    }

    public Answer simAnswer(String questionId) {
        Question q = simRepository.getQuestion(questionId);
        if (q == null) {
            throw new QuestionNotFoundException("Question not found: " + questionId);
        }
        User bob = simRepository.getUser("U2");
        Answer answer = Answer.builder()
                .id(simRepository.generateAnswerId())
                .body("G1 targets predictable pause times; ZGC nearly eliminates them by doing almost everything concurrently.")
                .authorId("U2")
                .authorName(bob.getUsername())
                .questionId(questionId)
                .build();

        ReentrantLock questionLock = simRepository.postLock(questionId);
        questionLock.lock();
        try {
            simRepository.saveAnswer(questionId, answer);
        } finally {
            questionLock.unlock();
        }

        rewardSimAuthor("U2", ANSWER_REWARD);
        addSimEvent("ANSWER", bob.getUsername(), bob.getUsername() + " answered question " + questionId,
                Map.of("questionId", questionId, "answerId", answer.getId()));
        return answer;
    }

    public Answer simVoteAnswer(String answerId, String voterId, String voteTypeRaw) {
        VoteType voteType = parseVoteType(voteTypeRaw);
        String voterName = displayName(simRepository, voterId);
        try {
            Answer a = simVotingService.voteAnswer(answerId, voterId, voteType);
            addSimEvent("VOTE", voterName, voterName + " " + voteType.name().toLowerCase(Locale.ROOT) + "d answer " + answerId,
                    Map.of("answerId", answerId, "score", a.getScore(), "voteType", voteType.name()));
            return a;
        } catch (StackOverflowException rejected) {
            addSimEvent("REJECTED", voterName, rejected.getMessage(), Map.of("answerId", answerId));
            throw rejected;
        }
    }

    public Question simAccept(String questionId, String answerId, String requesterId) {
        String requesterName = displayName(simRepository, requesterId);
        try {
            Question q = simVotingService.acceptAnswer(questionId, answerId, requesterId);
            addSimEvent("ACCEPT", requesterName,
                    "Answer " + answerId + " accepted — question " + questionId + " is now " + q.getStatus(),
                    Map.of("questionId", questionId, "answerId", answerId, "status", q.getStatus().name()));
            return q;
        } catch (StackOverflowException rejected) {
            addSimEvent("REJECTED", requesterName, rejected.getMessage(),
                    Map.of("questionId", questionId, "answerId", answerId));
            throw rejected;
        }
    }

    public Question simClose(String questionId, String requesterId) {
        String requesterName = displayName(simRepository, requesterId);
        try {
            Question q = simVotingService.closeQuestion(questionId, requesterId);
            addSimEvent("CLOSE", requesterName, "Question " + questionId + " closed", Map.of("questionId", questionId));
            return q;
        } catch (StackOverflowException rejected) {
            addSimEvent("REJECTED", requesterName, rejected.getMessage(), Map.of("questionId", questionId));
            throw rejected;
        }
    }

    /**
     * {@code voters} distinct, freshly-registered users upvote {@code answerId} at the
     * same instant via a {@link CountDownLatch}. Every voter is a genuine first-time
     * voter, so the invariant this proves is simple and strong: the answer's final
     * score must equal exactly the number of applied votes — the per-answer lock in
     * {@code VotingService} must lose none of them despite the concurrent writes to
     * the same score field and the same author's reputation.
     */
    public Map<String, Object> simRace(String answerId, int voters) {
        Answer answer = simRepository.getAnswer(answerId);
        if (answer == null) {
            throw new AnswerNotFoundException("Answer not found: " + answerId);
        }
        int n = Math.max(2, Math.min(voters, 10));

        List<String> voterIds = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            String id = "SIM-VOTER-" + i;
            simRepository.saveUser(User.builder().id(id).username("Voter-" + i).email(id + "@sim.local").build());
            voterIds.add(id);
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        List<Map<String, Object>> results = new CopyOnWriteArrayList<>();

        try {
            for (String voterId : voterIds) {
                pool.submit(() -> {
                    try {
                        start.await();
                        Answer voted = simVotingService.voteAnswer(answerId, voterId, VoteType.UPVOTE);
                        results.add(Map.of("voter", voterId, "outcome", "APPLIED", "scoreAfter", voted.getScore()));
                    } catch (StackOverflowException rejected) {
                        results.add(Map.of("voter", voterId, "outcome", "REJECTED", "reason", rejected.getMessage()));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }
            start.countDown();
            if (!done.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Race did not settle within 5 seconds");
            }
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Race was interrupted");
        } finally {
            pool.shutdown();
        }

        results.sort(Comparator.comparing(r -> String.valueOf(r.get("voter"))));
        Answer finalAnswer = simRepository.getAnswer(answerId);
        long applied = results.stream().filter(r -> "APPLIED".equals(r.get("outcome"))).count();

        addSimEvent("RACE", "System",
                n + " voters upvoted " + answerId + " concurrently — " + applied + " applied, final score " + finalAnswer.getScore(),
                Map.of("answerId", answerId, "attempts", n, "applied", applied, "finalScore", finalAnswer.getScore()));

        return Map.of(
                "answerId", answerId,
                "attempts", n,
                "applied", applied,
                "finalScore", finalAnswer.getScore(),
                "results", results
        );
    }

    public List<StackOverflowEvent> simEvents() {
        return new ArrayList<>(simEventLog);
    }

    private void addSimEvent(String type, String actor, String message, Map<String, ?> detail) {
        long id = simEventSeq.incrementAndGet();
        @SuppressWarnings("unchecked")
        Map<String, Object> typedDetail = (Map<String, Object>) detail;
        simEventLog.add(new StackOverflowEvent(id, type, actor, message, typedDetail, Instant.now()));
    }

    private void rewardSimAuthor(String authorId, int amount) {
        ReentrantLock authorLock = simRepository.userLock(authorId);
        authorLock.lock();
        try {
            User author = simRepository.getUser(authorId);
            if (author != null) {
                author.setReputation(author.getReputation() + amount);
            }
        } finally {
            authorLock.unlock();
        }
    }

    private String displayName(StackOverflowRepository repo, String userId) {
        User u = repo.getUser(userId);
        return u != null ? u.getUsername() : userId;
    }
}
