package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.strategy.DynamicPricingStrategy;
import com.lld.parkinglot.strategy.FlatRatePricingStrategy;
import com.lld.parkinglot.strategy.HourlyPricingStrategy;
import com.lld.parkinglot.strategy.PricingStrategy;
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
import java.lang.reflect.Modifier;
import java.lang.reflect.Proxy;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.IntUnaryOperator;

import static org.junit.jupiter.api.Assertions.*;

/** Checks the exact browser Java sources, all recorded fields, and the actual module boundary. */
class DependencyExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final Path SOURCE = EXAMPLES.resolve("dependency");
    private static final String PACKAGE = "com.lld.learning.examples.dependency.";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final List<String> FILES = List.of("FeePolicy.java", "FlatFeePolicy.java", "FreeAbovePolicy.java",
            "QuoteService.java", "QuoteSession.java", "DependencyDemo.java");
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> policyType;
    private static Class<?> serviceType;
    private static Class<?> sessionType;

    @BeforeAll
    static void compileTheDisplayedFilesWithJava17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "A Java 17 JDK is required");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        FILES.forEach(file -> args.add(SOURCE.resolve(file).toString()));
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        policyType = loader.loadClass(PACKAGE + "FeePolicy");
        serviceType = loader.loadClass(PACKAGE + "QuoteService");
        sessionType = loader.loadClass(PACKAGE + "QuoteSession");
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    private Object flat(int fee) throws Exception {
        return loader.loadClass(PACKAGE + "FlatFeePolicy").getConstructor(int.class).newInstance(fee);
    }

    private Object threshold(int threshold, int fee) throws Exception {
        return loader.loadClass(PACKAGE + "FreeAbovePolicy").getConstructor(int.class, int.class)
                .newInstance(threshold, fee);
    }

    private Object service() throws Exception { return serviceType.getConstructor().newInstance(); }
    private Object session(Object policy) throws Exception {
        return sessionType.getConstructor(policyType).newInstance(policy);
    }
    private Object storedPolicy(Object session) throws Exception {
        return sessionType.getMethod("getPolicy").invoke(session);
    }
    private int fee(Object policy, int subtotal) throws Exception {
        return (int) policyType.getMethod("feeCents", int.class).invoke(policy, subtotal);
    }
    private int quote(Object service, int subtotal, Object policy) throws Exception {
        return (int) serviceType.getMethod("quote", int.class, policyType).invoke(service, subtotal, policy);
    }
    private int sessionQuote(Object session, int subtotal) throws Exception {
        return (int) sessionType.getMethod("quote", int.class).invoke(session, subtotal);
    }
    private Object policy(IntUnaryOperator operation) {
        return Proxy.newProxyInstance(loader, new Class<?>[]{policyType}, (proxy, method, args) -> {
            if (method.getName().equals("feeCents")) return operation.applyAsInt((int) args[0]);
            throw new UnsupportedOperationException(method.getName());
        });
    }
    private Throwable rejected(org.junit.jupiter.api.function.Executable operation) {
        return assertThrows(InvocationTargetException.class, operation).getCause();
    }

    @ParameterizedTest
    @CsvSource({"0,50,50", "999,50,1049", "1000,0,1000", "1200,0,1200"})
    void bothPoliciesHonorTheSameContractIncludingTheInclusiveThreshold(int subtotal, int expectedFee, int total)
            throws Exception {
        Object threshold = threshold(1000, 50);
        assertTrue(policyType.isInstance(threshold));
        assertEquals(expectedFee, fee(threshold, subtotal));
        assertEquals(total, quote(service(), subtotal, threshold));
        Object flat = flat(50);
        assertTrue(policyType.isInstance(flat));
        assertEquals(50, fee(flat, subtotal));
        assertEquals(subtotal + 50, quote(service(), subtotal, flat));
    }

    @Test
    void interfaceCallPassesTheExactSubtotalAndCallsTheCollaboratorOnce() throws Exception {
        var inputs = new ArrayList<Integer>();
        Object recording = policy(subtotal -> { inputs.add(subtotal); return 7; });
        assertEquals(1207, quote(service(), 1200, recording));
        assertEquals(List.of(1200), inputs);
        assertEquals(7, quote(service(), 0, recording));
        assertEquals(List.of(1200, 0), inputs);
    }

    @Test
    void invalidSubtotalIsRejectedBeforeCollaboratorExecution() throws Exception {
        var calls = new AtomicInteger();
        Object recording = policy(subtotal -> { calls.incrementAndGet(); return 50; });
        Throwable error = rejected(() -> quote(service(), -1, recording));
        assertInstanceOf(IllegalArgumentException.class, error);
        assertEquals("Subtotal must be nonnegative", error.getMessage());
        assertEquals(0, calls.get());
        assertInstanceOf(IllegalArgumentException.class, rejected(() -> fee(flat(50), -1)));
        assertInstanceOf(IllegalArgumentException.class, rejected(() -> fee(threshold(1000, 50), -1)));
        assertInstanceOf(IllegalArgumentException.class, rejected(() -> sessionQuote(session(recording), -1)));
        assertEquals(0, calls.get());
    }

    @Test
    void nullPolicyHasAnExplicitFailureAtBothEntryPoints() throws Exception {
        for (Throwable failure : List.of(rejected(() -> quote(service(), 0, null)), rejected(() -> session(null)))) {
            assertInstanceOf(NullPointerException.class, failure);
            assertEquals("Policy is required", failure.getMessage());
        }
    }

    @Test
    void invalidConfigurationIsRejectedButZeroFeesAreValid() throws Exception {
        assertInstanceOf(IllegalArgumentException.class, rejected(() -> flat(-1)));
        assertInstanceOf(IllegalArgumentException.class, rejected(() -> threshold(1000, -1)));
        assertInstanceOf(IllegalArgumentException.class, rejected(() -> threshold(0, 50)));
        assertInstanceOf(IllegalArgumentException.class, rejected(() -> threshold(-1, 50)));
        assertEquals(0, fee(flat(0), 0));
        assertEquals(0, fee(threshold(1000, 0), 999));
        assertEquals(0, quote(service(), 0, flat(0)));
    }

    @Test
    void sourceValidImplementationCanViolateTheBehavioralContract() throws Exception {
        var calls = new AtomicInteger();
        Object broken = policy(subtotal -> { calls.incrementAndGet(); return -1; });
        Throwable failure = rejected(() -> quote(service(), 1200, broken));
        assertInstanceOf(IllegalArgumentException.class, failure);
        assertEquals("Policy returned a negative fee", failure.getMessage());
        assertEquals(1, calls.get(), "validation happens after the policy runs, without rollback");
        assertEquals(1250, quote(service(), 1200, flat(50)), "another call is independent");
    }

    @Test
    void collaboratorExceptionsPropagateWithoutRetryOrPretendRollback() throws Exception {
        var calls = new AtomicInteger();
        var original = new IllegalStateException("supplier unavailable");
        Object throwing = policy(subtotal -> { calls.incrementAndGet(); throw original; });
        assertSame(original, rejected(() -> quote(service(), 1200, throwing)));
        assertEquals(1, calls.get());
    }

    @Test
    void overflowIsRejectedAfterFeeCalculationWhileExactMaximumIsRepresentable() throws Exception {
        assertEquals(Integer.MAX_VALUE, quote(service(), Integer.MAX_VALUE, flat(0)));
        assertInstanceOf(ArithmeticException.class,
                rejected(() -> quote(service(), Integer.MAX_VALUE, flat(1))));
    }

    @Test
    void localDefaultNeedsNoRetainedFieldAndSessionKeepsTheSuppliedIdentity() throws Exception {
        Object service = service();
        assertEquals(0, serviceType.getDeclaredFields().length);
        assertEquals(1250, serviceType.getMethod("quoteWithDefault", int.class).invoke(service, 1200));
        Object local = flat(50);
        Object session = session(local);
        Object saved = storedPolicy(session);
        assertSame(local, saved);
        assertEquals(policyType, sessionType.getDeclaredField("policy").getType());
        local = threshold(1000, 50);
        assertNotSame(local, saved);
        assertSame(saved, storedPolicy(session));
        assertEquals(1200, quote(service, 1200, local));
        assertEquals(1250, sessionQuote(session, 1200));
        assertEquals(50, fee(saved, 1200), "the old policy is still callable");
    }

    @Test
    void finalStoredReferenceDoesNotFreezeStateInsideAnInjectedCollaborator() throws Exception {
        var currentFee = new AtomicInteger(50);
        Object mutable = policy(subtotal -> currentFee.get());
        Object session = session(mutable);
        var field = sessionType.getDeclaredField("policy");
        assertTrue(Modifier.isPrivate(field.getModifiers()));
        assertTrue(Modifier.isFinal(field.getModifiers()));
        assertEquals(1250, sessionQuote(session, 1200));
        currentFee.set(7);
        assertSame(mutable, storedPolicy(session));
        assertEquals(1207, sessionQuote(session, 1200), "final prevents rebinding, not collaborator mutation");
    }

    @Test
    void everyDisplayedSnapshotScalarMatchesActualJavaObjectsAndCalls() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("dependency-snapshots.json").toFile());
        assertEquals(6, snapshots.size());
        Object service = service();
        Object flat = flat(50);
        Object threshold = threshold(1000, 50);
        assertSnapshot(snapshots.get(0), values("subtotalCents", 1200, "runtime policy", flat.getClass().getSimpleName(),
                "feeCents", fee(flat, 1200), "totalCents", quote(service, 1200, flat)));
        assertSnapshot(snapshots.get(1),
                values("subtotalCents", 1200, "runtime policy", threshold.getClass().getSimpleName(),
                        "feeCents", fee(threshold, 1200), "totalCents", quote(service, 1200, threshold)),
                values("quote at 999 cents", quote(service, 999, threshold),
                        "quote at 1000 cents", quote(service, 1000, threshold)));
        assertSnapshot(snapshots.get(2), values("subtotalCents", 1200, "totalCents",
                serviceType.getMethod("quoteWithDefault", int.class).invoke(service, 1200),
                "declared service fields", serviceType.getDeclaredFields().length));
        Object session = session(flat);
        Object saved = storedPolicy(session);
        assertSnapshot(snapshots.get(3), values("stored runtime policy", storedPolicy(session).getClass().getSimpleName(),
                "session policy == saved", storedPolicy(session) == saved, "local flat == saved", flat == saved,
                "totalCents", sessionQuote(session, 1200)));
        flat = threshold;
        assertSnapshot(snapshots.get(4), values("local runtime policy", flat.getClass().getSimpleName(),
                "local quote totalCents", quote(service, 1200, flat),
                "session quote totalCents", sessionQuote(session, 1200),
                "session policy == saved", storedPolicy(session) == saved, "local flat == saved", flat == saved));
        Throwable failure = rejected(() -> quote(service, 1200, policy(subtotal -> -1)));
        assertSnapshot(snapshots.get(5), values("outcome", failure.getClass().getSimpleName(),
                "message", failure.getMessage(), "saved feeCents", fee(saved, 1200),
                "session quote totalCents", sessionQuote(session, 1200)));
    }

    private Map<String, Object> values(Object... pairs) {
        var result = new LinkedHashMap<String, Object>();
        for (int i = 0; i < pairs.length; i += 2) result.put((String) pairs[i], pairs[i + 1]);
        return result;
    }

    @SafeVarargs
    private final void assertSnapshot(JsonNode snapshot, Map<String, Object>... actualItems) {
        JsonNode items = snapshot.get("items");
        assertEquals(actualItems.length, items.size(), snapshot.get("title").asText());
        for (int i = 0; i < items.size(); i++) {
            var recorded = JSON.createObjectNode();
            for (JsonNode field : items.get(i).get("fields")) {
                assertTrue(field.get("value").isValueNode(), "rendered fields must be scalars");
                assertFalse(recorded.has(field.get("name").asText()), "field names must be unique");
                recorded.set(field.get("name").asText(), field.get("value"));
            }
            assertEquals(JSON.valueToTree(actualItems[i]), recorded,
                    snapshot.get("title").asText() + " / " + items.get(i).get("label").asText());
        }
    }

    @Test
    void displayedOutputMatchesTheRealDemoIncludingItsLambda() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "DependencyDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            String expected = Files.readString(EXAMPLES.resolve("dependency-output.txt"));
            assertEquals(expected.replace("\r\n", "\n"), actual.replace("\r\n", "\n"));
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "void call() { new QuoteService().quote(1200, \"flat\"); }",
            "int wrongApi(FeePolicy p) { return p.discountCents(1200); }",
            "static class Lookalike { public int feeCents(int n) { return 50; } } "
                    + "void call() { new QuoteService().quote(1200, new Lookalike()); }"
    })
    void compilerRejectsWrongTypesMissingApiAndStructuralLookalikes(String member) throws Exception {
        Path source = scratch.resolve("DependencyProbe.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class DependencyProbe { " + member + " }");
        assertCompilationFails(List.of(source), List.of("-classpath", classes.toString()));
    }

    @Test
    void renamingTheSupplierApiBreaksTheRealCallerSource() throws Exception {
        Path changedPolicy = scratch.resolve("FeePolicy.java");
        Files.writeString(changedPolicy, Files.readString(SOURCE.resolve("FeePolicy.java"))
                .replace("feeCents(", "renamedFee("));
        var diagnostics = assertCompilationFails(
                List.of(changedPolicy, SOURCE.resolve("QuoteService.java")),
                List.of("-classpath", classes.toString()));
        assertTrue(diagnostics.stream().anyMatch(entry -> entry.getMessage(Locale.ROOT).contains("feeCents")));
    }

    @Test
    void compilingTheRealLocalConstructionRequiresTheConcreteClassEvenWithoutAField() throws Exception {
        Path empty = Files.createDirectory(scratch.resolve("empty"));
        var diagnostics = assertCompilationFails(
                List.of(SOURCE.resolve("FeePolicy.java"), SOURCE.resolve("QuoteService.java")),
                List.of("-classpath", empty.toString(), "-sourcepath", empty.toString()));
        assertTrue(diagnostics.stream().anyMatch(entry -> entry.getMessage(Locale.ROOT).contains("FlatFeePolicy")));
    }

    private List<Diagnostic<? extends JavaFileObject>> assertCompilationFails(List<Path> sources, List<String> extra)
            throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            var options = new ArrayList<>(List.of("--release", "17", "-d", scratch.toString()));
            options.addAll(extra);
            assertFalse(compiler.getTask(null, files, diagnostics, options, null,
                    files.getJavaFileObjectsFromPaths(sources)).call());
        }
        assertTrue(diagnostics.getDiagnostics().stream().anyMatch(entry -> entry.getKind() == Diagnostic.Kind.ERROR));
        return diagnostics.getDiagnostics();
    }

    @Test
    void realParkingRepositoryReceivesTheExactTicketAndCallsTheSuppliedStrategy() {
        var repository = new ParkingLotRepository();
        LocalDateTime entry = LocalDateTime.of(2026, 1, 1, 10, 0);
        LocalDateTime exit = entry.plusHours(2);
        Ticket original = new Ticket("D1", "CAR1", VehicleType.CAR, "S1", entry);
        repository.saveTicket(original);
        var seen = new AtomicReference<Ticket>();
        var calls = new AtomicInteger();
        PricingStrategy recording = ticket -> {
            calls.incrementAndGet();
            seen.set(ticket);
            assertEquals(exit, ticket.getExitTime());
            return 37.0;
        };
        Ticket paid = repository.completeExit("D1", exit, recording, "CARD");
        assertSame(original, seen.get());
        assertSame(original, paid);
        assertEquals(1, calls.get());
        assertEquals(37.0, paid.getAmount());
        assertEquals(Ticket.PaymentStatus.PAID, paid.getPaymentStatus());
        assertEquals("CARD", paid.getPaymentMethod());
        assertTrue(Arrays.stream(ParkingLotRepository.class.getDeclaredFields())
                .noneMatch(field -> PricingStrategy.class.isAssignableFrom(field.getType())));
    }

    @Test
    void realFactoryRetainsPoliciesWhileRepositoryReceivesThemPerCallAndTheirResultsDiffer() {
        var hourly = new HourlyPricingStrategy();
        var flat = new FlatRatePricingStrategy();
        var factory = new PricingStrategyFactory(hourly, flat, new DynamicPricingStrategy());
        assertSame(hourly, factory.getStrategy("HOURLY"));
        assertSame(flat, factory.getStrategy("FLAT"));
        var repository = new ParkingLotRepository();
        LocalDateTime entry = LocalDateTime.of(2026, 1, 1, 10, 0);
        for (String id : List.of("H", "F")) {
            repository.saveTicket(new Ticket(id, "CAR1", VehicleType.CAR, "S1", entry));
        }
        assertEquals(40.0, repository.completeExit("H", entry.plusHours(2), factory.getStrategy("HOURLY"), "CASH").getAmount());
        assertEquals(50.0, repository.completeExit("F", entry.plusHours(2), factory.getStrategy("FLAT"), "CASH").getAmount());
        assertSame(hourly, factory.getStrategy("HOURLY"), "per-call use does not remove the factory's reference");
        assertSame(flat, factory.getStrategy("FLAT"));
    }
}
