package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.tools.ToolProvider;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class ClassesAndObjectsExampleTest {
    @TempDir
    static Path classes;
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static URLClassLoader loader;
    private static Class<?> cardClass;

    @BeforeAll
    static void compileDisplayedJava() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "The curriculum examples require a JDK, not a JRE");
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-d", classes.toString(),
                EXAMPLES.resolve("StudyCard.java").toString(), EXAMPLES.resolve("StudyCardDemo.java").toString()));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        cardClass = loader.loadClass("com.lld.learning.examples.StudyCard");
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    private Object card(String topic) throws Exception {
        return cardClass.getConstructor(String.class).newInstance(topic);
    }

    private int count(Object card) throws Exception {
        return (int) cardClass.getMethod("getReviewCount").invoke(card);
    }

    private void review(Object card) throws Exception {
        cardClass.getMethod("review").invoke(card);
    }

    @Test
    void initializesEachInstanceAndRejectsMissingTopics() throws Exception {
        Object first = card("Objects");
        assertEquals("Objects", cardClass.getMethod("getTopic").invoke(first));
        assertEquals(0, count(first));
        for (String topic : new String[]{null, "", "   "}) {
            var error = assertThrows(java.lang.reflect.InvocationTargetException.class, () -> card(topic));
            assertInstanceOf(IllegalArgumentException.class, error.getCause());
        }
    }

    @Test
    void equalTopicsDoNotShareInstanceState() throws Exception {
        Object first = card("Objects");
        Object second = card("Objects");
        assertNotSame(first, second);
        review(first);
        assertEquals(1, count(first));
        assertEquals(0, count(second));
    }

    @Test
    void assigningAnAliasDoesNotCreateAnotherObject() throws Exception {
        Object first = card("Objects");
        Object alias = first;
        review(first);
        review(alias);
        assertSame(first, alias);
        assertEquals(2, count(first));
        assertEquals(2, count(alias));
    }

    @Test
    void illustrationSnapshotsMatchTheActualJavaStates() throws Exception {
        JsonNode snapshots = new ObjectMapper().readTree(EXAMPLES.resolve("classes-and-objects-snapshots.json").toFile());
        assertEquals(3, snapshots.size());
        Object first = card("Objects");
        Object second = card("Objects");
        for (int step = 0; step < 3; step++) {
            if (step == 1) review(first);
            if (step == 2) {
                Object alias = first;
                review(alias);
            }
            JsonNode objects = snapshots.get(step).get("objects");
            assertEquals(2, objects.size());
            for (int index = 0; index < 2; index++) {
                Object actual = index == 0 ? first : second;
                assertEquals(cardClass.getMethod("getTopic").invoke(actual), objects.get(index).get("topic").asText());
                assertEquals(count(actual), objects.get(index).get("reviewCount").asInt());
            }
            assertEquals(step == 2 ? 2 : 1, objects.get(0).get("references").size());
            assertEquals("first", objects.get(0).get("references").get(0).asText());
            assertEquals("second", objects.get(1).get("references").get(0).asText());
            if (step == 2) assertEquals("alias", objects.get(0).get("references").get(1).asText());
        }
    }

    @Test
    void runnableDemoMatchesTheDisplayedOutput() throws Exception {
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");
        Process process = new ProcessBuilder(java.toString(), "-cp", classes.toString(),
                "com.lld.learning.examples.StudyCardDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "The small Java demo must terminate");
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readAllLines(EXAMPLES.resolve("classes-and-objects-output.txt")), actual.lines().toList());
            Path windowsFixture = classes.resolve("expected-output-crlf.txt");
            Files.writeString(windowsFixture, String.join("\r\n", Files.readAllLines(EXAMPLES.resolve("classes-and-objects-output.txt"))) + "\r\n");
            assertEquals(Files.readAllLines(windowsFixture), actual.lines().toList());
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }
}
