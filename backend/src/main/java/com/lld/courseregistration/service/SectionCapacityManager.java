package com.lld.courseregistration.service;

import com.lld.courseregistration.exception.AlreadyRegisteredException;
import com.lld.courseregistration.model.Registration;
import com.lld.courseregistration.model.RegistrationStatus;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.repository.CourseRegistrationRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Serialises every registration and drop for a given {@link Section} so its {@code enrolledCount}
 * can never exceed {@code capacity} under concurrent load, and so a drop's waitlist promotion can
 * never race a brand-new registration for the same freed seat.
 *
 * <p>This adapts the same shape as {@code airline.SeatLockManager} and {@code carrental.ReservationLockService}:
 * a per-entity {@link ReentrantLock} obtained via {@code computeIfAbsent}, with the read of current
 * state and the write of new state happening as one atomic unit inside {@code lock()}/{@code finally}.
 * The difference from a per-seat lock is what is being protected — not one boolean flag, but a
 * capacity <i>counter</i> plus a FIFO waitlist queue, so the critical section here re-checks
 * {@code enrolledCount < capacity} (the check-then-act this module is built to demonstrate) rather
 * than re-checking one seat's status.
 *
 * <p>The race this closes: two students call {@code register()} for the last open seat at the same
 * instant. Without the lock, both threads can read {@code enrolledCount == capacity - 1} before
 * either writes the increment, and both get ENROLLED — one seat, two occupants. With the lock, the
 * second thread's read of {@code enrolledCount} happens only after the first thread's increment and
 * unlock are visible, so it correctly sees the section as full and is placed on the waitlist instead
 * of being rejected outright.
 *
 * <p>Lock ordering: a single registration or drop only ever needs one section's lock, so only one
 * lock is ever held at a time here and no acquisition-order rule is required.
 */
@Component
public class SectionCapacityManager {

    private final CourseRegistrationRepository repository;
    // Fair locks so a popular section serves concurrent requesters in arrival order.
    private final Map<String, ReentrantLock> sectionLocks = new ConcurrentHashMap<>();

    public SectionCapacityManager(CourseRegistrationRepository repository) {
        this.repository = repository;
    }

    private ReentrantLock lockFor(String sectionId) {
        return sectionLocks.computeIfAbsent(sectionId, k -> new ReentrantLock(true));
    }

    /**
     * Atomically registers {@code studentId} into {@code section}: ENROLLED if a seat is free,
     * otherwise WAITLISTED. Duplicate-registration and capacity checks, the counter/waitlist
     * mutation, and the {@link Registration} persistence all happen under one lock acquisition so
     * no interleaving of two concurrent callers can ever double-book the last seat.
     *
     * @throws AlreadyRegisteredException the student already holds an active (ENROLLED or
     *                                     WAITLISTED) registration for this section
     */
    public Registration register(Section section, String studentId) {
        ReentrantLock lock = lockFor(section.getId());
        lock.lock();
        try {
            if (repository.getActiveRegistration(studentId, section.getId()) != null) {
                throw new AlreadyRegisteredException(
                        "Student " + studentId + " already has an active registration for section " + section.getId());
            }

            // Re-check capacity INSIDE the lock: anything read before acquiring it is stale by the
            // time we act on it. This is the check-then-act step a naive implementation gets wrong.
            RegistrationStatus status;
            Integer waitlistPosition = null;
            if (section.hasAvailableSeat()) {
                section.setEnrolledCount(section.getEnrolledCount() + 1);
                status = RegistrationStatus.ENROLLED;
            } else {
                section.getWaitlist().addLast(studentId);
                waitlistPosition = section.getWaitlist().size();
                status = RegistrationStatus.WAITLISTED;
            }
            repository.saveSection(section);

            Registration registration = Registration.builder()
                    .id(repository.nextRegistrationId())
                    .studentId(studentId)
                    .courseId(section.getCourseId())
                    .sectionId(section.getId())
                    .status(status)
                    .registeredAt(LocalDateTime.now())
                    .waitlistPosition(waitlistPosition)
                    .build();

            repository.saveRegistration(registration);
            repository.indexActive(registration);
            return registration;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Atomically drops {@code registration}. If it held a confirmed seat (ENROLLED), the seat is
     * released and — still under the same lock, so a concurrent {@link #register} cannot steal the
     * freed seat ahead of the queue — the next waitlisted student (if any) is promoted to ENROLLED.
     * If it was only WAITLISTED, the student is simply removed from the queue.
     *
     * @return the promoted {@link Registration}, or empty if nobody was waiting / the drop was from the waitlist
     */
    public Optional<Registration> drop(Section section, Registration registration) {
        ReentrantLock lock = lockFor(section.getId());
        lock.lock();
        try {
            RegistrationStatus previousStatus = registration.getStatus();

            registration.setStatus(RegistrationStatus.DROPPED);
            registration.setDroppedAt(LocalDateTime.now());
            repository.saveRegistration(registration);
            repository.unindexActive(registration);

            if (previousStatus == RegistrationStatus.WAITLISTED) {
                section.getWaitlist().remove(registration.getStudentId());
                repository.saveSection(section);
                return Optional.empty();
            }

            if (previousStatus != RegistrationStatus.ENROLLED) {
                // Already DROPPED/COMPLETED — nothing to release. Caller guards against this via
                // InvalidDropException before reaching here, but stay defensive.
                return Optional.empty();
            }

            section.setEnrolledCount(section.getEnrolledCount() - 1);

            String nextStudentId = section.getWaitlist().pollFirst();
            if (nextStudentId == null) {
                repository.saveSection(section);
                return Optional.empty();
            }

            Registration promoted = repository.getActiveRegistration(nextStudentId, section.getId());
            if (promoted == null) {
                // Defensive: waitlist entry without a matching active registration should not
                // happen, but do not leave a phantom queue slot occupying nothing.
                repository.saveSection(section);
                return Optional.empty();
            }

            promoted.setStatus(RegistrationStatus.ENROLLED);
            promoted.setWaitlistPosition(null);
            section.setEnrolledCount(section.getEnrolledCount() + 1);
            repository.saveRegistration(promoted);
            repository.saveSection(section);
            return Optional.of(promoted);
        } finally {
            lock.unlock();
        }
    }
}
