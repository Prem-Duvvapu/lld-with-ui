package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.model.Floor;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.repository.ParkingLotRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import javax.tools.*;
import java.lang.reflect.InvocationTargetException;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

/** Compiles the exact browser Java and checks every recorded scalar against real objects. */
class AggregationLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.aggregation.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> trackType, playlistType;

    @BeforeAll static void compileCanonicalSources() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 required");
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-d", classes.toString(),
                EXAMPLES.resolve("aggregation/Track.java").toString(),
                EXAMPLES.resolve("aggregation/Playlist.java").toString(),
                EXAMPLES.resolve("aggregation/AggregationDemo.java").toString()));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        trackType = loader.loadClass(PACKAGE + "Track");
        playlistType = loader.loadClass(PACKAGE + "Playlist");
    }
    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }
    private Object track(String title) throws Exception { return trackType.getConstructor(String.class).newInstance(title); }
    private Object playlist(String name) throws Exception { return playlistType.getConstructor(String.class).newInstance(name); }
    private Object call(Object target, String name, Object... args) throws Exception {
        for (var method : target.getClass().getMethods())
            if (method.getName().equals(name) && method.getParameterCount() == args.length) return method.invoke(target, args);
        throw new NoSuchMethodException(name);
    }
    private List<?> tracks(Object p) throws Exception { return (List<?>) call(p, "getTracks"); }
    private Throwable rejects(Class<? extends Throwable> type, Object target, String method, Object... args) {
        return assertInstanceOf(type, assertThrows(InvocationTargetException.class, () -> call(target, method, args)).getCause());
    }

    @Test void displayedOutputMatchesTheCanonicalJavaProcessNormalizingCrLf() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "AggregationDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("aggregation-output.txt")).replace("\r\n", "\n"), actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @Test void everyDisplayedFixtureFieldMatchesRealObjectsInRecordedOrder() throws Exception {
        var snapshots = JSON.readTree(EXAMPLES.resolve("aggregation-snapshots.json").toFile());
        assertEquals(6, snapshots.size());
        Object dawn = track("Dawn"), focus = playlist("Focus"), commute = playlist("Commute");
        check(snapshots.get(0), Map.of("name", call(focus, "getName"), "count", tracks(focus).size(), "deleted", call(focus, "isDeleted")),
                Map.of("name", call(commute, "getName"), "count", tracks(commute).size(), "deleted", call(commute, "isDeleted")), Map.of("title", call(dawn, "getTitle")));
        call(focus, "add", dawn); call(commute, "add", dawn);
        List<?> saved = tracks(focus);
        check(snapshots.get(1), Map.of("count", tracks(focus).size()), Map.of("count", tracks(commute).size()),
                Map.of("sameTrack", tracks(focus).get(0) == tracks(commute).get(0), "savedSameTrack", saved.get(0) == dawn));
        call(dawn, "rename", "Sunrise");
        check(snapshots.get(2), Map.of("title", call(tracks(focus).get(0), "getTitle")), Map.of("title", call(tracks(commute).get(0), "getTitle")),
                Map.of("title", call(saved.get(0), "getTitle")));
        Throwable failure = rejects(IllegalArgumentException.class, focus, "add", dawn);
        check(snapshots.get(3), Map.of("outcome", failure.getClass().getSimpleName(), "message", failure.getMessage()), Map.of("count", tracks(focus).size()), Map.of("count", tracks(commute).size()));
        Object removed = call(focus, "remove", dawn);
        check(snapshots.get(4), Map.of("removed", removed), Map.of("count", tracks(focus).size()), Map.of("count", tracks(commute).size(), "title", call(tracks(commute).get(0), "getTitle")),
                Map.of("count", saved.size(), "sameTrack", saved.get(0) == dawn));
        call(focus, "delete");
        check(snapshots.get(5), Map.of("count", tracks(focus).size(), "deleted", call(focus, "isDeleted")),
                Map.of("count", tracks(commute).size(), "deleted", call(commute, "isDeleted"), "title", call(tracks(commute).get(0), "getTitle")),
                Map.of("title", call(dawn, "getTitle")), Map.of("count", saved.size(), "sameTrack", saved.get(0) == dawn));
    }

    @SafeVarargs private final void check(JsonNode snapshot, Map<String, Object>... actualItems) {
        assertEquals(actualItems.length, snapshot.get("items").size());
        for (int i = 0; i < actualItems.length; i++) {
            var item = snapshot.get("items").get(i);
            var recorded = JSON.createObjectNode();
            for (JsonNode field : item.get("fields")) {
                assertTrue(field.get("value").isValueNode());
                assertFalse(recorded.has(field.get("name").asText()), "duplicate field");
                recorded.set(field.get("name").asText(), field.get("value"));
            }
            assertEquals(JSON.valueToTree(actualItems[i]), recorded, snapshot.get("title") + ": " + item.get("label"));
        }
    }

    @Test void sharedMutationAndIndependentRemovalUseIdentityInsteadOfTitles() throws Exception {
        Object dawn = track("Dawn"), equalTitle = track("Dawn"), first = playlist("First"), second = playlist("Second");
        call(first, "add", dawn); call(first, "add", equalTitle); call(second, "add", dawn);
        rejects(IllegalArgumentException.class, first, "add", dawn);
        assertEquals(2, tracks(first).size());
        assertSame(dawn, tracks(first).get(0)); assertNotSame(dawn, equalTitle);
        call(dawn, "rename", "Changed");
        assertEquals("Changed", call(tracks(second).get(0), "getTitle")); assertEquals("Dawn", call(equalTitle, "getTitle"));
        assertEquals(true, call(first, "remove", dawn)); assertEquals(false, call(first, "remove", dawn));
        assertSame(equalTitle, tracks(first).get(0)); assertSame(dawn, tracks(second).get(0));
    }

    @Test void snapshotsAreUnmodifiableDetachedAndShallow() throws Exception {
        Object dawn = track("Dawn"), focus = playlist("Focus");
        List<?> before = tracks(focus);
        call(focus, "add", dawn);
        List<?> saved = tracks(focus);
        assertTrue(before.isEmpty()); assertThrows(UnsupportedOperationException.class, saved::clear);
        call(focus, "delete");
        assertTrue(tracks(focus).isEmpty()); assertEquals(1, saved.size()); assertSame(dawn, saved.get(0));
        call(dawn, "rename", "Still usable"); assertEquals("Still usable", call(saved.get(0), "getTitle"));
    }

    @Test void deletionIsIdempotentAndPreservesCurrentPartsAndOtherWholes() throws Exception {
        Object dawn = track("Dawn"), focus = playlist("Focus"), commute = playlist("Commute");
        call(focus, "add", dawn); call(commute, "add", dawn);
        call(focus, "delete"); call(focus, "delete"); // Delete with a current part, unlike the demo's prior removal.
        assertEquals(true, call(focus, "isDeleted")); assertEquals("Focus", call(focus, "getName")); assertTrue(tracks(focus).isEmpty());
        assertSame(dawn, tracks(commute).get(0)); assertEquals(false, call(commute, "isDeleted")); assertEquals("Dawn", call(dawn, "getTitle"));
        assertEquals("Playlist is deleted", rejects(IllegalStateException.class, focus, "add", dawn).getMessage());
        rejects(IllegalStateException.class, focus, "remove", dawn);
        call(commute, "remove", dawn); call(commute, "add", dawn);
    }

    @Test void validationPreservesTrackAndMembershipState() throws Exception {
        for (String bad : new String[]{null, "", " \t "}) {
            for (Class<?> type : List.of(trackType, playlistType)) {
                var failure = assertThrows(InvocationTargetException.class, () -> type.getConstructor(String.class).newInstance(bad));
                assertInstanceOf(IllegalArgumentException.class, failure.getCause());
            }
        }
        Object dawn = track(" Dawn "), focus = playlist(" Focus ");
        assertEquals("Dawn", call(dawn, "getTitle")); assertEquals("Focus", call(focus, "getName")); call(focus, "add", dawn);
        for (String bad : new String[]{null, "", " "}) rejects(IllegalArgumentException.class, dawn, "rename", bad);
        rejects(IllegalArgumentException.class, focus, "add", new Object[]{null}); rejects(IllegalArgumentException.class, focus, "remove", new Object[]{null});
        assertEquals("Dawn", call(dawn, "getTitle")); assertEquals(List.of(dawn), tracks(focus));
    }

    @Test void compilerAllowsThePublicClientApiFromTheSamePackage() throws Exception {
        Path source = scratch.resolve("AggregationClient.java");
        Files.writeString(source, "package " + PACKAGE.substring(0, PACKAGE.length() - 1) + "; "
                + "public class AggregationClient { void use() { "
                + "Track track = new Track(\"Dawn\"); Playlist playlist = new Playlist(\"Focus\"); "
                + "playlist.add(track); track.rename(\"Sunrise\"); "
                + "playlist.getTracks().get(0).getTitle(); playlist.remove(track); playlist.delete(); } }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-classpath", classes.toString(),
                "-d", scratch.toString(), source.toString()));
    }

    @ParameterizedTest @ValueSource(strings = {
            "void bypass(Playlist p, Track t) { p.tracks.add(t); }",
            "void reverse(Track t) { t.getPlaylists(); }",
            "void wrongType(Playlist p) { p.add(\"Dawn\"); }"
    })
    void compilerRejectsPrivateMembershipReverseNavigationAndTitleInsteadOfReference(String member) throws Exception {
        Path source = scratch.resolve("AggregationProbe.java");
        Files.writeString(source, "package " + PACKAGE.substring(0, PACKAGE.length() - 1)
                + "; public class AggregationProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler(); var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics, List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()), null, files.getJavaFileObjects(source)).call());
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR));
        }
    }

    @Test void parkingSharesSpotsButDoesNotSynchronizeFloorMembershipWithTheIndex() {
        var spot = new ParkingSpot("S1", 1, 1, VehicleType.CAR);
        var floor = new Floor(1, new ArrayList<>(List.of(spot))); var repository = new ParkingLotRepository();
        repository.addFloor(floor);
        assertSame(spot, repository.getAllFloors().get(0).getSpots().get(0)); assertSame(spot, repository.getAvailableSpots().get(0));
        spot.setOccupied(true);
        assertTrue(repository.getAllFloors().get(0).getSpots().get(0).isOccupied()); assertTrue(repository.getAvailableSpots().isEmpty());
        floor.getSpots().clear(); spot.setOccupied(false);
        assertTrue(repository.getAllFloors().get(0).getSpots().isEmpty());
        assertSame(spot, repository.getAvailableSpots().get(0), "clearing floor membership is not an index deletion cascade");
    }
}
