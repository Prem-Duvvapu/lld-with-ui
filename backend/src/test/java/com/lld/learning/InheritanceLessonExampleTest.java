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
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Executes the exact inheritance files imported with ?raw, including every illustrated scalar. */
class InheritanceLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.inheritance.";
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> resource;
    private static Class<?> video;
    private static Class<?> playlist;
    private static Class<?> demo;

    @BeforeAll
    static void compileCanonicalDisplayedSources() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 compiler required");
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-d", classes.toString(),
                EXAMPLES.resolve("inheritance/InheritanceResource.java").toString(),
                EXAMPLES.resolve("inheritance/InheritanceVideo.java").toString(),
                EXAMPLES.resolve("inheritance/InheritancePlaylist.java").toString(),
                EXAMPLES.resolve("inheritance/InheritanceDemo.java").toString()));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        resource = loader.loadClass(PACKAGE + "InheritanceResource");
        video = loader.loadClass(PACKAGE + "InheritanceVideo");
        playlist = loader.loadClass(PACKAGE + "InheritancePlaylist");
        demo = loader.loadClass(PACKAGE + "InheritanceDemo");
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    private Object resource(String title, List<String> trace) throws Exception {
        return resource.getConstructor(String.class, List.class).newInstance(title, trace);
    }

    private Object video(String title, int minutes, List<String> trace) throws Exception {
        return video.getConstructor(String.class, int.class, List.class).newInstance(title, minutes, trace);
    }

    private String present(Object instance) throws Exception {
        return (String) demo.getMethod("present", resource).invoke(null, instance);
    }

    @Test
    void subclassInitializationIsOrderedAndTitleBehaviorIsInherited() throws Exception {
        List<String> trace = new ArrayList<>();
        Object instance = video(" Inheritance ", 12, trace);
        assertEquals(List.of("resource initialized: Inheritance", "video initialized: 12 min"), trace);
        assertEquals(resource, video.getSuperclass());
        assertTrue(resource.isInstance(instance));
        assertEquals(resource, video.getMethod("getTitle").getDeclaringClass());
        assertEquals("Inheritance", resource.getMethod("getTitle").invoke(instance));
        assertEquals(12, video.getMethod("getMinutes").invoke(instance));
        assertThrows(NoSuchMethodException.class, () -> video.getDeclaredMethod("getTitle"));
    }

    @Test
    void identicalBaseCallDispatchesToTheActualRuntimeObjectAndSuperSummaryIsPreserved() throws Exception {
        Object plain = resource("Objects", new ArrayList<>());
        Object derived = video("Inheritance", 12, new ArrayList<>());
        assertEquals("Resource: Objects", present(plain));
        assertEquals("Resource: Inheritance (video, 12 min)", present(derived));
        assertEquals(resource, plain.getClass().getMethod("describe").getDeclaringClass());
        assertEquals(video, derived.getClass().getMethod("describe").getDeclaringClass());
        assertThrows(NoSuchMethodException.class, () -> resource.getMethod("getMinutes"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Objects", "  Inheritance  ", "API design", "继承"})
    void bothResourceClassesKeepTheDeclaredTitleAndDescriptionPromise(String title) throws Exception {
        for (Object instance : List.of(resource(title, new ArrayList<>()), video(title, 1, new ArrayList<>()))) {
            assertEquals(title.trim(), resource.getMethod("getTitle").invoke(instance));
            String description = present(instance);
            assertFalse(description.isBlank());
            assertTrue(description.contains(title.trim()));
        }
    }

    @Test
    void invalidBaseInputRejectsBothClassesBeforeAnyTraceEvent() throws Exception {
        for (String title : new String[]{null, "", "   "}) {
            List<String> trace = new ArrayList<>();
            var baseFailure = assertThrows(InvocationTargetException.class, () -> resource(title, trace));
            var videoFailure = assertThrows(InvocationTargetException.class, () -> video(title, 12, trace));
            for (var failure : List.of(baseFailure, videoFailure)) {
                assertInstanceOf(IllegalArgumentException.class, failure.getCause());
                assertEquals("Title is required", failure.getCause().getMessage());
            }
            assertTrue(trace.isEmpty());
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, Integer.MIN_VALUE})
    void failedDerivedValidationDoesNotRollBackCompletedBaseInitialization(int minutes) {
        List<String> trace = new ArrayList<>();
        var failure = assertThrows(InvocationTargetException.class, () -> video("Inheritance", minutes, trace));
        assertInstanceOf(IllegalArgumentException.class, failure.getCause());
        assertEquals("Minutes must be positive", failure.getCause().getMessage());
        assertEquals(List.of("resource initialized: Inheritance"), trace);
    }

    @Test
    void playlistDelegatesWithoutBecomingAResource() throws Exception {
        assertEquals(Object.class, playlist.getSuperclass());
        assertFalse(resource.isAssignableFrom(playlist));
        for (Object instance : List.of(resource("Objects", new ArrayList<>()), video("Inheritance", 12, new ArrayList<>()))) {
            Object composed = playlist.getConstructor(resource).newInstance(instance);
            assertEquals("Next: " + present(instance), playlist.getMethod("describeNext").invoke(composed));
        }
        var failure = assertThrows(InvocationTargetException.class,
                () -> playlist.getConstructor(resource).newInstance(new Object[]{null}));
        assertInstanceOf(IllegalArgumentException.class, failure.getCause());
        assertEquals("Next resource is required", failure.getCause().getMessage());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "void inspect(InheritanceResource r) { r.getMinutes(); }",
            "void inspect(InheritanceResource r) { InheritanceVideo v = r; }",
            "static class Child extends InheritanceResource { Child() { super(\"X\", new java.util.ArrayList<>()); } String read() { return title; } }",
            "static class Child extends InheritanceResource { Child() {} }",
            "static class Child extends InheritanceResource { Child() { super(\"X\", new java.util.ArrayList<>()); } public String getTitle() { return \"X\"; } }",
            "static class Child extends InheritanceVideo { Child() { super(\"X\", 1, new java.util.ArrayList<>()); } }",
            "static class Child extends InheritanceResource, Object {}",
            "InheritanceVideo v = new InheritanceVideo(\"X\", new java.util.ArrayList<>());",
            "static class Child extends InheritanceResource { Child() { super(\"X\", new java.util.ArrayList<>()); } @Override protected String describe() { return \"X\"; } }",
            "static class Child extends InheritanceResource { Child() { super(\"X\", new java.util.ArrayList<>()); } @Override public int describe() { return 1; } }",
            "static class Child extends InheritanceResource { Child() { super(\"X\", new java.util.ArrayList<>()); } @Override public String describe() throws java.io.IOException { return \"X\"; } }",
            "static class Child extends InheritanceResource { Child() { super(\"X\", new java.util.ArrayList<>()); } @Override public String describe(int ignored) { return \"X\"; } }",
            "static class Child extends InheritanceResource { Child() { int x = 1; super(\"X\", new java.util.ArrayList<>()); } }"
    })
    void compilerRejectsTheSpecificInheritanceMisconceptions(String member) throws Exception {
        assertFalse(compileProbe(member));
    }

    @Test
    void aCompilingOverrideCanStillBreakTheBehavioralPromise() throws Exception {
        assertTrue(compileProbe("public static class Misleading extends InheritanceResource { "
                + "public Misleading() { super(\"Objects\", new java.util.ArrayList<>()); } "
                + "@Override public String describe() { return \"\"; } }"));
        try (var probes = new URLClassLoader(new java.net.URL[]{scratch.toUri().toURL()}, loader)) {
            Object broken = probes.loadClass("InheritanceProbe$Misleading").getConstructor().newInstance();
            assertTrue(resource.isInstance(broken));
            assertEquals("Objects", resource.getMethod("getTitle").invoke(broken));
            assertEquals("", present(broken), "compiler acceptance is not a behavioral proof");
        }
    }

    @Test
    void anUnannotatedOverloadDoesNotOverrideTheNoArgumentInstanceMethod() throws Exception {
        assertTrue(compileProbe("public static class Overload extends InheritanceResource { "
                + "public Overload() { super(\"Objects\", new java.util.ArrayList<>()); } "
                + "public String describe(int ignored) { return \"different overload\"; } }"));
        try (var probes = new URLClassLoader(new java.net.URL[]{scratch.toUri().toURL()}, loader)) {
            Object overloaded = probes.loadClass("InheritanceProbe$Overload").getConstructor().newInstance();
            assertEquals("Resource: Objects", present(overloaded));
            assertEquals("different overload", overloaded.getClass().getMethod("describe", int.class).invoke(overloaded, 1));
        }
    }

    @Test
    void illustratedConstructionAndInheritedReferenceValuesComeFromCanonicalJava() throws Exception {
        JsonNode snapshots = snapshots();
        assertEquals(4, snapshots.size());
        List<String> trace = new ArrayList<>();
        Object instance = video(" Inheritance ", 12, trace);
        JsonNode constructed = snapshots.get(0).get("items");
        assertField(constructed.get(0), "title", resource.getMethod("getTitle").invoke(instance));
        assertField(constructed.get(0), "minutes", video.getMethod("getMinutes").invoke(instance));
        assertField(constructed.get(1), "first", trace.get(0));
        assertField(constructed.get(1), "second", trace.get(1));
        JsonNode inherited = snapshots.get(1).get("items").get(0);
        // This declared type is also checked by compiling main and the getMinutes rejection above.
        assertField(inherited, "resource declared type", resource.getSimpleName());
        assertField(inherited, "runtime class", instance.getClass().getSimpleName());
        assertField(inherited, "getTitle declared by", video.getMethod("getTitle").getDeclaringClass().getSimpleName());
        assertField(inherited, "getTitle result", resource.getMethod("getTitle").invoke(instance));
        Object baseReference = resource.cast(instance);
        assertField(inherited, "resource == video", baseReference == instance);
    }

    @Test
    void illustratedDispatchAndPlaylistValuesComeFromCanonicalJava() throws Exception {
        JsonNode snapshots = snapshots();
        List<Object> instances = List.of(resource("Objects", new ArrayList<>()), video("Inheritance", 12, new ArrayList<>()));
        for (int i = 0; i < instances.size(); i++) {
            Object instance = instances.get(i);
            JsonNode call = snapshots.get(2).get("items").get(i);
            assertField(call, "parameter type", demo.getMethod("present", resource).getParameterTypes()[0].getSimpleName());
            assertField(call, "runtime class", instance.getClass().getSimpleName());
            assertField(call, "describe declared by", instance.getClass().getMethod("describe").getDeclaringClass().getSimpleName());
            assertField(call, "result", present(instance));
        }
        JsonNode composed = snapshots.get(3).get("items").get(0);
        Object list = playlist.getConstructor(resource).newInstance(instances.get(1));
        assertField(composed, "direct superclass", playlist.getSuperclass().getSimpleName());
        assertField(composed, "next field type", playlist.getDeclaredField("next").getType().getSimpleName());
        assertField(composed, "is a resource", resource.isInstance(list));
        assertField(composed, "describeNext result", playlist.getMethod("describeNext").invoke(list));
    }

    @Test
    void displayedOutputMatchesTheActualDemoProcess() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "InheritanceDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertEquals(Files.readAllLines(EXAMPLES.resolve("inheritance-output.txt")), output.lines().toList());
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    private boolean compileProbe(String member) throws Exception {
        Path source = scratch.resolve("InheritanceProbe.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class InheritanceProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            boolean success = compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call();
            assertEquals(!success, diagnostics.getDiagnostics().stream().anyMatch(entry -> entry.getKind() == Diagnostic.Kind.ERROR));
            return success;
        }
    }

    private JsonNode snapshots() throws Exception {
        return new ObjectMapper().readTree(EXAMPLES.resolve("inheritance-snapshots.json").toFile());
    }

    private void assertField(JsonNode item, String name, Object actual) {
        for (JsonNode field : item.get("fields")) {
            if (field.get("name").asText().equals(name)) {
                assertEquals(new ObjectMapper().valueToTree(actual), field.get("value"), item.get("label") + ": " + name);
                return;
            }
        }
        fail("Missing illustration field: " + name);
    }
}
