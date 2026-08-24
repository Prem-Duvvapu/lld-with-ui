package com.lld.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the error contract against the way it broke the first time: someone adds
 * a domain exception, forgets the status annotation, and it silently becomes a 500
 * with the message stripped. This scans the real classpath, so a new exception is
 * caught by the build rather than by a user.
 */
class DomainExceptionContractTest {

    /** Module base classes carry the hierarchy, not a status of their own. */
    private static final Set<String> BASES = Set.of(
            "AirlineException",
            "CarRentalException",
            "ConcertTicketException",
            "CourseRegistrationException",
            "HotelException",
            "LibraryException",
            "LinkedInException",
            "RestaurantException",
            "StackOverflowException",
            "StockBrokerException",
            "UberException",
            "ZomatoException"
    );

    private static List<Class<?>> allDomainExceptions() {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(DomainException.class));

        List<Class<?>> found = new ArrayList<>();
        for (var candidate : scanner.findCandidateComponents("com.lld")) {
            try {
                found.add(Class.forName(candidate.getBeanClassName()));
            } catch (ClassNotFoundException e) {
                fail("could not load " + candidate.getBeanClassName());
            }
        }
        return found;
    }

    @Test
    @DisplayName("the scan actually finds the hierarchy")
    void scanFindsExceptions() {
        List<Class<?>> found = allDomainExceptions();
        assertTrue(found.size() >= 27,
                "expected at least 27 domain exceptions, found " + found.size() + ": " + found);
    }

    @Test
    @DisplayName("every concrete domain exception except a module base declares a status")
    void everyConcreteExceptionDeclaresAStatus() {
        List<String> unannotated = new ArrayList<>();
        for (Class<?> type : allDomainExceptions()) {
            if (BASES.contains(type.getSimpleName())) continue;
            if (AnnotationUtils.findAnnotation(type, ResponseStatus.class) == null) {
                unannotated.add(type.getName());
            }
        }
        assertEquals(List.of(), unannotated,
                "these would return HTTP 500 with no message — add @ResponseStatus");
    }

    @Test
    @DisplayName("no domain exception is mapped to a 5xx")
    void noneMapToServerError() {
        List<String> serverErrors = new ArrayList<>();
        for (Class<?> type : allDomainExceptions()) {
            ResponseStatus annotation = AnnotationUtils.findAnnotation(type, ResponseStatus.class);
            if (annotation != null && annotation.value().is5xxServerError()) {
                serverErrors.add(type.getSimpleName() + " -> " + annotation.value());
            }
        }
        // A domain rule violation is the caller's fault. A 5xx here means either the
        // mapping is wrong or the failure is not really a domain exception.
        assertEquals(List.of(), serverErrors);
    }

    @Test
    @DisplayName("module bases stay concrete and constructible, so subclasses keep working")
    void basesRemainUsable() {
        for (Class<?> type : allDomainExceptions()) {
            if (!BASES.contains(type.getSimpleName())) continue;
            assertFalse(java.lang.reflect.Modifier.isAbstract(type.getModifiers()),
                    type.getSimpleName() + " is thrown directly in places, so it must stay concrete");
        }
    }
}
