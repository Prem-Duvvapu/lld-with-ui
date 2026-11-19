package com.lld.atm.service;

import com.fasterxml.jackson.databind.SerializationFeature;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.atm.dispenser.DispenseMode;
import com.lld.atm.exception.*;
import com.lld.atm.model.*;
import com.lld.config.DomainException;
import com.lld.config.ErrorResponse;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.time.Clock;
import java.util.*;
import java.util.function.Supplier;

/** In-memory terminal coordination. Every method runs under AtmService's terminal lock. */
final class AtmLiveSessionCoordinator {
    static final long LEASE_MILLIS = 10 * 60 * 1000;
    static final int MAX_OUTCOMES = 1024;
    private static final ObjectMapper JSON = new ObjectMapper().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    private final AtmService atm;
    private final Clock clock;
    private final String bootId = UUID.randomUUID().toString();
    private final LinkedHashMap<Key, Outcome> outcomes = new LinkedHashMap<>();
    private String owner;
    private long revision;
    private long lastActivity;
    private record Key(String token, String request) {}
    private record Outcome(String fingerprint, Object result, RuntimeException failure) {}

    AtmLiveSessionCoordinator(AtmService atm, Clock clock) {
        this.atm = atm; this.clock = clock; this.lastActivity = clock.millis();
    }
    boolean hasOwner() { return owner != null; }
    void legacyChanged() { revision++; lastActivity = clock.millis(); }

    Map<String, Object> state(String token) {
        uuid(token, "Session identifier"); expire();
        return snapshot(token);
    }

    Map<String, Object> command(String token, String requestId, Map<String, Object> body) {
        uuid(token, "Session identifier"); uuid(requestId, "Request identifier");
        if (body == null) throw new InvalidAtmRequestException("A command body is required");
        String operation = string(body, "operation");
        if (!Set.of("insert", "authenticate", "withdraw", "deposit", "eject").contains(operation))
            throw new InvalidAtmRequestException("Unknown terminal operation");
        String expectedBoot = string(body, "bootId");
        Object version = body.get("expectedRevision");
        if (!(version instanceof Integer || version instanceof Long) || ((Number) version).longValue() < 0)
            throw new InvalidAtmRequestException("expectedRevision must be a nonnegative integer");
        if (!(body.get("payload") instanceof Map<?, ?> values))
            throw new InvalidAtmRequestException("payload must be an object");
        Map<String, Object> payload = new LinkedHashMap<>();
        values.forEach((key, value) -> { if (key instanceof String name) payload.put(name, value); });
        expire();
        Key key = new Key(token, requestId);
        String fingerprint = fingerprint(body);
        Outcome previous = outcomes.get(key);
        if (previous != null) {
            if (!previous.fingerprint.equals(fingerprint))
                throw new AtmSessionConflictException("This request identifier already belongs to a different command");
            if (previous.failure != null) throw previous.failure;
            return reply(token, requestId, previous.result, true);
        }
        if (!bootId.equals(expectedBoot))
            throw new AtmSessionConflictException("The ATM restarted. Refresh its state before starting a new session");
        if (revision != ((Number) version).longValue())
            throw new AtmSessionConflictException("The terminal changed. Refresh its state before another command");
        if (operation.equals("insert")) {
            if (owner != null || atm.getCurrentState() != ATMState.IDLE)
                throw new AtmSessionConflictException("This terminal is in use. Refresh and wait for its session to end");
        } else if (!token.equals(owner)) {
            throw new AtmSessionConflictException("This browser does not own the active ATM session");
        }
        if (operation.equals("insert")) owner = token;
        Object result = null; RuntimeException failure = null;
        try {
            result = atm.coordinated(() -> execute(operation, payload));
        } catch (RuntimeException error) {
            failure = error instanceof DomainException || error instanceof AtmOperationUncertainException
                    ? error : new AtmOperationUncertainException(error);
        } finally {
            revision++;
            lastActivity = clock.millis();
            if (atm.getCurrentState() == ATMState.IDLE) owner = null;
        }
        outcomes.put(key, new Outcome(fingerprint, copy(result), failure));
        if (outcomes.size() > MAX_OUTCOMES) outcomes.remove(outcomes.keySet().iterator().next());
        // Every admitted attempt advances revision. An evicted/restarted old request cannot
        // become a new money operation: its original boot/revision admission is then stale.
        if (failure != null) throw failure;
        return reply(token, requestId, result, false);
    }

