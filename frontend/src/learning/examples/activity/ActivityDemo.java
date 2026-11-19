package com.lld.learning.examples.activity;

/** Each call is a separate activity execution. Printing happens after its return. */
public final class ActivityDemo {
    public static void main(String[] args) {
        RoomBookingService service = new RoomBookingService();
        show("Missing request", service, null);
        show("Accepted request", service, new BookingRequest("R1", 2));
        show("Occupied slot", service, new BookingRequest("R1", 1));
        show("Invalid while occupied", service, new BookingRequest("R2", 3));
        show("Fresh slot at capacity", new RoomBookingService(), new BookingRequest("R1", 4));
    }

    private static void show(String label, RoomBookingService service, BookingRequest request) {
        BookingResult result = service.request(request);
        BookingRequest saved = service.booking();
        System.out.println(label + ": " + result.status() + " | " + result.message()
                + " | booked=" + (saved == null ? "none" : saved.roomId() + "/" + saved.attendees())
                + " | available=" + service.available());
    }
}
