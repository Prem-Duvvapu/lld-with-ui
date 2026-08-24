package com.lld.stackoverflow;

import com.lld.stackoverflow.exception.*;
import com.lld.stackoverflow.model.*;
import com.lld.stackoverflow.repository.StackOverflowRepository;
import com.lld.stackoverflow.service.StackOverflowService;
import com.lld.stackoverflow.service.VotingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("StackOverflow Facade Service")
class StackOverflowServiceTest {

    private StackOverflowRepository repository;
    private StackOverflowService service;

    @BeforeEach
    void setUp() {
        repository = new StackOverflowRepository();
        repository.seed();
        service = new StackOverflowService(repository, new VotingService(repository));
    }

    @Test
    @DisplayName("Posting a question stores it, tags it and rewards the author 5 reputation")
    void postQuestionHappyPath() {
        int before = repository.getUser("U3").getReputation();
        Question q = service.postQuestion("Why is my build slow?", "Maven takes 3 minutes.", "U3", List.of("java"));

        assertNotNull(q.getId());
        assertEquals("charlie", q.getAuthorName());
        assertEquals(QuestionStatus.OPEN, q.getStatus());
        assertSame(q, repository.getQuestion(q.getId()));
        assertEquals(before + 5, repository.getUser("U3").getReputation());
    }

    @Test
    @DisplayName("Posting a question with an unregistered tag is rejected")
    void postQuestionWithUnknownTagRejected() {
        assertThrows(TagNotFoundException.class,
                () -> service.postQuestion("t", "b", "U1", List.of("cobol")));
    }

    @Test
    @DisplayName("Posting a question as an unknown user is rejected")
    void postQuestionAsUnknownUserRejected() {
        assertThrows(UserNotFoundException.class, () -> service.postQuestion("t", "b", "GHOST", List.of("java")));
    }

    @Test
    @DisplayName("Posting an answer appends it to the question and rewards the author 10 reputation")
    void postAnswerHappyPath() {
        int before = repository.getUser("U3").getReputation();
        Answer a = service.postAnswer("Q-2", "Try the offline profile.", "U3");

        assertEquals("Q-2", a.getQuestionId());
        assertTrue(repository.getQuestion("Q-2").getAnswers().stream().anyMatch(x -> x.getId().equals(a.getId())));
        assertEquals(before + 10, repository.getUser("U3").getReputation());
    }

    @Test
    @DisplayName("Posting an answer to an unknown question is rejected")
    void postAnswerToUnknownQuestionRejected() {
        assertThrows(QuestionNotFoundException.class, () -> service.postAnswer("Q-GHOST", "b", "U1"));
    }

    @Test
    @DisplayName("A closed question refuses new answers")
    void closedQuestionRefusesNewAnswers() {
        service.closeQuestion("Q-2", "U2"); // U2/bob authored Q-2 in the seed fixture
        assertThrows(QuestionClosedException.class, () -> service.postAnswer("Q-2", "too late", "U1"));
    }

    @Test
    @DisplayName("Adding a comment on a question rewards the author 2 reputation")
    void addCommentOnQuestion() {
        int before = repository.getUser("U3").getReputation();
        Comment c = service.addComment(VoteTargetType.QUESTION, "Q-1", "Nice question!", "U3");

        assertTrue(repository.getQuestion("Q-1").getComments().stream().anyMatch(x -> x.getId().equals(c.getId())));
        assertEquals(before + 2, repository.getUser("U3").getReputation());
    }

    @Test
    @DisplayName("Adding a comment on an answer rewards the author 2 reputation")
    void addCommentOnAnswer() {
        int before = repository.getUser("U3").getReputation();
        Comment c = service.addComment(VoteTargetType.ANSWER, "A-1", "Great answer!", "U3");

        assertTrue(repository.getAnswer("A-1").getComments().stream().anyMatch(x -> x.getId().equals(c.getId())));
        assertEquals(before + 2, repository.getUser("U3").getReputation());
    }

    @Test
    @DisplayName("Voting through the facade parses the vote-type string and rejects garbage")
    void voteTypeParsing() {
        Question q = service.voteQuestion("Q-2", "U1", "upvote");
        assertEquals(9, q.getScore());

        assertThrows(InvalidVoteTypeException.class, () -> service.voteAnswer("A-1", "U3", "SIDEWAYS"));
        assertThrows(InvalidVoteTypeException.class, () -> service.voteAnswer("A-1", "U3", null));
    }

    @Test
    @DisplayName("Getting a question increments its view count")
    void gettingQuestionIncrementsViews() {
        int before = repository.getQuestion("Q-1").getViewCount();
        service.getQuestion("Q-1");
        service.getQuestion("Q-1");
        assertEquals(before + 2, repository.getQuestion("Q-1").getViewCount());
    }

    @Test
    @DisplayName("Getting an unknown question is rejected")
    void gettingUnknownQuestionRejected() {
        assertThrows(QuestionNotFoundException.class, () -> service.getQuestion("Q-GHOST"));
    }

    @Test
    @DisplayName("getQuestions with no filters returns everything, newest first")
    void getQuestionsNoFilters() {
        List<Question> all = service.getQuestions(null, null, null);
        assertEquals(3, all.size());
    }

    @Test
    @DisplayName("getQuestions filters by keyword")
    void getQuestionsByKeyword() {
        List<Question> found = service.getQuestions("Strategy", null, null);
        assertEquals(1, found.size());
        assertEquals("Q-1", found.get(0).getId());
    }

    @Test
    @DisplayName("Tags and users are exposed read-only")
    void tagsAndUsersExposed() {
        assertEquals(8, service.getTags().size());
        assertEquals(3, service.getUsers().size());
        assertEquals("alice", service.getUser("U1").getUsername());
    }

    @Test
    @DisplayName("Getting an unknown user is rejected")
    void gettingUnknownUserRejected() {
        assertThrows(UserNotFoundException.class, () -> service.getUser("GHOST"));
    }
}
