package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.exception.InvalidParkingRequestException;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.strategy.DynamicPricingStrategy;
import com.lld.parkinglot.strategy.FlatRatePricingStrategy;
import com.lld.parkinglot.strategy.HourlyPricingStrategy;
import com.lld.parkinglot.strategy.PricingStrategyFactory;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Executes the exact raw-imported teaching sources, separate from application servers. */
class KissLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.kiss.";
    private static final String REJECTION = "weightGrams must be 1..2000";
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> rulesType, directType;

    @BeforeAll static void compileTheExactDisplayedSourcesWithJava17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "Run with a JDK, not a JRE");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String name : List.of("RuleBasedParcelFees", "ParcelFees", "KissDemo"))
            args.add(EXAMPLES.resolve("kiss/" + name + ".java").toString());
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        rulesType = loader.loadClass(PACKAGE + "RuleBasedParcelFees");
        directType = loader.loadClass(PACKAGE + "ParcelFees");
    }

    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    private static Object fresh(Class<?> type) throws Exception { return type.getConstructor().newInstance(); }

    private static int fee(Object policy, int grams) throws Exception {
        try {
            return (Integer) policy.getClass().getMethod("feeCents", int.class).invoke(policy, grams);
        } catch (InvocationTargetException wrapped) {
            if (wrapped.getCause() instanceof RuntimeException rejection) throw rejection;
            throw wrapped;
        }
    }

    @ParameterizedTest
    @CsvSource({"1,300", "2,300", "999,300", "1000,300", "1001,500", "1002,500", "1999,500", "2000,500"})
    void bothAlternativesMeetIndependentPositiveAndBoundaryExpectations(int grams, int expected) throws Exception {
        assertEquals(expected, fee(fresh(rulesType), grams), "rule-based fee");
        assertEquals(expected, fee(fresh(directType), grams), "direct fee");
    }

    @Test void everySupportedWholeGramMatchesTheRequirementNotJustTheOtherImplementation() throws Exception {
        Object rules = fresh(rulesType), direct = fresh(directType);
        for (int grams = 1; grams <= 1000; grams++) {
            assertEquals(300, fee(rules, grams), "lower rule band at " + grams);
            assertEquals(300, fee(direct, grams), "lower direct band at " + grams);
        }
        for (int grams = 1001; grams <= 2000; grams++) {
            assertEquals(500, fee(rules, grams), "upper rule band at " + grams);
            assertEquals(500, fee(direct, grams), "upper direct band at " + grams);
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {Integer.MIN_VALUE, -2000, -1, 0, 2001, 2002, Integer.MAX_VALUE})
    void unsupportedInputsPreserveExactRejectionContractAndDoNotPoisonLaterCalls(int grams) throws Exception {
        for (Class<?> type : List.of(rulesType, directType)) {
            Object policy = fresh(type);
            assertEquals(300, fee(policy, 1000));
            IllegalArgumentException rejection = assertThrowsExactly(IllegalArgumentException.class, () -> fee(policy, grams));
            assertEquals(REJECTION, rejection.getMessage());
            assertEquals(500, fee(policy, 1001));
            assertEquals(300, fee(policy, 1000));
        }
    }

    @Test void exactConsoleOutputIsProducedByTheCanonicalMain() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "KissDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo must terminate");
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertEquals(Files.readString(EXAMPLES.resolve("kiss-output.txt")).replace("\r\n", "\n"), output.replace("\r\n", "\n"));
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    @Test void everyRecordedScalarMatchesExecutionInDemoOrderIncludingNullFeesAndRejections() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("kiss-snapshots.json").toFile());
        int[][] weightsByStep = {{1}, {1000, 1001}, {2000}, {0, 2001}, {1000}};
        assertEquals(weightsByStep.length, snapshots.size());
        Object rules = fresh(rulesType), direct = fresh(directType);
        for (int step = 0; step < weightsByStep.length; step++) {
            JsonNode items = snapshots.get(step).get("items");
            assertEquals(weightsByStep[step].length * 2, items.size());
            int item = 0;
            for (int grams : weightsByStep[step]) {
                verifyRecordedItem(items.get(item++), "rules", rules, grams);
                verifyRecordedItem(items.get(item++), "direct", direct, grams);
            }
        }
    }

    private static void verifyRecordedItem(JsonNode item, String label, Object policy, int grams) throws Exception {
        assertEquals(label + " at " + grams + " g", item.get("label").asText());
        assertEquals(policy.getClass().getSimpleName() + " result", item.get("typeLabel").asText());
        var actual = JSON.createObjectNode().put("weightGrams", grams);
        try {
            actual.put("feeCents", fee(policy, grams));
            actual.putNull("rejection");
        } catch (IllegalArgumentException rejection) {
            actual.putNull("feeCents");
            actual.put("rejection", rejection.getClass().getSimpleName() + ": " + rejection.getMessage());
        }
        var recorded = JSON.createObjectNode();
        for (JsonNode field : item.get("fields")) {
            assertTrue(field.get("value").isValueNode(), "recorded result must be a named scalar");
            String name = field.get("name").asText();
            assertFalse(recorded.has(name), "duplicate recorded field " + name);
            recorded.set(name, field.get("value"));
        }
        assertEquals(actual, recorded, item.get("label").asText());
    }

    @Test void ordinaryExternalClientCanUseEitherPublicContract() throws Exception {
        Path source = scratch.resolve("KissClient.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class KissClient { "
                + "public static void main(String[] args) { "
                + "if (new ParcelFees().feeCents(1000) != 300) throw new AssertionError(); "
                + "if (new RuleBasedParcelFees().feeCents(1001) != 500) throw new AssertionError(); } }");
        assertEquals(0, ToolProvider.getSystemJavaCompiler().run(null, null, null,
                "--release", "17", "-classpath", classes.toString(), "-d", scratch.toString(), source.toString()));
        try (var clientLoader = new URLClassLoader(new java.net.URL[]{scratch.toUri().toURL()}, loader)) {
            clientLoader.loadClass("KissClient").getMethod("main", String[].class).invoke(null, (Object) new String[0]);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "void bypass(RuleBasedParcelFees fees) { fees.rules.clear(); }",
            "RuleBasedParcelFees.Rule exposed;"
    })
    void compilerRejectsClientAccessToThePrivateRuleRepresentation(String member) throws Exception {
        Path source = scratch.resolve("KissProbe.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class KissProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call());
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR
                    && d.getMessage(Locale.ROOT).contains("private access")), diagnostics.getDiagnostics().toString());
        }
    }

    @ParameterizedTest @CsvSource({"CAR,50.0", "BIKE,25.0", "TRUCK,100.0"})
    void realParkingFlatPolicyHasFixedRatesWithoutMutatingTickets(VehicleType vehicle, double expected) {
        var flat = new FlatRatePricingStrategy();
        var factory = new PricingStrategyFactory(new HourlyPricingStrategy(), flat, new DynamicPricingStrategy());
        assertSame(flat, factory.getStrategy("FLAT"));
        assertInstanceOf(HourlyPricingStrategy.class, factory.getStrategy("HOURLY"));
        assertInstanceOf(DynamicPricingStrategy.class, factory.getStrategy("DYNAMIC"));
        for (int hours : new int[]{0, 1, 48}) {
            var entry = LocalDateTime.of(2026, 1, 1, 10, 0);
            var ticket = new Ticket("KISS-1", "VEHICLE", vehicle, "SPOT", entry);
            ticket.setExitTime(entry.plusHours(hours));
            ticket.setAmount(17.0);
            ticket.setPaymentMethod("CASH");
            JsonNode before = JSON.valueToTree(ticket);
            assertEquals(expected, factory.getStrategy("FLAT").calculatePrice(ticket));
            assertEquals(before, JSON.valueToTree(ticket), "flat calculation must not change ticket data");
        }
        assertThrows(InvalidParkingRequestException.class, () -> factory.getStrategy("unregistered"));
    }
}
