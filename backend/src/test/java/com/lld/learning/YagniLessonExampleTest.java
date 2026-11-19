package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.tictactoe.exception.CellOccupiedException;
import com.lld.tictactoe.exception.GameOverException;
import com.lld.tictactoe.exception.InvalidMoveException;
import com.lld.tictactoe.exception.NotYourTurnException;
import com.lld.tictactoe.model.GameStatus;
import com.lld.tictactoe.model.Symbol;
import com.lld.tictactoe.repository.GameRepository;
import com.lld.tictactoe.service.TicTacToeService;
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
import java.util.*;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Executes the displayed sources as Java 17; the browser only selects recorded results. */
class YagniLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.yagni.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> currentType, speculativeType, pickupType;

    @BeforeAll static void compileDisplayedJava17Sources() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 required");
        var arguments = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String name : List.of("CurrentParcelQuote", "SpeculativeQuoteEngine", "PickupParcelQuote", "YagniDemo"))
            arguments.add(EXAMPLES.resolve("yagni/" + name + ".java").toString());
        assertEquals(0, compiler.run(null, null, null, arguments.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()}, ClassLoader.getPlatformClassLoader());
        currentType = loader.loadClass(PACKAGE + "CurrentParcelQuote");
        speculativeType = loader.loadClass(PACKAGE + "SpeculativeQuoteEngine");
        pickupType = loader.loadClass(PACKAGE + "PickupParcelQuote");
    }

    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }
    private Object current() throws Exception { return currentType.getConstructor().newInstance(); }
    private Object speculative(Map<String, Integer> rates) throws Exception {
        return speculativeType.getConstructor(Map.class).newInstance(rates);
    }
    private Object pickup(Object current) throws Exception { return pickupType.getConstructor(currentType).newInstance(current); }
    private Object call(Object target, String method, Object... args) throws Exception {
        for (var candidate : target.getClass().getMethods())
            if (candidate.getName().equals(method) && candidate.getParameterCount() == args.length)
                return candidate.invoke(target, args);
        throw new NoSuchMethodException(method);
    }
    private void rejects(Object target, String method, Object... args) {
        assertInstanceOf(IllegalArgumentException.class,
                assertThrows(InvocationTargetException.class, () -> call(target, method, args)).getCause());
    }

    @Test void exactMainOutputMatchesTheRecordedFixture() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "YagniDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "bounded teaching program must finish");
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("yagni-output.txt")).replace("\r\n", "\n"), actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @ParameterizedTest @ValueSource(ints = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20})
    void bothCurrentAlternativesSatisfyEverySupportedQuantity(int parcels) throws Exception {
        Object current = current(), speculative = speculative(Map.of("STANDARD", 200));
        int expected = 200 * parcels; // Independent stated current requirement, not another production call.
        assertEquals(expected, call(current, "quoteCents", parcels));
        assertEquals(expected, call(speculative, "quoteCents", "STANDARD", parcels));
        assertEquals(expected, call(pickup(current), "quoteCents", parcels, false), "later standard behavior stays compatible");
    }

    @ParameterizedTest @CsvSource({"1,100", "2,300", "3,500", "19,3700", "20,3900"})
    void actualPickupRequirementSubtractsOncePerQuote(int parcels, int expected) throws Exception {
        Object current = current(), changed = pickup(current);
        assertEquals(expected, call(changed, "quoteCents", parcels, true));
        assertEquals(200 * parcels, call(changed, "quoteCents", parcels, false));
        assertEquals(200 * parcels, call(current, "quoteCents", parcels), "using changed quote must not change its collaborator");
    }

    @Test void guessedRatePassesOneExampleButCannotExpressTheActualFixedDiscount() throws Exception {
        Object guessed = speculative(Map.of("PICKUP", 100)), actual = pickup(current());
        assertEquals(100, call(guessed, "quoteCents", "PICKUP", 1));
        assertEquals(100, call(actual, "quoteCents", 1, true));
        assertEquals(200, call(guessed, "quoteCents", "PICKUP", 2));
        assertEquals(300, call(actual, "quoteCents", 2, true));
        assertEquals(300, call(guessed, "quoteCents", "PICKUP", 3));
        assertEquals(500, call(actual, "quoteCents", 3, true));
        // The rate 150 that fixes two parcels would break one parcel.
        assertEquals(300, call(speculative(Map.of("PICKUP", 150)), "quoteCents", "PICKUP", 2));
        assertEquals(150, call(speculative(Map.of("PICKUP", 150)), "quoteCents", "PICKUP", 1));
    }

    @ParameterizedTest @ValueSource(ints = {Integer.MIN_VALUE, -1, 0, 21, Integer.MAX_VALUE})
    void invalidQuantitiesFailBeforePricingOnEveryPath(int parcels) throws Exception {
        Object current = current(), changed = pickup(current), speculative = speculative(Map.of("STANDARD", 200));
        rejects(current, "quoteCents", parcels);
        rejects(speculative, "quoteCents", "STANDARD", parcels);
        rejects(changed, "quoteCents", parcels, true);
        rejects(changed, "quoteCents", parcels, false);
        assertEquals(600, call(current, "quoteCents", 3));
        assertEquals(500, call(changed, "quoteCents", 3, true));
    }

    @Test void speculativeConfigurationHasRealValidationAndIndependentSnapshotCosts() throws Exception {
        var rates = new HashMap<String, Integer>();
        rates.put("STANDARD", 200);
        Object configured = speculative(rates);
        rates.put("STANDARD", 999);
        rates.put("EXPRESS", 300);
        assertEquals(600, call(configured, "quoteCents", "STANDARD", 3));
        rejects(configured, "quoteCents", "EXPRESS", 3);
        rejects(configured, "quoteCents", "standard", 3);
        rejects(configured, "quoteCents", "", 3);
        rejects(configured, "quoteCents", null, 3);
        rates.clear();
        assertEquals(600, call(configured, "quoteCents", "STANDARD", 3));
        assertEquals(200000, call(speculative(Map.of("MAX", 10000)), "quoteCents", "MAX", 20));
        assertEquals(1, call(speculative(Map.of("MIN", 1)), "quoteCents", "MIN", 1));
        assertEquals(900, call(speculative(Map.of("A", 200, "B", 300)), "quoteCents", "B", 3));
    }

    @Test void invalidConfigurationAndMissingRequiredCollaboratorAreRejected() throws Exception {
        assertInstanceOf(IllegalArgumentException.class, assertThrows(InvocationTargetException.class, () -> speculative(null)).getCause());
        assertInstanceOf(IllegalArgumentException.class, assertThrows(InvocationTargetException.class, () -> speculative(Map.of())).getCause());
        for (String name : new String[]{null, "", " \t"}) {
            Map<String, Integer> rates = new HashMap<>();
            rates.put(name, 200);
            assertInstanceOf(IllegalArgumentException.class, assertThrows(InvocationTargetException.class, () -> speculative(rates)).getCause());
        }
        for (Integer rate : new Integer[]{null, -1, 0, 10001, Integer.MAX_VALUE}) {
            Map<String, Integer> rates = new HashMap<>();
            rates.put("STANDARD", rate);
            assertInstanceOf(IllegalArgumentException.class, assertThrows(InvocationTargetException.class, () -> speculative(rates)).getCause());
        }
        assertInstanceOf(NullPointerException.class, assertThrows(InvocationTargetException.class, () -> pickup(null)).getCause());
    }

    @Test void everyRecordedScalarIsReplayedFromTheDisplayedJavaInDemoOrder() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("yagni-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        Object current = current(), speculative = speculative(Map.of("STANDARD", 200));
        check(snapshots.get(0), Map.of("parcels", 3, "feeCents", call(current, "quoteCents", 3)),
                Map.of("parcels", 3, "service", "STANDARD", "feeCents", call(speculative, "quoteCents", "STANDARD", 3)));
        InvocationTargetException rejected = assertThrows(InvocationTargetException.class, () -> call(current, "quoteCents", 0));
        check(snapshots.get(1), Map.of("zeroRejected", rejected.getCause() instanceof IllegalArgumentException,
                "validFeeAfterRejection", call(current, "quoteCents", 3)));
        Object guessed = speculative(Map.of("PICKUP", 100)), changed = pickup(current);
        check(snapshots.get(2), Map.of("parcels", 1, "feeCents", call(guessed, "quoteCents", "PICKUP", 1)),
                Map.of("parcels", 1, "pickup", true, "feeCents", call(changed, "quoteCents", 1, true)));
        check(snapshots.get(3), Map.of("parcels", 3, "feeCents", call(guessed, "quoteCents", "PICKUP", 3)),
                Map.of("parcels", 3, "pickup", true, "feeCents", call(changed, "quoteCents", 3, true)));
        check(snapshots.get(4), Map.of("parcels", 3, "pickup", false, "feeCents", call(changed, "quoteCents", 3, false)),
                Map.of("parcels", 3, "feeCents", call(current, "quoteCents", 3)));
    }

    @SafeVarargs private final void check(JsonNode snapshot, Map<String, Object>... actual) {
        assertEquals(actual.length, snapshot.get("items").size());
        for (int index = 0; index < actual.length; index++) {
            var recorded = JSON.createObjectNode();
            JsonNode item = snapshot.get("items").get(index);
            for (JsonNode field : item.get("fields")) {
                JsonNode value = field.get("value");
                assertTrue(value.isTextual() || value.isIntegralNumber() || value.isBoolean(), "named scalar field required");
                assertFalse(recorded.has(field.get("name").asText()), "duplicate field");
                recorded.set(field.get("name").asText(), value);
            }
            assertEquals(JSON.valueToTree(actual[index]), recorded, snapshot.get("title") + ": " + item.get("label"));
        }
    }

    @ParameterizedTest @ValueSource(strings = {
            "class YagniProbe { void bypass() { CurrentParcelQuote.CENTS_PER_PARCEL = 1; } }",
            "class YagniProbe { void bypass(PickupParcelQuote q) { q.standard = new CurrentParcelQuote(); } }",
            "class YagniProbe { void bypass(SpeculativeQuoteEngine q) { q.rates.clear(); } }",
            "class YagniProbe extends CurrentParcelQuote {}"
    })
    void compilerRejectsBypassesOfTheStatedBoundaries(String declaration) throws Exception {
        Path source = scratch.resolve("YagniProbe.java");
        Files.writeString(source, "import " + PACKAGE + "*; " + declaration);
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics, List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call());
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR
                    && (d.getCode().contains("report.access") || d.getCode().contains("cant.inherit.from.final"))), diagnostics.getDiagnostics().toString());
        }
    }

    @Test void publicClientCompilesAgainstTheIntendedApi() throws Exception {
        Path source = scratch.resolve("YagniClient.java");
        Files.writeString(source, "import " + PACKAGE + "*; import java.util.Map; public class YagniClient { void use() { "
                + "CurrentParcelQuote current = new CurrentParcelQuote(); current.quoteCents(3); "
                + "new SpeculativeQuoteEngine(Map.of(\"STANDARD\", 200)).quoteCents(\"STANDARD\", 3); "
                + "new PickupParcelQuote(current).quoteCents(3, true); } }");
        assertEquals(0, ToolProvider.getSystemJavaCompiler().run(null, null, null, "--release", "17", "-classpath", classes.toString(),
                "-d", scratch.toString(), source.toString()));
    }

    @Test void verifiedTicTacToeScopeIncludesTwoHumanTurnsRejectionAndARowWin() {
        var service = new TicTacToeService(new GameRepository());
        var game = service.createGame("Alice", "Bob");
        String id = game.getId();
        assertEquals(3, game.getBoardObj().getSize());
        assertEquals(2, game.getPlayers().length);
        assertEquals(Symbol.X, game.getPlayer1().getSymbol());
        assertEquals(Symbol.O, game.getPlayer2().getSymbol());
        assertThrows(InvalidMoveException.class, () -> service.makeMove(id, 3, 0, "Alice"));
        assertThrows(NotYourTurnException.class, () -> service.makeMove(id, 0, 0, "Bob"));
        assertEquals(0, game.getMoveCount());
        assertEquals("Alice", game.getCurrentTurn().getName());
        service.makeMove(id, 0, 0, "Alice");
        assertThrows(CellOccupiedException.class, () -> service.makeMove(id, 0, 0, "Bob"));
        assertEquals(1, game.getMoveCount());
        assertEquals("Bob", game.getCurrentTurn().getName());
        service.makeMove(id, 1, 0, "Bob");
        service.makeMove(id, 0, 1, "Alice");
        service.makeMove(id, 1, 1, "Bob");
        service.makeMove(id, 0, 2, "Alice");
        assertEquals(GameStatus.WON, game.getStatus());
        assertEquals("Alice", game.getWinner().getName());
        assertArrayEquals(new int[]{0, 0, 0, 2}, game.getWinningLine());
        assertThrows(GameOverException.class, () -> service.makeMove(id, 2, 2, "Bob"));
        assertEquals(5, game.getMoveCount());
    }
}
