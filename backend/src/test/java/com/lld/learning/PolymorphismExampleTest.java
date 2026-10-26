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

/** Tests the exact displayed Java 17 sources, not a JavaScript model of method selection. */
class PolymorphismExampleTest {
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
        for (String source : List.of("PracticeQuestion.java", "OpenPracticeQuestion.java",
                "HintedPracticeQuestion.java", "PolymorphismDemo.java")) {
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

    private Object question(String name) throws Exception {
        return type(name).getConstructor().newInstance();
    }

    private String ask(Object question, String topic) throws Exception {
        return (String) type("PracticeQuestion").getMethod("ask", String.class).invoke(question, topic);
    }

    private String present(Object question, String topic) throws Exception {
        return (String) type("PolymorphismDemo").getMethod("present", type("PracticeQuestion"), String.class)
                .invoke(null, question, topic);
    }

    private String members(String method, String parameter, Object question) throws Exception {
        return (String) type("PolymorphismDemo").getMethod(method, type(parameter)).invoke(null, question);
    }

    @Test
    void interfaceAndSuperclassCallsDispatchToTheSameObjectsOverride() throws Exception {
        Object hinted = question("HintedPracticeQuestion");
        assertTrue(type("PracticeQuestion").isInstance(hinted));
        assertTrue(type("OpenPracticeQuestion").isInstance(hinted));
        String expected = "Explain Objects (hint: name one object)";
        assertEquals(expected, present(hinted, " Objects "));
        assertEquals(expected, type("OpenPracticeQuestion").getMethod("ask", String.class).invoke(hinted, " Objects "));
        assertEquals("Explain Objects", present(question("OpenPracticeQuestion"), " Objects "));
        assertEquals("name one object", type("HintedPracticeQuestion").getMethod("hint").invoke(hinted));
    }

    @ParameterizedTest
    @ValueSource(strings = {"OpenPracticeQuestion", "HintedPracticeQuestion"})
    void bothTypesPreserveTheSharedContractIncludingWhitespaceAndFailureBehavior(String name) throws Exception {
        Object question = question(name);
        String suffix = name.equals("HintedPracticeQuestion") ? " (hint: name one object)" : "";
        for (String topic : List.of("Objects", " Objects ", "\u2003Objects\u2003", "two words", "A")) {
            assertEquals("Explain " + topic.strip() + suffix, present(question, topic));
        }
        for (String topic : new String[]{null, "", "   ", "\t\n", "\u2003"}) {
            var rejected = assertThrows(InvocationTargetException.class, () -> present(question, topic));
            assertInstanceOf(IllegalArgumentException.class, rejected.getCause());
            assertEquals("Topic is required", rejected.getCause().getMessage());
            assertEquals("Explain Objects" + suffix, present(question, "Objects"));
        }
    }

    @Test
    void compiledCallSitesChooseOverloadsByDeclaredTypeThenDispatchAskByRuntimeType() throws Exception {
        assertEquals("open overload: Explain Objects (hint: name one object)\n"
                        + "hinted overload: Explain Objects (hint: name one object)",
                runProbe("public static String run() { "
                        + "HintedPracticeQuestion hinted = new HintedPracticeQuestion(); "
                        + "OpenPracticeQuestion base = hinted; "
                        + "return PolymorphismDemo.select(base) + \"\\n\" + PolymorphismDemo.select(hinted); }"));
    }

    @Test
    void hiddenFieldsAndStaticMethodsFollowTheDeclaredReferenceType() throws Exception {
        Object hinted = question("HintedPracticeQuestion");
        assertEquals("open/open", members("baseMembers", "OpenPracticeQuestion", hinted));
        assertEquals("hinted/hinted", members("childMembers", "HintedPracticeQuestion", hinted));
        assertTrue(Modifier.isStatic(type("OpenPracticeQuestion").getMethod("category").getModifiers()));
        assertTrue(Modifier.isStatic(type("HintedPracticeQuestion").getMethod("category").getModifiers()));
        assertFalse(Modifier.isStatic(type("OpenPracticeQuestion").getMethod("ask", String.class).getModifiers()));
        assertFalse(Modifier.isStatic(type("HintedPracticeQuestion").getMethod("ask", String.class).getModifiers()));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "PracticeQuestion role = new HintedPracticeQuestion(); String hint = role.hint();",
            "PracticeQuestion role = new HintedPracticeQuestion(); String result = PolymorphismDemo.select(role);",
            "HintedPracticeQuestion child = new OpenPracticeQuestion();",
            "static class Broken extends OpenPracticeQuestion { @Override public String ask(Object topic) { return \"wrong signature\"; } }",
            "static class Broken extends OpenPracticeQuestion { public static String ask(String topic) { return topic; } }",
            "static class Broken extends OpenPracticeQuestion { @Override protected String ask(String topic) { return topic; } }",
            "static class Broken extends OpenPracticeQuestion { @Override public int ask(String topic) { return 1; } }"
    })
    void compilerRejectsUnavailableApiWrongOverridesAndUnsupportedAssignments(String members) throws Exception {
        assertFalse(compileProbe(members, Files.createTempDirectory(scratch, "invalid-")));
    }

