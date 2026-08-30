package com.lld.linkedin;

import com.lld.linkedin.enums.ConnectionStatus;
import com.lld.linkedin.enums.EmploymentType;
import com.lld.linkedin.model.Connection;
import com.lld.linkedin.model.JobPosting;
import com.lld.linkedin.model.Message;
import com.lld.linkedin.model.User;
import com.lld.linkedin.repository.LinkedInRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository-flavour tests for {@link LinkedInRepository}, isolated from {@code LinkedInService}'s
 * locking/notification/search logic — pure storage behaviour.
 */
public class LinkedInRepositoryTest {
    private LinkedInRepository repository;

    @BeforeEach
    public void setUp() {
        repository = new LinkedInRepository();
    }

    @Test
    public void startsEmpty() {
        assertTrue(repository.getAllUsers().isEmpty());
        assertTrue(repository.getAllJobs().isEmpty());
        assertTrue(repository.getAllConnections().isEmpty());
    }

    @Test
    public void savingAUserAlsoInitializesTheirConnectionIdSet() {
        User user = new User("user-1", "Alice", "alice@example.com", "hash");
        repository.saveUser(user);

        assertSame(user, repository.findUserById("user-1"));
        assertTrue(repository.getUserConnectionIds("user-1").isEmpty(), "a freshly-saved user starts with an empty (not null) connection set");
        assertEquals(1, repository.getAllUsers().size());
    }

    @Test
    public void claimEmailIsAtomicAndReportsTheExistingOwner() {
        assertNull(repository.claimEmail("alice@example.com", "user-1"), "first claim of an email succeeds (no existing owner)");
        assertEquals("user-1", repository.claimEmail("alice@example.com", "user-2"), "a second claim must report who already owns it, not silently overwrite");
        assertEquals("user-1", repository.findUserIdByEmail("alice@example.com"), "the first claimant must still own the email");
    }

    @Test
    public void connectionsAreFoundByIdAndTrackedPerPair() {
        Connection conn = new Connection("user-1", "user-2");
        repository.saveConnection(conn);
        String pairKey = "user-1#user-2";
        repository.setActiveConnectionPair(pairKey, conn.getId());
        repository.addUserConnectionId("user-1", conn.getId());
        repository.addUserConnectionId("user-2", conn.getId());

        assertSame(conn, repository.findConnectionById(conn.getId()));
        assertEquals(conn.getId(), repository.getActiveConnectionId(pairKey));
        assertTrue(repository.getUserConnectionIds("user-1").contains(conn.getId()));
        assertTrue(repository.getUserConnectionIds("user-2").contains(conn.getId()));
        assertEquals(1, repository.getAllConnections().size());

        repository.removeActiveConnectionPair(pairKey);
        assertNull(repository.getActiveConnectionId(pairKey), "removing the active pair must not remove the Connection record itself");
        assertNotNull(repository.findConnectionById(conn.getId()));
    }

    @Test
    public void messagesAccumulateInOrderUnderTheirConversationKey() {
        Message m1 = new Message("user-1", "user-2", "hello");
        Message m2 = new Message("user-2", "user-1", "hi back");
        repository.addMessage(m1.getConversationKey(), m1);
        repository.addMessage(m2.getConversationKey(), m2);

        List<Message> convo = repository.getConversation(m1.getConversationKey());
        assertEquals(List.of(m1, m2), convo);
    }

    @Test
    public void unknownConversationReturnsEmptyListNotNull() {
        assertTrue(repository.getConversation("nobody#nowhere").isEmpty());
    }

    @Test
    public void savingAJobAlsoInitializesItsApplicantSet() {
        JobPosting job = new JobPosting("job-1", "user-1", "Engineer", "Acme", "Remote", "desc", EmploymentType.FULL_TIME, Set.of("java"));
        repository.saveJob(job);

        assertSame(job, repository.findJobById("job-1"));
        assertEquals(1, repository.getAllJobs().size());
    }

    @Test
    public void addJobApplicantIsAtomicPerApplicant() {
        JobPosting job = new JobPosting("job-1", "user-1", "Engineer", "Acme", "Remote", "desc", EmploymentType.FULL_TIME, null);
        repository.saveJob(job);

        assertTrue(repository.addJobApplicant("job-1", "user-2"), "first application for this user succeeds");
        assertFalse(repository.addJobApplicant("job-1", "user-2"), "a duplicate application by the same user must be rejected, not double-counted");
        assertTrue(repository.addJobApplicant("job-1", "user-3"), "a different applicant is unaffected by user-2's prior application");
    }

    @Test
    public void clearResetsEveryMap() {
        repository.saveUser(new User("user-1", "Alice", "alice@example.com", "hash"));
        Connection conn = new Connection("user-1", "user-2");
        repository.saveConnection(conn);
        repository.saveJob(new JobPosting("job-1", "user-1", "Engineer", "Acme", "Remote", "desc", EmploymentType.FULL_TIME, null));

        repository.clear();

        assertTrue(repository.getAllUsers().isEmpty());
        assertTrue(repository.getAllConnections().isEmpty());
        assertTrue(repository.getAllJobs().isEmpty());
        assertNull(repository.findUserIdByEmail("alice@example.com"));
    }
}
