package com.lld.stackoverflow;

import com.lld.stackoverflow.model.Question;
import com.lld.stackoverflow.model.Tag;
import com.lld.stackoverflow.model.User;
import com.lld.stackoverflow.repository.StackOverflowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("StackOverflow Repository Storage & Lookup")
class StackOverflowRepositoryTest {

    private StackOverflowRepository repository;

    @BeforeEach
    void setUp() {
        repository = new StackOverflowRepository();
    }

    @Test
    @DisplayName("Absent lookups return null rather than throwing")
    void absentLookupsReturnNull() {
        assertNull(repository.getQuestion("NO-SUCH-QUESTION"));
        assertNull(repository.getAnswer("NO-SUCH-ANSWER"));
        assertNull(repository.getUser("NO-SUCH-USER"));
    }

    @Test
    @DisplayName("Empty collections are returned as empty lists, never null")
    void emptyCollectionsAreEmptyNotNull() {
        assertNotNull(repository.getAllQuestions());
        assertNotNull(repository.getAllUsers());
        assertNotNull(repository.getAllTags());
        assertTrue(repository.getAllQuestions().isEmpty());
    }

    @Test
    @DisplayName("seed() populates a deterministic, ready-to-use fixture")
    void seedPopulatesFixture() {
        repository.seed();

        assertEquals(3, repository.getAllUsers().size());
        assertEquals(3, repository.getAllQuestions().size());
        assertEquals(8, repository.getAllTags().size());
        assertNotNull(repository.getQuestion("Q-1"));
        assertNotNull(repository.getAnswer("A-1"));
        assertTrue(repository.getAnswer("A-1").isAccepted());

        // Ids generated after seeding must not collide with the seeded fixture.
        assertEquals("Q-4", repository.generateQuestionId());
        assertEquals("A-3", repository.generateAnswerId());
    }

    @Test
    @DisplayName("seed() is idempotent — calling it again wipes and reseeds rather than accumulating")
    void seedIsIdempotent() {
        repository.seed();
        repository.saveQuestion(Question.builder().id("Q-EXTRA").title("t").body("b")
                .authorId("U1").authorName("alice").build());
        assertEquals(4, repository.getAllQuestions().size());

        repository.seed();
        assertEquals(3, repository.getAllQuestions().size());
        assertNull(repository.getQuestion("Q-EXTRA"));
    }

    @Test
    @DisplayName("Tag lookup is case-insensitive")
    void tagExistsIsCaseInsensitive() {
        repository.addTag(Tag.builder().name("java").description("d").build());
        assertTrue(repository.tagExists("java"));
        assertTrue(repository.tagExists("JAVA"));
        assertTrue(repository.tagExists("Java"));
        assertFalse(repository.tagExists("python"));
        assertFalse(repository.tagExists(null));
    }

    @Test
    @DisplayName("Saving an answer both stores it and appends it to its question's answer list")
    void savingAnswerAppendsToQuestion() {
        Question q = Question.builder().id("Q-1").title("t").body("b").authorId("U1").authorName("alice").build();
        repository.saveQuestion(q);

        com.lld.stackoverflow.model.Answer a = com.lld.stackoverflow.model.Answer.builder()
                .id("A-1").body("body").authorId("U2").authorName("bob").questionId("Q-1").build();
        repository.saveAnswer("Q-1", a);

        assertSame(a, repository.getAnswer("A-1"));
        assertEquals(1, repository.getQuestion("Q-1").getAnswers().size());
        assertSame(a, repository.getQuestion("Q-1").getAnswers().get(0));
    }

    @Test
    @DisplayName("Question id generation is atomic under contention — no duplicates across 200 threads")
    void questionIdGenerationIsAtomic() throws InterruptedException {
        int threads = 200;
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    ids.add(repository.generateQuestionId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "id generation did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(threads, ids.size(), "the counter lost updates and handed out duplicate ids");
    }

    @Test
    @DisplayName("Concurrent user writes are all visible — the store is genuinely concurrent")
    void concurrentUserWritesAllLand() throws InterruptedException {
        int count = 300;
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch done = new CountDownLatch(count);

        for (int i = 0; i < count; i++) {
            String id = "U" + i;
            pool.submit(() -> {
                try {
                    repository.saveUser(User.builder().id(id).username(id).email(id + "@example.com").build());
                } finally {
                    done.countDown();
                }
            });
        }

        assertTrue(done.await(10, TimeUnit.SECONDS), "writes did not finish");
        pool.shutdown();

        assertEquals(count, repository.getAllUsers().size(),
                "a HashMap would have lost writes here; the store must be concurrent");
    }

    @Test
    @DisplayName("postLock and userLock hand back the same lock instance for the same id, distinct otherwise")
    void locksAreInterned() {
        assertSame(repository.postLock("Q-1"), repository.postLock("Q-1"));
        assertNotSame(repository.postLock("Q-1"), repository.postLock("A-1"));
        assertSame(repository.userLock("U1"), repository.userLock("U1"));
        assertNotSame(repository.postLock("U1"), repository.userLock("U1"));
    }

    @Test
    @DisplayName("Search filters by keyword, tag and author, and results are newest first")
    void searchFiltersCombine() throws InterruptedException {
        repository.saveQuestion(Question.builder().id("Q-1").title("Java generics")
                .body("body").authorId("U1").authorName("alice").tags(List.of("java")).build());
        Thread.sleep(5);
        repository.saveQuestion(Question.builder().id("Q-2").title("Python typing")
                .body("body").authorId("U2").authorName("bob").tags(List.of("python")).build());

        List<Question> byKeyword = repository.searchQuestions("generics", null, null);
        assertEquals(List.of("Q-1"), byKeyword.stream().map(Question::getId).toList());

        List<Question> byTag = repository.searchQuestions(null, "python", null);
        assertEquals(List.of("Q-2"), byTag.stream().map(Question::getId).toList());

        List<Question> byAuthor = repository.searchQuestions(null, null, "U1");
        assertEquals(List.of("Q-1"), byAuthor.stream().map(Question::getId).toList());

        List<Question> all = repository.getAllQuestions();
        assertEquals("Q-2", all.get(0).getId(), "newest question must sort first");
    }
}
