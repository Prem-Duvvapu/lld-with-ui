package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.repository.ParkingLotRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import javax.tools.*;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Modifier;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

/** Fresh loaders isolate class state; fixtures are checked against actual Java objects. */
class StaticMembersLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.memberstate.";
    private static final List<String> SOURCES = List.of("InitializationLog.java", "StudyCounter.java", "FocusCounter.java", "MembersDemo.java");
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private URLClassLoader loader;

    @BeforeAll static void compileCanonicalJava() {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 is required");
        List<String> args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String name : SOURCES) args.add(EXAMPLES.resolve("memberstate").resolve(name).toString());
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
    }
    @BeforeEach void freshRuntimeClasses() throws Exception {
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
    }
    @AfterEach void closeLoader() throws Exception { loader.close(); }
    private Class<?> type(String name) throws Exception { return loader.loadClass(PACKAGE + name); }
    private Object counter(String name, String topic) throws Exception { return type(name).getConstructor(String.class).newInstance(topic); }
    private Object invoke(Object receiver, String method) throws Exception { return receiver.getClass().getMethod(method).invoke(receiver); }
    private Object classCall(String method) throws Exception { return type("StudyCounter").getMethod(method).invoke(null); }
    private String trace() throws Exception { return String.join(" -> ", log()); }
    @SuppressWarnings("unchecked") private List<String> log() throws Exception { return (List<String>) classCall("initializationTrace"); }

    @Test void outputMatchesFreshJavaMainWithCrLfNormalization() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "MembersDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertEquals(normalize(Files.readString(EXAMPLES.resolve("static-and-instance-output.txt"))), normalize(output));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @Test void everySnapshotFieldMatchesObjectsAtItsRecordedStage() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("static-and-instance-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        assertEquals(List.of(1, 3, 3, 2, 1), java.util.stream.StreamSupport.stream(snapshots.spliterator(), false)
                .map(snapshot -> snapshot.get("items").size()).toList());
        Object before = classCall("createdCount");
        assertItem(snapshots, 0, 0, "class state before new", "StudyCounter", Map.of(
                "DEFAULT_MINUTES", type("StudyCounter").getField("DEFAULT_MINUTES").get(null), "created", before, "trace", trace()));
        Object first = counter("StudyCounter", " Objects ");
        Object second = counter("FocusCounter", "Methods");
        assertCounter(snapshots, 1, 0, "first counter", first);
        assertCounter(snapshots, 1, 1, "second counter", second);
        assertItem(snapshots, 1, 2, "shared class state", "StudyCounter", Map.of("created", classCall("createdCount")));
        invoke(first, "complete");
        type("MembersDemo").getMethod("completeOne", type("StudyCounter")).invoke(null, first);
        assertCounter(snapshots, 2, 0, "first counter", first);
        assertCounter(snapshots, 2, 1, "second counter", second);
        assertItem(snapshots, 2, 2, "shared class state", "StudyCounter", Map.of("created", classCall("createdCount")));
        assertItem(snapshots, 3, 0, "throughBase(second)", "StudyCounter parameter", Map.of("result",
                type("MembersDemo").getMethod("throughBase", type("StudyCounter")).invoke(null, second)));
        assertItem(snapshots, 3, 1, "throughChild(second)", "FocusCounter parameter", Map.of("result",
                type("MembersDemo").getMethod("throughChild", type("FocusCounter")).invoke(null, second)));
        assertItem(snapshots, 4, 0, "initialization evidence", "StudyCounter", Map.of("created", classCall("createdCount"), "trace", trace()));
    }

    @Test void constantReadDoesNotInitializeCounterButStaticMethodUseDoes() throws Exception {
        assertEquals(List.of(List.of(), 25, List.of()), runProbe("public static Object run() { "
                + "return java.util.List.of(InitializationLog.snapshot(), StudyCounter.DEFAULT_MINUTES, InitializationLog.snapshot()); }"));
        assertEquals(0, classCall("createdCount"));
        assertEquals(List.of("class initializer"), log());
        counter("StudyCounter", "Objects");
        assertEquals(List.of("class initializer", "instance initializer", "constructor #1"), log());
    }

    @Test void nullQualifierWorksForStaticMethodAndFailsForInstanceMethod() throws Exception {
        assertEquals("study", runProbe("public static Object run() { StudyCounter absent = null; return absent.category(); }"));
        var error = assertThrows(InvocationTargetException.class, () -> runProbe(
                "public static Object run() { StudyCounter absent = null; return absent.description(); }"));
        assertInstanceOf(NullPointerException.class, error.getCause());
    }

    @Test void separateDefiningLoadersHaveIndependentClassState() throws Exception {
        counter("StudyCounter", "First loader");
        try (var other = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()})) {
            Class<?> otherCounter = other.loadClass(PACKAGE + "StudyCounter");
            assertNotSame(type("StudyCounter"), otherCounter);
            assertEquals(0, otherCounter.getMethod("createdCount").invoke(null));
            otherCounter.getConstructor(String.class).newInstance("Second loader");
            assertEquals(1, otherCounter.getMethod("createdCount").invoke(null));
            assertEquals(1, classCall("createdCount"));
        }
    }

    @Test void finalReferenceDoesNotFreezeInternalLogButReturnedSnapshotIsDetached() throws Exception {
        List<String> earlier = log();
        counter("StudyCounter", "Objects");
        assertEquals(List.of("class initializer"), earlier);
        assertEquals(3, log().size());
        assertThrows(UnsupportedOperationException.class, () -> earlier.add("external mutation"));
        var events = type("InitializationLog").getDeclaredField("EVENTS");
        assertTrue(Modifier.isStatic(events.getModifiers()));
        assertTrue(Modifier.isFinal(events.getModifiers()));
    }

    @Test void failedConstructionDoesNotCountSuccessOrRollBackInitializerSideEffects() throws Exception {
        for (String invalid : new String[]{null, " ", "\u2003"}) {
            var error = assertThrows(InvocationTargetException.class, () -> counter("StudyCounter", invalid));
            assertInstanceOf(IllegalArgumentException.class, error.getCause());
            assertEquals("Topic is required", error.getCause().getMessage());
        }
        assertEquals(0, classCall("createdCount"));
        assertEquals(List.of("class initializer", "instance initializer", "instance initializer", "instance initializer"), log());
        Object valid = counter("StudyCounter", "\u2003Objects\u2003");
        assertEquals(1, invoke(valid, "id"));
        assertEquals("Objects", invoke(valid, "topic"));
    }

    @Test void overflowDoesNotAssignWrappedInstanceState() throws Exception {
        Object first = counter("StudyCounter", "Objects");
        var completed = type("StudyCounter").getDeclaredField("completed");
        completed.setAccessible(true);
        completed.setInt(first, Integer.MAX_VALUE);
        var error = assertThrows(InvocationTargetException.class, () -> invoke(first, "complete"));
        assertInstanceOf(ArithmeticException.class, error.getCause());
        assertEquals(Integer.MAX_VALUE, invoke(first, "completed"));
        assertEquals(1, classCall("createdCount"));
    }

    @Test void laterSubclassFailureDoesNotRollBackTheCompletedBaseConstructor() throws Exception {
        var error = assertThrows(InvocationTargetException.class, () -> runProbe(
                "static class Rejected extends StudyCounter { Rejected() { super(\"Objects\"); "
                        + "throw new IllegalStateException(\"subclass rejected\"); } } "
                        + "public static Object run() { return new Rejected(); }"));
        assertInstanceOf(IllegalStateException.class, error.getCause());
        assertEquals("subclass rejected", error.getCause().getMessage());
        assertEquals(1, classCall("createdCount"));
        assertEquals(List.of("class initializer", "instance initializer", "constructor #1"), log());
    }

    @Test void fieldLookupUsesDeclaredTypeWhileInstanceMethodsDispatch() throws Exception {
        assertEquals(List.of("base field", "child field", "child method", "child method", "changed base", "child field"),
                runProbe("static class Parent { public String label = \"base field\"; "
                        + "public String description() { return \"base method\"; } } "
                        + "static class Child extends Parent { public String label = \"child field\"; "
                        + "@Override public String description() { return \"child method\"; } } "
                        + "public static Object run() { Child child = new Child(); Parent base = child; "
                        + "java.util.List<String> result = new java.util.ArrayList<>(java.util.List.of("
                        + "base.label, child.label, base.description(), child.description())); "
                        + "base.label = \"changed base\"; result.add(base.label); result.add(child.label); return result; }"));
    }

    @ParameterizedTest @ValueSource(strings = {
            "int value; public static int wrong() { return value; }",
            "public static Object wrong() { return this; }",
            "public static void wrong() { StudyCounter.complete(); }",
            "public static void wrong() { StudyCounter.DEFAULT_MINUTES = 45; }",
            "static class Broken extends StudyCounter { Broken() { super(\"X\"); } @Override public static String category() { return \"x\"; } }",
            "static class Broken extends StudyCounter { Broken() { super(\"X\"); } public String category() { return \"x\"; } }",
            "static class Broken extends StudyCounter { Broken() { super(\"X\"); } public static String description() { return \"x\"; } }",
            "static class Broken extends StudyCounter { Broken() { super(\"X\"); } public static void wrong() { complete(); } }"
    })
    void javacRejectsMissingReceiversAndConfusedMemberKinds(String members) throws Exception {
        assertFalse(compileProbe(members, Files.createTempDirectory(scratch, "invalid-")), members);
    }

    @Test void mappedParkingRepositoryActuallyOwnsCounterAndLockPerInstance() throws Exception {
        var first = new ParkingLotRepository();
        var second = new ParkingLotRepository();
        assertEquals("TKT-00001", first.generateTicketNumber());
        assertEquals("TKT-00002", first.generateTicketNumber());
        assertEquals("TKT-00001", second.generateTicketNumber());
        var lock = ParkingLotRepository.class.getDeclaredField("ticketLock");
        lock.setAccessible(true);
        assertFalse(Modifier.isStatic(lock.getModifiers()));
        assertNotSame(lock.get(first), lock.get(second));
        assertFalse(Modifier.isStatic(ParkingLotRepository.class.getDeclaredField("ticketCounter").getModifiers()));
    }

    private Object runProbe(String members) throws Exception {
        Path directory = Files.createTempDirectory(scratch, "valid-");
        assertTrue(compileProbe(members, directory), members);
        try (var probes = new URLClassLoader(new java.net.URL[]{directory.toUri().toURL()}, loader)) {
            return probes.loadClass("StaticMembersProbe").getMethod("run").invoke(null);
        }
    }
    private boolean compileProbe(String members, Path directory) throws Exception {
        Path file = directory.resolve("StaticMembersProbe.java");
        Files.writeString(file, "import " + PACKAGE + "*; public class StaticMembersProbe { " + members + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var manager = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            boolean success = compiler.getTask(null, manager, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", directory.toString()),
                    null, manager.getJavaFileObjects(file)).call();
            assertEquals(!success, diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR));
            return success;
        }
    }
    private void assertCounter(JsonNode snapshots, int step, int index, String label, Object object) throws Exception {
        assertItem(snapshots, step, index, label, object.getClass().getSimpleName(),
                Map.of("id", invoke(object, "id"), "topic", invoke(object, "topic"), "completed", invoke(object, "completed")));
    }
    private void assertItem(JsonNode snapshots, int step, int index, String label, String type, Map<String, Object> actual) {
        JsonNode item = snapshots.get(step).get("items").get(index);
        assertEquals(label, item.get("label").asText());
        assertEquals(type, item.get("typeLabel").asText());
        Map<String, JsonNode> fields = new LinkedHashMap<>();
        for (JsonNode field : item.get("fields")) {
            assertTrue(field.get("value").isValueNode());
            assertNull(fields.put(field.get("name").asText(), field.get("value")), "duplicate field");
        }
        assertEquals(JSON.valueToTree(actual), JSON.valueToTree(fields), label);
    }
    private String normalize(String text) { return text.replace("\r\n", "\n"); }
}
