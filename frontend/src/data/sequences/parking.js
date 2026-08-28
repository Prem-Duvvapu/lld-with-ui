// Sequence diagram content for parking (Parking Lot).
// Grounded directly in ParkingLotRepository#completeExit and
// ParkingLotConcurrencyTest#concurrentPayAndExit_forTheSameTicket_exactlyOneThreadWins:
// several threads race to pay and exit the SAME ticket at once, and one ReentrantLock guarding
// the whole check-then-mutate is what stops more than one of them from succeeding.
export default {
  title: 'Parking Lot — Racing to Pay & Exit the Same Ticket (Atomic completeExit)',
  description:
    'A class diagram shows that ParkingLotRepository owns a ticketLock — it does not show why the check ("is this ticket still payable?") and the write ("mark it PAID") have to happen inside the SAME lock acquisition. This sequence follows two concurrent payAndExit calls for the same ticket — e.g. a double-tap on the exit kiosk, or a retried request after a slow response — resolved by ParkingLotRepository#completeExit folding the not-found / already-exited check and the PAID mutation into one atomic operation. See ParkingLotConcurrencyTest#concurrentPayAndExit_forTheSameTicket_exactlyOneThreadWins.',
  flows: [
    {
      id: 'concurrent-pay-and-exit',
      label: 'Two threads race to pay and exit the same ticket',
      description:
        'Vehicle KA-01-RACE holds ticket TKT-00001, still UNPAID, parked in spot F1-C1. Two near-simultaneous payAndExit(G3, "TKT-00001", ...) calls arrive on separate threads. Only one may legally pay this ticket and release the spot; completeExit\'s single ticketLock acquisition guarantees the other is rejected, not double-charged or double-released.',
      participants: [
        { id: 'threadA', name: 'Thread A\n(kiosk tap #1)', kind: 'actor' },
        { id: 'threadB', name: 'Thread B\n(kiosk tap #2)', kind: 'actor' },
        { id: 'service', name: 'ParkingLotService', kind: 'component', stereotype: 'facade' },
        { id: 'repo', name: 'ParkingLotRepository', kind: 'store' },
        { id: 'lock', name: 'ticketLock\n(ReentrantLock)', kind: 'store' },
        { id: 'ticket', name: 'Ticket\nTKT-00001', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['ticket'], text: 'TKT-00001: paymentStatus = UNPAID, exitTime = null, spotId = F1-C1.' },
        { from: 'threadA', to: 'service', text: 'payAndExit("G3", "TKT-00001", "HOURLY", "CASH")' },
        { from: 'service', to: 'repo', text: '[thread A] completeExit("TKT-00001", now, HourlyPricingStrategy, "CASH")' },
        { from: 'repo', to: 'lock', text: '[thread A] ticketLock.lock()  — ACQUIRED', activate: 'lock' },
        { from: 'threadB', to: 'service', text: 'payAndExit("G3", "TKT-00001", "HOURLY", "CASH")  — arrives concurrently' },
        { from: 'service', to: 'repo', text: '[thread B] completeExit("TKT-00001", now, HourlyPricingStrategy, "CASH")' },
        { from: 'repo', to: 'lock', text: '[thread B] ticketLock.lock()  — BLOCKS (thread A holds it)',
          detail: 'Both threads contend for the SAME ticketLock instance on the repository singleton — thread B blocks here for the entire duration of thread A\'s critical section.' },
        { from: 'repo', to: 'ticket', text: '[thread A] tickets.get("TKT-00001") -> paymentStatus == UNPAID, exitTime == null -> eligible' },
        { from: 'repo', to: 'ticket', text: '[thread A] ticket.setExitTime(now)' },
        { from: 'repo', to: 'repo', text: '[thread A] amount = pricingStrategy.calculatePrice(ticket)',
          detail: 'Pricing is computed INSIDE the lock, using the just-set exitTime — computing it before acquiring the lock (or outside it) would let a second thread interleave between "compute price" and "mark PAID".' },
        { from: 'repo', to: 'ticket', text: '[thread A] ticket.setAmount(amount) ; setPaymentStatus(PAID) ; setPaymentMethod("CASH")' },
        { from: 'repo', to: 'lock', text: '[thread A] ticketLock.unlock()', deactivate: 'lock' },
        { from: 'repo', to: 'service', text: 'return Ticket { PAID, amount }', type: 'return' },
        { from: 'service', to: 'repo', text: '[thread A] releaseSpot("F1-C1")' },
        { from: 'service', to: 'threadA', text: '200 OK — Ticket { PAID, amount, spot released }', type: 'return' },
        { type: 'note', over: ['lock'], text: 'Lock just freed — thread B, still waiting, acquires it now.' },
        { from: 'repo', to: 'lock', text: '[thread B] ticketLock.lock()  — ACQUIRED (was blocked, now unblocks)', activate: 'lock' },
        { from: 'repo', to: 'ticket', text: '[thread B] tickets.get("TKT-00001") -> paymentStatus == PAID, exitTime != null',
          detail: 'Thread B is reading the POST-thread-A state — the lock guarantees this read cannot interleave with thread A\'s write.' },
        { from: 'repo', to: 'repo', text: '[thread B] throw TicketAlreadyExitedException("TKT-00001")' },
        { from: 'repo', to: 'lock', text: '[thread B] ticketLock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'threadB', text: '409 Conflict — TicketAlreadyExitedException, spot NOT released a second time', type: 'return' },
        { type: 'note', over: ['service'], text: 'Exactly one thread ever observes the ticket as payable and completes the exit. If the check and the write were split across two lock acquisitions (or not locked at all), both threads could read UNPAID simultaneously, both compute a charge, and both call releaseSpot — the vehicle would be billed twice and a second, unrelated vehicle could be assigned the same spot before the first one physically leaves.' },
      ],
    },
  ],
};
