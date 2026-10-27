package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import javax.tools.*;
import java.lang.reflect.InvocationTargetException;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

/** Compiles the displayed canonical files and independent Java call-site probes. */
class MethodSelectionLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.methodselection.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;

    @BeforeAll static void compileDisplayedSources() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 is required");
        List<String> args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String file : List.of("PromptPrinter.java", "HintPrinter.java", "MethodSelectionDemo.java"))
            args.add(EXAMPLES.resolve("methodselection").resolve(file).toString());
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
    }
    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    @Test void recordedOutputMatchesJavaMainIncludingSignificantSpaces() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "MethodSelectionDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(normalize(Files.readString(EXAMPLES.resolve("overloading-and-overriding-output.txt"))), normalize(actual));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @Test void everyRecordedScalarComesFromCompiledCallsAndRealObjects() throws Exception {
        Object[] actual = (Object[]) runProbe("public static Object[] run() throws Exception { "
                + "HintPrinter child = new HintPrinter(); PromptPrinter base = child; "
                + "String text = \" Objects \"; Object object = text; StringBuilder builder = new StringBuilder(text); "
                + "PromptPrinter copy = base.copy(); HintPrinter childCopy = child.copy(); "
                + "return new Object[]{base == child, child.getClass().getSimpleName(), "
                + "MethodSelectionDemo.throughBase(base, text), base.print(object), base.print(builder), child.print(builder), "
                + "MethodSelectionDemo.phase(3), MethodSelectionDemo.phase(Integer.valueOf(3)), MethodSelectionDemo.phase(), "
                + "copy.getClass().getSimpleName(), copy != child, childCopy.getClass().getSimpleName(), childCopy != child}; }");
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("overloading-and-overriding-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        assertEquals(List.of(1, 2, 2, 1, 2), java.util.stream.StreamSupport.stream(snapshots.spliterator(), false)
                .map(snapshot -> snapshot.get("items").size()).toList());
        assertItem(snapshots, 0, 0, "receiver", "HintPrinter", Map.of("same object", actual[0], "runtime class", actual[1]));
        assertItem(snapshots, 1, 0, "String argument", "print(String)", Map.of("result", actual[2]));
        assertItem(snapshots, 1, 1, "Object argument", "print(Object)", Map.of("result", actual[3]));
        assertItem(snapshots, 2, 0, "base.print(builder)", "PromptPrinter API", Map.of("result", actual[4]));
        assertItem(snapshots, 2, 1, "child.print(builder)", "HintPrinter API", Map.of("result", actual[5]));
        assertItem(snapshots, 3, 0, "numeric overloads", "MethodSelectionDemo",
                Map.of("phase(3)", actual[6], "phase(Integer.valueOf(3))", actual[7], "phase()", actual[8]));
        assertItem(snapshots, 4, 0, "base.copy() result", "HintPrinter", Map.of("runtime class", actual[9], "fresh object", actual[10]));
        assertItem(snapshots, 4, 1, "child.copy() result", "HintPrinter", Map.of("runtime class", actual[11], "fresh object", actual[12]));
    }

    @Test void applicabilityIncludesFixedArityArraysAndPrimitiveWidening() throws Exception {
        assertEquals(List.of("long", "Integer", "int... length=2", "int... length=2", "long"), runProbe(
                "public static Object run() { short small = 3; Number number = Integer.valueOf(3); "
                        + "return java.util.List.of(MethodSelectionDemo.phase(small), "
                        + "MethodSelectionDemo.phase((Integer) number), MethodSelectionDemo.phase(1, 2), "
                        + "MethodSelectionDemo.phase(new int[]{1, 2}), MethodSelectionDemo.phase((long) 3)); }"));
    }

    @ParameterizedTest @ValueSource(strings = {"PromptPrinter", "HintPrinter"})
    void stringOverridePreservesWhitespaceAndFailureContract(String name) throws Exception {
        Object printer = loader.loadClass(PACKAGE + name).getConstructor().newInstance();
        var print = loader.loadClass(PACKAGE + "PromptPrinter").getMethod("print", String.class);
        for (String input : List.of("Objects", " Objects ", "\u2003Objects\u2003")) {
            String expected = name.equals("HintPrinter") ? "hint String: Objects (name an object)" : "base String: Objects";
            assertEquals(expected, print.invoke(printer, input));
        }
        for (String input : new String[]{null, "", " \t", "\u2003"}) {
            var error = assertThrows(InvocationTargetException.class, () -> print.invoke(printer, input));
            assertInstanceOf(IllegalArgumentException.class, error.getCause());
            assertEquals("Topic is required", error.getCause().getMessage());
        }
    }

    @Test void childCopyRefinesReturnAndOmitsCheckedThrows() throws Exception {
        assertEquals(List.of("hint String: Objects (name an object)", "base Object: [null]", "hint builder: Objects"),
                runProbe("public static Object run() { HintPrinter printer = new HintPrinter(); "
                        + "HintPrinter copy = printer.copy(); return java.util.List.of(copy.print(\"Objects\"), "
                        + "copy.print((Object) null), copy.print(new StringBuilder(\" Objects \"))); }"));
        assertTrue(compileProbe("public static Object run() throws java.io.IOException { "
                + "PromptPrinter base = new HintPrinter(); return base.copy(); }", Files.createTempDirectory(scratch, "allowed-")));
    }

    @Test void objectOverloadPreservesTextAndBuilderOverloadPreservesStringValidation() throws Exception {
        assertEquals(List.of("base Object: [ Objects ]", "base Object: [null]", "base Object: []", "hint builder: Objects"),
                runProbe("public static Object run() { PromptPrinter base = new HintPrinter(); "
                        + "HintPrinter child = new HintPrinter(); return java.util.List.of("
                        + "base.print((Object) \" Objects \"), base.print((Object) null), base.print((Object) \"\"), "
                        + "child.print(new StringBuilder(\"\\u2003Objects\\u2003\"))); }"));
        Object child = loader.loadClass(PACKAGE + "HintPrinter").getConstructor().newInstance();
        var builderPrint = child.getClass().getMethod("print", StringBuilder.class);
        for (StringBuilder input : new StringBuilder[]{null, new StringBuilder(), new StringBuilder("\u2003")}) {
            var failure = assertThrows(InvocationTargetException.class, () -> builderPrint.invoke(child, input));
            assertInstanceOf(IllegalArgumentException.class, failure.getCause());
            assertEquals("Topic is required", failure.getCause().getMessage());
        }
    }

    @ParameterizedTest @ValueSource(strings = {"PromptPrinter", "HintPrinter"})
    void copyReturnsFreshObjectsOfThePromisedRuntimeType(String name) throws Exception {
        Object original = loader.loadClass(PACKAGE + name).getConstructor().newInstance();
        var copy = loader.loadClass(PACKAGE + "PromptPrinter").getMethod("copy");
        Object first = copy.invoke(original);
        Object second = copy.invoke(original);
        assertEquals(original.getClass(), first.getClass());
        assertEquals(original.getClass(), second.getClass());
        assertNotSame(original, first);
        assertNotSame(original, second);
        assertNotSame(first, second);
    }

    @ParameterizedTest @ValueSource(strings = {
            "public static void run() { new HintPrinter().print(null); }",
            "public static void run() throws Exception { PromptPrinter base = new HintPrinter(); HintPrinter copy = base.copy(); }",
            "public static void run() { PromptPrinter base = new HintPrinter(); PromptPrinter copy = base.copy(); }",
            "static class Broken extends PromptPrinter { @Override protected String print(String s) { return s; } }",
            "static class Broken extends PromptPrinter { @Override public int print(String s) { return 1; } }",
            "static class Broken extends PromptPrinter { @Override public String print(String s) throws Exception { return s; } }",
            "static class Broken extends PromptPrinter { public static String print(String s) { return s; } }",
            "static class Broken extends PromptPrinter { @Override protected String clean(String s) { return s; } }",
            "static class Broken extends PromptPrinter { @Override public String print(CharSequence s) { return s.toString(); } }",
            "static class Broken { public int print(String s) { return 1; } public String print(String s) { return s; } }",
            "static class Parent { public int count() { return 0; } } static class Broken extends Parent { @Override public long count() { return 0; } }",
            "static class Parent { private String secret() { return \"base\"; } } static class Broken extends Parent { @Override public String secret() { return \"child\"; } }"
    })
    void javacRejectsAmbiguityWrongOverridesAndBaseTypedCopyMistakes(String members) throws Exception {
        assertFalse(compileProbe(members, Files.createTempDirectory(scratch, "invalid-")), members);
    }

    @Test void explicitNullCastSelectsStringButStillViolatesItsInputContract() {
        var failure = assertThrows(InvocationTargetException.class, () -> runProbe(
                "public static Object run() { return new HintPrinter().print((String) null); }"));
        assertInstanceOf(IllegalArgumentException.class, failure.getCause());
    }

    @Test void exerciseOverridesTheIntendedSignatureAndCopiesItsOwnType() throws Exception {
        assertEquals(List.of("check String: Objects", "check String: Objects", "base Object: [ Objects ]", true, true), runProbe(
                "public static class ChecklistPrinter extends PromptPrinter { "
                        + "@Override public String print(String topic) { return \"check String: \" + clean(topic); } "
                        + "@Override public ChecklistPrinter copy() { return new ChecklistPrinter(); } } "
                        + "public static Object run() throws Exception { ChecklistPrinter child = new ChecklistPrinter(); "
                        + "PromptPrinter base = child; Object topic = \" Objects \"; PromptPrinter copy = base.copy(); "
                        + "return java.util.List.of(base.print(\" Objects \"), child.print(\" Objects \"), base.print(topic), "
                        + "copy instanceof ChecklistPrinter, copy != child); }"));
    }

    @Test void overrideCanTargetTheWrongIntendedOverload() throws Exception {
        assertEquals("base String: Objects", runProbe("static class Wrong extends PromptPrinter { "
                + "@Override public String print(Object topic) { return \"wrong operation\"; } } "
                + "public static Object run() { PromptPrinter base = new Wrong(); return base.print(\" Objects \"); }"));
    }

    private Object runProbe(String members) throws Exception {
        Path directory = Files.createTempDirectory(scratch, "valid-");
        assertTrue(compileProbe(members, directory), members);
        try (var probes = new URLClassLoader(new java.net.URL[]{directory.toUri().toURL()}, loader)) {
            return probes.loadClass("MethodSelectionProbe").getMethod("run").invoke(null);
        }
    }
    private boolean compileProbe(String members, Path directory) throws Exception {
        Path file = directory.resolve("MethodSelectionProbe.java");
        Files.writeString(file, "import " + PACKAGE + "*; public class MethodSelectionProbe { " + members + " }");
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
