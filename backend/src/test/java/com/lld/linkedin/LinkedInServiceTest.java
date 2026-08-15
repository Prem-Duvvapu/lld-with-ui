package com.lld.linkedin;

import com.lld.linkedin.enums.ConnectionStatus;
import com.lld.linkedin.enums.EmploymentType;
import com.lld.linkedin.exception.ConnectionException;
import com.lld.linkedin.exception.InvalidCredentialsException;
import com.lld.linkedin.exception.UnauthorizedActionException;
import com.lld.linkedin.exception.UserAlreadyExistsException;
import com.lld.linkedin.model.Connection;
import com.lld.linkedin.model.JobPosting;
import com.lld.linkedin.model.Message;
import com.lld.linkedin.model.User;
import com.lld.linkedin.service.LinkedInService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class LinkedInServiceTest {

    private LinkedInService service;

    @BeforeEach
    void setUp() {
        service = new LinkedInService();
    }

    @Test
    void testUserRegistrationAndLogin() {
        User user = service.registerUser("Test User", "test.user@example.com", "secret123");
        assertNotNull(user);
        assertEquals("Test User", user.getName());
        assertEquals("test.user@example.com", user.getEmail());

        // Attempt duplicate registration
        assertThrows(UserAlreadyExistsException.class, () -> {
            service.registerUser("Test Duplicate", "test.user@example.com", "otherPass");
        });

        // Valid Login
        User loggedIn = service.login("test.user@example.com", "secret123");
        assertNotNull(loggedIn);
        assertEquals(user.getId(), loggedIn.getId());

        // Invalid Password Login
        assertThrows(InvalidCredentialsException.class, () -> {
            service.login("test.user@example.com", "wrongpassword");
        });
    }

    @Test
    void testProfileManagement() {
        User user = service.registerUser("Dev Expert", "dev@example.com", "pass123");

        service.updateProfile(user.getId(), "Principal Architect", "Building distributed clouds", "Seattle, WA");
        service.addSkill(user.getId(), "Java");
        service.addSkill(user.getId(), "Kubernetes");
        service.addExperience(user.getId(), "Lead Engineer", "TechCorp", "Seattle, WA",
                LocalDate.of(2020, 1, 1), null, true, "Scaling distributed systems");
        service.addEducation(user.getId(), "MIT", "M.S.", "Computer Science",
                LocalDate.of(2016, 9, 1), LocalDate.of(2018, 6, 1));

        User fetched = service.getUser(user.getId());
        assertEquals("Principal Architect", fetched.getProfile().getHeadline());
        assertEquals(2, fetched.getProfile().getSkills().size());
        assertEquals(1, fetched.getProfile().getExperiences().size());
        assertEquals(1, fetched.getProfile().getEducations().size());
    }

    @Test
    void testConnectionWorkflow() {
        User u1 = service.registerUser("Alice Doe", "alice.conn@example.com", "pass");
        User u2 = service.registerUser("Bob Smith", "bob.conn@example.com", "pass");

        // Self-connection should fail
        assertThrows(ConnectionException.class, () -> {
            service.sendConnectionRequest(u1.getId(), u1.getId());
        });

        // Send connection request
        Connection conn = service.sendConnectionRequest(u1.getId(), u2.getId());
        assertNotNull(conn);
        assertEquals(ConnectionStatus.PENDING, conn.getStatus());

        // Duplicate connection request should fail
        assertThrows(ConnectionException.class, () -> {
            service.sendConnectionRequest(u1.getId(), u2.getId());
        });

        // Bob accepts connection
        Connection accepted = service.acceptConnectionRequest(conn.getId(), u2.getId());
        assertEquals(ConnectionStatus.ACCEPTED, accepted.getStatus());

        // Both users should now be connected
        Set<User> aliceConns = service.getConnections(u1.getId());
        assertTrue(aliceConns.stream().anyMatch(u -> u.getId().equals(u2.getId())));
    }

    @Test
    void testDirectMessagingSecurity() {
        User u1 = service.registerUser("Chat User 1", "chat1@example.com", "pass");
        User u2 = service.registerUser("Chat User 2", "chat2@example.com", "pass");

        // Messaging before connection should throw UnauthorizedActionException
        assertThrows(UnauthorizedActionException.class, () -> {
            service.sendMessage(u1.getId(), u2.getId(), "Hello stranger!");
        });

        // Connect them
        Connection conn = service.sendConnectionRequest(u1.getId(), u2.getId());
        service.acceptConnectionRequest(conn.getId(), u2.getId());

        // Now message delivery succeeds
        Message msg = service.sendMessage(u1.getId(), u2.getId(), "Hello connection!");
        assertNotNull(msg);
        assertEquals("Hello connection!", msg.getContent());

        List<Message> convo = service.getConversation(u1.getId(), u2.getId());
        assertEquals(1, convo.size());
        assertEquals("Hello connection!", convo.get(0).getContent());
    }

    @Test
    void testJobPostingAndApplication() {
        User recruiter = service.registerUser("Recruiter Jane", "recruiter@acme.com", "pass");
        User candidate = service.registerUser("Candidate Dave", "dave@example.com", "pass");
        service.addSkill(candidate.getId(), "Java");

        JobPosting job = service.postJob(recruiter.getId(), "Senior Cloud Engineer", "Acme Corp", "Remote",
                "Great opportunity to build cloud software", EmploymentType.FULL_TIME, Set.of("java", "aws"));

        assertNotNull(job);
        assertEquals("Senior Cloud Engineer", job.getTitle());

        // Candidate applies
        boolean applied = service.applyForJob(candidate.getId(), job.getId());
        assertTrue(applied);
        assertTrue(service.getJob(job.getId()).hasApplied(candidate.getId()));

        // Duplicate application throws
        assertThrows(Exception.class, () -> {
            service.applyForJob(candidate.getId(), job.getId());
        });
    }

    @Test
    void testSearchAndRelevance() {
        User requester = service.registerUser("Searcher", "searcher@example.com", "pass");
        User candidate = service.registerUser("Java Guru", "guru@example.com", "pass");
        service.addSkill(candidate.getId(), "Java");
        service.updateProfile(candidate.getId(), "Senior Java Architect", "Expert in JVM internals", "New York, NY");

        List<Map<String, Object>> searchResults = service.searchUsers("Java", requester.getId());
        assertFalse(searchResults.isEmpty());
        assertTrue((Double) searchResults.get(0).get("relevanceScore") > 0.0);
    }

    @Test
    void testSimulationEngine() {
        service.simReset();
        Map<String, Object> snapshots = service.getSimSnapshots();
        assertNotNull(snapshots);
        assertTrue(snapshots.containsKey("users"));
        assertTrue(snapshots.containsKey("events"));

        // Test Simulation Connect
        Map<String, Object> afterConnect = service.simSendConnection("sim-charlie", "sim-diana");
        assertNotNull(afterConnect);

        // Test Simulation Apply Job
        Map<String, Object> afterApply = service.simApplyJob("sim-alice", "sim-job-1");
        assertNotNull(afterApply);

        assertFalse(service.getSimEvents().isEmpty());
    }
}
