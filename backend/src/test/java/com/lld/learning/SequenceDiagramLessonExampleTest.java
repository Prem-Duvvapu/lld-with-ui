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
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the exact browser sources; expected fees and messages are independent acceptance criteria. */
class SequenceDiagramLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.sequence.";
    private static final String REJECTION = "Weight must be 1 to 2000 g";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> traceType, feesType, writerType, deskType, clientType, quoteType;

    @BeforeAll
    static void compileExactlyTheSixDisplayedSourcesWithRelease17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "A JDK is required");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String file : List.of("InteractionTrace.java", "ParcelFees.java", "ReceiptWriter.java",
                "QuoteDesk.java", "QuoteClient.java", "SequenceDemo.java")) {
            args.add(EXAMPLES.resolve("sequence").resolve(file).toString());
        }
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        traceType = loader.loadClass(PACKAGE + "InteractionTrace");
        feesType = loader.loadClass(PACKAGE + "ParcelFees");
        writerType = loader.loadClass(PACKAGE + "ReceiptWriter");
        deskType = loader.loadClass(PACKAGE + "QuoteDesk");
        clientType = loader.loadClass(PACKAGE + "QuoteClient");
        quoteType = loader.loadClass(PACKAGE + "ParcelFees$Quote");
    }

    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    private record ObjectsInScenario(Object trace, Object fees, Object writer, Object desk, Object client) {}

    private ObjectsInScenario scenario() throws Exception {
        Object trace = traceType.getConstructor().newInstance();
        Object fees = feesType.getConstructor().newInstance();
        Object writer = writerType.getConstructor().newInstance();
        Object desk = deskType.getConstructor(feesType, writerType, traceType).newInstance(fees, writer, trace);
        Object client = clientType.getConstructor(deskType, traceType).newInstance(desk, trace);
        return new ObjectsInScenario(trace, fees, writer, desk, client);
    }

    private Object call(Object receiver, String method, Object... args) throws Exception {
        var target = Arrays.stream(receiver.getClass().getMethods())
                .filter(candidate -> candidate.getName().equals(method) && candidate.getParameterCount() == args.length)
                .findFirst().orElseThrow();
        try { return target.invoke(receiver, args); }
        catch (InvocationTargetException failure) {
            if (failure.getCause() instanceof RuntimeException cause) throw cause;
            throw failure;
        }
    }

    private List<?> messages(Object trace) throws Exception { return (List<?>) call(trace, "messages"); }

    private List<String> lines(Object trace) throws Exception {
        var result = new ArrayList<String>();
        for (Object message : messages(trace)) result.add((String) call(message, "line"));
        return result;
    }

    private List<String> acceptedMessages(int grams, int cents) {
        return List.of("call client -> desk: quote(" + grams + ")", "call desk -> fees: quote(" + grams + ")",
                "return fees -> desk: fee = " + cents + " cents", "call desk -> receipts: render(accepted quote)",
                "return receipts -> desk: \"Parcel " + grams + " g: " + cents + " cents\"", "return desk -> client: accepted result");
    }

    private List<String> rejectedMessages(int grams) {
        return List.of("call client -> desk: quote(" + grams + ")", "call desk -> fees: quote(" + grams + ")",
                "return fees -> desk: rejected: " + REJECTION, "return desk -> client: rejected result");
    }

    private void assertAccepted(Object result, int grams, int cents) throws Exception {
        Object quote = call(result, "quote");
        assertEquals(true, call(result, "accepted"));
        assertEquals(true, call(quote, "accepted"));
        assertEquals(grams, call(quote, "weightGrams"));
        assertEquals(cents, call(quote, "feeCents"));
        assertNull(call(quote, "rejection"));
        assertEquals("Parcel " + grams + " g: " + cents + " cents", call(result, "receipt"));
    }

    @ParameterizedTest @CsvSource({"1,300", "999,300", "1000,300", "1001,500", "1999,500", "2000,500"})
    void independentlySpecifiedFeeBandsAndExactNestedCallOrder(int grams, int cents) throws Exception {
        var objects = scenario();
        Object result = call(objects.client(), "request", grams);
        assertAccepted(result, grams, cents);
        assertEquals(acceptedMessages(grams, cents), lines(objects.trace()));
        // Direct collaborator behavior agrees with the published contract, not just with trace labels.
        Object directQuote = call(objects.fees(), "quote", grams);
        assertEquals(cents, call(directQuote, "feeCents"));
        assertEquals(call(result, "receipt"), call(objects.writer(), "render", directQuote));
        assertEquals(directQuote, call(result, "quote"));
    }

    @ParameterizedTest @ValueSource(ints = {Integer.MIN_VALUE, -1, 0, 2001, 2002, Integer.MAX_VALUE})
    void rejectionReturnsNormallySkipsTheWriterAndDoesNotPoisonLaterRequests(int grams) throws Exception {
        var objects = scenario();
        Object earlier = call(objects.client(), "request", 1);
        call(objects.trace(), "clear");
        Object result = call(objects.client(), "request", grams); // No thrown domain exception on this path.
        Object quote = call(result, "quote");
        assertEquals(false, call(result, "accepted"));
        assertEquals(false, call(quote, "accepted"));
        assertEquals(grams, call(quote, "weightGrams"));
        assertNull(call(quote, "feeCents"));
        assertNull(call(result, "receipt"));
        assertEquals(REJECTION, call(quote, "rejection"));
        assertEquals(rejectedMessages(grams), lines(objects.trace()));
        assertTrue(messages(objects.trace()).stream().noneMatch(message -> message.toString().contains("receipts")));
        call(objects.trace(), "clear");
        assertAccepted(call(objects.client(), "request", 1001), 1001, 500);
        assertEquals(acceptedMessages(1001, 500), lines(objects.trace()));
        assertAccepted(earlier, 1, 300); // Earlier returned values are still valid.
    }

    @Test void directWriterProgrammingErrorsAreExceptionsOutsideTheAuthoredFlows() throws Exception {
        var objects = scenario();
        Object rejected = call(objects.fees(), "quote", 0);
        var failure = assertThrowsExactly(IllegalArgumentException.class, () -> call(objects.writer(), "render", rejected));
        assertEquals("An accepted quote is required", failure.getMessage());
        assertThrowsExactly(NullPointerException.class, () -> call(objects.writer(), "render", (Object) null));
        assertTrue(messages(objects.trace()).isEmpty(), "direct calls have no client/desk instrumentation");
    }

    @Test void theLifelinesAreActualRetainedInstancesAndRequestIsNotStatic() throws Exception {
        var objects = scenario();
        for (Object[] retained : List.of(new Object[]{objects.client(), "desk", objects.desk()},
                new Object[]{objects.desk(), "fees", objects.fees()},
                new Object[]{objects.desk(), "receipts", objects.writer()})) {
            var field = retained[0].getClass().getDeclaredField((String) retained[1]);
            assertTrue(Modifier.isPrivate(field.getModifiers()));
            assertTrue(Modifier.isFinal(field.getModifiers()));
            assertFalse(Modifier.isStatic(field.getModifiers()));
            field.setAccessible(true);
            assertSame(retained[2], field.get(retained[0]));
        }
        assertFalse(Modifier.isStatic(clientType.getMethod("request", int.class).getModifiers()));
        assertTrue(quoteType.isRecord());
        assertTrue(loader.loadClass(PACKAGE + "QuoteDesk$Result").isRecord());
    }

    @Test void traceSnapshotsAreImmutableCopiesAndKeepActualReturnedLabels() throws Exception {
        var objects = scenario();
        call(objects.client(), "request", 1000);
        List<?> earlier = messages(objects.trace());
        assertThrows(UnsupportedOperationException.class, earlier::clear);
        call(objects.trace(), "clear");
        assertTrue(messages(objects.trace()).isEmpty());
        assertEquals(6, earlier.size());
        call(objects.client(), "request", 0);
        assertEquals(6, earlier.size());
        assertEquals(rejectedMessages(0), lines(objects.trace()));
    }

    @Test void everyRecordedScalarMatchesJavaInTheActualDemoOrder() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("sequence-snapshots.json").toFile());
        int[] grams = {1000, 0, 1001, 2001, 2000};
        Integer[] fees = {300, null, 500, null, 500};
        assertEquals(grams.length, snapshots.size());
        var objects = scenario();
        for (int index = 0; index < grams.length; index++) {
            call(objects.trace(), "clear");
            Object result = call(objects.client(), "request", grams[index]);
            Object quote = call(result, "quote");
            boolean accepted = fees[index] != null;
            assertEquals(accepted ? acceptedMessages(grams[index], fees[index]) : rejectedMessages(grams[index]), lines(objects.trace()));
            var actual = JSON.createObjectNode().put("weightGrams", (int) call(quote, "weightGrams"))
                    .put("accepted", (boolean) call(result, "accepted"));
            actual.set("feeCents", JSON.valueToTree(call(quote, "feeCents")));
            actual.set("receipt", JSON.valueToTree(call(result, "receipt")));
            actual.set("rejection", JSON.valueToTree(call(quote, "rejection")));
            int calls = 0, replies = 0;
            for (Object message : messages(objects.trace())) {
                if (call(message, "kind").equals("call")) calls++;
                else if (call(message, "kind").equals("return")) replies++;
                else fail("Unexpected recorded message kind");
            }
            actual.put("call count", calls).put("reply count", replies).put("trace", String.join("\n", lines(objects.trace())));
            JsonNode items = snapshots.get(index).get("items");
            assertEquals(1, items.size());
            assertEquals("Request at " + grams[index] + " g", items.get(0).get("label").asText());
            assertEquals("QuoteDesk.Result", items.get(0).get("typeLabel").asText());
            var recorded = JSON.createObjectNode();
            for (JsonNode field : items.get(0).get("fields")) {
                String name = field.get("name").asText();
                assertFalse(recorded.has(name), "duplicate recorded field " + name);
                assertTrue(field.get("value").isValueNode(), "all recorded fields must be scalar");
                recorded.set(name, field.get("value"));
            }
            assertEquals(actual, recorded, snapshots.get(index).get("title").asText());
        }
    }

    @Test void canonicalMainProducesTheExactDisplayedConsoleOutput() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "SequenceDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo must terminate");
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("sequence-output.txt")).replace("\r\n", "\n"), actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @ParameterizedTest @ValueSource(strings = {
            "void misuse() { QuoteClient.request(1000); }",
            "void misuse(QuoteDesk desk) { desk.fees.quote(1000); }",
            "void misuse(QuoteClient client) { client.request(\"1000 g\"); }"
    })
    void compilerRejectsClassAsCallerPrivateCollaboratorBypassAndWrongUnitRepresentation(String member) throws Exception {
        Path source = scratch.resolve("SequenceProbe.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class SequenceProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call());
            String expectedCode = member.contains("QuoteClient.request") ? "non-static.cant.be.ref"
                    : member.contains("desk.fees") ? "report.access" : "prob.found.req";
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR
                    && d.getCode().contains(expectedCode)), diagnostics.getDiagnostics().toString());
        }
    }
}
