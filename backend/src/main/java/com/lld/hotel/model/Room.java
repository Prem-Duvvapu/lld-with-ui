package com.lld.hotel.model;

public class Room {
    public enum RoomType { SINGLE, DOUBLE, SUITE, DELUXE }
    public enum RoomStatus { AVAILABLE, BOOKED, OCCUPIED, MAINTENANCE }

    private String id;
    private String hotelId;
    private String roomNumber;
    private RoomType type;
    private double price;
    private RoomStatus status;

    public Room() {}

    public Room(String id, String hotelId, String roomNumber, RoomType type, double price) {
        this.id = id;
        this.hotelId = hotelId;
        this.roomNumber = roomNumber;
        this.type = type;
        this.price = price;
        this.status = RoomStatus.AVAILABLE;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getHotelId() { return hotelId; }
    public void setHotelId(String hotelId) { this.hotelId = hotelId; }
    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }
    public RoomType getType() { return type; }
    public void setType(RoomType type) { this.type = type; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public RoomStatus getStatus() { return status; }
    public void setStatus(RoomStatus status) { this.status = status; }
}
