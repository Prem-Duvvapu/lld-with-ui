package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import javax.tools.Diagnostic;
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
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Executable evidence for constructors, visibility and encapsulation; no JavaScript simulation. */
class StateBoundariesExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;

    @BeforeAll
    static void compileDisplayedJava() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "A JDK 17 compiler is required");
        List<String> arguments = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String source : List.of("LearningSession.java", "FocusedSession.java", "ConstructorDemo.java",
                "visibility/VisibilityRecord.java", "visibility/VisibilityPeer.java",
                "outside/VisibilityChild.java", "outside/VisibilityDemo.java",
                "LeakyShelf.java", "ReadingShelf.java", "EncapsulationDemo.java")) {
            arguments.add(EXAMPLES.resolve(source).toString());
        }
        assertEquals(0, compiler.run(null, null, null, arguments.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    private Class<?> type(String name) throws Exception {
        return loader.loadClass(PACKAGE + name);
    }

    private Object focused(String topic, int minutes, List<String> trace) throws Exception {
        return type("FocusedSession").getConstructor(String.class, int.class, List.class).newInstance(topic, minutes, trace);
    }

    private Object value(Object instance, String method) throws Exception {
        return instance.getClass().getMethod(method).invoke(instance);
    }

    private Object shelf(int capacity) throws Exception {
        return type("ReadingShelf").getConstructor(int.class).newInstance(capacity);
    }

    private void add(Object shelf, String topic) throws Exception {
        shelf.getClass().getMethod("addTopic", String.class).invoke(shelf, topic);
    }

    @SuppressWarnings("unchecked")
    private List<String> topics(Object shelf) throws Exception {
        return (List<String>) value(shelf, "getTopics");
    }

    @Test
    void constructorDelegationInitializesOneSessionInTheRecordedOrder() throws Exception {
        List<String> trace = new ArrayList<>();
        Object session = type("FocusedSession").getConstructor(String.class, List.class).newInstance(" Objects ", trace);
        assertEquals(List.of("base topic=Objects", "focused minutes=25", "default constructor complete"), trace);
        assertEquals("Objects", value(session, "getTopic"));
        assertEquals(25, value(session, "getMinutes"));
        List<String> customTrace = new ArrayList<>();
        Object custom = focused("UML", 45, customTrace);
        assertEquals(45, value(custom, "getMinutes"));
        assertEquals(List.of("base topic=UML", "focused minutes=45"), customTrace);
        assertNotSame(session, custom);
    }

    @Test
    void failedConstructionDoesNotReturnAnObjectOrRollBackAnEarlierTraceEvent() throws Exception {
        for (String topic : new String[]{null, "", "   "}) {
            List<String> trace = new ArrayList<>();
            var failure = assertThrows(InvocationTargetException.class, () -> focused(topic, 25, trace));
            assertInstanceOf(IllegalArgumentException.class, failure.getCause());
            assertTrue(trace.isEmpty());
        }
        for (int minutes : new int[]{0, -1}) {
            List<String> trace = new ArrayList<>();
            var failure = assertThrows(InvocationTargetException.class, () -> focused("Objects", minutes, trace));
            assertInstanceOf(IllegalArgumentException.class, failure.getCause());
            assertEquals(List.of("base topic=Objects"), trace, "super already recorded its side effect");
        }
        var missingTrace = assertThrows(InvocationTargetException.class, () -> focused("Objects", 25, null));
        assertInstanceOf(NullPointerException.class, missingTrace.getCause());
    }

    @Test
    void laterExtensionValidatesWithoutRunningConstructorsOrPublishingOverflow() throws Exception {
        List<String> trace = new ArrayList<>();
        Object session = focused("Objects", 25, trace);
        var extend = type("FocusedSession").getMethod("extend", int.class);
        extend.invoke(session, 5);
        assertEquals(30, value(session, "getMinutes"));
        assertEquals(2, trace.size());
        for (int extra : new int[]{0, -1}) {
            var failure = assertThrows(InvocationTargetException.class, () -> extend.invoke(session, extra));
            assertInstanceOf(IllegalArgumentException.class, failure.getCause());
            assertEquals(30, value(session, "getMinutes"));
        }
        Object maximum = focused("Limits", Integer.MAX_VALUE, new ArrayList<>());
        var overflow = assertThrows(InvocationTargetException.class, () -> extend.invoke(maximum, 1));
        assertInstanceOf(ArithmeticException.class, overflow.getCause());
        assertEquals(Integer.MAX_VALUE, value(maximum, "getMinutes"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "static class Missing { Missing(String topic) {} } static Missing value = new Missing();",
            "static class Late { Late() { int n = 1; this(1); } Late(int n) {} }",
            "static class Cycle { Cycle() { this(1); } Cycle(int n) { this(); } }",
            "static class NotAConstructor { public void NotAConstructor(String topic) {} } static NotAConstructor value = new NotAConstructor(\"Objects\");"
    })
    void compilerRejectsTheConstructorMisconceptions(String members) throws Exception {
        assertFalse(compiles("public class VisibilityProbe { " + members + " }"));
    }

    @Test
    void accessMatrixMatchesActualCompilerDecisionsInBothPackages() throws Exception {
        JsonNode snapshots = fixture("access-modifiers");
        assertEquals(4, snapshots.size());
        Object record = type("visibility.VisibilityRecord").getConstructor(String.class).newInstance("A");
        assertEquals("public=A; protected=A; package=A; private=A", value(record, "inspectOwnMembers"));
        for (String member : List.of("public", "protected", "package-private", "private")) {
            assertField(snapshots.get(0).get("items").get(0), member, "allowed");
        }
        String[] labels = {"public", "protected", "package-private", "private"};
        String[] calls = {"base.summary()", "base.subclassHint()", "base.packageHint()", "base.secret()"};
        for (int member = 0; member < calls.length; member++) {
            checkAccess(snapshots.get(1), labels[member], "visibility", false, calls[member], member < 3);
            checkAccess(snapshots.get(3), labels[member], "outside", false, calls[member], member == 0);
        }
        JsonNode child = snapshots.get(2);
        checkAccess(child, "public", "outside", true, "summary()", true);
        checkAccess(child, "protected via child receiver", "outside", true, "child.subclassHint()", true);
        checkAccess(child, "protected via base receiver", "outside", true, "base.subclassHint()", false);
        checkAccess(child, "package-private", "outside", true, "packageHint()", false);
        checkAccess(child, "private", "outside", true, "secret()", false);
        Object actualChild = type("outside.VisibilityChild").getConstructor(String.class).newInstance("B");
        assertEquals("protected=B", value(actualChild, "ownHint"));
        assertEquals("protected=B", actualChild.getClass().getMethod("childHint", actualChild.getClass()).invoke(actualChild, actualChild));
    }

    private void checkAccess(JsonNode snapshot, String label, String pkg, boolean subclass, String expression, boolean expected) throws Exception {
        String source = "package " + PACKAGE + pkg + "; import " + PACKAGE + "visibility.VisibilityRecord; "
                + "public class VisibilityProbe " + (subclass ? "extends VisibilityRecord " : "") + "{ "
                + (subclass ? "public VisibilityProbe() { super(\"P\"); } " : "")
                + "public String read(VisibilityRecord base, VisibilityProbe child) { return " + expression + "; } }";
        boolean allowed = compiles(source);
        assertEquals(expected, allowed, pkg + "/subclass=" + subclass + ": " + expression);
        assertField(snapshot.get("items").get(0), label, allowed ? "allowed" : "rejected");
    }

    @Test
    void aPackagePrivateTopLevelTypeDoesNotBecomePublicBecauseItsFileContainsAPublicType() throws Exception {
        assertFalse(Modifier.isPublic(type("visibility.InternalNote").getModifiers()));
        assertTrue(compiles("package " + PACKAGE + "visibility; public class VisibilityProbe { InternalNote value; }"));
        assertFalse(compiles("package " + PACKAGE + "outside; import " + PACKAGE + "visibility.InternalNote; public class VisibilityProbe { InternalNote value; }"));
    }

    @Test
    void shelfOwnsItsInvariantAndReturnsADetachedUnmodifiableSnapshot() throws Exception {
        Object shelf = shelf(2);
        add(shelf, " Objects ");
        List<String> oldSnapshot = topics(shelf);
        assertEquals(List.of("Objects"), oldSnapshot);
        assertThrows(UnsupportedOperationException.class, () -> oldSnapshot.add(""));
        add(shelf, "Interfaces");
        assertEquals(List.of("Objects"), oldSnapshot);
        assertThrows(UnsupportedOperationException.class, () -> oldSnapshot.add(""));
        assertEquals(List.of("Objects", "Interfaces"), topics(shelf));
        var full = assertThrows(InvocationTargetException.class, () -> add(shelf, "Enums"));
        assertInstanceOf(IllegalStateException.class, full.getCause());
        assertEquals(List.of("Objects", "Interfaces"), topics(shelf));
        assertEquals(2, value(shelf, "getCapacity"));
    }

    @Test
    void rejectedShelfInputsPreserveThePriorStateAndInvalidCapacityCannotConstruct() throws Exception {
        for (int capacity : new int[]{0, -1}) {
            var failure = assertThrows(InvocationTargetException.class, () -> shelf(capacity));
            assertInstanceOf(IllegalArgumentException.class, failure.getCause());
        }
        Object shelf = shelf(2);
        add(shelf, "Objects");
        for (String topic : new String[]{null, "", "   "}) {
            var failure = assertThrows(InvocationTargetException.class, () -> add(shelf, topic));
            assertInstanceOf(IllegalArgumentException.class, failure.getCause());
            assertEquals(List.of("Objects"), topics(shelf));
        }
        add(shelf, "Objects");
        assertEquals(List.of("Objects", "Objects"), topics(shelf), "uniqueness is deliberately not an invariant");
    }

    @Test
    @SuppressWarnings("unchecked")
    void finalReferenceDoesNotPreventMutationOfTheLeakedList() throws Exception {
        Object leaky = type("LeakyShelf").getConstructor().newInstance();
        var field = type("LeakyShelf").getField("topics");
        assertTrue(Modifier.isFinal(field.getModifiers()));
        add(leaky, "Objects");
        List<String> list = (List<String>) field.get(leaky);
        list.add("");
        assertEquals(List.of("Objects", ""), list);
        assertTrue(list.contains(""));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "static ReadingShelf shelf = new ReadingShelf(2); static Object list = shelf.topics;",
            "static LeakyShelf leaky = new LeakyShelf(); static { leaky.topics = new java.util.ArrayList<>(); }"
    })
    void compilerEnforcesPrivateFieldAccessAndFinalReferenceAssignment(String members) throws Exception {
        assertFalse(compiles("import " + PACKAGE + "*; public class VisibilityProbe { " + members + " }"));
    }

    @Test
    void constructorTraceAndReturnedObjectFixturesMatchTheCompiledExample() throws Exception {
        JsonNode snapshots = fixture("constructors");
        assertEquals(4, snapshots.size());
        List<String> trace = new ArrayList<>();
        Object session = type("FocusedSession").getConstructor(String.class, List.class).newInstance(" Objects ", trace);
        assertField(snapshots.get(0).get("items").get(0), "events so far", trace.get(0));
        assertField(snapshots.get(1).get("items").get(0), "events so far", String.join(" → ", trace.subList(0, 2)));
        assertField(snapshots.get(2).get("items").get(0), "events", String.join(" → ", trace));
        assertField(snapshots.get(2).get("items").get(1), "topic", value(session, "getTopic"));
        assertField(snapshots.get(2).get("items").get(1), "minutes", value(session, "getMinutes"));
        type("FocusedSession").getMethod("extend", int.class).invoke(session, 5);
        assertField(snapshots.get(3).get("items").get(0), "topic", value(session, "getTopic"));
        assertField(snapshots.get(3).get("items").get(0), "minutes", value(session, "getMinutes"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void encapsulationFixturesMatchMutationRejectionAndSnapshotHistory() throws Exception {
        JsonNode snapshots = fixture("encapsulation");
        assertEquals(4, snapshots.size());
        Object leaky = type("LeakyShelf").getConstructor().newInstance();
        add(leaky, "Objects");
        List<String> leaked = (List<String>) type("LeakyShelf").getField("topics").get(leaky);
        leaked.add("");
        assertField(snapshots.get(0).get("items").get(0), "size", leaked.size());
        assertField(snapshots.get(0).get("items").get(0), "contains empty string", leaked.contains(""));
        Object shelf = shelf(2);
        add(shelf, "Objects");
        assertThrows(InvocationTargetException.class, () -> add(shelf, ""));
        JsonNode guarded = snapshots.get(1).get("items").get(0);
        assertField(guarded, "capacity", value(shelf, "getCapacity"));
        assertField(guarded, "topics", topics(shelf).toString());
        assertField(guarded, "blank request", "rejected");
        List<String> old = topics(shelf);
        var immutable = assertThrows(UnsupportedOperationException.class, () -> old.add(""));
        assertField(snapshots.get(2).get("items").get(0), "topics", old.toString());
        assertField(snapshots.get(2).get("items").get(0), "mutation", immutable.getClass().getSimpleName());
        add(shelf, "Interfaces");
        assertThrows(InvocationTargetException.class, () -> add(shelf, "Enums"));
        JsonNode current = snapshots.get(3).get("items").get(0);
        assertField(current, "topics", topics(shelf).toString());
        assertField(current, "size", topics(shelf).size());
        assertField(current, "third topic", "rejected");
        assertField(snapshots.get(3).get("items").get(1), "topics", old.toString());
    }

    @ParameterizedTest
    @CsvSource({"ConstructorDemo,constructors", "outside.VisibilityDemo,access-modifiers", "EncapsulationDemo,encapsulation"})
    void displayedOutputComesFromTheActualJavaDemo(String main, String fixture) throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + main).redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertEquals(Files.readAllLines(EXAMPLES.resolve(fixture + "-output.txt")), output.lines().toList());
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    private boolean compiles(String source) throws Exception {
        Path directory = Files.createTempDirectory(scratch, "probe-");
        Path file = directory.resolve("VisibilityProbe.java");
        Files.writeString(file, source);
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            boolean success = compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", directory.toString()),
                    null, files.getJavaFileObjects(file)).call();
            assertEquals(!success, diagnostics.getDiagnostics().stream().anyMatch(entry -> entry.getKind() == Diagnostic.Kind.ERROR));
            return success;
        }
    }

    private JsonNode fixture(String id) throws Exception {
        return JSON.readTree(EXAMPLES.resolve(id + "-snapshots.json").toFile());
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
