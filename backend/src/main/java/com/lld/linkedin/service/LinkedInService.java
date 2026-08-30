package com.lld.linkedin.service;

import com.lld.linkedin.enums.ConnectionStatus;
import com.lld.linkedin.enums.EmploymentType;
import com.lld.linkedin.enums.JobStatus;
import com.lld.linkedin.enums.NotificationType;
import com.lld.linkedin.exception.*;
import com.lld.linkedin.model.*;
import com.lld.linkedin.observer.InAppNotificationObserver;
import com.lld.linkedin.observer.LoggingNotificationObserver;
import com.lld.linkedin.observer.NotificationObserver;
import com.lld.linkedin.repository.LinkedInRepository;
import com.lld.linkedin.strategy.JobSearchRankingStrategy;
import com.lld.linkedin.strategy.UserSearchRankingStrategy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class LinkedInService {

    private final LinkedInRepository repository;
    private final Map<String, ReentrantLock> connectionLocks = new ConcurrentHashMap<>();

    private final List<NotificationObserver> observers = new CopyOnWriteArrayList<>();
    private final InAppNotificationObserver inAppObserver;
    private final UserSearchRankingStrategy userSearchStrategy;
    private final JobSearchRankingStrategy jobSearchStrategy;

    // Isolated Simulation Engine State — a second, fully independent repository instance so
    // replaying the demo can never touch a real user/connection/job, mirroring
    // movieticket.service.MovieTicketService's simRepository shape.
    private final LinkedInRepository simRepository = new LinkedInRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public LinkedInService(LinkedInRepository repository,
                           UserSearchRankingStrategy userSearchStrategy,
                           JobSearchRankingStrategy jobSearchStrategy,
                           InAppNotificationObserver inAppObserver,
                           LoggingNotificationObserver loggingObserver) {
        this.repository = repository;
        this.userSearchStrategy = userSearchStrategy;
        this.jobSearchStrategy = jobSearchStrategy;
        this.inAppObserver = inAppObserver;

        observers.add(inAppObserver);
        if (loggingObserver != null) {
            observers.add(loggingObserver);
        }

        initDefaultData();
        simReset();
    }

    // =========================================================================
    // OBSERVER MANAGEMENT
    // =========================================================================

    public void registerObserver(NotificationObserver observer) {
        if (observer != null) observers.add(observer);
    }

    public void removeObserver(NotificationObserver observer) {
        if (observer != null) observers.remove(observer);
    }

    public void dispatchNotification(Notification notification) {
        if (notification == null) return;
        for (NotificationObserver observer : observers) {
            try {
                observer.onNotification(notification);
            } catch (Exception e) {
                System.err.println("Notification observer failed: " + e.getMessage());
            }
        }
    }

    // =========================================================================
    // USER REGISTRATION, AUTHENTICATION & PROFILE
    // =========================================================================

    public User registerUser(String name, String email, String password) {
        if (name == null || name.trim().isEmpty()) {
            throw new ValidationException("Name cannot be empty");
        }
        if (email == null || !email.contains("@")) {
            throw new ValidationException("Invalid email format");
        }
        if (password == null || password.trim().isEmpty()) {
            throw new ValidationException("Password cannot be empty");
        }

        String normalizedEmail = email.trim().toLowerCase();
        String userId = "user-" + UUID.randomUUID().toString().substring(0, 8);

        String existing = repository.claimEmail(normalizedEmail, userId);
        if (existing != null) {
            throw new UserAlreadyExistsException("Email already registered: " + normalizedEmail);
        }

        String passwordHash = Integer.toHexString(password.hashCode());
        User user = new User(userId, name.trim(), normalizedEmail, passwordHash);

        repository.saveUser(user);

        return user;
    }

    public User login(String email, String password) {
        if (email == null || password == null) {
            throw new InvalidCredentialsException("Invalid email or password");
        }
        String normalizedEmail = email.trim().toLowerCase();
        String userId = repository.findUserIdByEmail(normalizedEmail);
        if (userId == null) {
            throw new InvalidCredentialsException("Invalid email or password");
        }
        User user = repository.findUserById(userId);
        if (user == null || !user.validatePassword(password)) {
            throw new InvalidCredentialsException("Invalid email or password");
        }
        user.setLastLoginAt(java.time.Instant.now());
        return user;
    }

    public User getUser(String userId) {
        User user = repository.findUserById(userId);
        if (user == null) {
            throw new UserNotFoundException("User not found with ID: " + userId);
        }
        return user;
    }

    public List<User> getAllUsers() {
        return repository.getAllUsers();
    }

    public Profile updateProfile(String userId, String headline, String summary, String location) {
        User user = getUser(userId);
        Profile profile = user.getProfile();
        if (headline != null) profile.setHeadline(headline);
        if (summary != null) profile.setSummary(summary);
        if (location != null) profile.setLocation(location);
        return profile;
    }

    public Profile addSkill(String userId, String skillName) {
        User user = getUser(userId);
        user.getProfile().addSkill(new Skill(skillName));
        return user.getProfile();
    }

    public Profile addExperience(String userId, String title, String company, String location,
                                 LocalDate startDate, LocalDate endDate, boolean isCurrent, String desc) {
        User user = getUser(userId);
        Experience exp = new Experience(title, company, location, startDate, endDate, isCurrent, desc);
        user.getProfile().addExperience(exp);
        return user.getProfile();
    }

    public Profile addEducation(String userId, String school, String degree, String field,
                                LocalDate startDate, LocalDate endDate) {
        User user = getUser(userId);
        Education edu = new Education(school, degree, field, startDate, endDate);
        user.getProfile().addEducation(edu);
        return user.getProfile();
    }

    // =========================================================================
    // CONNECTIONS & NETWORK WORKFLOWS
    // =========================================================================

    public Connection sendConnectionRequest(String senderId, String receiverId) {
        if (senderId.equals(receiverId)) {
            throw new ConnectionException("Cannot connect with yourself");
        }
        User sender = getUser(senderId);
        User receiver = getUser(receiverId);

        String pairKey = senderId.compareTo(receiverId) < 0 ? senderId + "#" + receiverId : receiverId + "#" + senderId;
        ReentrantLock pairLock = connectionLocks.computeIfAbsent(pairKey, k -> new ReentrantLock());

        pairLock.lock();
        try {
            String existingConnId = repository.getActiveConnectionId(pairKey);
            if (existingConnId != null) {
                Connection existing = repository.findConnectionById(existingConnId);
                if (existing != null) {
                    if (existing.getStatus() == ConnectionStatus.ACCEPTED) {
                        throw new ConnectionException("Users are already connected.");
                    }
                    if (existing.getStatus() == ConnectionStatus.PENDING) {
                        throw new ConnectionException("A connection request is already pending.");
                    }
                }
            }

            Connection conn = new Connection(senderId, receiverId);
            repository.saveConnection(conn);
            repository.setActiveConnectionPair(pairKey, conn.getId());

            repository.addUserConnectionId(senderId, conn.getId());
            repository.addUserConnectionId(receiverId, conn.getId());

            Notification notif = new Notification(receiverId, senderId, NotificationType.CONNECTION_REQUEST,
                    sender.getName() + " sent you a connection request.", conn.getId());
            dispatchNotification(notif);

            return conn;
        } finally {
            pairLock.unlock();
        }
    }

    public Connection acceptConnectionRequest(String connectionId, String targetUserId) {
        Connection conn = repository.findConnectionById(connectionId);
        if (conn == null) {
            throw new ConnectionException("Connection request not found");
        }
        if (!conn.getTargetId().equals(targetUserId)) {
            throw new UnauthorizedActionException("Only the recipient can accept a connection request");
        }
        if (conn.getStatus() != ConnectionStatus.PENDING) {
            throw new ConnectionException("Connection is not in PENDING state: " + conn.getStatus());
        }

        conn.setStatus(ConnectionStatus.ACCEPTED);

        User targetUser = getUser(targetUserId);
        Notification notif = new Notification(conn.getRequesterId(), targetUserId, NotificationType.CONNECTION_ACCEPTED,
                targetUser.getName() + " accepted your connection request.", conn.getId());
        dispatchNotification(notif);

        return conn;
    }

    public Connection rejectConnectionRequest(String connectionId, String targetUserId) {
        Connection conn = repository.findConnectionById(connectionId);
        if (conn == null) {
            throw new ConnectionException("Connection request not found");
        }
        if (!conn.getTargetId().equals(targetUserId)) {
            throw new UnauthorizedActionException("Only the recipient can reject a connection request");
        }

        conn.setStatus(ConnectionStatus.REJECTED);
        String pairKey = conn.getRequesterId().compareTo(conn.getTargetId()) < 0 ?
                conn.getRequesterId() + "#" + conn.getTargetId() : conn.getTargetId() + "#" + conn.getRequesterId();
        repository.removeActiveConnectionPair(pairKey);

        return conn;
    }

    public Set<User> getConnections(String userId) {
        getUser(userId); // validate user
        Set<String> connIds = repository.getUserConnectionIds(userId);
        Set<User> connectedUsers = new HashSet<>();

        for (String cId : connIds) {
            Connection c = repository.findConnectionById(cId);
            if (c != null && c.getStatus() == ConnectionStatus.ACCEPTED) {
                String otherId = c.getOtherUser(userId);
                User other = repository.findUserById(otherId);
                if (other != null) {
                    connectedUsers.add(other);
                }
            }
        }
        return connectedUsers;
    }

    public List<Connection> getPendingRequests(String userId) {
        getUser(userId);
        Set<String> connIds = repository.getUserConnectionIds(userId);
        List<Connection> pending = new ArrayList<>();

        for (String cId : connIds) {
            Connection c = repository.findConnectionById(cId);
            if (c != null && c.getStatus() == ConnectionStatus.PENDING && c.getTargetId().equals(userId)) {
                pending.add(c);
            }
        }
        return pending;
    }

    // =========================================================================
    // DIRECT MESSAGING
    // =========================================================================

    public Message sendMessage(String senderId, String receiverId, String content) {
        User sender = getUser(senderId);
        User receiver = getUser(receiverId);

        String pairKey = senderId.compareTo(receiverId) < 0 ? senderId + "#" + receiverId : receiverId + "#" + senderId;
        String connId = repository.getActiveConnectionId(pairKey);
        if (connId == null) {
            throw new UnauthorizedActionException("Cannot send message: Users are not connected.");
        }
        Connection conn = repository.findConnectionById(connId);
        if (conn == null || conn.getStatus() != ConnectionStatus.ACCEPTED) {
            throw new UnauthorizedActionException("Cannot send message: Connection is not active.");
        }

        Message message = new Message(senderId, receiverId, content);
        repository.addMessage(message.getConversationKey(), message);

        Notification notif = new Notification(receiverId, senderId, NotificationType.MESSAGE_RECEIVED,
                "New message from " + sender.getName() + ": " + (content.length() > 30 ? content.substring(0, 27) + "..." : content),
                message.getId());
        dispatchNotification(notif);

        return message;
    }

    public List<Message> getConversation(String userA, String userB) {
        String conversationKey = userA.compareTo(userB) < 0 ? userA + "#" + userB : userB + "#" + userA;
        return repository.getConversation(conversationKey);
    }

    // =========================================================================
    // JOB POSTING & APPLICATIONS
    // =========================================================================

    public JobPosting postJob(String posterId, String title, String company, String location,
                              String description, EmploymentType type, Set<String> requiredSkills) {
        getUser(posterId);
        String jobId = "job-" + UUID.randomUUID().toString().substring(0, 8);
        JobPosting job = new JobPosting(jobId, posterId, title, company, location, description, type, requiredSkills);

        repository.saveJob(job);
        return job;
    }

    public List<JobPosting> getAllJobs() {
        return repository.getAllJobs();
    }

    public JobPosting getJob(String jobId) {
        JobPosting job = repository.findJobById(jobId);
        if (job == null) {
            throw new JobNotFoundException("Job not found with ID: " + jobId);
        }
        return job;
    }

    public boolean applyForJob(String applicantId, String jobId) {
        User applicant = getUser(applicantId);
        JobPosting job = getJob(jobId);

        if (job.getStatus() != JobStatus.OPEN) {
            throw new ValidationException("Job posting is not open for applications.");
        }
        if (job.getPosterId().equals(applicantId)) {
            throw new ValidationException("Cannot apply to your own job posting.");
        }

        boolean added = repository.addJobApplicant(jobId, applicantId);
        if (!added) {
            throw new ValidationException("User has already applied for this job.");
        }
        job.addApplicant(applicantId);

        Notification notif = new Notification(job.getPosterId(), applicantId, NotificationType.JOB_ALERT,
                applicant.getName() + " applied for " + job.getTitle(), job.getId());
        dispatchNotification(notif);

        return true;
    }

    // =========================================================================
    // SEARCH & RELEVANCE
    // =========================================================================

    public List<Map<String, Object>> searchUsers(String query, String requestingUserId) {
        User requester = requestingUserId != null ? repository.findUserById(requestingUserId) : null;
        Set<String> directConnIds = requester != null ?
                getConnections(requester.getId()).stream().map(User::getId).collect(Collectors.toSet()) :
                Collections.emptySet();

        return repository.getAllUsers().stream()
                .filter(u -> requester == null || !u.getId().equals(requester.getId()))
                .map(u -> {
                    double score = userSearchStrategy.calculateUserRelevance(u, query, requester, directConnIds);
                    Map<String, Object> item = new HashMap<>();
                    item.put("user", u);
                    item.put("relevanceScore", Math.round(score * 100.0) / 100.0);
                    item.put("isConnected", directConnIds.contains(u.getId()));
                    return item;
                })
                .sorted((a, b) -> Double.compare((Double) b.get("relevanceScore"), (Double) a.get("relevanceScore")))
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> searchJobs(String query, String location, String applicantId) {
        User applicant = applicantId != null ? repository.findUserById(applicantId) : null;

        return repository.getAllJobs().stream()
                .filter(j -> j.getStatus() == JobStatus.OPEN)
                .map(j -> {
                    double score = jobSearchStrategy.calculateJobRelevance(j, query, location, applicant);
                    Map<String, Object> item = new HashMap<>();
                    item.put("job", j);
                    item.put("matchScore", Math.round(score * 100.0) / 100.0);
                    item.put("hasApplied", applicant != null && j.hasApplied(applicant.getId()));
                    return item;
                })
                .sorted((a, b) -> Double.compare((Double) b.get("matchScore"), (Double) a.get("matchScore")))
                .collect(Collectors.toList());
    }

    public List<Notification> getNotifications(String userId) {
        return inAppObserver.getNotificationsForUser(userId);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized void simReset() {
        simEventLog.clear();
        simRepository.clear();

        // Seed Simulation Users
        User alice = new User("sim-alice", "Alice Vance", "alice@blackmesa.gov", "hash123");
        alice.getProfile().setHeadline("Lead AI Research Scientist at Black Mesa");
        alice.getProfile().setLocation("New Mexico, USA");
        alice.getProfile().addSkill(new Skill("Machine Learning"));
        alice.getProfile().addSkill(new Skill("Distributed Systems"));
        alice.getProfile().addSkill(new Skill("Java"));

        User bob = new User("sim-bob", "Bob Martinez", "bob@google.com", "hash123");
        bob.getProfile().setHeadline("Senior Software Architect at Google Cloud");
        bob.getProfile().setLocation("Mountain View, CA");
        bob.getProfile().addSkill(new Skill("Java"));
        bob.getProfile().addSkill(new Skill("Kubernetes"));
        bob.getProfile().addSkill(new Skill("System Design"));

        User charlie = new User("sim-charlie", "Charlie Kim", "charlie@netflix.com", "hash123");
        charlie.getProfile().setHeadline("Engineering Manager at Netflix");
        charlie.getProfile().setLocation("Los Gatos, CA");
        charlie.getProfile().addSkill(new Skill("Microservices"));
        charlie.getProfile().addSkill(new Skill("Java"));

        User diana = new User("sim-diana", "Diana Prince", "diana@amazon.com", "hash123");
        diana.getProfile().setHeadline("Principal Product Manager at AWS");
        diana.getProfile().setLocation("Seattle, WA");
        diana.getProfile().addSkill(new Skill("Product Strategy"));
        diana.getProfile().addSkill(new Skill("Cloud Computing"));

        simRepository.saveUser(alice);
        simRepository.saveUser(bob);
        simRepository.saveUser(charlie);
        simRepository.saveUser(diana);

        // Connect Alice and Bob
        Connection connAB = new Connection(alice.getId(), bob.getId());
        connAB.setStatus(ConnectionStatus.ACCEPTED);
        simRepository.saveConnection(connAB);
        String pairAB = alice.getId() + "#" + bob.getId();
        simRepository.setActiveConnectionPair(pairAB, connAB.getId());
        simRepository.addUserConnectionId(alice.getId(), connAB.getId());
        simRepository.addUserConnectionId(bob.getId(), connAB.getId());

        // Post a demo job from Charlie
        JobPosting job1 = new JobPosting("sim-job-1", charlie.getId(), "Staff Backend Engineer", "Netflix",
                "Los Gatos, CA", "Build high-throughput global streaming microservices.",
                EmploymentType.FULL_TIME, Set.of("java", "microservices", "distributed systems"));
        simRepository.saveJob(job1);

        logSimEvent("SIM_RESET", "System", "Initialized simulation with 4 users, 1 active connection (Alice-Bob), and 1 open job posting.", null);
    }

    public synchronized Map<String, Object> simSendConnection(String senderId, String receiverId) {
        User sender = simRepository.findUserById(senderId);
        User receiver = simRepository.findUserById(receiverId);
        if (sender == null || receiver == null) {
            logSimEvent("CONN_FAILED", senderId, "User lookup failed", null);
            return getSimSnapshots();
        }

        String pairKey = senderId.compareTo(receiverId) < 0 ? senderId + "#" + receiverId : receiverId + "#" + senderId;
        if (simRepository.getActiveConnectionId(pairKey) != null) {
            logSimEvent("CONN_FAILED", sender.getName(), "Connection already exists or pending with " + receiver.getName(), null);
            return getSimSnapshots();
        }

        Connection conn = new Connection(senderId, receiverId);
        simRepository.saveConnection(conn);
        simRepository.setActiveConnectionPair(pairKey, conn.getId());
        simRepository.addUserConnectionId(senderId, conn.getId());
        simRepository.addUserConnectionId(receiverId, conn.getId());

        logSimEvent("CONN_REQUEST", sender.getName(), "Sent connection request to " + receiver.getName(), Map.of("connectionId", conn.getId()));
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simAcceptConnection(String connectionId) {
        Connection conn = simRepository.findConnectionById(connectionId);
        if (conn != null && conn.getStatus() == ConnectionStatus.PENDING) {
            conn.setStatus(ConnectionStatus.ACCEPTED);
            User sender = simRepository.findUserById(conn.getRequesterId());
            User receiver = simRepository.findUserById(conn.getTargetId());
            logSimEvent("CONN_ACCEPTED", receiver != null ? receiver.getName() : "User",
                    "Accepted connection request from " + (sender != null ? sender.getName() : "User"), Map.of("connectionId", conn.getId()));
        }
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simSendMessage(String senderId, String receiverId, String content) {
        String pairKey = senderId.compareTo(receiverId) < 0 ? senderId + "#" + receiverId : receiverId + "#" + senderId;
        String connId = simRepository.getActiveConnectionId(pairKey);
        Connection conn = connId != null ? simRepository.findConnectionById(connId) : null;

        if (conn == null || conn.getStatus() != ConnectionStatus.ACCEPTED) {
            logSimEvent("MSG_REJECTED", senderId, "Cannot message " + receiverId + ": Not 1st-degree connections!", null);
            return getSimSnapshots();
        }

        Message msg = new Message(senderId, receiverId, content);
        simRepository.addMessage(msg.getConversationKey(), msg);
        User sender = simRepository.findUserById(senderId);
        User receiver = simRepository.findUserById(receiverId);
        logSimEvent("MSG_DELIVERED", sender != null ? sender.getName() : senderId,
                "Sent message to " + (receiver != null ? receiver.getName() : receiverId) + ": \"" + content + "\"", null);

        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simApplyJob(String applicantId, String jobId) {
        User applicant = simRepository.findUserById(applicantId);
        JobPosting job = simRepository.findJobById(jobId);
        if (applicant == null || job == null) return getSimSnapshots();

        if (job.hasApplied(applicantId)) {
            logSimEvent("JOB_APP_DUPLICATE", applicant.getName(), "Duplicate application detected for " + job.getTitle(), null);
            return getSimSnapshots();
        }

        job.addApplicant(applicantId);
        logSimEvent("JOB_APPLIED", applicant.getName(), "Successfully applied for " + job.getTitle() + " at " + job.getCompany(), null);
        return getSimSnapshots();
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("users", simRepository.getAllUsers());
        res.put("connections", simRepository.getAllConnections());
        res.put("jobs", simRepository.getAllJobs());
        res.put("events", simEventLog);
        return res;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }

    // =========================================================================
    // SEED DATA INITIALIZATION (REAL REPOSITORIES)
    // =========================================================================

    private void initDefaultData() {
        // User 1
        User u1 = registerUser("Prem Duvvapu", "prem@example.com", "pass123");
        u1.getProfile().setHeadline("Senior Full Stack & Distributed Systems Architect");
        u1.getProfile().setLocation("San Francisco, CA");
        u1.getProfile().setSummary("Passionate engineer building ultra-scalable low-latency distributed platforms and reactive UIs.");
        u1.getProfile().addSkill(new Skill("Java"));
        u1.getProfile().addSkill(new Skill("React"));
        u1.getProfile().addSkill(new Skill("System Design"));
        u1.getProfile().addSkill(new Skill("Spring Boot"));
        u1.getProfile().addExperience(new Experience("Lead Architect", "Apex Systems", "San Francisco, CA",
                LocalDate.of(2022, 1, 1), null, true, "Architected high-throughput microservices."));
        u1.getProfile().addEducation(new Education("IIT Madras", "B.Tech", "Computer Science",
                LocalDate.of(2017, 8, 1), LocalDate.of(2021, 5, 1)));

        // User 2
        User u2 = registerUser("Sarah Jenkins", "sarah@google.com", "pass123");
        u2.getProfile().setHeadline("Staff Software Engineer at Google Cloud");
        u2.getProfile().setLocation("Mountain View, CA");
        u2.getProfile().addSkill(new Skill("Java"));
        u2.getProfile().addSkill(new Skill("Kubernetes"));
        u2.getProfile().addSkill(new Skill("Distributed Systems"));

        // User 3
        User u3 = registerUser("Alex Rivera", "alex@stripe.com", "pass123");
        u3.getProfile().setHeadline("VP of Engineering at Stripe Payments");
        u3.getProfile().setLocation("San Francisco, CA");
        u3.getProfile().addSkill(new Skill("Payments"));
        u3.getProfile().addSkill(new Skill("Leadership"));
        u3.getProfile().addSkill(new Skill("Java"));

        // User 4
        User u4 = registerUser("Elena Rostova", "elena@microsoft.com", "pass123");
        u4.getProfile().setHeadline("Principal AI Engineer at Microsoft Research");
        u4.getProfile().setLocation("Redmond, WA");
        u4.getProfile().addSkill(new Skill("Machine Learning"));
        u4.getProfile().addSkill(new Skill("Python"));

        // Establish Connection between u1 and u2
        Connection c1 = sendConnectionRequest(u1.getId(), u2.getId());
        acceptConnectionRequest(c1.getId(), u2.getId());

        // Establish Connection between u1 and u3 (Pending)
        sendConnectionRequest(u3.getId(), u1.getId());

        // Message between u1 and u2
        sendMessage(u2.getId(), u1.getId(), "Hey Prem! Welcome to the Google Cloud architectural review board.");

        // Job Postings
        postJob(u2.getId(), "Staff Distributed Systems Engineer", "Google", "Mountain View, CA",
                "Design and scale global cloud infrastructure.", EmploymentType.FULL_TIME,
                Set.of("java", "distributed systems", "kubernetes"));

        postJob(u3.getId(), "Senior Payments Infrastructure Engineer", "Stripe", "San Francisco, CA",
                "Scale multi-region payment ledger systems.", EmploymentType.FULL_TIME,
                Set.of("java", "payments", "system design"));
    }
}
