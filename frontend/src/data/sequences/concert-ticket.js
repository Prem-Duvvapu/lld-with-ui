// Sequence diagram content for concert-ticket.
// Grounded directly in ConcertTicketService, SeatLockManager (canonical seat locking + 10min hold TTL),
// and CancellationPolicyFactory / Idempotency cache.
export default {
  title: 'Concert Ticket — Concurrent VIP Seat Hold & Idempotent Checkout',
  description:
    'How ConcertTicketService handles high-demand concert ticket surges. SeatLockManager prevents double-booking across simultaneous fan requests using fine-grained seat locks, manages a 10-minute hold window, and deduplicates payment confirmations with an idempotency cache.',
  flows: [
    {
      id: 'concert-seat-hold-and-confirm',
      label: 'Surge seat hold → Idempotent payment confirmation',
      description:
        'A concert fan selects VIP Seat A-12. ConcertTicketService acquires a lock via SeatLockManager, holds the seat for 10 minutes with a unique hold token, and confirms payment idempotently against network retries.',
      participants: [
        { id: 'fan', name: 'Concert Fan\n(Client)', kind: 'actor' },
        { id: 'controller', name: 'ConcertTicket\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ConcertTicket\nService', kind: 'component', stereotype: 'facade' },
        { id: 'lockMgr', name: 'SeatLock\nManager', kind: 'component' },
        { id: 'lockA12', name: 'seatLock("A-12")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'ConcertTicket\nRepository', kind: 'store' },
        { id: 'pay', name: 'Payment\nProcessor', kind: 'component' },
      ],
      steps: [
        { from: 'fan', to: 'controller', text: 'POST /api/concert-ticket/concerts/101/hold {seatIds: ["A-12"], userId: "fan-1"}' },
        { from: 'controller', to: 'service', text: 'holdSeats(101, ["A-12"], "fan-1")', activate: 'service' },
        { from: 'service', to: 'lockMgr', text: 'holdSeats(101, ["A-12"], "fan-1", 600000ms)', activate: 'lockMgr' },
        { from: 'lockMgr', to: 'lockA12', text: 'lock.lock() — ACQUIRED', activate: 'lockA12' },
        { from: 'lockMgr', to: 'repo', text: 'getSeat("A-12") → status == AVAILABLE' },
        { from: 'lockMgr', to: 'repo', text: 'updateSeat(A-12 → HELD, heldBy="fan-1", ttl=now+10min)' },
        { from: 'lockMgr', to: 'lockA12', text: 'lock.unlock()', deactivate: 'lockA12' },
        { from: 'lockMgr', to: 'service', text: 'HoldResult {holdToken: "HLD-7788", expiresAt: 10min}', type: 'return', deactivate: 'lockMgr' },
        { from: 'service', to: 'controller', text: 'return HoldResult', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'fan', text: '200 OK — Seat A-12 held for 10 minutes (Token: HLD-7788)', type: 'return' },
        { from: 'fan', to: 'controller', text: 'POST /api/concert-ticket/confirm {holdToken: "HLD-7788", idempotencyKey: "IDEM-1001", paymentMethod: "CARD"}' },
        { from: 'controller', to: 'service', text: 'confirmBooking("HLD-7788", "IDEM-1001", CARD)', activate: 'service' },
        { from: 'service', to: 'service', text: 'check idempotencyCache.get("IDEM-1001") → null (fresh request)' },
        { from: 'service', to: 'lockMgr', text: 'verifyAndClaimHold("HLD-7788")' },
        { from: 'service', to: 'pay', text: 'processPayment("fan-1", ₹2500.0, CARD)', activate: 'pay' },
        { from: 'pay', to: 'service', text: 'PaymentResult {SUCCESS, txId: "TXN-CONCERT-99"}', type: 'return', deactivate: 'pay' },
        { from: 'service', to: 'repo', text: 'finalizeBooking(A-12 → BOOKED, Booking {id: "BKG-CONCERT-01", CONFIRMED})' },
        { from: 'service', to: 'service', text: 'idempotencyCache.put("IDEM-1001", booking)' },
        { from: 'service', to: 'controller', text: 'return Booking BKG-CONCERT-01 (CONFIRMED)', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'fan', text: '200 OK — VIP Concert Ticket Confirmed!', type: 'return' },
      ],
    },
  ],
};
