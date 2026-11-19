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
import java.lang.reflect.Proxy;
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
import java.util.function.IntUnaryOperator;

import static org.junit.jupiter.api.Assertions.*;

/** Exercises the canonical teaching Java independently of recorded browser results. */
class SolidLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final Path SOURCE = EXAMPLES.resolve("solid");
    private static final String PACKAGE = "com.lld.learning.examples.solid.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;

    @BeforeAll static void compileTheExactDisplayedJavaWithRelease17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "Run with a JDK, not a JRE");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        try (var sources = Files.walk(SOURCE)) {
            sources.filter(file -> file.toString().endsWith(".java")).sorted()
                    .forEach(file -> args.add(file.toString()));
        }
        assertTrue(args.size() > 4, "The displayed canonical Java files must exist");
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
    }

    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    private static Class<?> type(String name) throws Exception { return loader.loadClass(PACKAGE + name); }

    private static Object fresh(String name) throws Exception { return construct(name, new Class<?>[0]); }
    private static Object nested(String name) throws Exception { return fresh("CounterExamples$" + name); }
    private static Object invoke(Object target, String name, int weight) throws Exception {
        return call(target, name, new Class<?>[]{int.class}, weight);
    }
    private static int fee(Object policy, int weight) throws Exception {
        return (int) invoke(policy, "feeCents", weight);
    }
    private static int quote(Object client, int weight) throws Exception {
        return (int) invoke(client, "quoteCents", weight);
    }
    private static Object pickup(Object base) throws Exception {
        return construct("PickupFee", new Class<?>[]{type("FeePolicy")}, base);
    }
    private static Object service(Object policy) throws Exception {
        return construct("CounterExamples$QuoteService",
                new Class<?>[]{type("FeePolicy"), type("CounterExamples$ReceiptFormatter")},
                policy, nested("ReceiptFormatter"));
    }
    private static Object printer(Object service) throws Exception {
        return construct("CounterExamples$DeskPrinter", new Class<?>[]{type("CounterExamples$QuoteService")}, service);
    }
    private static Object policy(IntUnaryOperator operation) throws Exception {
        return Proxy.newProxyInstance(loader, new Class<?>[]{type("FeePolicy")}, (proxy, method, arguments) -> {
            if (method.getName().equals("feeCents")) return operation.applyAsInt((int) arguments[0]);
            throw new UnsupportedOperationException(method.getName());
        });
    }

    @ParameterizedTest
    @CsvSource({"1,300,200", "2,300,200", "999,300,200", "1000,300,200",
            "1001,500,400", "1002,500,400", "1999,500,400", "2000,500,400"})
    void independentBoundaryPricesAndReceiptsSurviveAllFiveRefactorings(int weight, int standardCents, int pickupCents)
            throws Exception {
        Object standard = fresh("StandardFee"), pickup = pickup(standard), free = fresh("FreeFee");
        String receipt = "Parcel " + weight + "g: " + standardCents + "c";
        assertEquals(receipt, invoke(nested("CoupledCounter"), "receipt", weight), "before SRP");
        assertEquals(receipt, invoke(service(standard), "receipt", weight), "after SRP");
        Object switchCounter = nested("SwitchCounter");
        assertEquals(standardCents, call(switchCounter, "quoteCents", new Class<?>[]{String.class, int.class}, "STANDARD", weight));
        assertEquals(pickupCents, call(switchCounter, "quoteCents", new Class<?>[]{String.class, int.class}, "PICKUP", weight));
        assertEquals(standardCents, fee(standard, weight));
        assertEquals(pickupCents, fee(pickup, weight));
        assertEquals(0, fee(free, weight));
        assertEquals(standardCents, quote(nested("OnlineStation"), weight), "before ISP");
        assertEquals(standardCents, quote(nested("OnlineQuote"), weight), "after ISP");
        assertEquals(receipt, invoke(printer(service(standard)), "printReceipt", weight));
        assertEquals(standardCents, quote(nested("DirectCounter"), weight), "before DIP");
        assertEquals(standardCents, quote(service(standard), weight));
        assertEquals(pickupCents, quote(service(pickup), weight));
        assertEquals(0, quote(service(free), weight));
    }

    @Test void everyPromisedWholeGramIsAcceptedWithIndependentPricesRatherThanIdenticalResults() throws Exception {
        Object standard = fresh("StandardFee"), pickup = pickup(standard), free = fresh("FreeFee");
        for (int grams = 1; grams <= 1000; grams++) {
            assertEquals(300, fee(standard, grams), "standard at " + grams);
            assertEquals(200, fee(pickup, grams), "pickup at " + grams);
            assertEquals(0, fee(free, grams), "free at " + grams);
        }
        for (int grams = 1001; grams <= 2000; grams++) {
            assertEquals(500, fee(standard, grams), "standard at " + grams);
            assertEquals(400, fee(pickup, grams), "pickup at " + grams);
            assertEquals(0, fee(free, grams), "free at " + grams);
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {Integer.MIN_VALUE, -2000, -1, 0, 2001, 2002, Integer.MAX_VALUE})
    void allQuotePathsPreserveExactInvalidInputContractAndRemainUsableAfterRejection(int invalid) throws Exception {
        for (Object policy : List.of(fresh("StandardFee"), pickup(fresh("StandardFee")), fresh("FreeFee"), fresh("BulkyOnlyFee"))) {
            int expected = policy.getClass().getSimpleName().equals("FreeFee") ? 0
                    : policy.getClass().getSimpleName().equals("PickupFee") ? 400 : 500;
            assertEquals(expected, fee(policy, 1001));
            assertWeightRejection(() -> fee(policy, invalid));
            assertEquals(expected, fee(policy, 1001));
            Object client = service(policy);
            assertWeightRejection(() -> quote(client, invalid));
            assertWeightRejection(() -> invoke(client, "receipt", invalid));
            assertEquals(expected, quote(client, 1001));
        }
        for (String name : List.of("OnlineStation", "OnlineQuote", "DirectCounter")) {
            Object client = nested(name);
            assertWeightRejection(() -> quote(client, invalid));
            assertEquals(300, quote(client, 1000));
        }
        Object coupled = nested("CoupledCounter"), printer = printer(service(fresh("StandardFee")));
        assertWeightRejection(() -> invoke(coupled, "receipt", invalid));
        assertEquals("Parcel 1000g: 300c", invoke(coupled, "receipt", 1000));
        assertWeightRejection(() -> invoke(printer, "printReceipt", invalid));
        assertEquals("Parcel 1000g: 300c", invoke(printer, "printReceipt", 1000));
        for (String mode : List.of("STANDARD", "PICKUP")) {
            Object dispatch = nested("SwitchCounter");
            assertWeightRejection(() -> call(dispatch, "quoteCents", new Class<?>[]{String.class, int.class}, mode, invalid));
            assertEquals(mode.equals("STANDARD") ? 300 : 200,
                    call(dispatch, "quoteCents", new Class<?>[]{String.class, int.class}, mode, 1000));
        }
    }

    private static void assertWeightRejection(org.junit.jupiter.api.function.Executable operation) {
        assertEquals("weightGrams must be 1..2000", assertThrowsExactly(IllegalArgumentException.class, operation).getMessage());
    }

    @Test void formatterOwnsWordingAndRangeChecksWithoutSelectingAPricingPolicy() throws Exception {
        Object formatter = nested("ReceiptFormatter");
        for (int cents : new int[]{0, 7, 300, 2000}) {
            assertEquals("Parcel 1000g: " + cents + "c",
                    call(formatter, "format", new Class<?>[]{int.class, int.class}, 1000, cents));
        }
        for (int cents : new int[]{Integer.MIN_VALUE, -1, 2001, Integer.MAX_VALUE}) {
            assertEquals("feeCents must be 0..2000", assertThrowsExactly(IllegalArgumentException.class,
                    () -> call(formatter, "format", new Class<?>[]{int.class, int.class}, 1000, cents)).getMessage());
        }
        assertWeightRejection(() -> call(formatter, "format", new Class<?>[]{int.class, int.class}, 0, -1));
        assertEquals("Parcel 2000g: 7c", call(formatter, "format", new Class<?>[]{int.class, int.class}, 2000, 7));
    }

    @Test void pickupFloorsAtZeroDelegatesOnceAndChecksWeightBeforeCallingItsBase() throws Exception {
        var inputs = new ArrayList<Integer>();
        Object supplied = policy(grams -> { inputs.add(grams); return 37; });
        Object pickup = pickup(supplied);
        assertEquals(0, fee(pickup, 1000));
        assertEquals(List.of(1000), inputs);
        assertWeightRejection(() -> fee(pickup, 0));
        assertEquals(List.of(1000), inputs, "rejected weight must not reach the base");
        assertEquals(0, fee(pickup, 2000));
        assertEquals(List.of(1000, 2000), inputs);
        assertEquals(0, fee(pickup(fresh("FreeFee")), 1));
        assertEquals(1900, fee(pickup(policy(grams -> 2000)), 2000));
        assertEquals(0, fee(pickup(policy(grams -> 100)), 1000));
        assertEquals(1, fee(pickup(policy(grams -> 101)), 1001));
    }

    @Test void approvedExtensionWorksWithoutAddingANameToTheExistingDispatchClient() throws Exception {
        Object freeClient = service(fresh("FreeFee"));
        assertEquals(0, quote(freeClient, 1));
        assertEquals(0, quote(freeClient, 2000));
        Object dispatch = nested("SwitchCounter");
        for (String mode : new String[]{"FREE", "standard", "", null}) {
            assertEquals("Unknown mode", assertThrowsExactly(IllegalArgumentException.class,
                    () -> call(dispatch, "quoteCents", new Class<?>[]{String.class, int.class}, mode, 1000)).getMessage());
        }
        assertWeightRejection(() -> call(dispatch, "quoteCents", new Class<?>[]{String.class, int.class}, "FREE", 0));
        assertEquals(300, call(dispatch, "quoteCents", new Class<?>[]{String.class, int.class}, "STANDARD", 1000));
    }

    @Test void compilingAgainstAnInterfaceDoesNotMakeTheBrokenBulkyPolicyABehavioralSubstitute() throws Exception {
        Object broken = fresh("BulkyOnlyFee");
        assertTrue(type("FeePolicy").isInstance(broken));
        Object client = service(broken);
        for (int grams : new int[]{1, 999, 1000}) {
            assertEquals("Bulky parcels only", assertThrowsExactly(IllegalArgumentException.class,
                    () -> quote(client, grams)).getMessage());
        }
        assertEquals(500, quote(client, 1001));
        assertEquals(500, quote(client, 2000));
        assertEquals("Parcel 1001g: 500c", invoke(client, "receipt", 1001));
        assertEquals(300, quote(service(fresh("StandardFee")), 1));
        assertEquals(200, quote(service(pickup(fresh("StandardFee"))), 1));
        assertEquals(0, quote(service(fresh("FreeFee")), 1));
    }

    @Test void unsupportedLegacyPrintingFailsWhileNarrowQuoteAndPrinterClientsKeepTheirOwnContracts() throws Exception {
        Object legacy = nested("OnlineStation");
        assertEquals(300, quote(legacy, 1000));
        assertEquals("Online station cannot print", assertThrowsExactly(UnsupportedOperationException.class,
                () -> invoke(legacy, "printReceipt", 1000)).getMessage());
        assertEquals(500, quote(legacy, 1001), "failed printing does not poison later quotes");
        Object online = nested("OnlineQuote"), desk = printer(service(pickup(fresh("StandardFee"))));
        assertTrue(type("CounterExamples$QuoteReader").isInstance(online));
        assertTrue(type("CounterExamples$ReceiptPrinter").isInstance(desk));
        assertEquals(300, quote(online, 1000));
        assertEquals("Parcel 1000g: 200c", invoke(desk, "printReceipt", 1000));
    }

    @Test void injectedClientCallsTheSuppliedPolicyOnceAndPropagatesItsFailureWithoutRetry() throws Exception {
        var inputs = new ArrayList<Integer>();
        Object client = service(policy(grams -> { inputs.add(grams); return 7; }));
        assertEquals(7, quote(client, 1234));
        assertEquals(List.of(1234), inputs);
        assertEquals("Parcel 1000g: 7c", invoke(client, "receipt", 1000));
        assertEquals(List.of(1234, 1000), inputs);
        var failure = new IllegalStateException("supplier unavailable");
        Object failing = service(policy(grams -> { inputs.add(grams); throw failure; }));
        assertSame(failure, assertThrowsExactly(IllegalStateException.class, () -> quote(failing, 2000)));
        assertEquals(List.of(1234, 1000, 2000), inputs);
        assertEquals(7, quote(client, 1));
        assertEquals(500, quote(nested("DirectCounter"), 1234));
    }

    @Test void requiredCollaboratorsRejectNullAtConstructionRatherThanFailingLater() throws Exception {
        assertEquals("base", assertThrowsExactly(NullPointerException.class, () -> pickup(null)).getMessage());
        assertEquals("policy", assertThrowsExactly(NullPointerException.class, () -> service(null)).getMessage());
        assertEquals("formatter", assertThrowsExactly(NullPointerException.class, () ->
                construct("CounterExamples$QuoteService", new Class<?>[]{type("FeePolicy"), type("CounterExamples$ReceiptFormatter")},
                        fresh("StandardFee"), null)).getMessage());
        assertEquals("counter", assertThrowsExactly(NullPointerException.class, () -> printer(null)).getMessage());
    }

    @Test void anOrdinaryExternalClientCanExtendTheFeeContractAndUseBothNarrowInterfaces() throws Exception {
        compileClient("public static void main(String[] args) { "
                + "FeePolicy approved = grams -> { if (grams < 1 || grams > 2000) "
                + "throw new IllegalArgumentException(\"weightGrams must be 1..2000\"); return 17; }; "
                + "QuoteService service = new QuoteService(approved, new ReceiptFormatter()); "
                + "QuoteReader reader = service; ReceiptPrinter printer = new DeskPrinter(service); "
                + "if (reader.quoteCents(1) != 17 || !printer.printReceipt(2000).equals(\"Parcel 2000g: 17c\")) "
                + "throw new AssertionError(); QuoteReader online = new OnlineQuote(); "
                + "if (online.quoteCents(1001) != 500) throw new AssertionError(); }", true, "");
        try (var clientLoader = new URLClassLoader(new java.net.URL[]{scratch.toUri().toURL()}, loader)) {
            clientLoader.loadClass("SolidClient").getMethod("main", String[].class).invoke(null, (Object) new String[0]);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "String cannotPrint() { return new OnlineQuote().printReceipt(1000); }",
            "String cannotPrint(QuoteReader reader) { return reader.printReceipt(1000); }",
            "int cannotQuote(ReceiptPrinter printer) { return printer.quoteCents(1000); }"
    })
    void narrowClientCompilerRejectsOperationsOutsideItsDeclaredRole(String member) throws Exception {
        compileClient(member, false, "cannot find symbol");
    }

    @Test void structuralLookalikesDoNotSatisfyTheNominalFeeContract() throws Exception {
        compileClient("static class Lookalike { public int feeCents(int weight) { return 17; } } "
                + "QuoteService service = new QuoteService(new Lookalike(), new ReceiptFormatter());", false, "incompatible types");
    }

    @Test void theCanonicalMainProducesTheExactOutputAndIndependentlyExpectedPrincipleResults() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "SolidDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo must terminate");
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).replace("\r\n", "\n");
            assertEquals(0, process.exitValue(), actual);
            assertEquals(String.join("\n", "SRP before: Parcel 1000g: 300c", "SRP after: Parcel 1000g: 300c",
                    "OCP standard=300 pickup=200 free=0", "LSP valid 1g: standard=300 pickup=200 free=0",
                    "LSP broken 1g: IllegalArgumentException: Bulky parcels only",
                    "ISP legacy quote=300 print=UnsupportedOperationException: Online station cannot print",
                    "ISP segregated quote=300 print=Parcel 1000g: 300c", "DIP standard=500 pickup=400 free=0", ""), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("solid-output.txt")).replace("\r\n", "\n"), actual);
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    @Test void allRecordedScalarsIncludingAbsenceAndFailuresMatchRealJavaExecution() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("solid-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        Object standard = fresh("StandardFee"), pickup = pickup(standard), free = fresh("FreeFee");
        assertSnapshot(snapshots.get(0), values("weightGrams", 1000, "receipt", invoke(nested("CoupledCounter"), "receipt", 1000)),
                values("weightGrams", 1000, "receipt", invoke(service(standard), "receipt", 1000)));
        assertSnapshot(snapshots.get(1), quoteResult(service(standard), 1000), quoteResult(service(pickup), 1000),
                quoteResult(service(free), 1000));
        var brokenFailure = assertThrowsExactly(IllegalArgumentException.class, () -> fee(fresh("BulkyOnlyFee"), 1));
        assertSnapshot(snapshots.get(2), feeResult(standard, 1), feeResult(pickup, 1), feeResult(free, 1),
                values("weightGrams", 1, "feeCents", null, "rejection", describe(brokenFailure)));
        Object legacy = nested("OnlineStation");
        var printFailure = assertThrowsExactly(UnsupportedOperationException.class, () -> invoke(legacy, "printReceipt", 1000));
        assertSnapshot(snapshots.get(3), values("weightGrams", 1000, "feeCents", quote(legacy, 1000),
                        "printResult", null, "rejection", describe(printFailure)),
                values("weightGrams", 1000, "feeCents", quote(nested("OnlineQuote"), 1000)),
                values("weightGrams", 1000, "receipt", invoke(printer(service(standard)), "printReceipt", 1000)));
        assertSnapshot(snapshots.get(4), quoteResult(nested("DirectCounter"), 1001), quoteResult(service(standard), 1001),
                quoteResult(service(pickup), 1001), quoteResult(service(free), 1001));
    }

    private static Map<String, Object> feeResult(Object policy, int weight) throws Exception {
        return values("weightGrams", weight, "feeCents", fee(policy, weight), "rejection", null);
    }
    private static Map<String, Object> quoteResult(Object client, int weight) throws Exception {
        return values("weightGrams", weight, "feeCents", quote(client, weight), "rejection", null);
    }
    private static String describe(Throwable failure) { return failure.getClass().getSimpleName() + ": " + failure.getMessage(); }

    private static Object construct(String name, Class<?>[] parameters, Object... arguments) throws Exception {
        try {
            return type(name).getConstructor(parameters).newInstance(arguments);
        } catch (InvocationTargetException wrapped) {
            if (wrapped.getCause() instanceof RuntimeException failure) throw failure;
            if (wrapped.getCause() instanceof Error failure) throw failure;
            throw wrapped;
        }
    }

    private static Object call(Object target, String method, Class<?>[] parameters, Object... arguments)
            throws Exception {
        try {
            return target.getClass().getMethod(method, parameters).invoke(target, arguments);
        } catch (InvocationTargetException wrapped) {
            if (wrapped.getCause() instanceof RuntimeException failure) throw failure;
            if (wrapped.getCause() instanceof Error failure) throw failure;
            throw wrapped;
        }
    }

    private static Map<String, Object> values(Object... pairs) {
        var result = new LinkedHashMap<String, Object>();
        for (int i = 0; i < pairs.length; i += 2) {
            assertFalse(result.containsKey((String) pairs[i]), "Duplicate expected scalar");
            result.put((String) pairs[i], pairs[i + 1]);
        }
        return result;
    }

    @SafeVarargs
    private static void assertSnapshot(JsonNode snapshot, Map<String, Object>... actualItems) {
        JsonNode items = snapshot.get("items");
        assertEquals(actualItems.length, items.size(), snapshot.get("title").asText());
        for (int i = 0; i < items.size(); i++) {
            var recorded = JSON.createObjectNode();
            for (JsonNode field : items.get(i).get("fields")) {
                assertTrue(field.get("value").isValueNode(), "Each recorded field must be a scalar or null");
                String name = field.get("name").asText();
                assertFalse(recorded.has(name), "Duplicate recorded field " + name);
                recorded.set(name, field.get("value"));
            }
            assertEquals(JSON.valueToTree(actualItems[i]), recorded,
                    snapshot.get("title").asText() + " / " + items.get(i).get("label").asText());
        }
    }

    private void compileClient(String member, boolean succeeds, String diagnostic) throws Exception {
        Path source = scratch.resolve("SolidClient.java");
        Files.writeString(source, "import " + PACKAGE + "*; import " + PACKAGE
                + "CounterExamples.*; public class SolidClient { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertEquals(succeeds, compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call(), diagnostics.getDiagnostics().toString());
        }
        if (!succeeds) assertTrue(diagnostics.getDiagnostics().stream().anyMatch(entry ->
                entry.getKind() == Diagnostic.Kind.ERROR && entry.getMessage(Locale.ROOT).contains(diagnostic)),
                diagnostics.getDiagnostics().toString());
    }
}
