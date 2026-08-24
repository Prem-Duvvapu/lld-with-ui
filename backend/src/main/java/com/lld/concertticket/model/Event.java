package com.lld.concertticket.model;

import com.lld.concertticket.enums.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A concert. Venue name/location are denormalized onto the event (the same convention
 * {@code movieticket.Show} uses for its screen name) so a seat-map or booking response
 * doesn't need a second lookup just to render "Wembley Arena, London".
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    private long id;
    private String artist;
    private String title;
    private long venueId;
    private String venueName;
    private String venueLocation;
    private LocalDateTime dateTime;
    private EventStatus status;
}
