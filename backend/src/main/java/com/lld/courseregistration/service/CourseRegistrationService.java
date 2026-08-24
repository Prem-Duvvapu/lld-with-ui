package com.lld.courseregistration.service;

import com.lld.courseregistration.exception.CourseNotFoundException;
import com.lld.courseregistration.exception.InvalidDropException;
import com.lld.courseregistration.exception.PrerequisiteNotMetException;
import com.lld.courseregistration.exception.RegistrationNotFoundException;
import com.lld.courseregistration.exception.ScheduleConflictException;
import com.lld.courseregistration.exception.SectionNotFoundException;
import com.lld.courseregistration.exception.StudentNotFoundException;
import com.lld.courseregistration.model.Course;
import com.lld.courseregistration.model.Registration;
import com.lld.courseregistration.model.RegistrationStatus;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.model.SimEvent;
import com.lld.courseregistration.model.Student;
import com.lld.courseregistration.model.TimeSlot;
import com.lld.courseregistration.repository.CourseRegistrationRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Facade over the whole module: catalog lookups, prerequisite and schedule-conflict validation,
 * and delegation to {@link SectionCapacityManager} for the concurrency-critical part (capacity
 * counting + waitlist promotion). Everything a controller needs goes through here — no business
 * rule lives in the controller or the frontend.
 */
@Service
public class CourseRegistrationService {

    private final CourseRegistrationRepository repository;
    private final SectionCapacityManager capacityManager;

    // Isolated Simulation Engine — separate repository + lock manager so the demo sandbox can
    // never corrupt the live catalog/registrations above.
    private final CourseRegistrationRepository simRepository = new CourseRegistrationRepository();
    private final SectionCapacityManager simCapacityManager = new SectionCapacityManager(simRepository);
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public CourseRegistrationService(CourseRegistrationRepository repository, SectionCapacityManager capacityManager) {
        this.repository = repository;
        this.capacityManager = capacityManager;
        simSeed();
    }

    // =========================================================================
    // CATALOG READS
    // =========================================================================

    public List<Course> getAllCourses() {
        return repository.getAllCourses();
    }

    public Course getCourse(String courseId) {
        Course course = repository.getCourse(courseId);
        if (course == null) throw new CourseNotFoundException("Course not found: " + courseId);
        return course;
    }

    public List<Section> getSectionsByCourse(String courseId) {
        getCourse(courseId); // 404s if the course itself doesn't exist
        return repository.getSectionsByCourse(courseId);
    }

    public List<Section> getAllSections() {
        return repository.getAllSections();
    }

    public Section getSection(String sectionId) {
        Section section = repository.getSection(sectionId);
        if (section == null) throw new SectionNotFoundException("Section not found: " + sectionId);
        return section;
    }

    public List<Student> getAllStudents() {
        return repository.getAllStudents();
    }

    public Student getStudent(String studentId) {
        Student student = repository.getStudent(studentId);
        if (student == null) throw new StudentNotFoundException("Student not found: " + studentId);
        return student;
    }

    public List<Registration> getStudentRegistrations(String studentId) {
        getStudent(studentId);
        return repository.getRegistrationsByStudent(studentId);
    }

    public List<Registration> getSectionRegistrations(String sectionId) {
        getSection(sectionId);
        return repository.getRegistrationsBySection(sectionId);
    }

    // =========================================================================
    // REGISTRATION WORKFLOW
    // =========================================================================

    /**
     * Registers a student for a section: prerequisite check, schedule-conflict check against the
     * student's other ENROLLED sections, then an atomic capacity-checked enroll-or-waitlist via
     * {@link SectionCapacityManager}.
     */
    public Registration register(String studentId, String sectionId) {
        return doRegister(repository, capacityManager, studentId, sectionId);
    }

    /**
     * Shared validation + enroll-or-waitlist path, parameterised over which repository/lock
     * manager pair to use so the isolated sim engine below runs through the exact same
     * prerequisite, schedule-conflict and capacity logic as the live endpoints — not a
     * simplified stand-in.
     */
    private Registration doRegister(CourseRegistrationRepository repo, SectionCapacityManager mgr,
                                     String studentId, String sectionId) {
        Student student = repo.getStudent(studentId);
        if (student == null) throw new StudentNotFoundException("Student not found: " + studentId);
        Section section = repo.getSection(sectionId);
        if (section == null) throw new SectionNotFoundException("Section not found: " + sectionId);
        Course course = repo.getCourse(section.getCourseId());
        if (course == null) throw new CourseNotFoundException("Course not found: " + section.getCourseId());

        checkPrerequisites(student, course);
        checkScheduleConflict(repo, student, section);

        return mgr.register(section, studentId);
    }