    @Test
    void anAccidentalObjectOverloadDoesNotReplaceTheInheritedStringMethod() throws Exception {
        assertEquals("Explain Objects", runProbe("static class Checklist extends OpenPracticeQuestion { "
                + "public String ask(Object topic) { return \"Wrong overload\"; } } "
                + "public static String run() { PracticeQuestion role = new Checklist(); return role.ask(\" Objects \"); }"));
    }

    @Test
    void theExerciseOverrideWorksThroughBothReferenceTypesAndTheExistingOverload() throws Exception {
        assertEquals("Explain Objects; give two examples\nExplain Objects; give two examples\n"
                        + "open overload: Explain Objects; give two examples",
                runProbe("static class Checklist extends OpenPracticeQuestion { "
                        + "@Override public String ask(String topic) { return super.ask(topic) + \"; give two examples\"; } } "
                        + "public static String run() { Checklist checklist = new Checklist(); "
                        + "PracticeQuestion role = checklist; OpenPracticeQuestion base = checklist; "
                        + "return PolymorphismDemo.present(role, \" Objects \") + \"\\n\" "
                        + "+ PolymorphismDemo.present(base, \" Objects \") + \"\\n\" + PolymorphismDemo.select(checklist); }"));
    }

    @Test
    void aCompilingOverrideCanBreakTheSemanticContract() throws Exception {
        assertEquals("", runProbe("static class Broken extends OpenPracticeQuestion { "
                + "@Override public String ask(String topic) { return \"\"; } } "
                + "public static String run() { return PolymorphismDemo.present(new Broken(), \"Objects\"); }"));
    }

    @Test
    void anExplicitDowncastChecksTheObjectInsteadOfConvertingIt() throws Exception {
        for (String actual : List.of("OpenPracticeQuestion", "Checklist")) {
            var rejected = assertThrows(InvocationTargetException.class, () -> runProbe(
                    "static class Checklist extends OpenPracticeQuestion {} "
                            + "public static String run() { OpenPracticeQuestion base = new " + actual + "(); "
                            + "return ((HintedPracticeQuestion) base).hint(); }"));
            assertInstanceOf(ClassCastException.class, rejected.getCause());
        }
        assertEquals("true/name one object", runProbe("public static String run() { "
                + "PracticeQuestion role = new HintedPracticeQuestion(); "
                + "HintedPracticeQuestion narrowed = (HintedPracticeQuestion) role; "
                + "return (role == narrowed) + \"/\" + narrowed.hint(); }"));
    }

    @Test
    void aNullReceiverIsDistinctFromTheTopicValidationContract() throws Exception {
        var rejected = assertThrows(InvocationTargetException.class, () -> present(null, "Objects"));
        assertInstanceOf(NullPointerException.class, rejected.getCause());
    }

