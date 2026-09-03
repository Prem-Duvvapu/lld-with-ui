package com.lld.meetingscheduler.config;

import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.repository.MeetingSchedulerRepository;
import com.lld.meetingscheduler.service.MeetingSchedulerService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Component
public class MeetingSchedulerInitializer {

    private final MeetingSchedulerRepository repository;
    private final MeetingSchedulerService service;

    public MeetingSchedulerInitializer(MeetingSchedulerRepository repository, MeetingSchedulerService service) {
        this.repository = repository;
        this.service = service;
    }

    @PostConstruct
    public void init() {
        MeetingRoom falcon = repository.saveRoom(MeetingRoom.builder()
                .id(repository.generateRoomId()).name("Falcon").capacity(8).location("3rd Floor, West Wing").build());
        MeetingRoom griffin = repository.saveRoom(MeetingRoom.builder()
                .id(repository.generateRoomId()).name("Griffin").capacity(4).location("3rd Floor, East Wing").build());
        repository.saveRoom(MeetingRoom.builder()
                .id(repository.generateRoomId()).name("Phoenix").capacity(12).location("4th Floor, Boardroom").build());

        // A couple of demo meetings, booked through the real service (not written straight into
        // the repository) so first load exercises the same conflict-checking path a real client
        // would, exactly like CarRentalInitializer's seed reservations.
        LocalDate today = LocalDate.now().plusDays(1);
        service.bookMeeting(falcon.getId(), "alice@example.com", List.of("bob@example.com"),
                "Sprint Planning",
                LocalDateTime.of(today, LocalTime.of(10, 0)),
                LocalDateTime.of(today, LocalTime.of(11, 0)));
        service.bookMeeting(griffin.getId(), "carol@example.com", List.of("dave@example.com", "bob@example.com"),
                "1:1 Sync",
                LocalDateTime.of(today, LocalTime.of(14, 0)),
                LocalDateTime.of(today, LocalTime.of(14, 30)));
    }
}
