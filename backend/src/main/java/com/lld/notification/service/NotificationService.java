package com.lld.notification.service;

import com.lld.notification.channel.ChannelDeliveryException;
import com.lld.notification.channel.NotificationChannel;
import com.lld.notification.channel.NotificationChannelFactory;
import com.lld.notification.channel.PushChannel;
import com.lld.notification.channel.EmailChannel;
import com.lld.notification.channel.SmsChannel;
import com.lld.notification.channel.WhatsAppChannel;
import com.lld.notification.exception.NotificationNotFoundException;
import com.lld.notification.exception.RecipientNotFoundException;
import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationStatus;
import com.lld.notification.model.NotificationType;
import com.lld.notification.model.Priority;
import com.lld.notification.model.SimEvent;
import com.lld.notification.model.UserPreference;
import com.lld.notification.repository.NotificationRepository;
import com.lld.notification.retry.RetryPolicy;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade for the whole notification pipeline: preference checks, idempotent de-duplication,
 * priority dispatch, and retry-with-backoff — plus an isolated {@code /sim/*} sandbox.
 *
 * <h2>Idempotency — the check-then-act race this module exists to close</h2>
 * Two concurrent {@link #send} calls carrying the same {@code idempotencyKey} must result in
 * exactly one dispatched notification. Left unguarded this is the textbook race: "has this key
 * been seen?" (check) then "record it and enqueue" (act), with nothing atomic in between. The
 * fix mirrors {@code uber.service.DriverAssignmentService}'s per-entity lock idiom: a
 * {@link ReentrantLock} keyed by idempotency key (lazily created via
 * {@code computeIfAbsent} into a {@link ConcurrentHashMap}) guards the whole
 * check-and-record as one atomic step, and {@code idempotencyIndex} — itself a
 * {@code ConcurrentHashMap} — records which notification a key already resolved to.
 *
 * <h2>Priority dispatch</h2>
 * Live sends are queued on a {@link PriorityBlockingQueue} ordered by {@link Priority} (HIGH
 * sorts first — every Java enum is {@link Comparable} by ordinal, so no custom comparator logic
 * is needed there) then by {@code createdAt}, and drained by a small fixed pool of background
 * worker threads. {@link #drainOnce()} performs exactly one dequeue-and-attempt and is what both
 * the real workers and this class's own tests call — see {@code NotificationPriorityQueueTest}.
 */
@Service
public class NotificationService {
    public static final ZoneId ZONE_IST = ZoneId.of("Asia/Kolkata");
    private static final int DEFAULT_WORKER_COUNT = 3;

    private static final Comparator<Notification> DISPATCH_ORDER =
            Comparator.comparing(Notification::getPriority).thenComparing(Notification::getCreatedAt);

    private final NotificationRepository repository;
    private final NotificationChannelFactory channelFactory;
    private final RetryPolicy retryPolicy;
    private final int workerCount;

    private final PriorityBlockingQueue<Notification> pendingQueue = new PriorityBlockingQueue<>(11, DISPATCH_ORDER);
    private final Map<String, ReentrantLock> idempotencyLocks = new ConcurrentHashMap<>();
    private final Map<String, Long> idempotencyIndex = new ConcurrentHashMap<>();

    private volatile boolean running = false;
    private Thread[] workers = new Thread[0];

    // ---- /sim/* sandbox: a second, fully isolated set of instances so the demo can never
    // touch a live notification or preference. See simReset() for the seed data. ----
    private static final long SIM_RECIPIENT_ID = 1L;
    private volatile NotificationRepository simRepository;
    private volatile NotificationChannelFactory simChannelFactory;
    private final Map<String, ReentrantLock> simIdempotencyLocks = new ConcurrentHashMap<>();
    private final Map<String, Long> simIdempotencyIndex = new ConcurrentHashMap<>();
    private volatile Long simInFlightNotificationId;
    private static final RetryPolicy SIM_RETRY_POLICY =
            new com.lld.notification.retry.ExponentialBackoffRetryPolicy(3, Duration.ofMillis(20), Duration.ofMillis(150));
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    @org.springframework.beans.factory.annotation.Autowired
    public NotificationService(NotificationRepository repository, NotificationChannelFactory channelFactory, RetryPolicy retryPolicy) {
        this(repository, channelFactory, retryPolicy, DEFAULT_WORKER_COUNT);
    }

    /** Lets a caller (chiefly tests) choose a worker count — or never call {@link #start()} at
     * all — so priority-ordering assertions can control dispatch by hand via {@link #drainOnce()}
     * instead of racing real background threads. */
    public NotificationService(NotificationRepository repository, NotificationChannelFactory channelFactory,
                                RetryPolicy retryPolicy, int workerCount) {
        this.repository = repository;
        this.channelFactory = channelFactory;
        this.retryPolicy = retryPolicy;
        this.workerCount = workerCount;
        simReset();
    }

    /** Starts the fixed background worker pool that drains {@link #pendingQueue}. Spring calls
     * this once the bean is constructed; direct-construction unit tests never call it unless
     * they explicitly want real asynchronous dispatch. */
    @PostConstruct
    public synchronized void start() {
        if (running) {
            return;
        }
        running = true;
        workers = new Thread[workerCount];
        for (int i = 0; i < workerCount; i++) {
            Thread t = new Thread(this::runWorkerLoop, "notification-worker-" + i);
            t.setDaemon(true);
            workers[i] = t;
            t.start();
        }
    }

    @PreDestroy
    public void shutdown() {
        running = false;
    }

    private void runWorkerLoop() {
        while (running) {
            try {
                Notification n = pendingQueue.poll(200, TimeUnit.MILLISECONDS);
                if (n != null) {
                    dispatchToTerminal(repository, channelFactory, retryPolicy, n, true);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    // =========================================================================
    // LIVE API
    // =========================================================================

    public Notification send(long recipientId, NotificationType type, ChannelType channel,
                              Map<String, String> templateData, String idempotencyKey, Priority priorityOverride) {
        java.util.concurrent.atomic.AtomicBoolean isNew = new java.util.concurrent.atomic.AtomicBoolean(false);
        Notification n = createAndClaim(repository, idempotencyLocks, idempotencyIndex,
                recipientId, type, channel, priorityOverride, templateData, idempotencyKey, isNew);
        // Only the caller that actually created the notification may enqueue it — a duplicate
        // call resolves to the same (still-PENDING) instance and must not enqueue it a second
        // time, or N racing callers with the same idempotencyKey would each add a copy of the
        // reference to pendingQueue even though they all correctly agree on one notification id.
        if (isNew.get() && n.getStatus() == NotificationStatus.PENDING) {
            pendingQueue.add(n);
        }
        return n;
    }

    public Notification getNotification(long id) {
        Notification n = repository.findById(id);
        if (n == null) {
            throw new NotificationNotFoundException("Notification not found: " + id);
        }
        return n;
    }

    public List<Notification> getAllNotifications(Long recipientId) {
        return recipientId != null ? repository.findByRecipient(recipientId) : repository.findAll();
    }

    public void setPreference(long userId, NotificationType type, ChannelType channel, boolean optedIn) {
        if (!repository.isKnownRecipient(userId)) {
            throw new RecipientNotFoundException("Unknown recipient: " + userId);
        }
        repository.setPreference(userId, type, channel, optedIn);
    }

    public List<UserPreference> getPreferences(long userId) {
        if (!repository.isKnownRecipient(userId)) {
            throw new RecipientNotFoundException("Unknown recipient: " + userId);
        }
        return repository.getPreferences(userId);
    }

    public Map<Long, String> getRecipients() {
        return repository.getRecipientDirectory();
    }

    /** Test/inspection hook: pops exactly one notification off the priority queue and performs
     * exactly one delivery attempt on it (no retry loop). Production background workers reach
     * the same outcome via {@link #dispatchToTerminal}; this method is what makes priority
     * ordering assertable without racing real threads — see
     * {@code NotificationPriorityQueueTest}. */
    public Notification drainOnce() {
        Notification n = pendingQueue.poll();
        if (n == null) {
            return null;
        }
        dispatchAttempt(repository, channelFactory, retryPolicy, n);
        return n;
    }

    public int pendingQueueSize() {
        return pendingQueue.size();
    }

    // =========================================================================
    // SHARED CORE — used by both the live path and the /sim/* sandbox
    // =========================================================================

    /**
     * Atomically checks for a duplicate idempotency key and, if none is found, creates and
     * persists a new PENDING notification (transitioning it straight to SUPPRESSED if the
     * recipient has opted out of this type/channel pair). The per-key lock closes the
     * check-then-act race described in the class javadoc.
     *
     * @param isNewOut if non-null, set to {@code true} iff this call is the one that created the
     *                 notification (as opposed to resolving to an existing one via the
     *                 idempotency key) — callers that enqueue/dispatch based on status must gate
     *                 on this, since a duplicate call's returned notification is also still
     *                 PENDING/RETRYING at the moment it is returned.
     */
    private Notification createAndClaim(NotificationRepository repo,
                                         Map<String, ReentrantLock> locks,
                                         Map<String, Long> index,
                                         long recipientId, NotificationType type, ChannelType channel,
                                         Priority priorityOverride, Map<String, String> templateData,
                                         String idempotencyKey, java.util.concurrent.atomic.AtomicBoolean isNewOut) {
        if (!repo.isKnownRecipient(recipientId)) {
            throw new RecipientNotFoundException("Unknown recipient: " + recipientId);
        }
        String key = (idempotencyKey == null || idempotencyKey.isBlank())
                ? "AUTO-" + UUID.randomUUID()
                : idempotencyKey;

        ReentrantLock lock = locks.computeIfAbsent(key, k -> new ReentrantLock());
        lock.lock();
        try {
            Long existingId = index.get(key);
            if (existingId != null) {
                // Duplicate: recognized as a no-op, never creates a new notification and never
                // touches a channel.
                if (isNewOut != null) {
                    isNewOut.set(false);
                }
                return repo.findById(existingId);
            }
            if (isNewOut != null) {
                isNewOut.set(true);
            }

            Priority priority = priorityOverride != null ? priorityOverride : type.defaultPriority();
            Notification n = Notification.builder()
                    .recipientId(recipientId)
                    .type(type)
                    .priority(priority)
                    .channel(channel)
                    .templateData(templateData == null ? Map.of() : templateData)
                    .status(NotificationStatus.PENDING)
                    .attemptCount(0)
                    .idempotencyKey(key)
                    .createdAt(LocalDateTime.now(ZONE_IST))
                    .build();
            n = repo.save(n);
            index.put(key, n.getId());

            if (!repo.isOptedIn(recipientId, type, channel)) {
                transition(n, NotificationStatus.SUPPRESSED);
                repo.save(n);
            }
            return n;
        } finally {
            lock.unlock();
        }
    }

    /** Single gate for every notification status change — mirrors {@code uber.service
     * .UberService#transition}. The identity transition (e.g. RETRYING -> RETRYING between
     * successive failed attempts) is always legal since it is not an actual state change. */
    private void transition(Notification n, NotificationStatus next) {
        NotificationStatus current = n.getStatus();
        if (current == next) {
            return;
        }
        if (!current.canTransitionTo(next)) {
            throw new IllegalStateException(
                    "Notification " + n.getId() + " cannot move from " + current + " to " + next
                            + ". Allowed: " + current.allowedNext());
        }
        n.setStatus(next);
    }

    /** Exactly one delivery attempt: resolves the channel, calls it, and moves the notification
     * to SENT, RETRYING (more attempts remain) or FAILED (budget exhausted) accordingly. */
    private void dispatchAttempt(NotificationRepository repo, NotificationChannelFactory chFactory,
                                  RetryPolicy policy, Notification n) {
        if (n.getStatus() != NotificationStatus.PENDING && n.getStatus() != NotificationStatus.RETRYING) {
            return; // already terminal or suppressed — nothing to dispatch
        }
        NotificationChannel channel = chFactory.getChannel(n.getChannel());
        n.setAttemptCount(n.getAttemptCount() + 1);
        n.setLastAttemptAt(LocalDateTime.now(ZONE_IST));
        try {
            channel.send(n);
            n.setLastError(null);
            transition(n, NotificationStatus.SENT);
        } catch (ChannelDeliveryException e) {
            n.setLastError(e.getMessage());
            if (policy.shouldRetry(n.getAttemptCount())) {
                transition(n, NotificationStatus.RETRYING);
            } else {
                transition(n, NotificationStatus.FAILED);
            }
        }
        repo.save(n);
    }

    /** Attempts delivery, then keeps retrying (optionally sleeping the policy's real backoff
     * between attempts) until the notification reaches a terminal state. */
    private void dispatchToTerminal(NotificationRepository repo, NotificationChannelFactory chFactory,
                                     RetryPolicy policy, Notification n, boolean sleepBetweenAttempts) {
        dispatchAttempt(repo, chFactory, policy, n);
        while (n.getStatus() == NotificationStatus.RETRYING) {
            if (sleepBetweenAttempts) {
                sleepQuietly(policy.backoffFor(n.getAttemptCount()));
            }
            dispatchAttempt(repo, chFactory, policy, n);
        }
    }

    private static void sleepQuietly(Duration d) {
        try {
            Thread.sleep(Math.max(0, d.toMillis()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    // =========================================================================
    // ISOLATED /sim/* ENGINE — a separate repository + channel factory from the live module.
    // Nothing here ever touches `repository`/`channelFactory` above. Sim dispatch runs
    // synchronously (no queue/workers) since each step is one user-paced click.
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        this.simRepository = new NotificationRepository();
        simRepository.registerRecipient(SIM_RECIPIENT_ID, "Priya Sharma");
        // Opted out of PROMOTIONAL over SMS specifically — the "sendPromoToOptedOutUser" step
        // exercises exactly this pair.
        simRepository.setPreference(SIM_RECIPIENT_ID, NotificationType.PROMOTIONAL, ChannelType.SMS, false);

        Random deterministic = new Random(42);
        Map<ChannelType, NotificationChannel> map = new EnumMap<>(ChannelType.class);
        map.put(ChannelType.EMAIL, new EmailChannel(0.0, deterministic));   // always succeeds
        map.put(ChannelType.SMS, new SmsChannel(0.0, deterministic));      // always succeeds
        map.put(ChannelType.PUSH, new PushChannel(1.0, deterministic));    // always fails — the retry demo
        map.put(ChannelType.WHATSAPP, new WhatsAppChannel(0.0, deterministic)); // always succeeds
        this.simChannelFactory = new NotificationChannelFactory(map);

        simIdempotencyLocks.clear();
        simIdempotencyIndex.clear();
        simInFlightNotificationId = null;
        simEvents.clear();
        simEventIdGen.set(1);

        SimEvent event = newSimEvent(0, "RESET", "Sandbox reset",
                "Seeded 1 recipient (opted out of PROMOTIONAL/SMS) in an isolated sim repository. "
                        + "The PUSH channel is forced to always fail so the retry/backoff steps are "
                        + "deterministic; EMAIL, SMS and WHATSAPP always succeed.",
                "SUCCESS")
                .addDetail("recipientId", SIM_RECIPIENT_ID);
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simSendOtp(int step) {
        Notification n = createAndClaim(simRepository, simIdempotencyLocks, simIdempotencyIndex,
                SIM_RECIPIENT_ID, NotificationType.OTP, ChannelType.EMAIL, null,
                Map.of("otp", "482913"), "SIM-OTP-" + step, null);
        if (n.getStatus() == NotificationStatus.PENDING) {
            dispatchToTerminal(simRepository, simChannelFactory, SIM_RETRY_POLICY, n, false);
        }

        SimEvent event = newSimEvent(step, "SEND_OTP", "HIGH-priority OTP sent",
                "OTP " + n.getTemplateData().get("otp") + " dispatched over EMAIL and delivered on "
                        + "the first attempt — status " + n.getStatus() + ".", "SUCCESS")
                .addDetail("notificationId", n.getId())
                .addDetail("priority", n.getPriority().name())
                .addDetail("status", n.getStatus().name());
        simEvents.add(event);

        return stepResult(n, event);
    }

    public synchronized Map<String, Object> simSendPromoToOptedOutUser(int step) {
        Notification n = createAndClaim(simRepository, simIdempotencyLocks, simIdempotencyIndex,
                SIM_RECIPIENT_ID, NotificationType.PROMOTIONAL, ChannelType.SMS, null,
                Map.of("offer", "Flat 20% off"), "SIM-PROMO-" + step, null);
        if (n.getStatus() == NotificationStatus.PENDING) {
            dispatchToTerminal(simRepository, simChannelFactory, SIM_RETRY_POLICY, n, false);
        }

        SimEvent event = newSimEvent(step, "SUPPRESS", "PROMOTIONAL/SMS suppressed by preference",
                "Priya opted out of PROMOTIONAL notifications over SMS — the notification moved "
                        + "straight to SUPPRESSED and the SMS channel was never called.", "WARNING")
                .addDetail("notificationId", n.getId())
                .addDetail("status", n.getStatus().name());
        simEvents.add(event);

        return stepResult(n, event);
    }

    public synchronized Map<String, Object> simSendWithForcedFailure(int step) {
        Notification n = createAndClaim(simRepository, simIdempotencyLocks, simIdempotencyIndex,
                SIM_RECIPIENT_ID, NotificationType.ALERT, ChannelType.PUSH, null,
                Map.of("alert", "Unusual login detected"), "SIM-FAIL-" + step, null);
        if (n.getStatus() == NotificationStatus.PENDING) {
            dispatchAttempt(simRepository, simChannelFactory, SIM_RETRY_POLICY, n); // exactly one attempt
        }
        simInFlightNotificationId = n.getId();

        Duration backoff = SIM_RETRY_POLICY.backoffFor(n.getAttemptCount());
        SimEvent event = newSimEvent(step, "FORCED_FAILURE", "PUSH delivery failed — retrying",
                "The PUSH channel is forced to fail in this sandbox. Attempt " + n.getAttemptCount()
                        + " failed (" + n.getLastError() + "); status is now " + n.getStatus()
                        + " with a " + backoff.toMillis() + "ms backoff before the next attempt.",
                "WARNING")
                .addDetail("notificationId", n.getId())
                .addDetail("attemptCount", n.getAttemptCount())
                .addDetail("status", n.getStatus().name())
                .addDetail("backoffMillis", backoff.toMillis());
        simEvents.add(event);

        return stepResult(n, event);
    }

    public synchronized Map<String, Object> simRetryOutcome(int step) {
        Notification n = requireSimInFlight();
        dispatchToTerminal(simRepository, simChannelFactory, SIM_RETRY_POLICY, n, true);

        SimEvent event = newSimEvent(step, "RETRY_OUTCOME", "Retry sequence resolved",
                "After " + n.getAttemptCount() + " total attempt(s) against the always-failing PUSH "
                        + "channel, the notification reached a terminal state: " + n.getStatus() + ".",
                n.getStatus() == NotificationStatus.SENT ? "SUCCESS" : "ERROR")
                .addDetail("notificationId", n.getId())
                .addDetail("attemptCount", n.getAttemptCount())
                .addDetail("finalStatus", n.getStatus().name());
        simEvents.add(event);

        return stepResult(n, event);
    }

    public synchronized Map<String, Object> simSendDuplicate(int step) {
        String key = "SIM-DUP-DEMO";
        Notification first = createAndClaim(simRepository, simIdempotencyLocks, simIdempotencyIndex,
                SIM_RECIPIENT_ID, NotificationType.TRANSACTIONAL, ChannelType.EMAIL, null,
                Map.of("orderId", "ORD-9001"), key, null);
        if (first.getStatus() == NotificationStatus.PENDING) {
            dispatchToTerminal(simRepository, simChannelFactory, SIM_RETRY_POLICY, first, false);
        }
        Notification duplicate = createAndClaim(simRepository, simIdempotencyLocks, simIdempotencyIndex,
                SIM_RECIPIENT_ID, NotificationType.TRANSACTIONAL, ChannelType.EMAIL, null,
                Map.of("orderId", "ORD-9001"), key, null);

        boolean sameNotification = first.getId().equals(duplicate.getId());
        SimEvent event = newSimEvent(step, "DUPLICATE", "Duplicate idempotency key rejected",
                "Sending the same idempotencyKey (" + key + ") twice resolved to the same "
                        + "notification (id " + duplicate.getId() + ") both times — the second call never "
                        + "created a new notification or touched a channel.", "SUCCESS")
                .addDetail("notificationId", first.getId())
                .addDetail("sameNotificationBothTimes", sameNotification)
                .addDetail("status", duplicate.getStatus().name());
        simEvents.add(event);

        return stepResult(duplicate, event);
    }

    /** The core concurrency demonstration: two callers race to send with the identical
     * idempotency key at the same instant. This exercises the exact race the per-key lock in
     * {@link #createAndClaim} exists to close. */
    public synchronized Map<String, Object> simConcurrentDuplicateRace(int step) {
        String key = "SIM-RACE-" + step;
        int racers = 2;
        ExecutorService pool = Executors.newFixedThreadPool(racers);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(racers);
        List<Long> resultIds = new CopyOnWriteArrayList<>();

        for (int i = 0; i < racers; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    Notification n = createAndClaim(simRepository, simIdempotencyLocks, simIdempotencyIndex,
                            SIM_RECIPIENT_ID, NotificationType.ALERT, ChannelType.WHATSAPP, null,
                            Map.of("alert", "Race demo"), key, null);
                    resultIds.add(n.getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        try {
            done.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        pool.shutdown();

        long distinctIds = resultIds.stream().distinct().count();
        Notification winner = simRepository.findById(resultIds.get(0));
        if (winner.getStatus() == NotificationStatus.PENDING) {
            dispatchToTerminal(simRepository, simChannelFactory, SIM_RETRY_POLICY, winner, false);
        }

        SimEvent event = newSimEvent(step, "RACE", "Two concurrent sends, one idempotency key",
                racers + " threads called send() at the same instant with idempotencyKey=" + key
                        + " — all " + racers + " resolved to the same notification id ("
                        + resultIds.get(0) + "); exactly one notification was ever created.",
                distinctIds == 1 ? "SUCCESS" : "ERROR")
                .addDetail("idempotencyKey", key)
                .addDetail("resultIds", resultIds)
                .addDetail("distinctNotificationIds", distinctIds)
                .addDetail("status", winner.getStatus().name());
        simEvents.add(event);

        return stepResult(winner, event);
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("recipient", Map.of("id", SIM_RECIPIENT_ID, "name", simRepository.getRecipientName(SIM_RECIPIENT_ID)));
        snapshot.put("notifications", simRepository.findAll());
        snapshot.put("preferences", simRepository.getPreferences(SIM_RECIPIENT_ID));
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    private Notification requireSimInFlight() {
        Notification n = simInFlightNotificationId != null ? simRepository.findById(simInFlightNotificationId) : null;
        if (n == null) {
            throw new NotificationNotFoundException("No sim notification in flight — run the forced-failure step first");
        }
        return n;
    }

    private Map<String, Object> stepResult(Notification n, SimEvent event) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("notification", n);
        result.put("event", event);
        return result;
    }

    private SimEvent newSimEvent(int step, String type, String title, String description, String status) {
        return SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step)
                .eventType(type)
                .title(title)
                .description(description)
                .status(status)
                .build();
    }
}