    @Test
    void everyIllustratedFieldAndReferenceMatchesTheCompiledJavaEvidence() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("polymorphism-snapshots.json").toFile());
        List<String> output = demoOutput();
        Object hinted = question("HintedPracticeQuestion");
        String runtimeType = hinted.getClass().getSimpleName();
        String roleType = type("PolymorphismDemo").getMethod("present", type("PracticeQuestion"), String.class)
                .getParameterTypes()[0].getSimpleName();
        String baseType = type("PolymorphismDemo").getMethod("baseMembers", type("OpenPracticeQuestion"))
                .getParameterTypes()[0].getSimpleName();
        String childType = type("PolymorphismDemo").getMethod("childMembers", type("HintedPracticeQuestion"))
                .getParameterTypes()[0].getSimpleName();
        assertEquals(4, snapshots.size());
        for (JsonNode snapshot : snapshots) assertEquals(2, snapshot.get("items").size());
        JsonNode object = snapshots.get(0).get("items").get(0);
        assertEquals(JSON.valueToTree(List.of("hinted", "base", "role")), object.get("references"));
        assertItem(object, "hinted question", runtimeType, Map.of("hinted declared type", childType,
                "base declared type", baseType, "role declared type", roleType,
                "same object", Boolean.parseBoolean(output.get(5).substring("same object: ".length()))));
        Object plain = question("OpenPracticeQuestion");
        assertItem(snapshots.get(0).get("items").get(1), "plain question", plain.getClass().getSimpleName(),
                Map.of("ask result", ask(plain, " Objects ")));
        assertItem(snapshots.get(1).get("items").get(0), "interface call", roleType,
                Map.of("topic", " Objects ", "runtime class", runtimeType, "result", present(hinted, " Objects ")));
        assertItem(snapshots.get(1).get("items").get(1), "superclass call", baseType,
                Map.of("topic", " Objects ", "runtime class", runtimeType,
                        "result", type("OpenPracticeQuestion").getMethod("ask", String.class).invoke(hinted, " Objects ")));
        assertItem(snapshots.get(2).get("items").get(0), "select(base)", baseType + " argument",
                Map.of("result", output.get(3)));
        assertItem(snapshots.get(2).get("items").get(1), "select(hinted)", childType + " argument",
                Map.of("result", output.get(4)));
        assertItem(snapshots.get(3).get("items").get(0), "baseMembers(base)", baseType + " reference",
                Map.of("field / static method", members("baseMembers", baseType, hinted)));
        assertItem(snapshots.get(3).get("items").get(1), "childMembers(hinted)", childType + " reference",
                Map.of("field / static method", members("childMembers", childType, hinted)));
    }

    @Test
    void recordedOutputComesFromTheActualCanonicalJavaMain() throws Exception {
        assertEquals(Files.readAllLines(EXAMPLES.resolve("polymorphism-output.txt")), demoOutput());
    }

    private List<String> demoOutput() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "PolymorphismDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            return output.lines().toList();
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    private String runProbe(String members) throws Exception {
        Path directory = Files.createTempDirectory(scratch, "valid-");
        assertTrue(compileProbe(members, directory));
        try (var probes = new URLClassLoader(new java.net.URL[]{directory.toUri().toURL()}, loader)) {
            return (String) probes.loadClass("PolymorphismProbe").getMethod("run").invoke(null);
        }
    }

    private boolean compileProbe(String members, Path directory) throws Exception {
        Path file = directory.resolve("PolymorphismProbe.java");
        Files.writeString(file, "import " + PACKAGE + "*; public class PolymorphismProbe { " + members + " }");
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
        Map<String, JsonNode> fields = new LinkedHashMap<>();
        for (JsonNode field : item.get("fields")) {
            assertNull(fields.put(field.get("name").asText(), field.get("value")), "duplicate field");
        }
        assertEquals(JSON.valueToTree(actualFields), JSON.valueToTree(fields), label);
    }
}
