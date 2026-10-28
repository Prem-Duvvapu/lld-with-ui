package com.lld.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import javax.tools.ToolProvider;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Modifier;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Runs the exact displayed sources: UML roles/goals are not inferred from Java declarations. */
class UseCaseDiagramLessonExampleTest {
    private static final Path EXAMPLES = Path.of("..", "frontend", "src", "learning", "examples");
    private static final String PACKAGE = "com.lld.learning.examples.usecase.";
    private static final ObjectMapper JSON = new ObjectMapper();
    @TempDir static Path classes;
    private static URLClassLoader loader;
    private static Class<?> portalType, memberType;

    @BeforeAll
    static void compileTheFourDisplayedFilesWithJava17() throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "Run with a JDK");
        var args = new ArrayList<>(List.of("--release", "17", "-d", classes.toString()));
        for (String file : List.of("Member.java", "Loan.java", "LibraryPortal.java", "UseCaseDemo.java")) {
            args.add(EXAMPLES.resolve("usecase").resolve(file).toString());
        }
        assertEquals(0, compiler.run(null, null, null, args.toArray(String[]::new)));
        loader = new URLClassLoader(new java.net.URL[]{classes.toUri().toURL()});
        portalType = loader.loadClass(PACKAGE + "LibraryPortal");
        memberType = loader.loadClass(PACKAGE + "Member");
    }

    @AfterAll
    static void closeLoader() throws Exception { if (loader != null) loader.close(); }

    private Object portal() throws Exception {
        return portalType.getConstructor(Set.class).newInstance(Set.of("UML", "Java"));
    }

    private Object member(String id, boolean active, boolean librarian) throws Exception {
        return memberType.getConstructor(String.class, boolean.class, boolean.class).newInstance(id, active, librarian);
    }

    private Object call(Object target, String operation, Object... args) throws Exception {
        var method = Arrays.stream(target.getClass().getMethods())
                .filter(m -> m.getName().equals(operation) && m.getParameterCount() == args.length)
                .findFirst().orElseThrow();
        return method.invoke(target, args);
    }

    private Throwable rejected(org.junit.jupiter.api.function.Executable operation, Class<? extends Throwable> type,
                               String message) {
        Throwable cause = assertThrows(InvocationTargetException.class, operation).getCause();
        assertInstanceOf(type, cause);
        assertEquals(message, cause.getMessage());
        return cause;
    }

    @Test
    void baseCompletesWithoutExtensionAndBothGoalsIncorporateEligibility() throws Exception {
        Object portal = portal(), member = member("M1", true, false);
        Object borrowing = call(portal, "borrow", member, "UML", false);
        Object loan = call(borrowing, "loan");
        assertEquals(List.of("eligibility accepted", "loan confirmed"), call(borrowing, "trace"));
        assertNull(call(borrowing, "receipt"));
        assertSame(loan, call(portal, "loan", "UML"));
        assertEquals(true, call(loan, "active"));
        assertEquals(14, call(loan, "dueDay"));
        assertEquals(List.of("eligibility accepted", "loan renewed"), call(portal, "renew", member, "UML"));
        assertEquals(21, call(loan, "dueDay"));
        assertEquals(true, call(loan, "renewed"));

        Object inactive = member("M1", false, false);
        rejected(() -> call(portal, "renew", inactive, "UML"), IllegalStateException.class, "Membership inactive");
        rejected(() -> call(portal, "borrow", inactive, "Java", true), IllegalStateException.class, "Membership inactive");
        rejected(() -> call(portal, "loan", "Java"), IllegalStateException.class, "No loan for title");
        assertEquals(21, call(loan, "dueDay"));
        assertEquals(true, call(loan, "active"));
    }

    @Test
    void requestedExtensionFollowsConfirmationAndNeitherChangesBaseLoanNorRunsOnRejection() throws Exception {
        Object portal = portal(), member = member("M1", true, false);
        Object borrowing = call(portal, "borrow", member, "UML", true);
        assertEquals(List.of("eligibility accepted", "loan confirmed", "receipt issued"), call(borrowing, "trace"));
        assertEquals("Receipt: M1 borrowed UML; due day 14", call(borrowing, "receipt"));
        Object loan = call(borrowing, "loan");
        assertEquals(14, call(loan, "dueDay"));
        assertEquals(true, call(loan, "active"));
        rejected(() -> call(portal, "borrow", member, "UML", true), IllegalStateException.class, "Copy unavailable");
        assertSame(loan, call(portal, "loan", "UML"));
        assertEquals(false, call(loan, "renewed"));
    }

    @Test
    void librarianPreservesMemberCapabilitiesAndRestrictionsWhileAddingReturnDutyWithoutJavaInheritance() throws Exception {
        Object portal = portal(), staff = member("L1", true, true), inactiveStaff = member("L1", false, true);
        assertEquals(Object.class, memberType.getSuperclass());
        assertTrue(Modifier.isFinal(memberType.getModifiers()), "Actor specialization is not a Java subclass here");
        Object borrowing = call(portal, "borrow", staff, "Java", false);
        Object loan = call(borrowing, "loan");
        assertEquals("L1", call(loan, "memberId"));
        assertEquals(List.of("eligibility accepted", "loan renewed"), call(portal, "renew", staff, "Java"));
        rejected(() -> call(portal, "borrow", inactiveStaff, "UML", false), IllegalStateException.class, "Membership inactive");
        rejected(() -> call(portal, "renew", inactiveStaff, "Java"), IllegalStateException.class, "Membership inactive");
        // Member eligibility governs borrowing; staff return duties survive inactive borrowing membership.
        assertEquals(List.of("return recorded"), call(portal, "recordReturn", inactiveStaff, "Java"));
        assertEquals(false, call(loan, "active"));
    }

    @Test
    void returnAndRenewalRejectionsPreserveTheExistingLoanAndReturnedCopyCanBeBorrowedAgain() throws Exception {
        Object portal = portal(), owner = member("M1", true, false), other = member("M2", true, false);
        Object staff = member("L1", true, true), loan = call(call(portal, "borrow", owner, "UML", false), "loan");
        rejected(() -> call(portal, "renew", other, "UML"), IllegalArgumentException.class, "Not your loan");
        rejected(() -> call(portal, "recordReturn", owner, "UML"), IllegalArgumentException.class, "Librarian role required");
        assertEquals(14, call(loan, "dueDay"));
        assertEquals(false, call(loan, "renewed"));
        assertEquals(true, call(loan, "active"));
        call(portal, "renew", owner, "UML");
        rejected(() -> call(portal, "renew", owner, "UML"), IllegalStateException.class, "Loan cannot be renewed");
        assertEquals(21, call(loan, "dueDay"));
        call(portal, "recordReturn", staff, "UML");
        rejected(() -> call(portal, "recordReturn", staff, "UML"), IllegalStateException.class, "Loan already returned");
        rejected(() -> call(portal, "renew", owner, "UML"), IllegalStateException.class, "Loan cannot be renewed");
        assertEquals(false, call(loan, "active"));
        Object replacement = call(call(portal, "borrow", other, "UML", false), "loan");
        assertNotSame(loan, replacement);
        assertEquals("M2", call(replacement, "memberId"));
        assertEquals(14, call(replacement, "dueDay"));
        assertEquals(true, call(replacement, "active"));
        assertSame(replacement, call(portal, "loan", "UML"));
        assertEquals(false, call(loan, "active"), "Saved references still denote the earlier returned loan");
    }

    @Test
    void unknownTitlesMissingLoansAndNullArgumentsRejectBeforeChangingExistingState() throws Exception {
        Object portal = portal(), member = member("M1", true, false), staff = member("L1", true, true);
        Object loan = call(call(portal, "borrow", member, "UML", false), "loan");
        rejected(() -> call(portal, "borrow", member, "Unknown", true), IllegalArgumentException.class, "Unknown title");
        rejected(() -> call(portal, "renew", member, "Java"), IllegalStateException.class, "No loan for title");
        rejected(() -> call(portal, "recordReturn", staff, "Java"), IllegalStateException.class, "No loan for title");
        rejected(() -> call(portal, "borrow", null, "Java", true), NullPointerException.class, "member");
        rejected(() -> call(portal, "renew", null, "UML"), NullPointerException.class, "member");
        rejected(() -> call(portal, "recordReturn", null, "UML"), NullPointerException.class, "operator");
        rejected(() -> call(portal, "borrow", member, null, true), NullPointerException.class, "title");
        assertSame(loan, call(portal, "loan", "UML"));
        assertEquals(14, call(loan, "dueDay"));
        assertEquals(true, call(loan, "active"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\t\n"})
    void blankMemberIdsAreRejected(String id) {
        rejected(() -> member(id, true, false), IllegalArgumentException.class, "Blank member id");
    }

    @Test
    void constructorBoundariesAndTheCallerTrustLimitAreExplicit() throws Exception {
        rejected(() -> member(null, true, false), NullPointerException.class, "member id");
        assertEquals("M1", call(member(" M1 ", true, false), "id"));
        rejected(() -> portalType.getConstructor(Set.class).newInstance(Set.of(" ")), IllegalArgumentException.class, "Blank title");
        rejected(() -> portalType.getConstructor(Set.class).newInstance((Object) null), NullPointerException.class, "catalog");
        Object portal = portal(), member = member("M1", true, false);
        call(portal, "borrow", member, "UML", false);
        // This is a limitation demonstration: anyone constructing role data can claim staff authority.
        call(portal, "recordReturn", member("caller-claimed-staff", false, true), "UML");
        assertEquals(false, call(call(portal, "loan", "UML"), "active"));
    }

    @Test
    void traceListsAreSnapshotsButTheBorrowingRecordIsNotDeeplyImmutable() throws Exception {
        Object portal = portal(), member = member("M1", true, false);
        Object borrowing = call(portal, "borrow", member, "UML", true);
        List<?> trace = (List<?>) call(borrowing, "trace");
        assertThrows(UnsupportedOperationException.class, trace::clear);
        List<?> renewed = (List<?>) call(portal, "renew", member, "UML");
        assertThrows(UnsupportedOperationException.class, renewed::clear);
        assertEquals(List.of("eligibility accepted", "loan confirmed", "receipt issued"), trace);
        assertEquals(21, call(call(borrowing, "loan"), "dueDay"));
        assertEquals("Receipt: M1 borrowed UML; due day 14", call(borrowing, "receipt"), "The issued receipt text is historical");
    }

    @Test
    void everyRecordedScalarAndTraceMatchesTheCanonicalScenario() throws Exception {
        JsonNode snapshots = JSON.readTree(EXAMPLES.resolve("use-case-diagram-snapshots.json").toFile());
        assertEquals(6, snapshots.size());
        Object portal = portal(), member = member("M1", true, false), staff = member("L1", true, true);
        Object plain = call(portal, "borrow", member, "UML", false), loan = call(plain, "loan");
        assertSnapshot(snapshots.get(0), values("member id", call(loan, "memberId"), "active loan", call(loan, "active"),
                "due day", call(loan, "dueDay"), "receipt", call(plain, "receipt"), "trace", trace(call(plain, "trace"))));
        Object renewalTrace = call(portal, "renew", member, "UML");
        assertSnapshot(snapshots.get(1), values("member id", call(loan, "memberId"), "due day", call(loan, "dueDay"),
                "renewed", call(loan, "renewed"), "trace", trace(renewalTrace)));
        Object requested = call(portal, "borrow", staff, "Java", true), staffLoan = call(requested, "loan");
        assertSnapshot(snapshots.get(2), values("member id", call(staffLoan, "memberId"), "librarian", call(staff, "librarian"),
                "active loan", call(staffLoan, "active"), "receipt", call(requested, "receipt"), "trace", trace(call(requested, "trace"))));
        String rejection = rejected(() -> call(portal, "recordReturn", member, "UML"), IllegalArgumentException.class,
                "Librarian role required").getMessage();
        assertSnapshot(snapshots.get(3), values("rejection", rejection, "active loan", call(loan, "active"), "due day", call(loan, "dueDay")));
        Object returnTrace = call(portal, "recordReturn", staff, "UML");
        assertSnapshot(snapshots.get(4), values("active loan", call(loan, "active"), "other loan active", call(staffLoan, "active"),
                "trace", trace(returnTrace)));
        String inactive = rejected(() -> call(portal, "borrow", member("M2", false, false), "UML", true),
                IllegalStateException.class, "Membership inactive").getMessage();
        assertSnapshot(snapshots.get(5), values("rejection", inactive, "returned loan still stored", loan == call(portal, "loan", "UML"),
                "active loan", call(loan, "active"), "other loan active", call(staffLoan, "active")));
    }

    private String trace(Object value) { return String.join(" → ", ((List<?>) value).stream().map(Object::toString).toList()); }

    private Map<String, Object> values(Object... pairs) {
        var values = new LinkedHashMap<String, Object>();
        for (int i = 0; i < pairs.length; i += 2) values.put((String) pairs[i], pairs[i + 1]);
        return values;
    }

    private void assertSnapshot(JsonNode snapshot, Map<String, Object> actual) {
        assertEquals(1, snapshot.get("items").size());
        var fields = JSON.createObjectNode();
        for (JsonNode field : snapshot.get("items").get(0).get("fields")) {
            String name = field.get("name").asText();
            assertFalse(fields.has(name), "duplicate scalar field");
            assertTrue(field.get("value").isValueNode(), "recorded values must be scalar");
            fields.set(name, field.get("value"));
        }
        assertEquals(JSON.valueToTree(actual), fields, snapshot.get("title").asText());
    }

    @Test
    void demoOutputMatchesTheDisplayedFixtureExactly() throws Exception {
        var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classes.toString(), PACKAGE + "UseCaseDemo").redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(10, TimeUnit.SECONDS));
            String actual = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), actual);
            assertEquals(Files.readString(EXAMPLES.resolve("use-case-diagram-output.txt")).replace("\r\n", "\n"),
                    actual.replace("\r\n", "\n"));
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }
}
