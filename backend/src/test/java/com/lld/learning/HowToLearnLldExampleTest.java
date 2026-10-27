package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.model.Floor;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.strategy.NearestSpotStrategy;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;
import java.lang.reflect.InvocationTargetException;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the exact optional browser Java and verifies its contracts and every recorded scalar. */
class HowToLearnLldExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.howtolearn.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> seatType;

    @BeforeAll
    static void compileTheDisplayedFilesWithJava17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 required");
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-d", classes.toString(),
                EXAMPLES.resolve("howtolearn/StudySeat.java").toString(),
                EXAMPLES.resolve("howtolearn/StudySeatDemo.java").toString()));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        seatType = loader.loadClass(PACKAGE + "StudySeat");
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    private Object seat(String id) throws Exception {
        return seatType.getConstructor(String.class).newInstance(id);
    }

    private Object read(Object seat, String method) throws Exception {
        return seatType.getMethod(method).invoke(seat);
    }

    private void request(Object seat, String method, String learnerId) throws Exception {
        seatType.getMethod(method, String.class).invoke(seat, learnerId);
    }

    private Throwable failure(org.junit.jupiter.api.function.Executable action) {
        return assertThrows(InvocationTargetException.class, action).getCause();
    }

    private void assertState(Object seat, String id, String holder) throws Exception {
        assertEquals(id, read(seat, "getSeatId"));
        assertEquals(holder, read(seat, "getReservedBy"));
        assertEquals(holder != null, read(seat, "isReserved"));
    }

    @Test
    void constructionNamesTheSeatAndStartsWithoutAReservation() throws Exception {
        assertState(seat(" S1 "), "S1", null);
        for (String invalid : new String[]{null, "", " ", "\t\n"}) {
            Throwable rejected = failure(() -> seat(invalid));
            assertInstanceOf(IllegalArgumentException.class, rejected);
            assertEquals("Seat ID is required", rejected.getMessage());
        }
    }

    @Test
    void reserveCancelAndReuseHaveTheRequiredSequentialBehavior() throws Exception {
        Object seat = seat("S1");
        request(seat, "reserve", "Ada");
        assertState(seat, "S1", "Ada");
        Throwable competing = failure(() -> request(seat, "reserve", "Ben"));
        assertInstanceOf(IllegalStateException.class, competing);
        assertEquals("Seat is already reserved", competing.getMessage());
        assertState(seat, "S1", "Ada");
        Throwable wrongHolder = failure(() -> request(seat, "cancel", "Ben"));
        assertInstanceOf(IllegalStateException.class, wrongHolder);
        assertEquals("Only the reserving learner may cancel", wrongHolder.getMessage());
        assertState(seat, "S1", "Ada");
        request(seat, "cancel", "Ada");
        assertState(seat, "S1", null);
        request(seat, "reserve", "Ben");
        assertState(seat, "S1", "Ben");
    }

    @Test
    void duplicateReservationAndCancellationOfAFreeSeatAreExplicitRejections() throws Exception {
        Object seat = seat("S1");
        Throwable free = failure(() -> request(seat, "cancel", "Ada"));
        assertInstanceOf(IllegalStateException.class, free);
        assertEquals("Seat is not reserved", free.getMessage());
        assertState(seat, "S1", null);
        request(seat, "reserve", "Ada");
        Throwable duplicate = failure(() -> request(seat, "reserve", "Ada"));
        assertInstanceOf(IllegalStateException.class, duplicate);
        assertEquals("Seat is already reserved", duplicate.getMessage());
        assertState(seat, "S1", "Ada");
        request(seat, "cancel", "Ada");
        assertInstanceOf(IllegalStateException.class, failure(() -> request(seat, "cancel", "Ada")));
        assertState(seat, "S1", null);
    }

    @Test
    void invalidIdsAreRejectedBeforeAnyStateChangeOnEitherOperation() throws Exception {
        Object seat = seat("S1");
        for (boolean occupied : List.of(false, true)) {
            if (occupied) request(seat, "reserve", "Ada");
            for (String invalid : new String[]{null, "", " ", "\t\n"}) {
                for (String method : List.of("reserve", "cancel")) {
                    Throwable rejected = failure(() -> request(seat, method, invalid));
                    assertInstanceOf(IllegalArgumentException.class, rejected);
                    assertEquals("Learner ID is required", rejected.getMessage());
                    assertState(seat, "S1", occupied ? "Ada" : null);
                }
            }
        }
    }

    @Test
    void idsUseTrimmedCaseSensitiveTextRatherThanReferenceIdentity() throws Exception {
        Object seat = seat("S1");
        request(seat, "reserve", " Ada ");
        assertState(seat, "S1", "Ada");
        assertInstanceOf(IllegalStateException.class, failure(() -> request(seat, "cancel", "ada")));
        assertState(seat, "S1", "Ada");
        request(seat, "cancel", new String(new char[]{'A', 'd', 'a'}));
        assertState(seat, "S1", null);
        request(seat, "reserve", new String(new char[]{'A', 'd', 'a'}));
        request(seat, "cancel", " Ada ");
        assertState(seat, "S1", null);
    }

    @Test
    void separateSeatsKeepIndependentStateWithoutEnforcingGlobalIdOrLearnerUniqueness() throws Exception {
        Object first = seat("S1");
        Object sameId = seat("S1");
        Object second = seat("S2");
        assertNotSame(first, sameId);
        request(first, "reserve", "Ada");
        assertState(sameId, "S1", null);
        assertState(second, "S2", null);
        request(sameId, "reserve", "Ben");
        request(second, "reserve", "Ada");
        request(first, "cancel", "Ada");
        assertState(first, "S1", null);
        assertState(sameId, "S1", "Ben");
        assertState(second, "S2", "Ada");
    }

    @Test
    void everyRecordedSnapshotFieldMatchesActualJavaBehavior() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("howtolearn-snapshots.json").toFile());
        assertEquals(6, snapshots.size());
        Object seat = seat("S1");
        assertSnapshot(snapshots.get(0), state(seat));
        request(seat, "reserve", "Ada");
        assertSnapshot(snapshots.get(1), state(seat));
        Throwable competing = failure(() -> request(seat, "reserve", "Ben"));
        assertSnapshot(snapshots.get(2), state(seat), rejectedRequest("reserve Ben", competing));
        Throwable wrongHolder = failure(() -> request(seat, "cancel", "Ben"));
        assertSnapshot(snapshots.get(3), state(seat), rejectedRequest("cancel Ben", wrongHolder));
        request(seat, "cancel", "Ada");
        assertSnapshot(snapshots.get(4), state(seat));
        request(seat, "reserve", "Ben");
        assertSnapshot(snapshots.get(5), state(seat));
    }

    private Map<String, Object> state(Object seat) throws Exception {
        var state = new LinkedHashMap<String, Object>();
        state.put("seatId", read(seat, "getSeatId"));
        state.put("reserved", read(seat, "isReserved"));
        state.put("reservedBy", read(seat, "getReservedBy"));
        return state;
    }

    private Map<String, Object> rejectedRequest(String request, Throwable failure) {
        var result = new LinkedHashMap<String, Object>();
        result.put("request", request);
        result.put("outcome", failure.getClass().getSimpleName());
        result.put("message", failure.getMessage());
        return result;
    }

    @SafeVarargs
    private final void assertSnapshot(JsonNode snapshot, Map<String, Object>... actualItems) {
        JsonNode items = snapshot.get("items");
        assertEquals(actualItems.length, items.size());
        for (int index = 0; index < actualItems.length; index++) {
            var recorded = JSON.createObjectNode();
            for (JsonNode field : items.get(index).get("fields")) {
                assertTrue(field.get("value").isValueNode(), "displayed values must be scalars");
                String name = field.get("name").asText();
                assertFalse(recorded.has(name), "field names must be unique");
                recorded.set(name, field.get("value"));
            }
            assertEquals(JSON.valueToTree(actualItems[index]), recorded,
                    snapshot.get("title").asText() + " / " + items.get(index).get("label").asText());
        }
    }

    @Test
    void displayedOutputExactlyMatchesTheCanonicalJavaDemo() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "StudySeatDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("howtolearn-output.txt")).replace("\r\n", "\n"),
                    actual.replace("\r\n", "\n"));
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "void bypass(StudySeat seat) { seat.reservedBy = \"Ben\"; }",
            "void bypass(StudySeat seat) { seat.seatId = \"S2\"; }",
            "void wrongType(StudySeat seat) { seat.reserve(42); }",
            "void inventedSetter(StudySeat seat) { seat.setReservedBy(\"Ben\"); }"
    })
    void compilerRejectsBypassingTheBoundaryAndSupplyingTheWrongType(String member) throws Exception {
        Path source = scratch.resolve("HowToLearnProbe.java");
        Files.writeString(source, "import " + PACKAGE + "StudySeat; public class HowToLearnProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call());
        }
        assertTrue(diagnostics.getDiagnostics().stream().anyMatch(entry -> entry.getKind() == Diagnostic.Kind.ERROR));
    }

    @Test
    void linkedParkingRepositorySupportsTheSequentialAllocationFailureAndReleaseTrace() {
        var repository = new ParkingLotRepository();
        ParkingSpot only = new ParkingSpot("P1", 1, 1, VehicleType.CAR);
        repository.addFloor(new Floor(1, List.of(only)));
        var nearest = new NearestSpotStrategy();
        assertSame(only, repository.occupySpot(VehicleType.CAR, nearest));
        assertTrue(only.isOccupied());
        assertNull(repository.occupySpot(VehicleType.CAR, nearest));
        assertTrue(only.isOccupied(), "an unsuccessful sequential allocation does not release the old one");
        repository.releaseSpot("P1");
        assertFalse(only.isOccupied());
        assertSame(only, repository.occupySpot(VehicleType.CAR, nearest));
        assertTrue(only.isOccupied());
    }
}
