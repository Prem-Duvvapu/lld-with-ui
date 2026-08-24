package com.lld.courseregistration.repository;

import com.lld.courseregistration.model.Course;
import com.lld.courseregistration.model.Registration;
import com.lld.courseregistration.model.RegistrationStatus;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.model.Student;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * In-memory storage. Plain {@link ConcurrentHashMap}s per entity — safe for independent reads and
 * writes of different keys, but NOT sufficient on its own to keep a section's enrolled count under
 * its capacity; that invariant is {@link com.lld.courseregistration.service.SectionCapacityManager}'s
 * job via a per-section lock around the whole check-then-act sequence.
 *
 * <p>{@link #activeRegistrationIndex} maps {@code studentId|sectionId -> registrationId} for every
 * registration currently ENROLLED or WAITLISTED. It exists so "is this student already registered
 * for this section" and "find the waitlisted registration to promote on drop" are O(1) instead of
 * a scan, and so a duplicate registration is rejected without walking every registration a student
 * has ever made.
 */
@Repository
public class CourseRegistrationRepository {

    private final Map<String, Course> courses = new ConcurrentHashMap<>();
    private final Map<String, Section> sections = new ConcurrentHashMap<>();
    private final Map<String, Student> students = new ConcurrentHashMap<>();
    private final Map<String, Registration> registrations = new ConcurrentHashMap<>();
    private final Map<String, String> activeRegistrationIndex = new ConcurrentHashMap<>();

    private final AtomicLong registrationIdGen = new AtomicLong(1);

    // --- Courses ---
    public Course saveCourse(Course course) {
        courses.put(course.getId(), course);
        return course;
    }

    public Course getCourse(String id) {
        return courses.get(id);
    }

    public List<Course> getAllCourses() {
        return new ArrayList<>(courses.values());
    }

    // --- Sections ---
    public Section saveSection(Section section) {
        sections.put(section.getId(), section);
        return section;
    }

    public Section getSection(String id) {
        return sections.get(id);
    }

    public List<Section> getAllSections() {
        return new ArrayList<>(sections.values());
    }

    public List<Section> getSectionsByCourse(String courseId) {
        return sections.values().stream()
                .filter(s -> s.getCourseId().equals(courseId))
                .collect(Collectors.toList());
    }

    // --- Students ---
    public Student saveStudent(Student student) {
        students.put(student.getId(), student);
        return student;
    }

    public Student getStudent(String id) {
        return students.get(id);
    }

    public List<Student> getAllStudents() {
        return new ArrayList<>(students.values());
    }

    // --- Registrations ---
    public String nextRegistrationId() {
        return "REG-" + String.format("%05d", registrationIdGen.getAndIncrement());
    }

    public Registration saveRegistration(Registration registration) {
        registrations.put(registration.getId(), registration);
        return registration;
    }

    public Registration getRegistration(String id) {
        return registrations.get(id);
    }

    public List<Registration> getRegistrationsByStudent(String studentId) {
        return registrations.values().stream()
                .filter(r -> r.getStudentId().equals(studentId))
                .collect(Collectors.toList());
    }

    public List<Registration> getRegistrationsBySection(String sectionId) {
        return registrations.values().stream()
                .filter(r -> r.getSectionId().equals(sectionId))
                .collect(Collectors.toList());
    }

    /** Every ENROLLED section a student currently holds a seat in — the schedule-conflict check's input. */
    public List<Section> getEnrolledSectionsForStudent(String studentId) {
        return registrations.values().stream()
                .filter(r -> r.getStudentId().equals(studentId) && r.getStatus() == RegistrationStatus.ENROLLED)
                .map(r -> sections.get(r.getSectionId()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    private String activeKey(String studentId, String sectionId) {
        return studentId + "|" + sectionId;
    }

    public Registration getActiveRegistration(String studentId, String sectionId) {
        String regId = activeRegistrationIndex.get(activeKey(studentId, sectionId));
        return regId == null ? null : registrations.get(regId);
    }

    public void indexActive(Registration registration) {
        activeRegistrationIndex.put(activeKey(registration.getStudentId(), registration.getSectionId()), registration.getId());
    }

    public void unindexActive(Registration registration) {
        activeRegistrationIndex.remove(activeKey(registration.getStudentId(), registration.getSectionId()));
    }

    /** Wipes all state. Used only by the isolated sim sandbox's reset. */
    public void clear() {
        courses.clear();
        sections.clear();
        students.clear();
        registrations.clear();
        activeRegistrationIndex.clear();
        registrationIdGen.set(1);
    }
}
