// Sequence diagram content for movieticket (BookMyShow).
// Grounded directly in MovieTicketService, SeatLockManager#holdSeats / bookSeats,
// sorted-order deadlock prevention (sorted distinct seatIds), and hold TTL.
export default {
  title: 'Movie Ticket (BookMyShow) — Seat Hold & Deadlock-Free Booking',
  description:
    'How MovieTicketService coordinates seat holds and bookings. SeatLockManager acquires per-seat ReentrantLocks in strictly ascending seat-ID order to prevent circular-wait deadlocks during multi-seat bookings, enforces 5-minute hold TTLs, and processes payment atomically.',
  flows: [
    {
      id: 'seat-hold-and-book-flow',
      label: 'Multi-seat hold (sorted lock acquisition) → Payment → Booking confirmed',
      description:
        'User holds Seats 102 and 101 for Show 501. SeatLockManager sorts IDs ([101, 102]), acquires locks in ascending order, marks seats HELD with a 5-minute TTL, and notifies the seat map observer. User then submits payment to finalize the booking.',
      participants: [
        { id: 'user', name: 'Moviegoer\n(Alice)', kind: 'actor' },
        { id: 'controller', name: 'MovieTicket\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'MovieTicket\nService', kind: 'component', stereotype: 'facade' },
        { id: 'lockMgr', name: 'SeatLock\nManager', kind: 'component' },
        { id: 'lock101', name: 'seatLock(501:101)', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'lock102', name: 'seatLock(501:102)', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'MovieTicket\nRepository', kind: 'store' },
        { id: 'pay', name: 'Payment\nProcessor', kind: 'component' },
      ],
      steps: [
        { from: 'user', to: 'controller', text: 'POST /api/movie-ticket/shows/501/hold {seatIds: [102, 101], userId: "alice"}' },
        { from: 'controller', to: 'service', text: 'holdSeats(501, [102, 101], "alice")', activate: 'service' },
        { from: 'service', to: 'lockMgr', text: 'holdSeats(501, [102, 101], "alice", 300000ms, repo, notifier)', activate: 'lockMgr' },
        { from: 'lockMgr', to: 'lockMgr', text: 'sort seatIds: [102, 101] → [101, 102] (Deadlock Prevention)' },
        { from: 'lockMgr', to: 'lock101', text: 'lockSeatsInOrder: lock(501:101) — ACQUIRED', activate: 'lock101' },
        { from: 'lockMgr', to: 'lock102', text: 'lockSeatsInOrder: lock(501:102) — ACQUIRED', activate: 'lock102' },
        { from: 'lockMgr', to: 'repo', text: 'findSeatById(501, 101) ; findSeatById(501, 102)' },
        { from: 'repo', to: 'lockMgr', text: 'Both seats AVAILABLE ✓', type: 'return' },
        { from: 'lockMgr', to: 'repo', text: 'updateSeatStatus(101 & 102 → HELD, heldBy="alice", ttl=now+5min)' },
        { from: 'lockMgr', to: 'lock102', text: 'unlock(501:102)', deactivate: 'lock102' },
        { from: 'lockMgr', to: 'lock101', text: 'unlock(501:101)', deactivate: 'lock101' },
        { from: 'lockMgr', to: 'service', text: 'hold confirmed', type: 'return', deactivate: 'lockMgr' },
        { from: 'service', to: 'controller', text: 'return HoldResponse {seatIds: [101, 102], expiresAt: 5min}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'user', text: '200 OK — Seats held for 5 minutes', type: 'return' },
        { from: 'user', to: 'controller', text: 'POST /api/movie-ticket/shows/501/book {seatIds: [101, 102], userId: "alice", paymentMethod: "UPI"}' },
        { from: 'controller', to: 'service', text: 'bookSeats(501, [101, 102], "alice", "UPI")', activate: 'service' },
        { from: 'service', to: 'lockMgr', text: 'acquire locks [101, 102] & verify hold ownership by "alice"' },
        { from: 'service', to: 'pay', text: 'processPayment("alice", amount=₹500.0, "UPI")', activate: 'pay' },
        { from: 'pay', to: 'service', text: 'Payment successful (txId: "TX-9988")', type: 'return', deactivate: 'pay' },
        { from: 'service', to: 'repo', text: 'markSeatsBooked([101, 102]) ; createBooking("BK-501")' },
        { from: 'service', to: 'lockMgr', text: 'release locks [102, 101]' },
        { from: 'service', to: 'controller', text: 'return Booking BK-501 (CONFIRMED)', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'user', text: '200 OK — Booking BK-501 Confirmed with e-Tickets', type: 'return' },
      ],
    },
  ],
};
