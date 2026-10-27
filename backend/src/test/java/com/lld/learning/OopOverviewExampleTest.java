package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.strategy.DynamicPricingStrategy;
import com.lld.parkinglot.strategy.FlatRatePricingStrategy;
import com.lld.parkinglot.strategy.HourlyPricingStrategy;
import com.lld.parkinglot.strategy.PricingStrategyFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.InvocationTargetException;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Tests displayed Java itself, not a reimplementation of the domain in fixtures or JS. */
@Timeout(30)
class OopOverviewExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.oopoverview.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;

    @BeforeAll
    static void compileExactDisplayedSources() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "A JDK supporting --release 17 is required");
        List<String> arguments = new java.util.ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String file : List.of("Topic", "PromptStyle", "PlainPrompt", "HintedPrompt", "StudyPlan", "OopOverviewDemo")) {
            arguments.add(EXAMPLES.resolve("oopoverview/" + file + ".java").toString());
        }
        var errors = new ByteArrayOutputStream();
        assertEquals(0, compiler.run(null, null, errors, arguments.toArray(String[]::new)), errors.toString());
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
    }

    @AfterAll
    static void closeLoader() throws Exception {
        if (loader != null) loader.close();
    }

    @Test
    void constructionAndRejectedRequestsPreserveValidMembership() throws Exception {
        runProbe("""
                for (String bad : new String[]{null, "", "  "}) {
                    reject(IllegalArgumentException.class, () -> new Topic(bad));
                    reject(IllegalArgumentException.class, () -> new StudyPlan(bad));
                }
                reject(IllegalArgumentException.class, () -> new StudyPlan("Plan", 0));
                reject(IllegalArgumentException.class, () -> new StudyPlan("Plan", -1));
                Topic topic = new Topic("  Objects  ");
                StudyPlan plan = new StudyPlan("  Focus  ", 1);
                assert topic.title().equals("Objects");
                assert plan.name().equals("Focus");
                assert new StudyPlan("Default").capacity() == StudyPlan.DEFAULT_CAPACITY;
                assert plan.entries().isEmpty() && plan.state() == StudyPlan.State.OPEN;
                reject(NullPointerException.class, () -> plan.add(null));
                assert plan.entries().isEmpty();
                StudyPlan.Entry first = plan.add(topic);
                reject(IllegalArgumentException.class, () -> plan.add(topic));
                reject(IllegalStateException.class, () -> plan.add(new Topic("Other")));
                reject(IllegalArgumentException.class, () -> topic.rename("  "));
                reject(IllegalArgumentException.class, () -> topic.rename(null));
                assert topic.title().equals("Objects");
                assert plan.entries().size() == 1 && plan.entries().get(0) == first;
                assert !first.isRetired();
                plan.remove(first);
                assert plan.entries().isEmpty() && first.isRetired();
                assert plan.add(topic) != first; // free capacity, new selection identity
                """);
    }

    @Test
    void catalogIdentityAndProgressBoundariesAreIndependentAcrossPlans() throws Exception {
        runProbe("""
                Topic shared = new Topic("Objects");
                Topic sameTitle = new Topic("Objects");
                StudyPlan one = new StudyPlan("Same name");
                StudyPlan two = new StudyPlan("Same name");
                StudyPlan.Entry a = one.add(shared);
                StudyPlan.Entry b = two.add(shared);
                StudyPlan.Entry distinct = one.add(sameTitle);
                assert a != b && a.topic() == b.topic();
                assert distinct.topic() != a.topic();
                reject(IllegalArgumentException.class, () -> one.remove(b));
                reject(NullPointerException.class, () -> one.remove(null));
                assert one.entries().size() == 2 && two.entries().size() == 1;
                assert !a.isRetired() && !b.isRetired();
                one.remove(a);
                reject(IllegalStateException.class, () -> one.remove(a));
                assert one.entries().get(0) == distinct && !distinct.isRetired();
                shared.rename("References");
                assert a.topic() == shared && b.topic().title().equals("References");
                assert b.prompt(new PlainPrompt()).equals("Review: References");
                assert !b.isRetired();
                """);
    }

    @Test
    void shallowSavedMembershipObservesRetirementButDoesNotOwnTheCatalog() throws Exception {
        runProbe("""
                Topic topic = new Topic("Objects");
                StudyPlan plan = new StudyPlan("Focus");
                StudyPlan other = new StudyPlan("Weekend");
                StudyPlan.Entry first = plan.add(topic);
                StudyPlan.Entry second = plan.add(new Topic("Enums"));
                StudyPlan.Entry independent = other.add(topic);
                List<StudyPlan.Entry> saved = plan.entries();
                reject(UnsupportedOperationException.class, () -> saved.clear());
                String earlier = first.prompt(new PlainPrompt());
                plan.remove(first);
                assert saved.size() == 2 && saved.get(0) == first;
                assert first.isRetired() && !second.isRetired();
                StudyPlan alias = plan;
                alias.archive();
                alias.archive();
                assert plan.state() == StudyPlan.State.ARCHIVED && plan.entries().isEmpty();
                assert saved.size() == 2 && saved.get(1) == second && second.isRetired();
                reject(IllegalStateException.class, () -> first.prompt(new PlainPrompt()));
                reject(IllegalStateException.class, () -> second.prompt(new HintedPrompt()));
                reject(IllegalStateException.class, () -> plan.add(topic));
                reject(IllegalStateException.class, () -> plan.remove(second));
                topic.rename("References");
                assert first.topic().title().equals("References"); // metadata stays readable
                assert independent.prompt(new HintedPrompt()).equals("Review: References (give an example)");
                assert earlier.equals("Review: Objects");
                assert other.state() == StudyPlan.State.OPEN && !independent.isRetired();
                new StudyPlan("Empty").archive();
                """);
    }

    @Test
    void interfaceCallsDispatchAndUseExactlyTheSuppliedPerCallPolicy() throws Exception {
        runProbe("""
                for (PromptStyle style : List.of(new PlainPrompt(), new HintedPrompt())) {
                    assert style.format("  Objects  ").startsWith("Review: Objects");
                    for (String bad : new String[]{null, "", "   "}) {
                        reject(IllegalArgumentException.class, () -> style.format(bad));
                    }
                }
                PlainPrompt parent = new HintedPrompt();
                PromptStyle contract = parent;
                assert contract == parent;
                assert contract.format("Objects").equals("Review: Objects (give an example)");
                StudyPlan plan = new StudyPlan("Plan");
                Topic topic = new Topic("Objects");
                StudyPlan.Entry entry = plan.add(topic);
                int[] calls = {0};
                PromptStyle recording = title -> { calls[0]++; assert title.equals("Objects"); return "Recorded: " + title; };
                assert entry.prompt(recording).equals("Recorded: Objects") && calls[0] == 1;
                assert entry.prompt(contract).equals("Review: Objects (give an example)");
                assert entry.prompt(new PlainPrompt()).equals("Review: Objects");
                reject(NullPointerException.class, () -> entry.prompt(null));
                IllegalStateException sentinel = new IllegalStateException("policy failed");
                try { entry.prompt(title -> { throw sentinel; }); throw new AssertionError("not thrown"); }
                catch (IllegalStateException failure) { assert failure == sentinel; }
                assert plan.entries().get(0) == entry && !entry.isRetired();
                plan.archive();
                reject(IllegalStateException.class, () -> entry.prompt(recording));
                assert calls[0] == 1; // retirement rejected before collaborator invocation
                """);
    }

    @Test
    void compilingAnImplementationDoesNotProveItsBehavioralContract() throws Exception {
        runProbe("""
                StudyPlan.Entry entry = new StudyPlan("Plan").add(new Topic("Objects"));
                PromptStyle broken = title -> "";
                assert entry.prompt(broken).isEmpty(); // documented trust boundary, not a recommended policy
                """);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "void bypass(StudyPlan p) { p.entries.clear(); }",
            "void attach(StudyPlan p, Topic t) { new StudyPlan.Entry(p, t); }",
            "void reparent(StudyPlan.Entry e, StudyPlan p) { e.owner = p; }",
            "void revive(StudyPlan.Entry e) { e.retired = false; }",
            "PromptStyle style = new PromptStyle();",
            "StudyPlan.State state = \"OPEN\";",
            "static class Incomplete implements PromptStyle { }",
            "static class Wrong extends PlainPrompt { @Override public String format(Object t) { return \"x\"; } }",
            "static class Wrong extends PlainPrompt { static String global() { return format(\"Objects\"); } }",
            "void rewriteConstant() { StudyPlan.DEFAULT_CAPACITY = 9; }"
    })
    void compilerRejectsAccessAndContractBypasses(String member) throws Exception {
        compileProbe("import " + PACKAGE + "*; public class OopProbe { " + member + " }", false);
    }

    @Test
    void allRecordedFieldsAndReferenceGroupsMatchRealJavaObjects() throws Exception {
        JsonNode steps = JSON.readTree(EXAMPLES.resolve("oop-overview-snapshots.json").toFile());
        assertEquals(5, steps.size());
        Object topic = construct("Topic", new Class<?>[]{String.class}, "Objects");
        Object focus = construct("StudyPlan", new Class<?>[]{String.class}, "Focus");
        Object weekend = construct("StudyPlan", new Class<?>[]{String.class, int.class}, "Weekend", 1);
        Map<String, Object> refs = new HashMap<>(Map.of("topic", topic, "focus", focus, "alias", focus, "weekend", weekend));
        checkStep(steps.get(0), Map.of("topic", Map.of("title", call(topic, "title")),
                "focus", planFields(focus), "weekend", planFields(weekend)), refs);

        Object first = call(focus, "add", type("Topic"), topic);
        Object second = call(weekend, "add", type("Topic"), topic);
        List<?> saved = (List<?>) call(focus, "entries");
        refs.putAll(Map.of("first", first, "second", second, "saved.get(0)", saved.get(0),
                "focus.entries().get(0)", ((List<?>) call(focus, "entries")).get(0),
                "weekend.entries().get(0)", ((List<?>) call(weekend, "entries")).get(0),
                "first.topic()", call(first, "topic"), "second.topic()", call(second, "topic")));
        checkStep(steps.get(1), Map.of(
                "first", Map.of("retired", call(first, "isRetired"), "first == second", first == second),
                "second", Map.of("retired", call(second, "isRetired")),
                "topic", Map.of("title", call(topic, "title"),
                        "first.topic() == second.topic()", call(first, "topic") == call(second, "topic"))), refs);

        Object style = construct("HintedPrompt", new Class<?>[]{});
        refs.put("style", style);
        Object earlier = call(first, "prompt", type("PromptStyle"), style);
        checkStep(steps.get(2), Map.of("style", Map.of("runtime class", style.getClass().getSimpleName()),
                "call", Map.of("earlier", earlier)), refs);

        Throwable duplicate = assertThrows(InvocationTargetException.class,
                () -> call(focus, "add", type("Topic"), topic)).getCause();
        checkStep(steps.get(3), Map.of("call", failureFields(duplicate),
                "focus", Map.of("size", ((List<?>) call(focus, "entries")).size(), "state", call(focus, "state").toString()),
                "first", Map.of("retired", call(first, "isRetired"))), refs);

        call(topic, "rename", String.class, "References");
        call(refs.get("alias"), "archive");
        refs.remove("focus.entries().get(0)");
        Throwable retired = assertThrows(InvocationTargetException.class,
                () -> call(saved.get(0), "prompt", type("PromptStyle"), style)).getCause();
        checkStep(steps.get(4), Map.of(
                "focus", Map.of("state", call(focus, "state").toString(), "size", ((List<?>) call(focus, "entries")).size()),
                "first", Map.of("retired", call(first, "isRetired"), "saved size", saved.size()),
                "call", failureFields(retired),
                "weekend", Map.of("state", call(weekend, "state").toString(), "size", ((List<?>) call(weekend, "entries")).size(),
                        "prompt", call(second, "prompt", type("PromptStyle"), style)),
                "topic", Map.of("title", call(topic, "title")), "earlier", Map.of("text", earlier)), refs);
    }

    @Test
    void displayedOutputMatchesTheCanonicalMainInABoundedChildJvm() throws Exception {
        assertEquals(Files.readAllLines(EXAMPLES.resolve("oop-overview-output.txt")),
                runJava(classes.toString(), PACKAGE + "OopOverviewDemo").lines().toList());
    }

    @Test
    void linkedProductionFactorySelectsPoliciesActuallyUsedByRepositoryExit() {
        var hourly = new HourlyPricingStrategy();
        var flat = new FlatRatePricingStrategy();
        var factory = new PricingStrategyFactory(hourly, flat, new DynamicPricingStrategy());
        assertSame(hourly, factory.getStrategy(" hourly "));
        assertSame(hourly, factory.getStrategy(null));
        assertSame(flat, factory.getStrategy("FLAT"));
        var repository = new ParkingLotRepository();
        LocalDateTime start = LocalDateTime.of(2026, 1, 1, 10, 0);
        Ticket h = new Ticket("H", "CAR-H", VehicleType.CAR, "S1", start);
        Ticket f = new Ticket("F", "CAR-F", VehicleType.CAR, "S2", start);
        repository.saveTicket(h);
        repository.saveTicket(f);
        assertSame(h, repository.completeExit("H", start.plusHours(2), factory.getStrategy("HOURLY"), "CASH"));
        repository.completeExit("F", start.plusHours(2), factory.getStrategy("FLAT"), "CARD");
        assertEquals(40.0, h.getAmount());
        assertEquals(50.0, f.getAmount());
        assertEquals(Ticket.PaymentStatus.PAID, h.getPaymentStatus());
        assertThrows(TicketAlreadyExitedException.class,
                () -> repository.completeExit("H", start.plusHours(3), factory.getStrategy("FLAT"), "CASH"));
        assertEquals(40.0, h.getAmount());
    }

    private void runProbe(String body) throws Exception {
        compileProbe("""
                import com.lld.learning.examples.oopoverview.*;
                import java.util.List;
                public class OopProbe {
                    static void reject(Class<? extends Throwable> expected, Runnable action) {
                        try { action.run(); }
                        catch (Throwable failure) {
                            if (expected.isInstance(failure)) return;
                            throw new AssertionError("Unexpected rejection", failure);
                        }
                        throw new AssertionError("Expected " + expected.getSimpleName());
                    }
                    public static void main(String[] args) {
                """ + body + "\n} }", true);
        runJava(scratch + java.io.File.pathSeparator + classes, "OopProbe");
    }

    private void compileProbe(String contents, boolean expectedSuccess) throws Exception {
        Path source = scratch.resolve("OopProbe.java");
        Files.writeString(source, contents);
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            boolean success = compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call();
            assertEquals(expectedSuccess, success, diagnostics.getDiagnostics().toString());
            if (!expectedSuccess) assertTrue(diagnostics.getDiagnostics().stream()
                    .anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR));
        }
    }

    private String runJava(String classpath, String main) throws Exception {
        Path output = scratch.resolve("java-output.txt");
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-ea", "-cp", classpath, main).redirectErrorStream(true).redirectOutput(output.toFile()).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "Child JVM timed out: " + main);
            String text = Files.readString(output);
            assertEquals(0, process.exitValue(), text);
            return text;
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    private static Class<?> type(String name) throws ClassNotFoundException {
        return loader.loadClass(PACKAGE + name);
    }

    private Object construct(String name, Class<?>[] parameters, Object... values) throws Exception {
        return type(name).getConstructor(parameters).newInstance(values);
    }

    private Object call(Object object, String method) throws Exception {
        return object.getClass().getMethod(method).invoke(object);
    }

    private Object call(Object object, String method, Class<?> parameter, Object value) throws Exception {
        return object.getClass().getMethod(method, parameter).invoke(object, value);
    }

    private Map<String, Object> planFields(Object plan) throws Exception {
        return Map.of("name", call(plan, "name"), "capacity", call(plan, "capacity"),
                "state", call(plan, "state").toString(), "size", ((List<?>) call(plan, "entries")).size());
    }

    private Map<String, Object> failureFields(Throwable failure) {
        return Map.of("exception", failure.getClass().getSimpleName(), "message", failure.getMessage());
    }

    private void checkStep(JsonNode step, Map<String, Map<String, Object>> actual, Map<String, Object> refs) {
        Map<String, Map<String, JsonNode>> illustrated = new LinkedHashMap<>();
        for (JsonNode item : step.get("items")) {
            String label = item.get("label").asText();
            Map<String, JsonNode> fields = new LinkedHashMap<>();
            for (JsonNode field : item.get("fields")) {
                assertNull(fields.put(field.get("name").asText(), field.get("value")), "Duplicate field");
            }
            assertNull(illustrated.put(label, fields), "Duplicate illustrated object");
            for (JsonNode reference : item.path("references")) {
                assertTrue(refs.containsKey(reference.asText()), "Unverified reference: " + reference);
                assertSame(refs.get(label), refs.get(reference.asText()), "Reference group: " + label);
            }
        }
        assertEquals(JSON.valueToTree(actual), JSON.valueToTree(illustrated), step.get("title").asText());
    }
}
