import { apiFetch } from '../../utils/api';

// ---- Live Course Registration Endpoints ----

export function getCourses() {
  return apiFetch('/course-registration/courses');
}

export function getCourse(courseId) {
  return apiFetch(`/course-registration/courses/${courseId}`);
}

export function getSectionsByCourse(courseId) {
  return apiFetch(`/course-registration/courses/${courseId}/sections`);
}

export function getSections() {
  return apiFetch('/course-registration/sections');
}

export function getSection(sectionId) {
  return apiFetch(`/course-registration/sections/${sectionId}`);
}

export function getStudents() {
  return apiFetch('/course-registration/students');
}

export function getStudent(studentId) {
  return apiFetch(`/course-registration/students/${studentId}`);
}

export function getStudentRegistrations(studentId) {
  return apiFetch(`/course-registration/students/${studentId}/registrations`);
}

export function register(studentId, sectionId) {
  return apiFetch('/course-registration/register', {
    method: 'POST',
    body: JSON.stringify({ studentId, sectionId }),
  });
}

export function dropRegistration(registrationId) {
  return apiFetch('/course-registration/drop', {
    method: 'POST',
    body: JSON.stringify({ registrationId }),
  });
}

// ---- Isolated Simulation Endpoints (/sim/*) ----

export function simReset() {
  return apiFetch('/course-registration/sim/reset', { method: 'POST' });
}

export function simState() {
  return apiFetch('/course-registration/sim/state');
}

export function simEvents() {
  return apiFetch('/course-registration/sim/events');
}

export function simRegister(studentId, sectionId) {
  return apiFetch('/course-registration/sim/register', {
    method: 'POST',
    body: JSON.stringify({ studentId, sectionId }),
  });
}

export function simDrop(registrationId) {
  return apiFetch('/course-registration/sim/drop', {
    method: 'POST',
    body: JSON.stringify({ registrationId }),
  });
}

export function simRace(sectionId, studentIds) {
  return apiFetch('/course-registration/sim/race', {
    method: 'POST',
    body: JSON.stringify({ sectionId, studentIds }),
  });
}
