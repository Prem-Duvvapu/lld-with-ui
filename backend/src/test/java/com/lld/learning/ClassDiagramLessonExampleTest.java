package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.strategy.HourlyPricingStrategy;
import com.lld.parkinglot.strategy.PricingStrategy;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Compiles the browser's exact sources and verifies the structural claims and recorded behavior. */
class ClassDiagramLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final Path SOURCE = EXAMPLES.resolve("classdiagram");
    private static final String PACKAGE = "com.lld.learning.examples.classdiagram.";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final List<String> FILES = List.of("Resource.java", "Labelled.java", "Book.java",
            "Shelf.java", "Loan.java", "ClassDiagramDemo.java");
    @TempDir static Path classes;
    @TempDir Path scratch;
    private static URLClassLoader loader;
    private static Class<?> resourceType, labelledType, bookType, shelfType, loanType, receiptType;

    @BeforeAll
    static void compileDisplayedJavaWithRelease17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "A JDK is required");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        FILES.forEach(file -> args.add(SOURCE.resolve(file).toString()));
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        resourceType = loader.loadClass(PACKAGE + "Resource");
        labelledType = loader.loadClass(PACKAGE + "Labelled");
        bookType = loader.loadClass(PACKAGE + "Book");
        shelfType = loader.loadClass(PACKAGE + "Shelf");
        loanType = loader.loadClass(PACKAGE + "Loan");
        receiptType = loader.loadClass(PACKAGE + "Loan$Receipt");
    }

    @AfterAll
    static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    private Object book(String title) throws Exception { return bookType.getConstructor(String.class).newInstance(title); }
    private Object shelf() throws Exception { return shelfType.getConstructor().newInstance(); }
    private Object loan(Object book) throws Exception { return loanType.getConstructor(bookType).newInstance(book); }
    private Object call(Object target, String name) throws Exception { return target.getClass().getMethod(name).invoke(target); }
    private List<?> books(Object shelf) throws Exception { return (List<?>) call(shelf, "books"); }
    private void add(Object shelf, Object book) throws Exception { shelfType.getMethod("add", bookType).invoke(shelf, book); }
    private Object preview(Object shelf, Object item) throws Exception {
        return shelfType.getMethod("preview", labelledType).invoke(shelf, item);
    }
    private boolean isFor(Object receipt, Object loan) throws Exception {
        return (boolean) receiptType.getMethod("isFor", loanType).invoke(receipt, loan);
    }
    private Throwable rejection(org.junit.jupiter.api.function.Executable operation) {
        return assertThrows(InvocationTargetException.class, operation).getCause();
    }

    @Test
    void subtypeAndRealizationMatchTheDeclaredTrianglesAndInheritedState() throws Exception {
        assertEquals(resourceType, bookType.getSuperclass());
        assertArrayEquals(new Class<?>[]{labelledType}, bookType.getInterfaces());
        assertTrue(Modifier.isAbstract(resourceType.getModifiers()));
        assertTrue(labelledType.isInterface());
        assertTrue(Modifier.isFinal(bookType.getModifiers()));
        assertEquals(0, bookType.getDeclaredFields().length, "the Book compartment omits inherited state");
        assertTrue(Modifier.isProtected(resourceType.getDeclaredConstructor(String.class).getModifiers()));
        assertTrue(Modifier.isPrivate(resourceType.getDeclaredField("title").getModifiers()));
        assertTrue(Modifier.isFinal(resourceType.getDeclaredField("title").getModifiers()));
        assertTrue(Modifier.isFinal(resourceType.getMethod("title").getModifiers()));
        assertTrue(Modifier.isAbstract(resourceType.getMethod("label").getModifiers()));
        assertTrue(Modifier.isPublic(labelledType.getMethod("label").getModifiers()));
        assertTrue(Modifier.isAbstract(labelledType.getMethod("label").getModifiers()));
        Object book = book("UML");
        assertTrue(resourceType.isInstance(book));
        assertTrue(labelledType.isInstance(book));
        assertEquals("UML", resourceType.getMethod("title").invoke(book));
        assertEquals("Book: UML", resourceType.getMethod("label").invoke(book));
        assertEquals("Book: UML", labelledType.getMethod("label").invoke(book));
        assertEquals(resourceType, bookType.getMethod("title").getDeclaringClass());
        assertEquals(bookType, bookType.getMethod("label").getDeclaringClass());
    }

    @Test
    void requiredBookAndOptionalReceiptBoundsHoldBeforeAndAfterClosure() throws Exception {
        assertInstanceOf(NullPointerException.class, rejection(() -> loan(null)));
        Object book = book("UML"), first = loan(book), second = loan(book);
        assertSame(book, call(first, "book"));
        assertSame(book, call(second, "book"), "no exclusive checkout rule exists");
        assertNull(call(first, "receipt"));
        call(first, "close");
        call(first, "close");
        assertNull(call(first, "receipt"), "closing without issuance does not create a part");
        assertEquals(true, call(first, "isClosed"));
        assertInstanceOf(IllegalStateException.class, rejection(() -> call(first, "issueReceipt")));
        assertSame(book, call(first, "book"), "closed loans retain their required association");
        assertEquals(false, call(second, "isClosed"));
        assertEquals("Book: UML", call(book, "label"));
    }

    @Test
    void shelfMembershipIsShareableUniqueByIdentityAndDetachedFromReturnedLists() throws Exception {
        Object book = book("UML"), sameTitle = book("UML"), first = shelf(), second = shelf();
        assertTrue(books(first).isEmpty());
        assertInstanceOf(NullPointerException.class, rejection(() -> add(first, null)));
        assertTrue(books(first).isEmpty());
        add(first, book); add(first, book); add(second, book);
        assertEquals(1, books(first).size());
        assertSame(books(first).get(0), books(second).get(0));
        List<?> saved = books(first);
        assertThrows(UnsupportedOperationException.class, saved::clear);
        add(first, sameTitle);
        assertEquals(2, books(first).size(), "distinct Book identities with equal titles are distinct members");
        assertEquals(1, saved.size(), "a prior membership snapshot does not gain later additions");
        call(first, "clear");
        assertTrue(books(first).isEmpty());
        assertSame(book, saved.get(0));
        assertSame(book, books(second).get(0));
        assertEquals("Book: UML", call(book, "label"));
        assertEquals(0, bookType.getDeclaredFields().length, "Book has no reverse shelf or loan collection");
    }

    @Test
    void receiptHasOneFixedOwnerAndDomainRetirementWithoutPretendJvmDestruction() throws Exception {
        Object book = book("UML"), first = loan(book), second = loan(book);
        Object receipt = call(first, "issueReceipt"), otherReceipt = call(second, "issueReceipt");
        assertNotSame(receipt, otherReceipt);
        assertSame(receipt, call(first, "issueReceipt"));
        assertSame(receipt, call(first, "receipt"));
        assertTrue(isFor(receipt, first));
        assertFalse(isFor(receipt, second));
        assertFalse(isFor(receipt, null));
        assertEquals(true, call(receipt, "isActive"));
        assertEquals("Book: UML", call(receipt, "read"));
        call(first, "close"); call(first, "close");
        assertSame(receipt, call(first, "receipt"));
        assertTrue(isFor(receipt, first));
        assertEquals(false, call(receipt, "isActive"));
        assertEquals("Receipt is retired", rejection(() -> call(receipt, "read")).getMessage());
        assertInstanceOf(IllegalStateException.class, rejection(() -> call(first, "issueReceipt")));
        assertEquals("Book: UML", call(otherReceipt, "read"));
        assertEquals("Book: UML", call(book, "label"));
        var text = receiptType.getDeclaredField("text");
        assertTrue(text.trySetAccessible());
        assertEquals("", text.get(receipt), "the stated domain retirement clears the text field");
    }

    @Test
    void previewUsesAnInterfaceWithoutAddingMembershipOrStoringTheArgument() throws Exception {
        Object shelf = shelf();
        var calls = new AtomicInteger();
        Object label = Proxy.newProxyInstance(loader, new Class<?>[]{labelledType}, (proxy, method, args) -> {
            assertEquals("label", method.getName());
            calls.incrementAndGet();
            return "Temporary preview";
        });
        assertEquals("Temporary preview", preview(shelf, label));
        assertEquals(1, calls.get());
        assertTrue(books(shelf).isEmpty());
        assertInstanceOf(NullPointerException.class, rejection(() -> preview(shelf, null)));
        assertEquals(1, calls.get());
        assertEquals(Set.of("books"), Arrays.stream(shelfType.getDeclaredFields())
                .map(java.lang.reflect.Field::getName).collect(Collectors.toSet()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\t\n"})
    void resourceRejectsBlankTitles(String title) {
        assertInstanceOf(IllegalArgumentException.class, rejection(() -> book(title)));
    }

    @Test
    void resourceRejectsNullTitle() {
        assertInstanceOf(NullPointerException.class, rejection(() -> book(null)));
    }

    @Test
    void declaredFieldsAndOperationsMatchTheSelectedClassCompartments() throws Exception {
        assertFields(resourceType, Map.of("title", String.class), Set.of("title"));
        assertFields(bookType, Map.of(), Set.of());
        assertFields(labelledType, Map.of(), Set.of());
        assertFields(shelfType, Map.of("books", List.class), Set.of("books"));
        assertEquals("java.util.List<" + PACKAGE + "Book>", shelfType.getDeclaredField("books").getGenericType().getTypeName());
        assertFields(loanType, Map.of("book", bookType, "receipt", receiptType, "closed", boolean.class), Set.of("book"));
        assertFields(receiptType, Map.of("owner", loanType, "text", String.class, "active", boolean.class), Set.of("owner"));
        assertTrue(Modifier.isStatic(receiptType.getModifiers()));
        assertTrue(Modifier.isFinal(receiptType.getModifiers()));
        assertTrue(Modifier.isPrivate(receiptType.getDeclaredConstructor(loanType, String.class).getModifiers()));
        assertOperations(resourceType, "title():String", "label():String");
        assertOperations(labelledType, "label():String");
        assertOperations(bookType, "label():String");
        assertOperations(shelfType, "add(Book):void", "books():List", "clear():void", "preview(Labelled):String");
        assertOperations(loanType, "book():Book", "receipt():Receipt", "isClosed():boolean", "issueReceipt():Receipt", "close():void");
        assertOperations(receiptType, "isFor(Loan):boolean", "isActive():boolean", "read():String", "retire():void");
    }

    private void assertFields(Class<?> type, Map<String, Class<?>> expected, Set<String> finals) {
        var fields = Arrays.stream(type.getDeclaredFields()).collect(Collectors.toMap(
                java.lang.reflect.Field::getName, java.lang.reflect.Field::getType));
        assertEquals(expected, fields, type.getSimpleName());
        for (var field : type.getDeclaredFields()) {
            assertTrue(Modifier.isPrivate(field.getModifiers()));
            assertEquals(finals.contains(field.getName()), Modifier.isFinal(field.getModifiers()));
            assertFalse(Modifier.isStatic(field.getModifiers()));
        }
    }

    private void assertOperations(Class<?> type, String... signatures) {
        Set<String> actual = Arrays.stream(type.getDeclaredMethods()).map(method -> {
            assertFalse(Modifier.isStatic(method.getModifiers()));
            if (method.getName().equals("retire")) assertTrue(Modifier.isPrivate(method.getModifiers()));
            else assertTrue(Modifier.isPublic(method.getModifiers()));
            return method.getName() + "(" + Arrays.stream(method.getParameterTypes()).map(Class::getSimpleName)
                    .collect(Collectors.joining(",")) + "):" + method.getReturnType().getSimpleName();
        }).collect(Collectors.toSet());
        assertEquals(Set.of(signatures), actual, type.getSimpleName());
    }

    @Test
    void everyRecordedScalarMatchesCanonicalJavaAtThatStep() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("class-diagram-snapshots.json").toFile());
        assertEquals(5, snapshots.size());
        Object book = book("UML"), first = shelf(), second = shelf(), loan = loan(book);
        assertSnapshot(snapshots.get(0), values("book count", books(first).size()),
                values("book title", call(call(loan, "book"), "title"), "closed", call(loan, "isClosed"),
                        "receipt present", call(loan, "receipt") != null));
        add(first, book); add(first, book); add(second, book);
        assertSnapshot(snapshots.get(1), values("first book count", books(first).size(), "second book count", books(second).size(),
                "same book", books(first).get(0) == books(second).get(0), "preview", preview(first, book)));
        Object saved = call(loan, "issueReceipt");
        assertSnapshot(snapshots.get(2), values("same receipt on repeated issuance", saved == call(loan, "issueReceipt"),
                "owner matches", isFor(saved, loan), "active", call(saved, "isActive"), "text", call(saved, "read")));
        call(first, "clear");
        assertSnapshot(snapshots.get(3), values("first book count", books(first).size(), "second book count", books(second).size(),
                "loan keeps book", call(loan, "book") == book, "book label", call(book, "label")));
        call(loan, "close");
        assertSnapshot(snapshots.get(4), values("closed", call(loan, "isClosed"), "receipt still stored", call(loan, "receipt") == saved,
                        "book label", call(book, "label")),
                values("active", call(saved, "isActive"), "owner matches", isFor(saved, loan),
                        "read rejection", rejection(() -> call(saved, "read")).getMessage()));
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
                assertTrue(field.get("value").isValueNode(), "fields must be scalars");
                assertFalse(recorded.has(field.get("name").asText()), "field names must be unique");
                recorded.set(field.get("name").asText(), field.get("value"));
            }
            assertEquals(JSON.valueToTree(actualItems[i]), recorded, snapshot.get("title").asText());
        }
    }

    @Test
    void realDemoMatchesTheDisplayedOutputExactly() throws Exception {
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "ClassDiagramDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "demo timed out");
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("class-diagram-output.txt")).replace("\r\n", "\n"),
                    actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "void check(Loan loan) { loan.book = new Book(\"x\"); }|book",
            "void check(Book book) { String s = book.title; }|title",
            "void check(Loan loan) { new Loan.Receipt(loan, \"x\"); }|Receipt",
            "void check(Loan.Receipt receipt) { receipt.retire(); }|retire",
            "void check() { new Resource(\"x\"); }|abstract",
            "void check(Shelf shelf) { shelf.add(\"x\"); }|String",
            "static class Lookalike { public String label() { return \"x\"; } } void check(Shelf s) { s.preview(new Lookalike()); }|Labelled"
    })
    void compilerRejectsVisibilityViolationsAbstractConstructionAndWrongTypes(String member, String diagnosticToken)
            throws Exception {
        assertProbeCompiles("void check() { Book b = new Book(\"x\"); Shelf s = new Shelf(); s.add(b); "
                + "Labelled label = b; Resource resource = b; s.preview(label); Loan l = new Loan(b); "
                + "Loan.Receipt r = l.issueReceipt(); r.read(); }", true, null);
        assertProbeCompiles(member, false, diagnosticToken);
    }

    private void assertProbeCompiles(String member, boolean success, String diagnosticToken) throws Exception {
        Path source = scratch.resolve("ClassDiagramProbe.java");
        Files.writeString(source, "import " + PACKAGE + "*; public class ClassDiagramProbe { " + member + " }");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
            assertEquals(success, compiler.getTask(null, files, diagnostics,
                    List.of("--release", "17", "-classpath", classes.toString(), "-d", scratch.toString()),
                    null, files.getJavaFileObjects(source)).call());
        }
        if (!success) assertTrue(diagnostics.getDiagnostics().stream().anyMatch(entry ->
                entry.getKind() == Diagnostic.Kind.ERROR && entry.getMessage(Locale.ROOT).contains(diagnosticToken)),
                () -> diagnostics.getDiagnostics().toString());
    }

    @Test
    void parkingPracticeClaimsMatchRealDeclarationsIncludingTheIdentifierBoundary() throws Exception {
        assertTrue(PricingStrategy.class.isAssignableFrom(HourlyPricingStrategy.class));
        assertEquals(double.class, PricingStrategy.class.getMethod("calculatePrice", Ticket.class).getReturnType());
        assertEquals(double.class, HourlyPricingStrategy.class.getDeclaredMethod("calculatePrice", Ticket.class).getReturnType());
        assertEquals(String.class, Ticket.class.getDeclaredField("spotId").getType());
        assertTrue(Arrays.stream(Ticket.class.getDeclaredFields()).noneMatch(field -> field.getType() == ParkingSpot.class));
        assertEquals(void.class, Ticket.class.getMethod("setSpotId", String.class).getReturnType(), "Lombok-generated operation");
        assertNotNull(Ticket.class.getConstructor());
        assertNotNull(ParkingSpot.class.getConstructor());
    }
}
