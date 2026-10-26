package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.lang.reflect.Modifier;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the displayed Java 17 files and checks their behavioral and illustration evidence. */
class AbstractionExampleTest {
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
        for (String file : List.of("TopicLabel.java", "BoundedTopicLabel.java", "EllipsisTopicLabel.java",
                "ClippedTopicLabel.java", "AbstractionDemo.java")) {
            arguments.add(EXAMPLES.resolve(file).toString());
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

    private Object label(String name, int limit) throws Exception {
        return type(name).getConstructor(int.class).newInstance(limit);
    }

    private String render(Object label, String topic) throws Exception {
        return (String) type("TopicLabel").getMethod("render", String.class).invoke(label, topic);
    }

    private String show(Object label, String topic) throws Exception {
        return (String) type("AbstractionDemo").getMethod("show", type("TopicLabel"), String.class)
                .invoke(null, label, topic);
    }

    private Throwable invalidConstruction(String name, int limit) {
        return assertThrows(InvocationTargetException.class, () -> label(name, limit)).getCause();
    }

    private Throwable invalidTopic(Object label, String topic) {
        return assertThrows(InvocationTargetException.class, () -> render(label, topic)).getCause();
    }

    @Test
    void callerUsesAnInterfaceWhileTheAbstractBaseOwnsCommonStateAndBehavior() throws Exception {
        assertTrue(type("TopicLabel").isInterface());
        Class<?> base = type("BoundedTopicLabel");
        assertTrue(Modifier.isAbstract(base.getModifiers()));
        assertTrue(type("TopicLabel").isAssignableFrom(base));
        assertTrue(Modifier.isProtected(base.getDeclaredConstructor(int.class).getModifiers()));
        var limit = base.getDeclaredField("maxChars");
        assertTrue(Modifier.isPrivate(limit.getModifiers()));
        assertTrue(Modifier.isFinal(limit.getModifiers()));
        var common = base.getDeclaredMethod("render", String.class);
        assertFalse(Modifier.isAbstract(common.getModifiers()));
        assertTrue(Modifier.isFinal(common.getModifiers()));
        var hook = base.getDeclaredMethod("shorten", String.class, int.class);
        assertTrue(Modifier.isProtected(hook.getModifiers()));
        assertTrue(Modifier.isAbstract(hook.getModifiers()));
        for (String name : List.of("EllipsisTopicLabel", "ClippedTopicLabel")) {
            assertEquals(base, type(name).getSuperclass());
            assertEquals(base, type(name).getMethod("render", String.class).getDeclaringClass());
            assertEquals("Study: OOP", show(label(name, 8), " OOP "));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"EllipsisTopicLabel", "ClippedTopicLabel"})
    void bothImplementationsHonorTheSharedContractAtLengthAndWhitespaceBoundaries(String name) throws Exception {
        Object label = label(name, 8);
        for (String topic : List.of("OOP", " OOP ", "12345678", " 12345678 ", "\u2003OOP\u2003")) {
            assertEquals(topic.strip(), render(label, topic));
        }
        assertEquals(name.equals("EllipsisTopicLabel") ? "Encap..." : "Encapsul",
                render(label, " Encapsulation "));
        for (int limit : new int[]{4, 5, 8, 13, 20}) {
            Object candidate = label(name, limit);
            for (String topic : List.of("A", "ABCD", "12345678", "Encapsulation", "a topic with spaces")) {
                String result = render(candidate, " " + topic + " ");
                assertFalse(result.isBlank());
                assertTrue(result.length() <= limit, name + " exceeded " + limit);
                if (topic.length() <= limit) assertEquals(topic, result);
            }
        }
        assertEquals(name.equals("EllipsisTopicLabel") ? "E..." : "Enca",
                render(label(name, 4), "Encapsulation"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"EllipsisTopicLabel", "ClippedTopicLabel"})
    void bothStylesRejectInvalidConstructionAndInputWithoutChangingLaterResults(String name) throws Exception {
        for (int limit : new int[]{Integer.MIN_VALUE, -1, 0, 3}) {
            Throwable failure = invalidConstruction(name, limit);
            assertInstanceOf(IllegalArgumentException.class, failure);
            assertEquals("Limit must be at least 4", failure.getMessage());
        }
        Object label = label(name, 8);
        String before = render(label, "Encapsulation");
        for (String topic : new String[]{null, "", "   ", "\t\n", "\u2003"}) {
            Throwable failure = invalidTopic(label, topic);
            assertInstanceOf(IllegalArgumentException.class, failure);
            assertEquals("Topic is required", failure.getMessage());
            assertEquals(before, render(label, "Encapsulation"));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "public class AbstractionProbe { Object value = new BoundedTopicLabel(8); }",
            "public class AbstractionProbe { TopicLabel value = new TopicLabel(); }",
            "public class AbstractionProbe extends BoundedTopicLabel { public AbstractionProbe() { super(8); } }",
            "public abstract class AbstractionProbe extends BoundedTopicLabel { public AbstractionProbe() { super(8); } public String render(String topic) { return topic; } }",
            "public abstract class AbstractionProbe extends BoundedTopicLabel { public AbstractionProbe() { super(8); } int read() { return maxChars; } }"
    })
    void compilerRejectsDirectInstantiationMissingHooksFinalOverrideAndPrivateFieldAccess(String declaration) throws Exception {
        assertFalse(compileProbe(declaration, Files.createTempDirectory(scratch, "invalid-")));
    }

    @Test
    void fittingTextBypassesTheAbstractHookButLongTextReachesIt() throws Exception {
        Path probe = Files.createTempDirectory(scratch, "hook-");
        assertTrue(compileProbe("public class AbstractionProbe extends BoundedTopicLabel { "
                + "public int calls; public AbstractionProbe() { super(8); } "
                + "protected String shorten(String text, int limit) { calls++; return text.substring(0, limit); } }", probe));
        try (var probes = new URLClassLoader(new java.net.URL[]{probe.toUri().toURL()}, loader)) {
            var probeType = probes.loadClass("AbstractionProbe");
            Object instance = probeType.getConstructor().newInstance();
            assertEquals("OOP", render(instance, " OOP "));
            assertEquals("12345678", render(instance, "12345678"));
            assertInstanceOf(IllegalArgumentException.class, invalidTopic(instance, " "));
            assertEquals(0, probeType.getField("calls").get(instance));
            assertEquals("Encapsul", render(instance, " Encapsulation "));
            assertEquals(1, probeType.getField("calls").get(instance));
        }
    }

    @Test
    void aCompilingSubclassCanStillViolateTheDocumentedOutputContract() throws Exception {
        Path probe = Files.createTempDirectory(scratch, "broken-");
        assertTrue(compileProbe("public class AbstractionProbe extends BoundedTopicLabel { "
                + "public AbstractionProbe() { super(8); } "
                + "protected String shorten(String text, int limit) { return text; } }", probe));
        try (var probes = new URLClassLoader(new java.net.URL[]{probe.toUri().toURL()}, loader)) {
            Object broken = probes.loadClass("AbstractionProbe").getConstructor().newInstance();
            assertTrue(render(broken, "Encapsulation").length() > 8,
                    "final render does not enforce the hook's postcondition");
        }
    }

    @Test
    void anUnrelatedSuperclassDoesNotPreventDirectInterfaceImplementation() throws Exception {
        Path probe = Files.createTempDirectory(scratch, "direct-");
        assertTrue(compileProbe("class ExistingBase {} public class AbstractionProbe extends ExistingBase implements TopicLabel { "
                + "public String render(String topic) { "
                + "if (topic == null || topic.isBlank()) throw new IllegalArgumentException(); "
                + "String text = topic.strip(); return text.substring(0, Math.min(8, text.length())); } }", probe));
        try (var probes = new URLClassLoader(new java.net.URL[]{probe.toUri().toURL()}, loader)) {
            Object direct = probes.loadClass("AbstractionProbe").getConstructor().newInstance();
            assertEquals("Study: Encapsul", show(direct, " Encapsulation "));
            assertEquals("Study: OOP", show(direct, " OOP "));
            assertInstanceOf(IllegalArgumentException.class, invalidTopic(direct, null));
        }
    }

    @Test
    void everyRecordedIllustrationValueMatchesTheCanonicalJava() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("abstraction-snapshots.json").toFile());
        assertEquals(4, snapshots.size());
        assertEquals(2, snapshots.get(0).get("items").size());
        assertEquals(2, snapshots.get(1).get("items").size());
        assertEquals(2, snapshots.get(2).get("items").size());
        assertEquals(2, snapshots.get(3).get("items").size());
        String declaredType = type("AbstractionDemo").getMethod("show", type("TopicLabel"), String.class)
                .getParameterTypes()[0].getSimpleName();
        var limit = type("BoundedTopicLabel").getDeclaredField("maxChars");
        limit.setAccessible(true);
        int index = 0;
        for (String name : List.of("EllipsisTopicLabel", "ClippedTopicLabel")) {
            Object label = label(name, 8);
            String reference = index == 0 ? "ellipsis" : "clipped";
            String runtimeType = label.getClass().getSimpleName();
            assertItem(snapshots.get(0).get("items").get(index), reference, runtimeType,
                    Map.of("declared type", declaredType, "stored maxChars", limit.getInt(label)));
            String longInput = " Encapsulation ";
            String result = render(label, longInput);
            assertItem(snapshots.get(1).get("items").get(index), reference + " call", runtimeType,
                    Map.of("input", longInput, "render result", result, "result length", result.length(),
                            "caller result", show(label, longInput)));
            String shortInput = " OOP ";
            assertItem(snapshots.get(2).get("items").get(index), reference + " short call", runtimeType,
                    Map.of("input", shortInput, "render result", render(label, shortInput),
                            "caller result", show(label, shortInput)));
            index++;
        }
        Throwable blank = invalidTopic(label("EllipsisTopicLabel", 8), "   ");
        assertItem(snapshots.get(3).get("items").get(0), "blank render", blank.getClass().getSimpleName(),
                Map.of("input", "   ", "message", blank.getMessage()));
        Throwable construction = invalidConstruction("EllipsisTopicLabel", 3);
        assertItem(snapshots.get(3).get("items").get(1), "invalid construction", construction.getClass().getSimpleName(),
                Map.of("requested maxChars", 3, "message", construction.getMessage()));
    }

    @Test
    void displayedOutputIsProducedByTheActualJavaDemo() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "AbstractionDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertEquals(Files.readAllLines(EXAMPLES.resolve("abstraction-output.txt")), output.lines().toList());
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    private boolean compileProbe(String declaration, Path directory) throws Exception {
        Path file = directory.resolve("AbstractionProbe.java");
        Files.writeString(file, "import " + PACKAGE + "*; " + declaration);
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            boolean success = compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", directory.toString()),
                    null, files.getJavaFileObjects(file)).call();
            assertEquals(!success, diagnostics.getDiagnostics().stream()
                    .anyMatch(entry -> entry.getKind() == Diagnostic.Kind.ERROR));
            return success;
        }
    }

    private void assertItem(JsonNode item, String label, String type, Map<String, Object> actualFields) {
        assertEquals(label, item.get("label").asText());
        assertEquals(type, item.get("typeLabel").asText());
        Map<String, JsonNode> illustratedFields = new LinkedHashMap<>();
        for (JsonNode field : item.get("fields")) {
            assertNull(illustratedFields.put(field.get("name").asText(), field.get("value")), "duplicate field");
        }
        assertEquals(JSON.valueToTree(actualFields), JSON.valueToTree(illustratedFields), label);
    }
}
