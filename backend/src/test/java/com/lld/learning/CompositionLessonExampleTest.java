package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.Symbol;
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

/** Verifies displayed Java ownership/lifecycle contracts and every recorded scalar. */
class CompositionLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.composition.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> documentType;

    @BeforeAll static void compileCanonicalSources() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "JDK 17 required");
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-d", classes.toString(),
                EXAMPLES.resolve("composition/Document.java").toString(), EXAMPLES.resolve("composition/CompositionDemo.java").toString()));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        documentType = loader.loadClass(PACKAGE + "Document");
    }
    @AfterAll static void closeLoader() throws Exception { if (loader != null) loader.close(); }
    private Object document(String name) throws Exception { return documentType.getConstructor(String.class).newInstance(name); }
    private Object call(Object target, String name, Object... args) throws Exception {
        for (var method : target.getClass().getMethods())
            if (method.getName().equals(name) && method.getParameterCount() == args.length) return method.invoke(target, args);
        throw new NoSuchMethodException(name);
    }
    private List<?> pages(Object doc) throws Exception { return (List<?>) call(doc, "getPages"); }
    private Object page(Object doc, String text) throws Exception { return call(doc, "createPage", text); }
    private Throwable rejects(Class<? extends Throwable> type, Object target, String method, Object... args) {
        return assertInstanceOf(type, assertThrows(InvocationTargetException.class, () -> call(target, method, args)).getCause());
    }

    @Test void displayedOutputMatchesTheCanonicalJavaProcessNormalizingCrLf() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "CompositionDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("composition-output.txt")).replace("\r\n", "\n"), actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @Test void everyDisplayedFixtureFieldMatchesRealObjectsInRecordedOrder() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("composition-snapshots.json").toFile());
        assertEquals(6, snapshots.size());
        Object draft = document("Draft"), archive = document("Archive");
        check(snapshots.get(0), Map.of("name", call(draft, "getName"), "count", pages(draft).size(), "deleted", call(draft, "isDeleted")),
                Map.of("name", call(archive, "getName"), "count", pages(archive).size(), "deleted", call(archive, "isDeleted")));
        Object intro = page(draft, "Hello"), appendix = page(draft, "Notes"), archived = page(archive, "Record");
        List<?> saved = pages(draft);
        check(snapshots.get(1), Map.of("count", pages(draft).size()), activePage(intro), activePage(appendix), activePage(archived));
        Throwable foreign = rejects(IllegalArgumentException.class, archive, "revise", intro, "Stolen");
        check(snapshots.get(2), failure(foreign), Map.of("owner", call(intro, "getOwnerName"), "text", call(intro, "read")), Map.of("text", call(archived, "read")));
        call(draft, "revise", intro, "Hello Java");
        check(snapshots.get(3), Map.of("text", call(intro, "read")), Map.of("samePage", saved.get(0) == intro, "text", call(saved.get(0), "read")));
        call(draft, "removePage", appendix);
        Throwable removed = rejects(IllegalStateException.class, appendix, "read");
        check(snapshots.get(4), Map.of("count", pages(draft).size()), Map.of("owner", call(appendix, "getOwnerName"), "deleted", call(appendix, "isDeleted")), failure(removed));
        call(draft, "delete");
        Throwable retired = rejects(IllegalStateException.class, saved.get(0), "read");
        check(snapshots.get(5), Map.of("count", pages(draft).size(), "deleted", call(draft, "isDeleted")),
                Map.of("owner", call(intro, "getOwnerName"), "deleted", call(intro, "isDeleted")), Map.of("deleted", call(appendix, "isDeleted")),
                Map.of("count", saved.size(), "samePage", saved.get(0) == intro), failure(retired),
                Map.of("count", pages(archive).size(), "deleted", call(archive, "isDeleted"), "text", call(archived, "read")));
    }
    private Map<String, Object> activePage(Object p) throws Exception {
        return Map.of("owner", call(p, "getOwnerName"), "text", call(p, "read"), "deleted", call(p, "isDeleted"));
    }
    private Map<String, Object> failure(Throwable t) { return Map.of("outcome", t.getClass().getSimpleName(), "message", t.getMessage()); }
    @SafeVarargs private final void check(JsonNode snapshot, Map<String, Object>... actualItems) {
        assertEquals(actualItems.length, snapshot.get("items").size());
        for (int i = 0; i < actualItems.length; i++) {
            var item = snapshot.get("items").get(i); var recorded = JSON.createObjectNode();
            for (JsonNode field : item.get("fields")) {
                assertTrue(field.get("value").isValueNode());
                assertFalse(recorded.has(field.get("name").asText()), "duplicate field");
                recorded.set(field.get("name").asText(), field.get("value"));
            }
            assertEquals(JSON.valueToTree(actualItems[i]), recorded, snapshot.get("title") + ": " + item.get("label"));
        }
    }

    @Test void equalOwnerNamesNeverPermitForeignRevisionOrRemoval() throws Exception {
        Object first = document("Same"), second = document("Same"), intro = page(first, "Hello");
        Object other = page(second, "Other");
        assertEquals("Page belongs to another document", rejects(IllegalArgumentException.class, second, "revise", intro, "Stolen").getMessage());
        rejects(IllegalArgumentException.class, second, "removePage", intro);
        assertEquals("Hello", call(intro, "read")); assertEquals("Other", call(other, "read"));
        assertEquals(List.of(intro), pages(first)); assertEquals(List.of(other), pages(second));
        call(first, "revise", intro, "Changed"); assertEquals("Changed", call(intro, "read"));
    }

    @Test void deletionRetiresEveryCurrentPageAndDoesNotDependOnOutsideAliases() throws Exception {
        Object doc = document("Draft"), otherDoc = document("Other");
        Object first = page(doc, "One"), second = page(doc, "Two"), other = page(otherDoc, "Three");
        List<?> saved = pages(doc); String alreadyRead = (String) call(first, "read");
        call(doc, "delete"); call(doc, "delete");
        assertEquals(true, call(doc, "isDeleted")); assertTrue(pages(doc).isEmpty()); assertEquals(2, saved.size());
        for (Object p : saved) {
            assertEquals(true, call(p, "isDeleted")); assertEquals("Draft", call(p, "getOwnerName"));
            assertEquals("Page is deleted", rejects(IllegalStateException.class, p, "read").getMessage());
        }
        assertSame(first, saved.get(0)); assertSame(second, saved.get(1)); assertEquals("One", alreadyRead);
        assertEquals("Three", call(other, "read")); assertEquals(false, call(otherDoc, "isDeleted"));
        rejects(IllegalStateException.class, doc, "createPage", "Later");
        rejects(IllegalStateException.class, doc, "revise", first, "Later"); rejects(IllegalStateException.class, doc, "removePage", first);
    }

    @Test void removingOnePageRetiresItAndPreservesItsSiblingAndOwner() throws Exception {
        Object doc = document("Draft"), first = page(doc, "One"), second = page(doc, "Two");
        call(doc, "removePage", first);
        assertEquals(true, call(first, "isDeleted")); rejects(IllegalStateException.class, first, "read");
        rejects(IllegalStateException.class, doc, "revise", first, "Again"); rejects(IllegalStateException.class, doc, "removePage", first);
        assertEquals(List.of(second), pages(doc)); assertEquals("Two", call(second, "read")); assertEquals(false, call(doc, "isDeleted"));
        assertNotSame(first, page(doc, "One"), "recreating text creates a new owned identity, not a resurrected page");
    }

    @Test void detachedUnmodifiableMembershipDoesNotMakePageObjectsImmutable() throws Exception {
        Object doc = document("Draft"); List<?> before = pages(doc);
        Object first = page(doc, "One"); List<?> saved = pages(doc);
        Object second = page(doc, "Two");
        assertTrue(before.isEmpty()); assertEquals(1, saved.size()); assertEquals(List.of(first, second), pages(doc));
        assertThrows(UnsupportedOperationException.class, saved::clear);
        call(doc, "revise", first, "Changed"); assertEquals("Changed", call(saved.get(0), "read"));
        call(doc, "removePage", first); assertSame(first, saved.get(0)); rejects(IllegalStateException.class, saved.get(0), "read");
    }

    @Test void validationRejectsInvalidInputBeforeChangingMembershipOrContent() throws Exception {
        for (String bad : new String[]{null, "", " \t "}) {
            var failure = assertThrows(InvocationTargetException.class, () -> document(bad));
            assertInstanceOf(IllegalArgumentException.class, failure.getCause());
        }
        Object doc = document(" Draft "), intro = page(doc, " Hello ");
        assertEquals("Draft", call(doc, "getName")); assertEquals("Hello", call(intro, "read"));
        for (String bad : new String[]{null, "", " "}) {
            rejects(IllegalArgumentException.class, doc, "createPage", bad);
            rejects(IllegalArgumentException.class, doc, "revise", intro, bad);
        }
        rejects(IllegalArgumentException.class, doc, "revise", null, "Text");
        rejects(IllegalArgumentException.class, doc, "removePage", new Object[]{null});
        assertEquals("Hello", call(intro, "read")); assertEquals(List.of(intro), pages(doc));
    }

    @Test void deletingAnEmptyDocumentStillEndsItsCreationLifecycle() throws Exception {
        Object doc = document("Empty"); call(doc, "delete"); call(doc, "delete");
        assertTrue(pages(doc).isEmpty()); assertEquals(true, call(doc, "isDeleted"));
        rejects(IllegalStateException.class, doc, "createPage", "Text");
    }

    @Test void compilerAllowsThePublicClientApiFromTheSamePackage() throws Exception {
        Path source = scratch.resolve("CompositionClient.java");
        Files.writeString(source, "package " + PACKAGE.substring(0, PACKAGE.length() - 1) + "; "
                + "public class CompositionClient { void use() { "
                + "Document document = new Document(\"Draft\"); Document.Page page = document.createPage(\"Hello\"); "
                + "document.revise(page, \"Hello Java\"); document.getPages().get(0).read(); "
                + "page.getOwnerName(); document.removePage(page); page.isDeleted(); document.delete(); } }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertEquals(0, compiler.run(null, null, null, "--release", "17", "-classpath", classes.toString(),
                "-d", scratch.toString(), source.toString()));
    }

    @ParameterizedTest @ValueSource(strings = {
            "void create(Document d) { new Document.Page(d, \"Text\"); }",
            "void reparent(Document d, Document.Page p) { p.owner = d; }",
            "void attach(Document d, Document.Page p) { d.pages.add(p); }",
            "void bypass(Document.Page p) { p.text = \"Changed\"; }",
            "void revive(Document.Page p) { p.deleted = false; }"
    })
    void compilerRejectsDirectConstructionReparentingAttachmentMutationAndResurrection(String member) throws Exception {
        Path source = scratch.resolve("CompositionProbe.java");
        Files.writeString(source, "package " + PACKAGE.substring(0, PACKAGE.length() - 1)
                + "; public class CompositionProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler(); var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertFalse(compiler.getTask(null, files, diagnostics, List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()), null, files.getJavaFileObjects(source)).call());
            assertTrue(diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR));
        }
    }

    @Test void ticTacToeCreatesDistinctPartsButExposesMutableGridWithoutExclusiveOwnershipChecks() {
        Game first = new Game("G1", "Ada", "Ben"), second = new Game("G2", "Cy", "Dee");
        var firstBoard = first.getBoardObj(); var secondBoard = second.getBoardObj();
        assertNotSame(firstBoard, secondBoard);
        Set<Object> cells = Collections.newSetFromMap(new IdentityHashMap<>());
        for (var row : firstBoard.getGrid()) for (var cell : row) assertTrue(cells.add(cell));
        assertEquals(9, cells.size());
        var saved = firstBoard.getGrid()[0][0];
        assertNotSame(saved, secondBoard.getGrid()[0][0]);
        firstBoard.setCell(0, 0, Symbol.X); assertEquals(Symbol.X, saved.getSymbol());
        first.reset(); assertSame(firstBoard, first.getBoardObj()); assertSame(saved, firstBoard.getGrid()[0][0]); assertTrue(saved.isEmpty());
        secondBoard.getGrid()[0][0] = saved; // Local objects only: demonstrate the public boundary's actual limit.
        assertSame(firstBoard.getGrid()[0][0], secondBoard.getGrid()[0][0]);
        saved.setSymbol(Symbol.O); assertEquals(Symbol.O, secondBoard.getGrid()[0][0].getSymbol());
    }
}
