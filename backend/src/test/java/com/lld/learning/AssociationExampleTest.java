package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.uber.model.Driver;
import com.lld.uber.model.DriverStatus;
import com.lld.uber.model.Ride;
import com.lld.uber.model.VehicleType;
import com.lld.uber.repository.UberRepository;
import com.lld.uber.service.DriverAssignmentService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the canonical browser examples and checks every recorded state against their objects. */
class AssociationExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.association.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> tutorType;
    private static Class<?> learnerType;
    private Object mira;
    private Object noor;
    private Object sol;
    private Object ada;
    private Object ben;

    @BeforeAll
    static void compileDisplayedJava() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 required");
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-d", classes.toString(),
                EXAMPLES.resolve("association/AssociationTutor.java").toString(),
                EXAMPLES.resolve("association/AssociationLearner.java").toString(),
                EXAMPLES.resolve("association/AssociationDemo.java").toString()));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        tutorType = loader.loadClass(PACKAGE + "AssociationTutor");
        learnerType = loader.loadClass(PACKAGE + "AssociationLearner");
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    @BeforeEach
    void constructTheDemoObjects() throws Exception {
        mira = tutor("Mira", "Java");
        noor = tutor("Noor", "Java");
        sol = tutor("Sol", "SQL");
        ada = learner("Ada", "Java");
        ben = learner("Ben", "Java");
    }

    private Object tutor(String name, String subject) throws Exception {
        return tutorType.getConstructor(String.class, String.class).newInstance(name, subject);
    }

    private Object learner(String name, String subject) throws Exception {
        return learnerType.getConstructor(String.class, String.class).newInstance(name, subject);
    }

    private Object call(Object target, String method) throws Exception {
        return target.getClass().getMethod(method).invoke(target);
    }

    private void assign(Object learner, Object tutor) throws Exception {
        learnerType.getMethod("assignTutor", tutorType).invoke(learner, tutor);
    }

    @Test
    void constructorsTrimRequiredNamesAndSubjectsWithoutCreatingAnyTutorLink() throws Exception {
        Object tutor = tutor(" Mira ", " Java ");
        Object learner = learner(" Ada ", " Java ");
        assertEquals("Mira", call(tutor, "getName"));
        assertEquals("Java", call(tutor, "getSubject"));
        assertEquals("Ada", call(learner, "getName"));
        assertEquals("Java", call(learner, "getSubject"));
        assertNull(call(learner, "getTutor"));
        assign(learner, tutor);
        assertEquals("Ada -> Mira (Java)", call(learner, "describeAssignment"));
    }

    @Test
    void bothClassesRejectMissingNamesOrSubjects() {
        for (Class<?> type : List.of(tutorType, learnerType)) {
            for (String bad : new String[]{null, "", "   "}) {
                for (String[] values : new String[][]{{bad, "Java"}, {"Name", bad}}) {
                    var failure = assertThrows(InvocationTargetException.class,
                            () -> type.getConstructor(String.class, String.class).newInstance((Object[]) values));
                    assertInstanceOf(IllegalArgumentException.class, failure.getCause());
                }
            }
        }
    }

    @Test
    void multipleLearnersCanShareTheExactTutorWithoutAReverseReference() throws Exception {
        for (Object person : List.of(ada, ben, learner("Cy", "Java"))) {
            assign(person, mira);
            assertSame(mira, call(person, "getTutor"));
        }
        assertEquals(Object.class, learnerType.getSuperclass());
        assertEquals(Object.class, tutorType.getSuperclass());
        assertEquals(tutorType, learnerType.getDeclaredField("tutor").getType());
        assertTrue(Arrays.stream(tutorType.getDeclaredFields()).allMatch(field -> field.getType() == String.class),
                "the tutor must not acquire a reverse directory in this one-way example");
        assertThrows(NoSuchMethodException.class, () -> tutorType.getMethod("getLearners"));
    }

    @Test
    void reassignmentChangesOneFieldAndDoesNotRedirectExistingAliases() throws Exception {
        assign(ada, mira);
        assign(ben, mira);
        Object saved = call(ada, "getTutor");
        assign(ada, noor);
        assertSame(noor, call(ada, "getTutor"));
        assertSame(mira, call(ben, "getTutor"));
        assertSame(mira, saved);
        assertNotSame(call(ada, "getTutor"), call(ben, "getTutor"));
        assertEquals("Mira (Java)", call(saved, "describe"));
        assign(ada, noor);
        assertSame(noor, call(ada, "getTutor"), "reassigning the same instance is valid");
    }

    @Test
    void equalNamesDoNotMakeTwoTutorsTheSameObject() throws Exception {
        Object anotherMira = tutor("Mira", "Java");
        assign(ada, mira);
        assign(ben, anotherMira);
        assertEquals(call(mira, "describe"), call(anotherMira, "describe"));
        assertNotSame(call(ada, "getTutor"), call(ben, "getTutor"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SQL", "java", "JavaScript"})
    void subjectValidationRejectsIncompatibleAssignmentsBeforeReplacingTheOldLink(String subject) throws Exception {
        Object candidate = tutor("Other", subject);
        var firstFailure = assertThrows(InvocationTargetException.class, () -> assign(ada, candidate));
        assertInstanceOf(IllegalArgumentException.class, firstFailure.getCause());
        assertNull(call(ada, "getTutor"));
        assign(ada, noor);
        var secondFailure = assertThrows(InvocationTargetException.class, () -> assign(ada, candidate));
        assertInstanceOf(IllegalArgumentException.class, secondFailure.getCause());
        assertEquals("Tutor subject must match Java", secondFailure.getCause().getMessage());
        assertSame(noor, call(ada, "getTutor"));
    }

    @Test
    void nullAssignmentIsRejectedWhileExplicitClearingIsValidAndIdempotent() throws Exception {
        var unassignedFailure = assertThrows(InvocationTargetException.class, () -> assign(ada, null));
        assertInstanceOf(IllegalArgumentException.class, unassignedFailure.getCause());
        assertNull(call(ada, "getTutor"));
        assign(ada, mira);
        var assignedFailure = assertThrows(InvocationTargetException.class, () -> assign(ada, null));
        assertEquals("Tutor is required; use clearTutor to unassign", assignedFailure.getCause().getMessage());
        assertSame(mira, call(ada, "getTutor"));
        call(ada, "clearTutor");
        call(ada, "clearTutor");
        assertNull(call(ada, "getTutor"));
        assertEquals("Ada -> unassigned", call(ada, "describeAssignment"));
        assertEquals("Mira (Java)", call(mira, "describe"));
        assign(ada, noor);
        assertSame(noor, call(ada, "getTutor"), "clearing does not end the learner's lifecycle");
    }

    @Test
    void allIllustratedScalarsMatchTheActualJavaStatesInTheRecordedOrder() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("association-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        JsonNode before = snapshots.get(0).get("items");
        for (int i = 0; i < 2; i++) {
            Object person = List.of(ada, ben).get(i);
            assertField(before.get(i), "name", call(person, "getName"));
            assertField(before.get(i), "subject", call(person, "getSubject"));
            assertAssignment(before.get(i), person);
        }
        assign(ada, mira);
        assign(ben, mira);
        JsonNode shared = snapshots.get(1).get("items");
        assertAssignment(shared.get(0), ada);
        assertAssignment(shared.get(1), ben);
        assertField(shared.get(2), "name", call(mira, "getName"));
        assertField(shared.get(2), "subject", call(mira, "getSubject"));
        assertField(shared.get(2), "ada.tutor == ben.tutor", call(ada, "getTutor") == call(ben, "getTutor"));
        Object saved = call(ada, "getTutor");
        assign(ada, noor);
        JsonNode replaced = snapshots.get(2).get("items");
        assertAssignment(replaced.get(0), ada);
        assertAssignment(replaced.get(1), ben);
        assertField(replaced.get(2), "description", call(saved, "describe"));
        assertField(replaced.get(2), "saved == ben.tutor", saved == call(ben, "getTutor"));
        assertField(replaced.get(2), "ada.tutor == ben.tutor", call(ada, "getTutor") == call(ben, "getTutor"));
        var rejection = assertThrows(InvocationTargetException.class, () -> assign(ada, sol));
        JsonNode rejected = snapshots.get(3).get("items");
        assertField(rejected.get(0), "candidate", call(sol, "describe"));
        assertField(rejected.get(0), "outcome", rejection.getCause().getClass().getSimpleName());
        assertField(rejected.get(0), "message", rejection.getCause().getMessage());
        assertAssignment(rejected.get(1), ada);
        assertAssignment(rejected.get(2), ben);
        call(ada, "clearTutor");
        call(ben, "clearTutor");
        JsonNode cleared = snapshots.get(4).get("items");
        assertAssignment(cleared.get(0), ada);
        assertAssignment(cleared.get(1), ben);
        assertField(cleared.get(2), "description", call(mira, "describe"));
        assertField(cleared.get(3), "description", call(noor, "describe"));
    }

    @Test
    void displayedOutputMatchesTheCanonicalDemoProcess() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "AssociationDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertEquals(Files.readAllLines(EXAMPLES.resolve("association-output.txt")), output.lines().toList());
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "void link(AssociationLearner l, AssociationTutor t) { l.tutor = t; }",
            "void reverse(AssociationTutor t) { t.getLearners(); }",
            "void wrongType(AssociationLearner l) { l.assignTutor(\"Mira\"); }"
    })
    void compilerRejectsBypassingThePrivateLinkInventingReverseNavigationOrPassingAName(String member) throws Exception {
        Path source = scratch.resolve("AssociationProbe.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class AssociationProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call());
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(entry -> entry.getKind() == Diagnostic.Kind.ERROR));
        }
    }

    @Test
    void linkedUberSourceStoresAnExistingDriverAndReleasePreservesHistoricalReferences() {
        UberRepository repository = new UberRepository();
        Driver driver = new Driver("D1", "Mira", "000", VehicleType.UBER_GO, "CAR1", null);
        repository.registerDriver(driver);
        DriverAssignmentService assignment = new DriverAssignmentService(repository);
        Ride first = new Ride("R1", "U1", null, null, 1.0, 37.0, VehicleType.UBER_GO);
        repository.saveRide(first);
        assignment.assign(first, "D1");
        assertSame(driver, first.getDriver());
        assertEquals("D1", first.getDriverId());
        assertEquals(DriverStatus.ON_TRIP, driver.getStatus());
        assignment.release("D1", null);
        assertEquals(DriverStatus.AVAILABLE, driver.getStatus());
        assertSame(driver, first.getDriver());
        assertSame(driver, repository.getDriver("D1"));
        Ride second = new Ride("R2", "U2", null, null, 1.0, 37.0, VehicleType.UBER_GO);
        repository.saveRide(second);
        assignment.assign(second, "D1");
        assertSame(driver, second.getDriver());
        assertSame(first.getDriver(), second.getDriver());
    }

    private void assertAssignment(JsonNode item, Object learner) throws Exception {
        assertField(item, "assignment", call(learner, "describeAssignment"));
    }

    private void assertField(JsonNode item, String name, Object actual) {
        for (JsonNode field : item.get("fields")) {
            if (field.get("name").asText().equals(name)) {
                assertEquals(JSON.valueToTree(actual), field.get("value"), item.get("label") + ": " + name);
                return;
            }
        }
        fail("Missing illustrated field: " + name);
    }
}