    Map<String, Object> outcome(String token, String requestId) {
        uuid(token, "Session identifier"); uuid(requestId, "Request identifier"); expire();
        Outcome outcome = outcomes.get(new Key(token, requestId));
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", outcome == null ? "NOT_FOUND" : "FOUND");
        Map<String, Object> detail = null;
        if (outcome != null) {
            detail = new LinkedHashMap<>();
            detail.put("httpStatus", outcome.failure == null ? 200 : status(outcome.failure));
            if (outcome.failure == null) detail.put("result", copy(outcome.result));
            else {
                detail.put("error", ErrorResponse.messageOf(outcome.failure));
                detail.put("code", outcome.failure.getClass().getSimpleName());
            }
        }
        response.put("outcome", detail); response.put("snapshot", snapshot(token));
        return response;
    }

    private Object execute(String operation, Map<String, Object> payload) {
        return switch (operation) {
            case "insert" -> atm.insertCard(string(payload, "cardNumber"));
            case "authenticate" -> atm.authenticateSnapshot(string(payload, "cardNumber"), string(payload, "pin"));
            case "withdraw" -> atm.withdraw(string(payload, "accountNumber"), amount(payload), mode(payload));
            case "deposit" -> atm.deposit(string(payload, "accountNumber"), amount(payload), null);
            case "eject" -> atm.ejectCard();
            default -> throw new InvalidAtmRequestException("Unknown terminal operation");
        };
    }

    private void expire() {
        if (atm.getCurrentState() != ATMState.IDLE && clock.millis() - lastActivity >= LEASE_MILLIS) {
            atm.coordinated(atm::ejectCard); owner = null; revision++; lastActivity = clock.millis();
        }
    }

    private Map<String, Object> reply(String token, String request, Object result, boolean replayed) {
        Map<String, Object> reply = new LinkedHashMap<>();
        reply.put("requestId", request); reply.put("replayed", replayed);
        reply.put("result", copy(result)); reply.put("snapshot", snapshot(token)); return reply;
    }

    private Map<String, Object> snapshot(String token) {
        return atm.coordinated(() -> {
            ATMState phase = atm.getCurrentState();
            boolean mine = token.equals(owner);
            Account account = mine && phase == ATMState.AUTHENTICATED ? atm.getActiveAccount() : null;
            Card card = mine ? atm.getActiveCard() : null;
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("state", mine || phase == ATMState.IDLE ? phase.name() : "BUSY");
            snapshot.put("owned", mine); snapshot.put("bootId", bootId); snapshot.put("revision", revision);
            snapshot.put("expiresAt", phase == ATMState.IDLE ? null : lastActivity + LEASE_MILLIS);
            snapshot.put("pinAttemptsRemaining", card == null ? null : Math.max(0, 3 - card.getFailedPinAttempts()));
            snapshot.put("cardNumber", card == null ? null : card.getCardNumber());
            snapshot.put("account", account);
            snapshot.put("transactions", account == null ? List.of() : atm.getTransactions(account.getAccountNumber()));
            snapshot.put("dispenser", atm.getDispenserSnapshot());
            return snapshot;
        });
    }

    private static String fingerprint(Map<String, Object> body) {
        try {
            byte[] bytes = JSON.valueToTree(body).toString().getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private static int status(RuntimeException failure) {
        ResponseStatus annotation = AnnotationUtils.findAnnotation(failure.getClass(), ResponseStatus.class);
        if (annotation != null) return annotation.value().value();
        if (failure instanceof DomainException || failure instanceof IllegalArgumentException || failure instanceof IllegalStateException) return 400;
        return 500;
    }
    private static void uuid(String value, String name) {
        if (value == null || !value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))
            throw new InvalidAtmRequestException(name + " must be a UUID");
    }
    private static String string(Map<String, Object> values, String field) {
        if (values.get(field) instanceof String value && !value.isBlank()) return value;
        throw new InvalidAtmRequestException("'" + field + "' must be a nonblank string");
    }
    private static double amount(Map<String, Object> values) {
        if (values.get("amount") instanceof Number number && Double.isFinite(number.doubleValue())) return number.doubleValue();
        throw new InvalidAtmRequestException("'amount' must be a finite JSON number");
    }
    private static DispenseMode mode(Map<String, Object> values) {
        Object value = values.get("mode");
        if (value == null) return DispenseMode.MINIMIZE_NOTES;
        if (value instanceof String name) try { return DispenseMode.valueOf(name); } catch (IllegalArgumentException ignored) { /* typed below */ }
        throw new InvalidAtmRequestException("'mode' must be MINIMIZE_NOTES or CONSERVE_LARGE_NOTES");
    }
    private static Object copy(Object value) {
        if (value instanceof Transaction transaction) return transaction.detachedCopy();
        if (value instanceof Map<?, ?> values) {
            Map<Object, Object> result = new LinkedHashMap<>(); values.forEach((key, item) -> result.put(key, copy(item))); return result;
        }
        if (value instanceof List<?> list) return list.stream().map(AtmLiveSessionCoordinator::copy).toList();
        return value;
    }
}
