package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import javax.tools.ToolProvider;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles exactly the four displayed Java files; no Spring context or servers. */
class ActivityDiagramLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.activity.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    private static URLClassLoader loader;
    private static Class<?> serviceType, requestType, resultType;

    @BeforeAll
    static void compileCanonicalSourcesWithJava17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "Run using JDK 17 or newer");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String file : List.of("BookingRequest.java", "BookingResult.java", "RoomBookingService.java", "ActivityDemo.java")) {
            args.add(EXAMPLES.resolve("activity").resolve(file).toString());
        }
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        serviceType = loader.loadClass(PACKAGE + "RoomBookingService");
        requestType = loader.loadClass(PACKAGE + "BookingRequest");
        resultType = loader.loadClass(PACKAGE + "BookingResult");
    }

    @AfterAll
    static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    private Object service() throws Exception { return serviceType.getConstructor().newInstance(); }
    private Object request(String room, int attendees) throws Exception {
        return requestType.getConstructor(String.class, int.class).newInstance(room, attendees);
    }
    private Object book(Object service, Object request) throws Exception {
        return serviceType.getMethod("request", requestType).invoke(service, request);
    }
    private Object read(Object target, String accessor) throws Exception {
        return target.getClass().getMethod(accessor).invoke(target);
    }
    private void outcome(Object result, String status, String message) throws Exception {
        assertEquals(status, read(result, "status"));
        assertEquals(message, read(result, "message"));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 4})
    void vacantSlotAcceptsBothCapacityBoundariesAndStoresExactlyTheSuppliedRecord(int attendees) throws Exception {
        Object service = service(), request = request("R1", attendees);
        assertEquals(true, read(service, "available"));
        assertNull(read(service, "booking"));
        outcome(book(service, request), "CONFIRMED", "Room reserved");
        assertSame(request, read(service, "booking"));
        assertEquals("R1", read(request, "roomId"));
        assertEquals(attendees, read(request, "attendees"));
        assertEquals(false, read(service, "available"));
    }

    @Test
    void invalidInputsRejectOnFreeAndOccupiedSlotsWithoutChangingTheEarlierState() throws Exception {
        List<Object> invalid = Arrays.asList(null, request(null, 2), request("", 2), request(" ", 2),
                request("r1", 2), request(" R1 ", 2), request("R2", 2), request("R1", 0),
                request("R1", -1), request("R1", 5), request("R1", Integer.MIN_VALUE), request("R1", Integer.MAX_VALUE));
        Object free = service(), occupied = service(), original = request("R1", 2);
        book(occupied, original);
        for (Object input : invalid) {
            outcome(book(free, input), "REJECTED_INVALID", "Use R1 with 1..4 attendees");
            assertNull(read(free, "booking"));
            assertEquals(true, read(free, "available"));
            // Invalid while occupied must remain INVALID, proving validation precedence.
            outcome(book(occupied, input), "REJECTED_INVALID", "Use R1 with 1..4 attendees");
            assertSame(original, read(occupied, "booking"));
            assertEquals("R1", read(original, "roomId"));
            assertEquals(2, read(original, "attendees"));
            assertEquals(false, read(occupied, "available"));
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 3, 4})
    void validSecondRequestsRejectWithoutOverwritingAnOccupiedSlot(int attendees) throws Exception {
        Object service = service(), original = request("R1", 2);
        book(service, original);
        Object attempt = request("R1", attendees);
        outcome(book(service, attempt), "REJECTED_UNAVAILABLE", "Slot already booked");
        assertSame(original, read(service, "booking"));
        assertNotSame(attempt, read(service, "booking"));
        assertEquals(2, read(read(service, "booking"), "attendees"));
        assertEquals(false, read(service, "available"));
    }

    @Test
    void badOverlappingGuardHasAConcreteWitnessButIsNotTheImplementedWorkflow() throws Exception {
        Object service = service();
        // Hypothetical [valid OR available] and [not valid] would both permit this input.
        // The real source first rejects null; no invalid request can reach its assignment.
        var validation = serviceType.getDeclaredMethod("isValid", requestType);
        validation.setAccessible(true);
        boolean valid = (boolean) validation.invoke(service, (Object) null);
        boolean available = (boolean) read(service, "available");
        assertFalse(valid);
        assertTrue(valid || available);
        assertTrue(!valid);
        outcome(book(service, null), "REJECTED_INVALID", "Use R1 with 1..4 attendees");
        assertNull(read(service, "booking"));
    }

    @Test
    void recordShapeSupportsTheClassViewButNeitherRecordsNorIndependentServicesEnforceGlobalAvailability() throws Exception {
        assertTrue(requestType.isRecord());
        assertTrue(resultType.isRecord());
        assertEquals(List.of("roomId:String", "attendees:int"), Arrays.stream(requestType.getRecordComponents())
                .map(component -> component.getName() + ":" + component.getType().getSimpleName()).toList());
        assertEquals(List.of("status:String", "message:String"), Arrays.stream(resultType.getRecordComponents())
                .map(component -> component.getName() + ":" + component.getType().getSimpleName()).toList());
        assertEquals(requestType, serviceType.getDeclaredField("booking").getType());
        assertEquals(1, serviceType.getDeclaredFields().length);
        Object first = service(), second = service(), shared = request("R1", 2);
        outcome(book(first, shared), "CONFIRMED", "Room reserved");
        outcome(book(second, shared), "CONFIRMED", "Room reserved");
        assertSame(read(first, "booking"), read(second, "booking"), "No exclusive ownership or global slot registry");
        Object raw = request(null, -1);
        assertNull(read(raw, "roomId"), "Input record construction does not validate the business request");
        assertEquals(-1, read(raw, "attendees"));
    }

    @Test
    void allThirtyFiveRecordedScalarsMatchIndependentExecutionOfTheFiveScenarios() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("activity-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        Object service = service();
        assertSnapshot(snapshots.get(0), observe(service, null));
        assertSnapshot(snapshots.get(1), observe(service, request("R1", 2)));
        assertSnapshot(snapshots.get(2), observe(service, request("R1", 1)));
        assertSnapshot(snapshots.get(3), observe(service, request("R2", 3)));
        assertSnapshot(snapshots.get(4), observe(service(), request("R1", 4)));
    }

    private Map<String, Object> observe(Object service, Object request) throws Exception {
        Object result = book(service, request), booking = read(service, "booking");
        var actual = new LinkedHashMap<String, Object>();
        actual.put("request room", request == null ? null : read(request, "roomId"));
        actual.put("requested attendees", request == null ? null : read(request, "attendees"));
        actual.put("status", read(result, "status"));
        actual.put("message", read(result, "message"));
        actual.put("booked room", booking == null ? null : read(booking, "roomId"));
        actual.put("booked attendees", booking == null ? null : read(booking, "attendees"));
        actual.put("available", read(service, "available"));
        return actual;
    }

    private void assertSnapshot(JsonNode snapshot, Map<String, Object> actual) {
        assertEquals(1, snapshot.path("items").size());
        var fields = JSON.createObjectNode();
        for (JsonNode field : snapshot.path("items").get(0).path("fields")) {
            String name = field.path("name").asText();
            assertFalse(fields.has(name), "Duplicate recorded field");
            assertTrue(field.path("value").isValueNode(), "Every recorded field must be scalar");
            fields.set(name, field.get("value"));
        }
        assertEquals(JSON.valueToTree(actual), fields, snapshot.path("title").asText());
    }

    @Test
    void postReturnConsoleTraceExactlyMatchesTheDisplayedOutput() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "ActivityDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("activity-output.txt")).replace("\r\n", "\n"), actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }
}
