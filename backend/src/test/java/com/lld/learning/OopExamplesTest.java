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
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the exact Java shown in the browser; fixtures are checked against those classes. */
class OopExamplesTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> priority;
    private static Class<?> formatter;

    @BeforeAll
    static void compileDisplayedJava() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "A JDK 17 compiler is required");
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-d", classes.toString(),
                EXAMPLES.resolve("ReviewPriority.java").toString(), EXAMPLES.resolve("EnumDemo.java").toString(),
                EXAMPLES.resolve("MessageFormatter.java").toString(), EXAMPLES.resolve("PlainFormatter.java").toString(),
                EXAMPLES.resolve("TaggedFormatter.java").toString(), EXAMPLES.resolve("InterfaceDemo.java").toString()));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        priority = loader.loadClass("com.lld.learning.examples.ReviewPriority");
        formatter = loader.loadClass("com.lld.learning.examples.MessageFormatter");
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    private Object parse(String input) throws Exception {
        return priority.getMethod("parse", String.class).invoke(null, input);
    }

    private Object implementation(String name) throws Exception {
        Class<?> type = loader.loadClass("com.lld.learning.examples." + name);
        return name.equals("TaggedFormatter") ? type.getConstructor(String.class).newInstance("LLD")
                : type.getConstructor().newInstance();
    }

    private String format(Object implementation, String input) throws Exception {
        return (String) formatter.getMethod("format", String.class).invoke(implementation, input);
    }

    @Test
    void enumConstantsHaveTheirDeclaredDataAndStableIdentity() throws Exception {
        Object[] constants = priority.getEnumConstants();
        assertEquals(3, constants.length);
        assertEquals("LOW, MEDIUM, HIGH", String.join(", ", Arrays.stream(constants).map(Object::toString).toList()));
        for (int i = 0; i < constants.length; i++) {
            assertEquals(i + 1, priority.getMethod("getWeight").invoke(constants[i]));
            assertSame(constants[i], parse(constants[i].toString()));
        }
    }

    @Test
    void customParsingIsExplicitAndExactLookupDoesNotNormalize() throws Exception {
        assertSame(priority.getField("HIGH").get(null), parse(" high "));
        assertSame(priority.getField("MEDIUM").get(null), parse("medium"));
        var exactLookup = assertThrows(InvocationTargetException.class,
                () -> priority.getMethod("valueOf", String.class).invoke(null, " high "));
        assertInstanceOf(IllegalArgumentException.class, exactLookup.getCause());
        for (String input : new String[]{null, "", "   ", "urgent"}) {
            var rejected = assertThrows(InvocationTargetException.class, () -> parse(input));
            assertInstanceOf(IllegalArgumentException.class, rejected.getCause());
        }
        assertEquals(3, priority.getEnumConstants().length, "parsing must not invent constants");
    }

    @Test
    void parsingDoesNotDependOnTheMachinesDefaultLocale() throws Exception {
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertSame(priority.getField("MEDIUM").get(null), parse("medium"));
            assertSame(priority.getField("HIGH").get(null), parse("high"));
        } finally {
            Locale.setDefault(previous);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "ReviewPriority priority = \"HIGH\";",
            "ReviewPriority priority = new ReviewPriority(3);",
            "MessageFormatter formatter = new MessageFormatter();",
            "MessageFormatter formatter = new TaggedFormatter(\"LLD\"); String tag = formatter.getTag();",
            "static class MissingFormat implements MessageFormatter {}"
    })
    void compilerRejectsTheMisconceptionsShownInTheLessons(String member) throws Exception {
        Path source = scratch.resolve("InvalidSnippet.java");
        Files.writeString(source, "import com.lld.learning.examples.*; public class InvalidSnippet { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            boolean success = compiler.getTask(null, files, diagnostics,
                    java.util.List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call();
            assertFalse(success, "the invalid declaration unexpectedly compiled");
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(entry -> entry.getKind() == Diagnostic.Kind.ERROR));
        }
    }

    @Test
    void theSameInterfaceCallDispatchesToEachRuntimeImplementation() throws Exception {
        Class<?> demo = loader.loadClass("com.lld.learning.examples.InterfaceDemo");
        var present = demo.getMethod("present", formatter, String.class);
        assertEquals("Hello", present.invoke(null, implementation("PlainFormatter"), "  Hello  "));
        assertEquals("[LLD] Hello", present.invoke(null, implementation("TaggedFormatter"), "  Hello  "));
    }

    @ParameterizedTest
    @ValueSource(strings = {"PlainFormatter", "TaggedFormatter"})
    void everyImplementationHonorsTheSharedInputContract(String name) throws Exception {
        Object instance = implementation(name);
        for (String input : new String[]{null, "", "   "}) {
            var rejected = assertThrows(InvocationTargetException.class, () -> format(instance, input));
            assertInstanceOf(IllegalArgumentException.class, rejected.getCause());
            assertEquals("Text is required", rejected.getCause().getMessage());
        }
        assertFalse(format(instance, "  accepted  ").isBlank());
    }

    @Test
    void taggedFormatterRejectsInvalidConstructionAndKeepsItsOwnConfiguration() throws Exception {
        Class<?> tagged = loader.loadClass("com.lld.learning.examples.TaggedFormatter");
        for (String tag : new String[]{null, "", "   "}) {
            var rejected = assertThrows(InvocationTargetException.class, () -> tagged.getConstructor(String.class).newInstance(tag));
            assertInstanceOf(IllegalArgumentException.class, rejected.getCause());
        }
        Object one = tagged.getConstructor(String.class).newInstance(" LLD ");
        Object two = tagged.getConstructor(String.class).newInstance("DSA");
        assertEquals("LLD", tagged.getMethod("getTag").invoke(one));
        assertEquals("[LLD] message", format(one, "message"));
        assertEquals("[DSA] message", format(two, "message"));
    }

    @Test
    void enumIllustrationMatchesRealParsingAndConstantData() throws Exception {
        JsonNode snapshots = new ObjectMapper().readTree(EXAMPLES.resolve("enums-snapshots.json").toFile());
        assertEquals(3, snapshots.size());
        JsonNode constants = snapshots.get(0).get("items").get(0);
        assertEquals(String.join(", ", Arrays.stream(priority.getEnumConstants()).map(Object::toString).toList()), field(constants, "declared values").asText());
        assertEquals("1, 2, 3", field(constants, "weights").asText());
        JsonNode accepted = snapshots.get(1).get("items").get(0);
        assertEquals("\" high \"", field(accepted, "input").asText());
        Object actual = parse(" high ");
        assertEquals(actual.toString(), field(accepted, "normalized name").asText());
        assertEquals(actual.toString(), field(accepted, "result").asText());
        assertEquals(priority.getMethod("getWeight").invoke(actual), field(accepted, "weight").asInt());
        assertEquals(actual == priority.getField("HIGH").get(null), field(accepted, "same as HIGH").asBoolean());
        JsonNode rejected = snapshots.get(2).get("items").get(0);
        var failure = assertThrows(InvocationTargetException.class, () -> parse(field(rejected, "input").asText()));
        assertEquals("rejected", field(rejected, "outcome").asText());
        assertEquals(failure.getCause().getMessage(), field(rejected, "message").asText());
    }

    @Test
    void interfaceIllustrationMatchesRuntimeDispatchAndBothContractFailures() throws Exception {
        JsonNode snapshots = new ObjectMapper().readTree(EXAMPLES.resolve("interfaces-snapshots.json").toFile());
        assertEquals(3, snapshots.size());
        for (int step = 0; step < 2; step++) {
            JsonNode item = snapshots.get(step).get("items").get(0);
            String name = step == 0 ? "PlainFormatter" : "TaggedFormatter";
            Object instance = implementation(name);
            assertEquals(instance.getClass().getSimpleName(), field(item, "runtime class").asText());
            assertEquals("\"  Hello  \"", field(item, "input").asText());
            assertEquals(format(instance, "  Hello  "), field(item, "output").asText());
        }
        assertEquals(2, snapshots.get(2).get("items").size());
        for (JsonNode item : snapshots.get(2).get("items")) {
            Object instance = implementation(item.get("label").asText());
            assertEquals("\"   \"", field(item, "input").asText());
            var failure = assertThrows(InvocationTargetException.class, () -> format(instance, "   "));
            assertEquals(failure.getCause().getClass().getSimpleName(), field(item, "outcome").asText());
            assertEquals(failure.getCause().getMessage(), field(item, "message").asText());
        }
    }

    @ParameterizedTest
    @CsvSource({"EnumDemo,enums-output.txt", "InterfaceDemo,interfaces-output.txt"})
    void displayedOutputMatchesTheCompiledDemo(String main, String fixture) throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), "com.lld.learning.examples." + main).redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertEquals(Files.readAllLines(EXAMPLES.resolve(fixture)), output.lines().toList());
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    private JsonNode field(JsonNode item, String name) {
        for (JsonNode field : item.get("fields")) {
            if (field.get("name").asText().equals(name)) return field.get("value");
        }
        throw new AssertionError("Missing illustration field: " + name);
    }
}
