package com.lld.linkedin.repository;

import com.lld.linkedin.model.Connection;
import com.lld.linkedin.model.JobPosting;
import com.lld.linkedin.model.Message;
import com.lld.linkedin.model.User;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory user/connection/message/job store — one instance backs the live API, a second, fully
 * independent instance backs {@code /sim/*} (constructed directly by {@code LinkedInService},
 * mirroring {@code movieticket.repository.MovieTicketRepository}'s two-instance shape).
 *
 * <p>Deliberately does NOT hold {@code connectionLocks} — the per-pair {@code ReentrantLock}s
 * behind {@code LinkedInService}'s canonical {@code min(u1,u2) + "#" + max(u1,u2)} pair locking are
 * a service-level concurrency concern coordinating a read-validate-mutate span across this
 * repository, the same split {@code tictactoe.service.TicTacToeService}'s {@code gameLocks} keeps
 * outside {@code GameRepository}.
 */
@Repository
public class LinkedInRepository {
    private final Map<String, User> usersById = new ConcurrentHashMap<>();
    private final Map<String, String> usersByEmail = new ConcurrentHashMap<>();
    private final Map<String, Connection> connectionsById = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> userConnections = new ConcurrentHashMap<>();
    private final Map<String, String> activeConnectionPairs = new ConcurrentHashMap<>();
    private final Map<String, List<Message>> conversations = new ConcurrentHashMap<>();
    private final Map<String, JobPosting> jobPostings = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> jobApplications = new ConcurrentHashMap<>();

    // ── Users ────────────────────────────────────────────────────────────────

    public User findUserById(String id) {
        return usersById.get(id);
    }

    public void saveUser(User user) {
        usersById.put(user.getId(), user);
        userConnections.putIfAbsent(user.getId(), ConcurrentHashMap.newKeySet());
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(usersById.values());
    }

    /** Atomically claims {@code email} for {@code userId}; returns the existing owner's id if already taken. */
    public String claimEmail(String email, String userId) {
        return usersByEmail.putIfAbsent(email, userId);
    }

    public String findUserIdByEmail(String email) {
        return usersByEmail.get(email);
    }

    // ── Connections ──────────────────────────────────────────────────────────

    public Connection findConnectionById(String id) {
        return connectionsById.get(id);
    }

    public void saveConnection(Connection connection) {
        connectionsById.put(connection.getId(), connection);
    }

    public Collection<Connection> getAllConnections() {
        return connectionsById.values();
    }

    public String getActiveConnectionId(String pairKey) {
        return activeConnectionPairs.get(pairKey);
    }

    public void setActiveConnectionPair(String pairKey, String connectionId) {
        activeConnectionPairs.put(pairKey, connectionId);
    }

    public void removeActiveConnectionPair(String pairKey) {
        activeConnectionPairs.remove(pairKey);
    }

    public Set<String> getUserConnectionIds(String userId) {
        return userConnections.getOrDefault(userId, Collections.emptySet());
    }

    public void addUserConnectionId(String userId, String connectionId) {
        userConnections.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(connectionId);
    }

    // ── Messaging ────────────────────────────────────────────────────────────

    public List<Message> getConversation(String conversationKey) {
        return conversations.getOrDefault(conversationKey, Collections.emptyList());
    }

    public void addMessage(String conversationKey, Message message) {
        conversations.computeIfAbsent(conversationKey, k -> new CopyOnWriteArrayList<>()).add(message);
    }

    // ── Jobs ─────────────────────────────────────────────────────────────────

    public JobPosting findJobById(String id) {
        return jobPostings.get(id);
    }

    public void saveJob(JobPosting job) {
        jobPostings.put(job.getId(), job);
        jobApplications.putIfAbsent(job.getId(), ConcurrentHashMap.newKeySet());
    }

    public List<JobPosting> getAllJobs() {
        return new ArrayList<>(jobPostings.values());
    }

    /** Atomically records {@code applicantId} against {@code jobId}; false if already applied. */
    public boolean addJobApplicant(String jobId, String applicantId) {
        return jobApplications.computeIfAbsent(jobId, k -> ConcurrentHashMap.newKeySet()).add(applicantId);
    }

    // ── Reset (used by the isolated /sim/* engine's own repository instance) ──

    public void clear() {
        usersById.clear();
        usersByEmail.clear();
        connectionsById.clear();
        userConnections.clear();
        activeConnectionPairs.clear();
        conversations.clear();
        jobPostings.clear();
        jobApplications.clear();
    }
}
