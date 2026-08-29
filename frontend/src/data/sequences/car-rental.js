// Sequence diagram content for car-rental.
// Grounded directly in CarRentalService, ReservationLockService (per-vehicle lock + date overlap check),
// and CarRentalConcurrencyTest.
export default {
  title: 'Car Rental — Concurrent Vehicle Reservation & Date-Overlap Check',
  description:
    'How CarRentalService prevents double-booking a rental vehicle. A per-vehicle ReentrantLock serializes reservation attempts, and active rental date intervals are re-verified INSIDE the lock so competing drivers never get conflicting bookings.',
  flows: [
    {
      id: 'car-rental-race',
      label: 'Two drivers race to book the same vehicle for overlapping dates',
      description:
        'Driver A (Alice) and Driver B (Bob) simultaneously attempt to book Tesla Model 3 (CAR-101) for June 10–15. ReservationLockService acquires vehicleLock("CAR-101"). Alice acquires the lock first, confirms the booking, and creates Reservation RES-001. Bob acquires the lock next, detects the overlapping date interval, and receives CarUnavailableException (409).',
      participants: [
        { id: 'driverA', name: 'Driver A\n(Alice)', kind: 'actor' },
        { id: 'driverB', name: 'Driver B\n(Bob)', kind: 'actor' },
        { id: 'controller', name: 'CarRental\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'CarRentalService', kind: 'component', stereotype: 'facade' },
        { id: 'lockService', name: 'ReservationLock\nService', kind: 'component' },
        { id: 'vehLock', name: 'vehicleLock\n("CAR-101")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'CarRental\nRepository', kind: 'store' },
      ],
      steps: [
        { from: 'driverA', to: 'controller', text: 'POST /api/car-rental/reservations {vehicleId: "CAR-101", startDate: "2026-06-10", endDate: "2026-06-15"}' },
        { from: 'controller', to: 'service', text: 'reserveCar("CAR-101", "Alice", 2026-06-10, 2026-06-15)', activate: 'service' },
        { from: 'driverB', to: 'controller', text: 'POST /api/car-rental/reservations {vehicleId: "CAR-101", startDate: "2026-06-12", endDate: "2026-06-18"}' },
        { from: 'controller', to: 'service', text: 'reserveCar("CAR-101", "Bob", 2026-06-12, 2026-06-18)' },
        { from: 'service', to: 'lockService', text: '[Alice] acquireLockAndReserve("CAR-101", ...)', activate: 'lockService' },
        { from: 'lockService', to: 'vehLock', text: '[Alice] lock.lock() — ACQUIRED', activate: 'vehLock' },
        { from: 'service', to: 'lockService', text: '[Bob] acquireLockAndReserve("CAR-101", ...)' },
        { from: 'lockService', to: 'vehLock', text: '[Bob] lock.lock() — BLOCKS on CAR-101' },
        { from: 'lockService', to: 'repo', text: '[Alice] getVehicle("CAR-101") ; getReservationsForVehicle("CAR-101")' },
        { from: 'repo', to: 'lockService', text: '[Alice] Vehicle {AVAILABLE, activeReservations: []}', type: 'return' },
        { from: 'lockService', to: 'repo', text: '[Alice] saveReservation(RES-001 {Alice, Jun 10–15, CONFIRMED})' },
        { from: 'lockService', to: 'vehLock', text: '[Alice] lock.unlock()', deactivate: 'vehLock' },
        { from: 'lockService', to: 'service', text: '[Alice] return Reservation RES-001', type: 'return', deactivate: 'lockService' },
        { from: 'service', to: 'controller', text: '[Alice] return RES-001', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'driverA', text: '200 OK — Reservation RES-001 Confirmed', type: 'return' },
        { type: 'note', over: ['vehLock'], text: 'Lock released. Bob unblocks and verifies dates inside lock.' },
        { from: 'lockService', to: 'vehLock', text: '[Bob] lock.lock() — ACQUIRED', activate: 'vehLock' },
        { from: 'lockService', to: 'repo', text: '[Bob] getReservationsForVehicle("CAR-101")' },
        { from: 'repo', to: 'lockService', text: '[Bob] returns [RES-001 (Jun 10–15)]', type: 'return' },
        { from: 'lockService', to: 'lockService', text: '[Bob] overlapCheck(Jun 12–18 vs Jun 10–15) → OVERLAP DETECTED' },
        { from: 'lockService', to: 'lockService', text: '[Bob] throw CarUnavailableException("CAR-101 is already booked")' },
        { from: 'lockService', to: 'vehLock', text: '[Bob] lock.unlock()', deactivate: 'vehLock' },
        { from: 'lockService', to: 'service', text: '[Bob] propagate CarUnavailableException', type: 'return' },
        { from: 'service', to: 'controller', text: '[Bob] propagate exception', type: 'return' },
        { from: 'controller', to: 'driverB', text: '409 Conflict — Vehicle unavailable for chosen dates', type: 'return' },
      ],
    },
  ],
};