    private void checkPrerequisites(Student student, Course course) {
        List<String> missing = new ArrayList<>();
        for (String prereqCode : course.getPrerequisiteCourseCodes()) {
            if (!student.getCompletedCourseCodes().contains(prereqCode)) {
                missing.add(prereqCode);
            }
        }
        if (!missing.isEmpty()) {
            throw new PrerequisiteNotMetException(
                    "Student " + student.getId() + " is missing prerequisite(s) " + missing
                            + " for course " + course.getCode());
        }
    }

    private void checkScheduleConflict(CourseRegistrationRepository repo, Student student, Section target) {
        List<Section> currentlyEnrolled = repo.getEnrolledSectionsForStudent(student.getId());
        for (Section enrolled : currentlyEnrolled) {
            if (enrolled.getId().equals(target.getId())) continue;
            TimeSlot mine = enrolled.getTimeSlot();
            TimeSlot theirs = target.getTimeSlot();
            if (mine != null && theirs != null && mine.conflictsWith(theirs)) {
                throw new ScheduleConflictException(
                        "Section " + target.getId() + " (" + theirs + ") conflicts with already-enrolled section "
                                + enrolled.getId() + " (" + mine + ")");
            }
        }
    }

    public static class DropOutcome {
        public final Registration dropped;
        public final Registration promoted;

        public DropOutcome(Registration dropped, Registration promoted) {
            this.dropped = dropped;
            this.promoted = promoted;
        }
    }

