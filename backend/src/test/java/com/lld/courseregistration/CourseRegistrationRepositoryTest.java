package com.lld.courseregistration;

import com.lld.courseregistration.model.Course;
import com.lld.courseregistration.model.Registration;
import com.lld.courseregistration.model.RegistrationStatus;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.model.Student;
import com.lld.courseregistration.model.TimeSlot;
import com.lld.courseregistration.repository.CourseRegistrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Course Registration Repository — Storage, Indexing, Filtering")
class CourseRegistrationRepositoryTest {

    private CourseRegistrationRepository repository;

    @BeforeEach
    void setUp() {
        repository = new CourseRegistrationRepository();
    }

    private Section section(String id, String courseId, DayOfWeek day) {
        return Section.builder().id(id).courseId(courseId).sectionCode("A").professorName("Dr. Test")
                .capacity(5).enrolledCount(0)
                .timeSlot(TimeSlot.builder().days(EnumSet.of(day)).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0)).room("R1").build())
                .semester("TERM").build();
    }

    @Test
    @DisplayName("Saved courses/sections/students round-trip by id")
    void savesAndRetrievesEntities() {
        Course course = repository.saveCourse(Course.builder().id("C1").code("C1").title("T").description("d")
                .credits(3).department("CS").prerequisiteCourseCodes(List.of()).build());
        Section sec = repository.saveSection(section("SEC-1", "C1", DayOfWeek.MONDAY));
        Student student = repository.saveStudent(Student.builder().id("S1").name("Alice").email("a@test.com")
                .department("CS").completedCourseCodes(new HashSet<>()).build());

        assertEquals(course, repository.getCourse("C1"));
        assertEquals(sec, repository.getSection("SEC-1"));
        assertEquals(student, repository.getStudent("S1"));
        assertNull(repository.getCourse("GHOST"));
    }

    @Test
    @DisplayName("getSectionsByCourse only returns sections for that course")
    void getSectionsByCourseFilters() {
        repository.saveSection(section("SEC-1", "C1", DayOfWeek.MONDAY));
        repository.saveSection(section("SEC-2", "C1", DayOfWeek.TUESDAY));
        repository.saveSection(section("SEC-3", "C2", DayOfWeek.MONDAY));

        List<Section> forC1 = repository.getSectionsByCourse("C1");
        assertEquals(2, forC1.size());
        assertTrue(forC1.stream().allMatch(s -> s.getCourseId().equals("C1")));
    }

    @Test
    @DisplayName("nextRegistrationId hands out unique, monotonically distinguishable ids")
    void nextRegistrationIdIsUnique() {
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            assertTrue(ids.add(repository.nextRegistrationId()), "duplicate registration id generated");
        }
    }

    @Test
    @DisplayName("Active registration index finds the registration by (student, section) and clears on unindex")
    void activeRegistrationIndexRoundTrips() {
        Registration reg = Registration.builder().id("REG-1").studentId("S1").courseId("C1").sectionId("SEC-1")
                .status(RegistrationStatus.ENROLLED).registeredAt(LocalDateTime.now()).build();
        repository.saveRegistration(reg);
        repository.indexActive(reg);

        assertEquals(reg, repository.getActiveRegistration("S1", "SEC-1"));
        assertNull(repository.getActiveRegistration("S1", "SEC-OTHER"));

        repository.unindexActive(reg);
        assertNull(repository.getActiveRegistration("S1", "SEC-1"), "unindex must remove the lookup entry");
    }

    @Test
    @DisplayName("getEnrolledSectionsForStudent only returns sections from ENROLLED registrations, not WAITLISTED/DROPPED")
    void getEnrolledSectionsForStudentFiltersByStatus() {
        repository.saveSection(section("SEC-1", "C1", DayOfWeek.MONDAY));
        repository.saveSection(section("SEC-2", "C1", DayOfWeek.TUESDAY));
        repository.saveSection(section("SEC-3", "C1", DayOfWeek.WEDNESDAY));

        repository.saveRegistration(Registration.builder().id("R1").studentId("S1").courseId("C1").sectionId("SEC-1")
                .status(RegistrationStatus.ENROLLED).registeredAt(LocalDateTime.now()).build());
        repository.saveRegistration(Registration.builder().id("R2").studentId("S1").courseId("C1").sectionId("SEC-2")
                .status(RegistrationStatus.WAITLISTED).registeredAt(LocalDateTime.now()).build());
        repository.saveRegistration(Registration.builder().id("R3").studentId("S1").courseId("C1").sectionId("SEC-3")
                .status(RegistrationStatus.DROPPED).registeredAt(LocalDateTime.now()).build());

        List<Section> enrolled = repository.getEnrolledSectionsForStudent("S1");
        assertEquals(1, enrolled.size());
        assertEquals("SEC-1", enrolled.get(0).getId());
    }

    @Test
    @DisplayName("getRegistrationsByStudent returns every registration regardless of status")
    void getRegistrationsByStudentReturnsAll() {
        repository.saveRegistration(Registration.builder().id("R1").studentId("S1").courseId("C1").sectionId("SEC-1")
                .status(RegistrationStatus.ENROLLED).registeredAt(LocalDateTime.now()).build());
        repository.saveRegistration(Registration.builder().id("R2").studentId("S1").courseId("C1").sectionId("SEC-2")
                .status(RegistrationStatus.DROPPED).registeredAt(LocalDateTime.now()).build());
        repository.saveRegistration(Registration.builder().id("R3").studentId("S2").courseId("C1").sectionId("SEC-1")
                .status(RegistrationStatus.ENROLLED).registeredAt(LocalDateTime.now()).build());

        assertEquals(2, repository.getRegistrationsByStudent("S1").size());
        assertEquals(1, repository.getRegistrationsByStudent("S2").size());
    }

    @Test
    @DisplayName("clear() wipes every map and resets the id generator")
    void clearWipesEverything() {
        repository.saveCourse(Course.builder().id("C1").code("C1").title("T").description("d")
                .credits(3).department("CS").prerequisiteCourseCodes(List.of()).build());
        repository.saveSection(section("SEC-1", "C1", DayOfWeek.MONDAY));
        repository.saveStudent(Student.builder().id("S1").name("Alice").email("a@test.com")
                .department("CS").completedCourseCodes(new HashSet<>()).build());
        Registration reg = Registration.builder().id("R1").studentId("S1").courseId("C1").sectionId("SEC-1")
                .status(RegistrationStatus.ENROLLED).registeredAt(LocalDateTime.now()).build();
        repository.saveRegistration(reg);
        repository.indexActive(reg);
        String firstId = repository.nextRegistrationId();

        repository.clear();

        assertTrue(repository.getAllCourses().isEmpty());
        assertTrue(repository.getAllSections().isEmpty());
        assertTrue(repository.getAllStudents().isEmpty());
        assertNull(repository.getActiveRegistration("S1", "SEC-1"));
        assertEquals(firstId, repository.nextRegistrationId(), "id generator must reset after clear()");
    }
}
