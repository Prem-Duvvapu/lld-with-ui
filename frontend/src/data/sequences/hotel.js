// Sequence diagram content for hotel.
// Grounded directly in RoomBookingService#bookRoom, TariffStrategyFactory, and
// HotelConcurrencyTest (racing for the same room with overlapping dates).
export default {
  title: 'Hotel — Concurrent Room Booking & Date-Overlap Serialization',
  description:
    'How RoomBookingService prevents double-booking the same room across overlapping date ranges. A per-room ReentrantLock serializes requests, and active reservations are re-evaluated INSIDE the lock so stale availability snapshots never lead to double confirmations.',
  flows: [
    {
      id: 'concurrent-hotel-booking',
      label: 'Two guests race to book the same room for overlapping dates',
      description:
        'Alice and Bob both attempt to book Room 101 for Dec 20–25 at the same moment. RoomBookingService acquires roomLock("RM-101"). Alice wins the lock, validates date range, computes dynamic pricing via TariffStrategyFactory, and saves the reservation. When Bob acquires the lock, the re-check finds the overlapping dates and throws RoomUnavailableException (409).',
      participants: [
        { id: 'guestA', name: 'Guest A\n(Alice)', kind: 'actor' },
        { id: 'guestB', name: 'Guest B\n(Bob)', kind: 'actor' },
        { id: 'controller', name: 'HotelController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'HotelService / \nRoomBookingService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'roomLock("RM-101")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'factory', name: 'TariffStrategy\nFactory', kind: 'component', stereotype: 'factory' },
        { id: 'repo', name: 'HotelRepository', kind: 'store' },
      ],
      steps: [
        { from: 'guestA', to: 'controller', text: 'POST /api/hotel/bookings {roomId: "RM-101", checkIn: "2026-12-20", checkOut: "2026-12-25"}' },
        { from: 'controller', to: 'service', text: 'bookRoom("RM-101", "Alice", 2026-12-20, 2026-12-25)', activate: 'service' },
        { from: 'guestB', to: 'controller', text: 'POST /api/hotel/bookings {roomId: "RM-101", checkIn: "2026-12-22", checkOut: "2026-12-28"}' },
        { from: 'controller', to: 'service', text: 'bookRoom("RM-101", "Bob", 2026-12-22, 2026-12-28)' },
        { from: 'service', to: 'lock', text: '[Alice] lock.lock() — ACQUIRED', activate: 'lock' },
        { from: 'service', to: 'lock', text: '[Bob] lock.lock() — BLOCKS (waiting on RM-101 lock)' },
        { from: 'service', to: 'repo', text: '[Alice] getRoom("RM-101") ; getBookingsForRoom("RM-101")' },
        { from: 'repo', to: 'service', text: '[Alice] Room {status: AVAILABLE, existingBookings: []}', type: 'return' },
        { from: 'service', to: 'factory', text: '[Alice] getTariffStrategy(room.getType())', activate: 'factory' },
        { from: 'factory', to: 'service', text: '[Alice] return SeasonalTariffStrategy', type: 'return', deactivate: 'factory' },
        { from: 'service', to: 'service', text: '[Alice] totalPrice = strategy.calculatePrice(room, 5 nights)' },
        { from: 'service', to: 'repo', text: '[Alice] saveBooking(Booking {id: "BK-001", guest: "Alice", CONFIRMED})' },
        { from: 'service', to: 'lock', text: '[Alice] lock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'controller', text: '[Alice] return Booking BK-001 (CONFIRMED)', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'guestA', text: '200 OK — Reservation BK-001 confirmed', type: 'return' },
        { type: 'note', over: ['lock'], text: 'Lock released. Bob unblocks and acquires lock.' },
        { from: 'service', to: 'lock', text: '[Bob] lock.lock() — ACQUIRED', activate: 'lock' },
        { from: 'service', to: 'repo', text: '[Bob] getRoom("RM-101") ; getBookingsForRoom("RM-101")' },
        { from: 'repo', to: 'service', text: '[Bob] existingBookings: [BK-001 (Dec 20–25)]', type: 'return' },
        { from: 'service', to: 'service', text: '[Bob] checkOverlap(Dec 22–28 vs Dec 20–25) → OVERLAP DETECTED' },
        { from: 'service', to: 'service', text: '[Bob] throw RoomUnavailableException("Room RM-101 not available for requested dates")' },
        { from: 'service', to: 'lock', text: '[Bob] lock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'controller', text: '[Bob] propagate RoomUnavailableException', type: 'return' },
        { from: 'controller', to: 'guestB', text: '409 Conflict — Room already booked for overlapping dates', type: 'return' },
      ],
    },
  ],
};
