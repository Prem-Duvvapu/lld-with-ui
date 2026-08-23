package com.lld.hotel.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {
    private String id;
    private String hotelId;
    private String roomNumber;
    private RoomType type;
    private double price;
    @Builder.Default
    private RoomStatus status = RoomStatus.AVAILABLE;
}