    /** Drops a registration and, if it freed a confirmed seat, promotes the next waitlisted student. */
    public DropOutcome drop(String registrationId) {
        Registration registration = repository.getRegistration(registrationId);
        if (registration == null) throw new RegistrationNotFoundException("Registration not found: " + registrationId);
        if (registration.getStatus() != RegistrationStatus.ENROLLED && registration.getStatus() != RegistrationStatus.WAITLISTED) {
            throw new InvalidDropException("Registration " + registrationId + " is already " + registration.getStatus() + " and cannot be dropped.");
        }

        Section section = getSection(registration.getSectionId());
        Optional<Registration> promoted = capacityManager.drop(section, registration);
        return new DropOutcome(registration, promoted.orElse(null));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/course-registration/sim/*)
    // =========================================================================

    public synchronized void simReset() {
        simEventLog.clear();
        simSeed();
        logSimEvent("SIM_RESET", "System", "Simulation sandbox reset — CS201-A has 3 seats and 6 students ready to race for them.", null);
    }

    private void simSeed() {
        simRepository.clear();

        Course cs201 = simRepository.saveCourse(Course.builder()
                .id("SIM-CS201").code("CS201").title("Data Structures").credits(4)
                .department("CS").prerequisiteCourseCodes(List.of()).build());
        Course cs301 = simRepository.saveCourse(Course.builder()
                .id("SIM-CS301").code("CS301").title("Algorithms").credits(4)
                .department("CS").prerequisiteCourseCodes(List.of("CS201")).build());
        Course math101 = simRepository.saveCourse(Course.builder()
                .id("SIM-MATH101").code("MATH101").title("Calculus I").credits(3)
                .department("MATH").prerequisiteCourseCodes(List.of()).build());

        // Capacity 3, contested by 6 students in the race step — the core "N racers, one seat" demo.
        simRepository.saveSection(Section.builder()
                .id("SIM-CS201-A").courseId(cs201.getId()).sectionCode("A")
                .professorName("Dr. Sim").capacity(3).enrolledCount(0)
                .timeSlot(TimeSlot.builder()
                        .days(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY))
                        .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0)).room("SIM-101")
                        .build())
                .semester("SIM-TERM").build());
        // No sim student has completed CS201 — registering here always trips PrerequisiteNotMetException.
        simRepository.saveSection(Section.builder()
                .id("SIM-CS301-A").courseId(cs301.getId()).sectionCode("A")
                .professorName("Dr. Sim").capacity(10).enrolledCount(0)
                .timeSlot(TimeSlot.builder()
                        .days(EnumSet.of(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY))
                        .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0)).room("SIM-201")
                        .build())
                .semester("SIM-TERM").build());
        // Overlaps CS201-A (Mon/Wed 09:00-10:00): 09:30 < 10:00 and 09:00 < 10:15 — a student
        // already enrolled in CS201-A always trips ScheduleConflictException registering here.
        simRepository.saveSection(Section.builder()
                .id("SIM-MATH101-A").courseId(math101.getId()).sectionCode("A")
                .professorName("Dr. Sim").capacity(10).enrolledCount(0)
                .timeSlot(TimeSlot.builder()
                        .days(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY))
                        .startTime(LocalTime.of(9, 30)).endTime(LocalTime.of(10, 15)).room("SIM-301")
                        .build())
                .semester("SIM-TERM").build());

        for (int i = 1; i <= 6; i++) {
            String id = "sim-s" + i;
            simRepository.saveStudent(Student.builder().id(id).name("Student " + i).email(id + "@sim.edu")
                    .department("CS").completedCourseCodes(new java.util.HashSet<>()).build());
        }
    }

    public synchronized Map<String, Object> simState() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("courses", simRepository.getAllCourses());
        state.put("sections", simRepository.getAllSections());
        state.put("students", simRepository.getAllStudents());
        state.put("registrations", simRepository.getAllSections().stream()
                .flatMap(s -> simRepository.getRegistrationsBySection(s.getId()).stream()).toList());
        return state;
    }

    public List<SimEvent> simGetEvents() {
        return new ArrayList<>(simEventLog);
    }

    public synchronized Map<String, Object> simRegister(String studentId, String sectionId) {
        try {
            Registration reg = doRegister(simRepository, simCapacityManager, studentId, sectionId);
            Section section = simRepository.getSection(sectionId);
            if (reg.getStatus() == RegistrationStatus.ENROLLED) {
                logSimEvent("REGISTER_ENROLLED", studentId,
                        studentId + " enrolled in " + sectionId + " (" + section.getEnrolledCount() + "/" + section.getCapacity() + ").",
                        Map.of("sectionId", sectionId, "registrationId", reg.getId()));
            } else {
                logSimEvent("REGISTER_WAITLISTED", studentId,
                        studentId + " waitlisted for " + sectionId + " at position " + reg.getWaitlistPosition() + ".",
                        Map.of("sectionId", sectionId, "registrationId", reg.getId(), "position", reg.getWaitlistPosition()));
            }
        } catch (Exception e) {
            logSimEvent("REGISTER_FAILED", studentId, studentId + " registration for " + sectionId + " failed: " + e.getMessage(), null);
        }
        return simState();
    }

    /**
     * Fires {@code studentIds.size()} concurrent registration attempts at one section — the live
     * illustration of the race {@link SectionCapacityManager} closes. All threads block on one
     * {@link java.util.concurrent.CountDownLatch} so they hit the lock as close to simultaneously
     * as the JVM scheduler allows, then the per-section lock serialises them one at a time.
     */
    public synchronized Map<String, Object> simRace(String sectionId, List<String> studentIds) {
        Section section = simRepository.getSection(sectionId);
        if (section == null) throw new SectionNotFoundException("Sim section not found: " + sectionId);

        int n = studentIds.size();
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(Math.max(1, n));
        java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.CountDownLatch doneLatch = new java.util.concurrent.CountDownLatch(n);
        List<Map<String, Object>> results = java.util.Collections.synchronizedList(new ArrayList<>());

        for (String studentId : studentIds) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    Registration reg = doRegister(simRepository, simCapacityManager, studentId, sectionId);
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("studentId", studentId);
                    r.put("outcome", reg.getStatus().name());
                    r.put("registrationId", reg.getId());
                    r.put("waitlistPosition", reg.getWaitlistPosition());
                    results.add(r);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("studentId", studentId);
                    r.put("outcome", "REJECTED");
                    r.put("error", e.getMessage());
                    results.add(r);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        try {
            doneLatch.await(5, java.util.concurrent.TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        pool.shutdown();

        results.sort(java.util.Comparator.comparing(r -> (String) r.get("studentId")));
        long enrolled = results.stream().filter(r -> "ENROLLED".equals(r.get("outcome"))).count();
        long waitlisted = results.stream().filter(r -> "WAITLISTED".equals(r.get("outcome"))).count();

        logSimEvent("RACE", "System",
                n + " students raced for " + section.getEnrolledCount() + "-would-be seats in " + sectionId
                        + " (capacity " + section.getCapacity() + "): " + enrolled + " ENROLLED, " + waitlisted + " WAITLISTED.",
                Map.of("sectionId", sectionId, "attempts", n));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("sectionId", sectionId);
        summary.put("attempts", n);
        summary.put("enrolled", enrolled);
        summary.put("waitlisted", waitlisted);
        summary.put("results", results);
        summary.put("state", simState());
        return summary;
    }

    public synchronized Map<String, Object> simDrop(String registrationId) {
        Registration registration = simRepository.getRegistration(registrationId);
        if (registration == null) {
            logSimEvent("DROP_FAILED", "System", "Sim registration not found: " + registrationId, null);
            return simState();
        }
        Section section = simRepository.getSection(registration.getSectionId());
        Optional<Registration> promoted = simCapacityManager.drop(section, registration);
        logSimEvent("DROPPED", registration.getStudentId(),
                registration.getStudentId() + " dropped " + registration.getSectionId() + ".",
                Map.of("registrationId", registrationId));
        promoted.ifPresent(p -> logSimEvent("PROMOTED", p.getStudentId(),
                p.getStudentId() + " promoted from waitlist to ENROLLED in " + p.getSectionId() + ".",
                Map.of("registrationId", p.getId())));
        return simState();
    }

    private void logSimEvent(String type, String actor, String message, Map<String, Object> data) {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        simEventLog.add(new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, message, data));
    }
}
