package com.lld.courseregistration.controller;

import com.lld.courseregistration.model.Course;
import com.lld.courseregistration.model.Registration;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.model.SimEvent;
import com.lld.courseregistration.model.Student;
import com.lld.courseregistration.service.CourseRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/course-registration")
@CrossOrigin(origins = "*")
public class CourseRegistrationController {

    private final CourseRegistrationService service;

    public CourseRegistrationController(CourseRegistrationService service) {
        this.service = service;
    }

    // =========================================================================
    // LIVE ENDPOINTS
    // =========================================================================

    @GetMapping("/courses")
    public ResponseEntity<List<Course>> getCourses() {
        return ResponseEntity.ok(service.getAllCourses());
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<Course> getCourse(@PathVariable String courseId) {
        return ResponseEntity.ok(service.getCourse(courseId));
    }

    @GetMapping("/courses/{courseId}/sections")
    public ResponseEntity<List<Section>> getSectionsByCourse(@PathVariable String courseId) {
        return ResponseEntity.ok(service.getSectionsByCourse(courseId));
    }

    @GetMapping("/sections")
    public ResponseEntity<List<Section>> getSections() {
        return ResponseEntity.ok(service.getAllSections());
    }

    @GetMapping("/sections/{sectionId}")
    public ResponseEntity<Section> getSection(@PathVariable String sectionId) {
        return ResponseEntity.ok(service.getSection(sectionId));
    }

    @GetMapping("/sections/{sectionId}/registrations")
    public ResponseEntity<List<Registration>> getSectionRegistrations(@PathVariable String sectionId) {
        return ResponseEntity.ok(service.getSectionRegistrations(sectionId));
    }

    @GetMapping("/students")
    public ResponseEntity<List<Student>> getStudents() {
        return ResponseEntity.ok(service.getAllStudents());
    }

    @GetMapping("/students/{studentId}")
    public ResponseEntity<Student> getStudent(@PathVariable String studentId) {
        return ResponseEntity.ok(service.getStudent(studentId));
    }

    @GetMapping("/students/{studentId}/registrations")
    public ResponseEntity<List<Registration>> getStudentRegistrations(@PathVariable String studentId) {
        return ResponseEntity.ok(service.getStudentRegistrations(studentId));
    }

    @PostMapping("/register")
    public ResponseEntity<Registration> register(@RequestBody Map<String, Object> body) {
        String studentId = String.valueOf(body.get("studentId"));
        String sectionId = String.valueOf(body.get("sectionId"));
        return ResponseEntity.ok(service.register(studentId, sectionId));
    }

    @PostMapping("/drop")
    public ResponseEntity<Map<String, Object>> drop(@RequestBody Map<String, Object> body) {
        String registrationId = String.valueOf(body.get("registrationId"));
        CourseRegistrationService.DropOutcome outcome = service.drop(registrationId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("dropped", outcome.dropped);
        response.put("promoted", outcome.promoted);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/course-registration/sim/*)
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, String>> simReset() {
        service.simReset();
        return ResponseEntity.ok(Map.of("message", "Simulation sandbox reset."));
    }

    @GetMapping("/sim/state")
    public ResponseEntity<Map<String, Object>> simState() {
        return ResponseEntity.ok(service.simState());
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    @PostMapping("/sim/register")
    public ResponseEntity<Map<String, Object>> simRegister(@RequestBody Map<String, Object> body) {
        String studentId = String.valueOf(body.get("studentId"));
        String sectionId = String.valueOf(body.get("sectionId"));
        return ResponseEntity.ok(service.simRegister(studentId, sectionId));
    }

    @PostMapping("/sim/drop")
    public ResponseEntity<Map<String, Object>> simDrop(@RequestBody Map<String, Object> body) {
        String registrationId = String.valueOf(body.get("registrationId"));
        return ResponseEntity.ok(service.simDrop(registrationId));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/sim/race")
    public ResponseEntity<Map<String, Object>> simRace(@RequestBody Map<String, Object> body) {
        String sectionId = String.valueOf(body.get("sectionId"));
        List<String> studentIds = (List<String>) body.get("studentIds");
        return ResponseEntity.ok(service.simRace(sectionId, studentIds));
    }
}
