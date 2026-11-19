package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Modifier;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the displayed Java, then checks independent boundaries as well as recorded traces. */
class StateMachineDiagramLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.statemachine.";
    private static final List<String> COMMANDS = List.of("hold", "renew", "inspect", "confirm", "expire", "cancel");
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> reservationType, stateType;

    @BeforeAll
    static void compileExactDisplayedSourcesWithRelease17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "A JDK is required");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String file : List.of("ReservationState.java", "Reservation.java", "StateMachineDemo.java")) {
            args.add(EXAMPLES.resolve("statemachine").resolve(file).toString());
        }
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        reservationType = loader.loadClass(PACKAGE + "Reservation");
        stateType = loader.loadClass(PACKAGE + "ReservationState");
    }

    @AfterAll
    static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    private Object reservation() throws Exception { return reservationType.getConstructor().newInstance(); }
    private Object read(Object r, String name) throws Exception { return reservationType.getMethod(name).invoke(r); }
    private void command(Object r, String name, long now) throws Exception {
        reservationType.getMethod(name, long.class).invoke(r, now);
    }

    private Map<String, Object> state(Object r) throws Exception {
        var values = new LinkedHashMap<String, Object>();
        values.put("state", read(r, "state").toString());
        for (String key : List.of("expiresAtMinute", "heldEntries", "heldExits", "inspections", "lastMinute")) {
            values.put(key, read(r, key));
        }
        values.put("terminated", read(r, "isTerminated"));
        return values;
    }

    private Throwable rejectUnchanged(Object r, String method, long now, Class<? extends Throwable> type,
                                      String message) throws Exception {
        Map<String, Object> before = state(r);
        Throwable cause = assertThrows(InvocationTargetException.class, () -> command(r, method, now)).getCause();
        assertInstanceOf(type, cause);
        if (message != null) assertEquals(message, cause.getMessage());
        assertEquals(before, state(r), "Every scalar must be unchanged after rejected " + method);
        return cause;
    }

    @Test
    void constructorInitialTargetAndImplementationTypesMatchTheCompanionModel() throws Exception {
        Object r = reservation();
        assertEquals("DRAFT", read(r, "state").toString());
        assertNull(read(r, "expiresAtMinute"));
        assertEquals(0L, read(r, "lastMinute"));
        assertEquals(0, read(r, "heldEntries"));
        assertEquals(0, read(r, "heldExits"));
        assertEquals(0, read(r, "inspections"));
        assertEquals(false, read(r, "isTerminated"));
        assertTrue(stateType.isEnum());
        assertNotEquals(Thread.State.class, stateType);
        assertEquals(List.of("DRAFT", "HELD", "CONFIRMED", "CANCELLED"),
                java.util.Arrays.stream(stateType.getEnumConstants()).map(Object::toString).toList());
        assertEquals(10L, reservationType.getField("HOLD_MINUTES").get(null));
        assertTrue(Modifier.isFinal(reservationType.getModifiers()));
        assertEquals(stateType, reservationType.getDeclaredField("state").getType());
        assertTrue(Modifier.isPrivate(reservationType.getDeclaredField("state").getModifiers()));
        assertEquals(Long.class, reservationType.getDeclaredField("expiresAtMinute").getType());
    }

    @Test
    void internalInspectionAndExternalRenewalHaveDifferentObservableEffects() throws Exception {
        Object r = reservation();
        command(r, "hold", 0);
        assertEquals(10L, read(r, "expiresAtMinute"));
        command(r, "inspect", 1);
        assertEquals(1, read(r, "heldEntries"));
        assertEquals(0, read(r, "heldExits"));
        assertEquals(1, read(r, "inspections"));
        assertEquals(10L, read(r, "expiresAtMinute"));
        command(r, "renew", 2);
        assertEquals("HELD", read(r, "state").toString());
        assertEquals(2, read(r, "heldEntries"));
        assertEquals(1, read(r, "heldExits"));
        assertEquals(1, read(r, "inspections"));
        assertEquals(12L, read(r, "expiresAtMinute"));
        command(r, "inspect", 2); // Equal logical inputs are allowed.
        assertEquals(2L, read(r, "lastMinute"));
        assertEquals(2, read(r, "inspections"));
        command(r, "confirm", 11);
        assertEquals("CONFIRMED", read(r, "state").toString());
        assertEquals(2, read(r, "heldExits"));
        assertEquals(true, read(r, "isTerminated"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"inspect", "renew", "confirm"})
    void strictDeadlineGuardAcceptsLastMinuteButRejectsEqualityAndLaterWithoutMutation(String method) throws Exception {
        Object before = reservation();
        command(before, "hold", 100);
        command(before, method, 109);
        assertEquals(109L, read(before, "lastMinute"));
        for (long now : new long[]{110, 111, Long.MAX_VALUE}) {
            Object r = reservation();
            command(r, "hold", 100);
            rejectUnchanged(r, method, now, IllegalStateException.class, "Hold expired");
            assertEquals(false, read(r, "isTerminated"), "A rejected command does not dispatch expiry");
        }
    }

    @Test
    void expiryRequiresAnExplicitCommandAtOrAfterDeadlineAndCancellationHasNoUnexpiredGuard() throws Exception {
        for (long now : new long[]{110, 111}) {
            Object r = reservation();
            command(r, "hold", 100);
            rejectUnchanged(r, "expire", 109, IllegalStateException.class, "Hold not expired");
            command(r, "expire", now);
            assertEquals("CANCELLED", read(r, "state").toString());
            assertEquals(1, read(r, "heldExits"));
            assertEquals(110L, read(r, "expiresAtMinute"), "Completion retains historical data");
        }
        for (long now : new long[]{100, 110, 111}) {
            Object held = reservation();
            command(held, "hold", 100);
            command(held, "cancel", now);
            assertEquals("CANCELLED", read(held, "state").toString());
            assertEquals(1, read(held, "heldExits"));
        }
        Object draft = reservation();
        command(draft, "cancel", 0);
        assertEquals("CANCELLED", read(draft, "state").toString());
        assertEquals(0, read(draft, "heldEntries"));
        assertEquals(0, read(draft, "heldExits"));
        assertNull(read(draft, "expiresAtMinute"));
    }

    @Test
    void invalidSourceCommandsCannotSkipOrRepeatLifecycleSteps() throws Exception {
        for (String method : List.of("inspect", "renew", "confirm", "expire")) {
            rejectUnchanged(reservation(), method, 0, IllegalStateException.class, "Expected HELD, was DRAFT");
        }
        Object r = reservation();
        command(r, "hold", 0);
        rejectUnchanged(r, "hold", 0, IllegalStateException.class, "Expected DRAFT, was HELD");
    }

    @ParameterizedTest
    @ValueSource(strings = {"hold", "renew", "inspect", "confirm", "expire", "cancel"})
    void everyCommandRejectsNegativeAndBackwardsTimeBeforeChangingAnyScalar(String method) throws Exception {
        String error = "Logical minutes must be nonnegative and nondecreasing";
        rejectUnchanged(reservation(), method, -1, IllegalArgumentException.class, error);
        Object r = reservation();
        command(r, "hold", 10);
        command(r, "inspect", 11);
        rejectUnchanged(r, method, 10, IllegalArgumentException.class, error);
        rejectUnchanged(r, method, Long.MIN_VALUE, IllegalArgumentException.class, error);
    }

    @Test
    void deadlineOverflowIsCheckedBeforeDraftMutationOrHeldExitAndMaxDeadlineIsValid() throws Exception {
        rejectUnchanged(reservation(), "hold", Long.MAX_VALUE - 9, ArithmeticException.class, null);
        rejectUnchanged(reservation(), "hold", Long.MAX_VALUE, ArithmeticException.class, null);
        Object r = reservation();
        command(r, "hold", Long.MAX_VALUE - 15); // deadline MAX - 5
        rejectUnchanged(r, "renew", Long.MAX_VALUE - 9, ArithmeticException.class, null); // Still unexpired.
        command(r, "renew", Long.MAX_VALUE - 10); // Rejection did not advance lastMinute.
        assertEquals(Long.MAX_VALUE, read(r, "expiresAtMinute"));
        assertEquals(2, read(r, "heldEntries"));
        assertEquals(1, read(r, "heldExits"));
        rejectUnchanged(r, "confirm", Long.MAX_VALUE, IllegalStateException.class, "Hold expired");
        command(r, "expire", Long.MAX_VALUE);
        assertEquals("CANCELLED", read(r, "state").toString());
        Object confirmed = reservation();
        command(confirmed, "hold", Long.MAX_VALUE - 10);
        command(confirmed, "confirm", Long.MAX_VALUE - 1);
        assertEquals("CONFIRMED", read(confirmed, "state").toString());
    }

    @Test
    void everyTerminalOutcomeRejectsAllSixCommandsAndRetainsAReadableJavaObject() throws Exception {
        for (String ending : List.of("confirm", "expire", "cancel", "cancel-draft")) {
            Object r = reservation();
            if (ending.equals("cancel-draft")) command(r, "cancel", 0);
            else {
                command(r, "hold", 0);
                command(r, ending, ending.equals("expire") ? 10 : 1);
            }
            assertEquals(true, read(r, "isTerminated"));
            for (String method : COMMANDS) {
                for (long now : new long[]{-1, 100, Long.MAX_VALUE}) {
                    rejectUnchanged(r, method, now, IllegalStateException.class, "Lifecycle terminated");
                }
            }
            assertNotNull(read(r, "state"));
        }
    }

    @Test
    void allNineSnapshotsMatchIndependentCanonicalCallsAndEveryNamedScalar() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("statemachine-snapshots.json").toFile());
        assertEquals(9, snapshots.size());
        Object r = reservation();
        assertSnapshot(snapshots.get(0), "reservation", state(r));
        command(r, "hold", 10);
        assertSnapshot(snapshots.get(1), "reservation", state(r));
        command(r, "inspect", 11);
        assertSnapshot(snapshots.get(2), "reservation", state(r));
        command(r, "renew", 12);
        assertSnapshot(snapshots.get(3), "reservation", state(r));
        String error = rejectUnchanged(r, "confirm", 22, IllegalStateException.class, "Hold expired").getMessage();
        var rejected = state(r);
        rejected.put("rejection", error);
        assertSnapshot(snapshots.get(4), "reservation", rejected);
        command(r, "expire", 22);
        assertSnapshot(snapshots.get(5), "reservation", state(r));
        error = rejectUnchanged(r, "hold", 23, IllegalStateException.class, "Lifecycle terminated").getMessage();
        rejected = state(r);
        rejected.put("rejection", error);
        assertSnapshot(snapshots.get(6), "reservation", rejected);
        Object confirmed = reservation();
        command(confirmed, "hold", 30);
        command(confirmed, "confirm", 39);
        assertSnapshot(snapshots.get(7), "confirmed", state(confirmed));
        Object cancelled = reservation();
        command(cancelled, "cancel", 0);
        assertSnapshot(snapshots.get(8), "cancelledDraft", state(cancelled));
    }

    private void assertSnapshot(JsonNode snapshot, String label, Map<String, Object> actual) throws Exception {
        assertEquals(1, snapshot.get("items").size());
        JsonNode item = snapshot.get("items").get(0);
        assertEquals(label, item.get("label").asText());
        assertEquals("Reservation", item.get("typeLabel").asText());
        var fields = JSON.createObjectNode();
        for (JsonNode field : item.get("fields")) {
            String name = field.get("name").asText();
            assertFalse(fields.has(name), "Duplicate named scalar");
            assertTrue(field.get("value").isValueNode(), "Recorded values must be scalar");
            fields.set(name, field.get("value"));
        }
        // Parse both sides as JSON so Java long/int node types do not affect equality.
        assertEquals(JSON.readTree(JSON.writeValueAsString(actual)), fields, snapshot.get("title").asText());
    }

    @Test
    void demoOutputMatchesExactDisplayedFixture() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "StateMachineDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).replace("\r\n", "\n");
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("statemachine-output.txt")).replace("\r\n", "\n"), actual);
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "class Invalid { void change(Reservation r) { r.state = ReservationState.CONFIRMED; } }",
            "class Invalid extends Reservation { }"
    })
    void callersCannotBypassTheLifecycleThroughPrivateStateOrSubclassing(String body) throws Exception {
        Path file = scratch.resolve("Invalid.java");
        Files.writeString(file, "import " + PACKAGE + "Reservation;\nimport " + PACKAGE + "ReservationState;\n" + body);
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var manager = compiler.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, manager, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, manager.getJavaFileObjects(file)).call());
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == javax.tools.Diagnostic.Kind.ERROR));
        }
    }
}
