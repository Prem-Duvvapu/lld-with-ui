package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.model.*;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.service.ParkingLotService;
import com.lld.parkinglot.service.ParkingLotSimService;
import com.lld.parkinglot.strategy.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import javax.tools.*;
import java.lang.reflect.InvocationTargetException;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the exact displayed Java 17 files; no lesson semantics implemented in JS. */
class DryLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.dry.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> beforeType, ruleType, quotesType, rewardsType;

    @BeforeAll static void compileCanonicalJava() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 required");
        var arguments = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String file : List.of("BeforeQuotes", "DeliveryFeeRule", "OrderQuotes", "RewardRule", "DryDemo"))
            arguments.add(EXAMPLES.resolve("dry/" + file + ".java").toString());
        assertEquals(0, compiler.run(null, null, null, arguments.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        beforeType = loader.loadClass(PACKAGE + "BeforeQuotes");
        ruleType = loader.loadClass(PACKAGE + "DeliveryFeeRule");
        quotesType = loader.loadClass(PACKAGE + "OrderQuotes");
        rewardsType = loader.loadClass(PACKAGE + "RewardRule");
    }

    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }
    private Object rule(int threshold, int fee) throws Exception {
        return ruleType.getConstructor(int.class, int.class).newInstance(threshold, fee);
    }
    private Object quotes(Object rule) throws Exception { return quotesType.getConstructor(ruleType).newInstance(rule); }
    private Object call(Object target, String name, Object... args) throws Exception {
        Class<?> type = target instanceof Class<?> supplied ? supplied : target.getClass();
        for (var method : type.getMethods())
            if (method.getName().equals(name) && method.getParameterCount() == args.length)
                return method.invoke(target instanceof Class<?> ? null : target, args);
        throw new NoSuchMethodException(name);
    }
    private void rejects(Class<? extends Throwable> failure, Object target, String method, Object... args) {
        assertInstanceOf(failure, assertThrows(InvocationTargetException.class, () -> call(target, method, args)).getCause());
    }

    @Test void outputMatchesTheCanonicalJavaProcess() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "DryDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("dry-output.txt")).replace("\r\n", "\n"), actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @Test void everyRecordedScalarMatchesTheJavaReplayInDemoOrder() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("dry-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        int subtotal = 5500;
        check(snapshots.get(0), Map.of("subtotalCents", subtotal,
                "previewFeeCents", call(beforeType, "originalPreview", subtotal), "checkoutFeeCents", call(beforeType, "originalCheckout", subtotal)));
        check(snapshots.get(1), Map.of("subtotalCents", subtotal,
                "previewFeeCents", call(beforeType, "updatedPreview", subtotal), "checkoutFeeCents", call(beforeType, "staleCheckout", subtotal)));
        Object rule = rule(6000, 500), live = quotes(rule), sandbox = quotes(rule);
        Object preview = call(live, "preview", subtotal), checkout = call(live, "checkoutQuote", "A", subtotal);
        check(snapshots.get(2), Map.of("previewFeeCents", preview, "checkoutFeeCents", checkout, "recordedCount", call(live, "recordedCount")),
                Map.of("recordedCount", call(sandbox, "recordedCount")));
        call(sandbox, "checkoutQuote", "A", 6000);
        check(snapshots.get(3), Map.of("recordedFeeCents", call(live, "recordedFee", "A"), "recordedCount", call(live, "recordedCount")),
                Map.of("recordedFeeCents", call(sandbox, "recordedFee", "A"), "recordedCount", call(sandbox, "recordedCount")));
        Object next = quotes(rule(7000, 500));
        check(snapshots.get(4), Map.of("subtotalCents", 6000, "previewFeeCents", call(next, "preview", 6000)),
                Map.of("points", 6000, "canRedeem", call(rewardsType, "canRedeem", 6000)));
    }

    @SafeVarargs private final void check(JsonNode snapshot, Map<String, Object>... actual) {
        assertEquals(actual.length, snapshot.get("items").size());
        for (int index = 0; index < actual.length; index++) {
            var recorded = JSON.createObjectNode();
            JsonNode item = snapshot.get("items").get(index);
            for (JsonNode field : item.get("fields")) {
                assertTrue(field.get("value").isValueNode(), "recorded fields must be scalar");
                assertFalse(recorded.has(field.get("name").asText()), "duplicate field");
                recorded.set(field.get("name").asText(), field.get("value"));
            }
            assertEquals(JSON.valueToTree(actual[index]), recorded, snapshot.get("title") + ": " + item.get("label"));
        }
    }

    @ParameterizedTest @CsvSource({"0,500", "4999,500", "5000,500", "5500,500", "5999,500", "6000,0", "6001,0", "2147483647,0"})
    void bothCallersFollowTheSameInclusiveRequirementBoundary(int subtotal, int expected) throws Exception {
        Object quotes = quotes(rule(6000, 500));
        assertEquals(expected, call(quotes, "preview", subtotal));
        assertEquals(0, call(quotes, "recordedCount"), "preview must not record");
        assertEquals(expected, call(quotes, "checkoutQuote", "A", subtotal));
        assertEquals(expected, call(quotes, "recordedFee", "A"));
        assertEquals(1, call(quotes, "recordedCount"));
    }

    @Test void characterizeOldAgreementAndTheEntireDriftInterval() throws Exception {
        Object refactoredOriginal = quotes(rule(5000, 500));
        for (int subtotal : new int[]{0, 4999, 5000, 5500, 5999, 6000, Integer.MAX_VALUE}) {
            int original = subtotal >= 5000 ? 0 : 500;
            assertEquals(original, call(beforeType, "originalPreview", subtotal));
            assertEquals(original, call(beforeType, "originalCheckout", subtotal));
            assertEquals(original, call(beforeType, "staleCheckout", subtotal));
            assertEquals(original, call(refactoredOriginal, "preview", subtotal), "extraction preserves the old requirement");
            assertEquals(original, call(refactoredOriginal, "checkoutQuote", "A", subtotal));
            assertEquals(subtotal >= 6000 ? 0 : 500, call(beforeType, "updatedPreview", subtotal));
        }
        for (int subtotal = 5000; subtotal < 6000; subtotal++)
            assertNotEquals(call(beforeType, "updatedPreview", subtotal), call(beforeType, "staleCheckout", subtotal));
    }

    @Test void configurationSupportsAnActualChangeWithoutChangingLoyaltyOrExistingClients() throws Exception {
        Object oldBook = quotes(rule(5000, 500)), current = quotes(rule(6000, 500)), next = quotes(rule(7000, 500));
        assertEquals(0, call(oldBook, "preview", 5500));
        assertEquals(500, call(current, "preview", 5500));
        assertEquals(0, call(current, "preview", 6000));
        assertEquals(500, call(next, "preview", 6000));
        assertEquals(0, call(next, "preview", 7000));
        assertEquals(0, call(quotes(rule(1, 0)), "preview", 0), "a zero standard fee is valid");
        assertEquals(false, call(rewardsType, "canRedeem", 5999));
        assertEquals(true, call(rewardsType, "canRedeem", 6000));
        assertEquals(true, call(rewardsType, "canRedeem", Integer.MAX_VALUE));
        rejects(IllegalArgumentException.class, rewardsType, "canRedeem", -1);
    }

    @ParameterizedTest @CsvSource({"0,500", "-1,500", "-2147483648,0", "6000,-1"})
    void invalidRuleConfigurationIsRejected(int threshold, int fee) {
        assertInstanceOf(IllegalArgumentException.class, assertThrows(InvocationTargetException.class, () -> rule(threshold, fee)).getCause());
    }

    @Test void invalidInputsCannotEraseOrReplacePreviouslyRecordedFees() throws Exception {
        Object rule = rule(6000, 500), quotes = quotes(rule);
        assertInstanceOf(NullPointerException.class, assertThrows(InvocationTargetException.class, () -> quotes(null)).getCause());
        call(quotes, "checkoutQuote", "A", 5500);
        for (int subtotal : new int[]{-1, Integer.MIN_VALUE}) {
            rejects(IllegalArgumentException.class, rule, "feeCents", subtotal);
            rejects(IllegalArgumentException.class, quotes, "preview", subtotal);
            rejects(IllegalArgumentException.class, quotes, "checkoutQuote", "A", subtotal);
            for (String method : List.of("originalPreview", "originalCheckout", "updatedPreview", "staleCheckout"))
                rejects(IllegalArgumentException.class, beforeType, method, subtotal);
        }
        for (String id : new String[]{null, "", " \t"}) rejects(IllegalArgumentException.class, quotes, "checkoutQuote", id, 6000);
        for (String id : new String[]{null, "", "missing"}) rejects(IllegalArgumentException.class, quotes, "recordedFee", id);
        assertEquals(500, call(quotes, "recordedFee", "A"));
        assertEquals(1, call(quotes, "recordedCount"));
    }

    @Test void sameRuleReferenceDoesNotShareMapsAndRequotingOnlyReplacesOneBook() throws Exception {
        Object rule = rule(6000, 500), live = quotes(rule), sandbox = quotes(rule);
        call(live, "checkoutQuote", "A", 5500);
        assertEquals(0, call(sandbox, "recordedCount"));
        call(sandbox, "checkoutQuote", "A", 6000);
        call(live, "checkoutQuote", "A", 0);
        assertEquals(500, call(live, "recordedFee", "A"));
        assertEquals(0, call(sandbox, "recordedFee", "A"));
        assertEquals(1, call(live, "recordedCount"));
        assertEquals(1, call(sandbox, "recordedCount"));
    }

    @ParameterizedTest @ValueSource(strings = {
            "void bypass(DeliveryFeeRule r) { r.freeFromCents = 1; }",
            "void bypass(OrderQuotes q) { q.recordedFees.clear(); }",
            "void bypass(OrderQuotes q, DeliveryFeeRule r) { q.rule = r; }"
    })
    void compilerRejectsClientBypassesOfTheEncapsulatedRuleAndRecords(String member) throws Exception {
        Path source = scratch.resolve("DryProbe.java");
        Files.writeString(source, "package " + PACKAGE.substring(0, PACKAGE.length() - 1) + "; public class DryProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics, List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call());
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR));
        }
    }

    @Test void publicClientCanUseTheIntendedBoundary() throws Exception {
        Path source = scratch.resolve("DryClient.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class DryClient { void use() { "
                + "DeliveryFeeRule rule = new DeliveryFeeRule(6000, 500); OrderQuotes a = new OrderQuotes(rule); "
                + "OrderQuotes b = new OrderQuotes(rule); a.preview(5500); a.checkoutQuote(\"A\", 6000); "
                + "a.recordedFee(\"A\"); b.recordedCount(); RewardRule.canRedeem(6000); } }");
        assertEquals(0, ToolProvider.getSystemJavaCompiler().run(null, null, null, "--release", "17", "-classpath", classes.toString(),
                "-d", scratch.toString(), source.toString()));
    }

    @Test void parkingLiveAndSandboxExecuteTheSameHourlyPolicyButResetOnlySandboxState() {
        var calls = new ArrayList<Ticket>();
        var hourly = new HourlyPricingStrategy() {
            @Override public double calculatePrice(Ticket ticket) {
                calls.add(ticket);
                return super.calculatePrice(ticket);
            }
        };
        var factory = new PricingStrategyFactory(hourly, new FlatRatePricingStrategy(), new DynamicPricingStrategy());
        var assignment = new SpotAssignmentStrategyFactory(new NearestSpotStrategy(), new FarthestSpotStrategy());
        var repository = new ParkingLotRepository();
        var spot = new ParkingSpot("LIVE-C1", 1, 1, VehicleType.CAR);
        repository.addFloor(new Floor(1, new ArrayList<>(List.of(spot))));
        repository.addGate(new Gate("ENTRY", "Entry", Gate.GateType.ENTRY));
        repository.addGate(new Gate("EXIT", "Exit", Gate.GateType.EXIT));
        var live = new ParkingLotService(repository, assignment, factory);
        var sandbox = new ParkingLotSimService(assignment, factory);
        Ticket liveTicket = live.entry("ENTRY", "LIVE-CAR", "CAR");
        var state = sandbox.entry("SIM-CAR", "CAR", "NEAREST");
        Ticket simTicket = (Ticket) ((List<?>) state.get("activeTickets")).get(0);
        assertSame(hourly, factory.getStrategy("HOURLY"));
        assertEquals(20.0, live.scanTicket("EXIT", liveTicket.getTicketNumber(), "HOURLY").getAmount());
        assertEquals(20.0, sandbox.scan(simTicket.getTicketNumber(), "HOURLY").get("previewAmount"));
        assertEquals(2, calls.size());
        assertEquals(List.of("LIVE-CAR", "SIM-CAR"), calls.stream().map(Ticket::getVehicleNumber).toList());
        assertEquals(1, repository.getActiveTickets().size());
        assertTrue(spot.isOccupied());
        sandbox.reset();
        assertTrue(((List<?>) sandbox.getState().get("activeTickets")).isEmpty());
        assertSame(liveTicket, repository.getTicket(liveTicket.getTicketNumber()));
        assertTrue(spot.isOccupied());
        assertNull(liveTicket.getExitTime());

        LocalDateTime entry = LocalDateTime.of(2026, 1, 1, 10, 0);
        Ticket fixed = new Ticket("FIXED", "CAR", VehicleType.CAR, "S1", entry);
        fixed.setExitTime(entry.plusHours(2));
        assertEquals(40.0, new HourlyPricingStrategy().calculatePrice(fixed));
    }
}
