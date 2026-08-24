package com.lld.concertticket.config;

import com.lld.concertticket.enums.EventStatus;
import com.lld.concertticket.enums.SeatStatus;
import com.lld.concertticket.enums.SeatType;
import com.lld.concertticket.model.*;
import com.lld.concertticket.repository.ConcertTicketRepository;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds the same demo world for both the live repository ({@code ConcertTicketInitializer})
 * and the isolated {@code /sim/*} sandbox ({@code ConcertTicketService}'s simRepository) —
 * one seeding routine, two independent {@code ConcertTicketRepository} instances, so demo
 * traffic can never corrupt real data.
 */
public final class ConcertTicketSeedData {

    private ConcertTicketSeedData() {
    }

    public static void seed(ConcertTicketRepository repo) {
        repo.clear();

        repo.saveUser(new User("user1", "Alice", "alice@example.com"));
        repo.saveUser(new User("user2", "Bob", "bob@example.com"));
        repo.saveUser(new User("user3", "Charlie", "charlie@example.com"));
        repo.saveUser(new User("user4", "Diana", "diana@example.com"));

        long wembleyId = repo.nextVenueId();
        Venue wembley = Venue.builder()
                .id(wembleyId)
                .name("Wembley Arena")
                .location("London, UK")
                .sections(List.of(
                        new Section(SeatType.VIP, 2, 6, 5000.0),
                        new Section(SeatType.GOLD, 3, 8, 3000.0),
                        new Section(SeatType.SILVER, 3, 8, 1500.0)
                ))
                .build();
        wembley.setCapacity(wembley.getSections().stream().mapToInt(Section::totalSeats).sum());
        repo.saveVenue(wembley);

        long msgId = repo.nextVenueId();
        Venue msg = Venue.builder()
                .id(msgId)
                .name("Madison Square Garden")
                .location("New York, USA")
                .sections(List.of(
                        new Section(SeatType.VIP, 2, 6, 6000.0),
                        new Section(SeatType.GOLD, 3, 8, 3500.0),
                        new Section(SeatType.GENERAL, 4, 10, 1200.0)
                ))
                .build();
        msg.setCapacity(msg.getSections().stream().mapToInt(Section::totalSeats).sum());
        repo.saveVenue(msg);

        LocalDateTime now = LocalDateTime.now();
        createEventWithSeats(repo, "The Weeknd", "After Hours Tour", wembley, now.plusDays(30));
        createEventWithSeats(repo, "Coldplay", "Music of the Spheres", msg, now.plusDays(45));
        createEventWithSeats(repo, "Arijit Singh", "Live in Concert", wembley, now.plusDays(5));
    }

    private static void createEventWithSeats(ConcertTicketRepository repo, String artist, String title,
                                               Venue venue, LocalDateTime dateTime) {
        long eventId = repo.nextEventId();
        Event event = Event.builder()
                .id(eventId)
                .artist(artist)
                .title(title)
                .venueId(venue.getId())
                .venueName(venue.getName())
                .venueLocation(venue.getLocation())
                .dateTime(dateTime)
                .status(EventStatus.SCHEDULED)
                .build();
        repo.saveEvent(event);

        Map<String, Seat> seats = new LinkedHashMap<>();
        for (Section section : venue.getSections()) {
            for (int r = 0; r < section.getRows(); r++) {
                char rowLetter = (char) ('A' + r);
                for (int n = 1; n <= section.getSeatsPerRow(); n++) {
                    String seatId = section.getSeatType().name() + "-" + rowLetter + "-" + n;
                    Seat seat = Seat.builder()
                            .id(seatId)
                            .eventId(eventId)
                            .seatType(section.getSeatType())
                            .row(String.valueOf(rowLetter))
                            .number(n)
                            .price(section.getPrice())
                            .status(SeatStatus.AVAILABLE)
                            .heldByUserId(null)
                            .holdExpiresAt(0L)
                            .version(1L)
                            .build();
                    seats.put(seatId, seat);
                }
            }
        }
        repo.putSeatsForEvent(eventId, seats);
    }
}
