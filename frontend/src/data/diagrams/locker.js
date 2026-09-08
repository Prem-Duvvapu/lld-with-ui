// classDiagrams — locker
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Locker Management (Amazon Locker) — Class Diagram',
  classes: [
    {
      name: 'LockerService',
      stereotype: 'service',
      fields: [
        '- repository: LockerRepository',
        '- strategyFactory: LockerAllocationStrategyFactory',
        '- codeFactory: PickupCodeFactory',
        '- parcelIdGen: AtomicLong',
      ],
      methods: [
        '+ deposit(bankId, size, courierId, recipientId, policy): Parcel',
        '+ pickup(pickupCode): Parcel',
        '- claimLocker(lockersInBank, size, strategy, ...): Parcel',
      ],
    },
    {
      name: 'LockerRepository',
      stereotype: 'repository',
      fields: [
        '- banks: ConcurrentHashMap<String, LockerBank>',
        '- lockers: ConcurrentHashMap<String, Locker>',
        '- parcels: ConcurrentHashMap<String, Parcel>',
      ],
      methods: [
        '+ addBank(bank): void',
        '+ addLocker(locker): void',
        '+ getBank(bankId): LockerBank',
        '+ getLocker(lockerId): Locker',
        '+ getLockersInBank(bankId): List<Locker>',
        '+ saveParcel(parcel): void',
        '+ reset(): void',
      ],
    },
    {
      name: 'LockerBank',
      fields: [
        '- id: String',
        '- name: String',
        '- location: String',
      ],
      methods: [],
    },
    {
      name: 'Locker',
      fields: [
        '- id: String',
        '- bankId: String',
        '- size: LockerSize',
        '- status: LockerStatus',
        '- lockerLock: ReentrantLock',
      ],
      methods: [
        '+ transitionTo(target: LockerStatus): void  // the only place status is ever assigned',
        '+ getLock(): ReentrantLock',
      ],
    },
    {
      name: 'LockerStatus',
      stereotype: 'enum',
      fields: ['EMPTY', 'OCCUPIED', 'AWAITING_PICKUP'],
      methods: [
        '+ canTransitionTo(next): boolean',
        '+ allowedNext(): Set<LockerStatus>',
      ],
    },
    {
      name: 'LockerSize',
      stereotype: 'enum',
      fields: ['SMALL', 'MEDIUM', 'LARGE'],
      methods: ['+ fits(required: LockerSize): boolean'],
    },
    {
      name: 'Parcel',
      fields: [
        '- id: String',
        '- size: LockerSize',
        '- courierId: String',
        '- recipientId: String',
        '- assignedLockerId: String',
        '- pickupCode: String',
        '- depositedAtEpoch: long',
        '- expiresAtEpoch: long',
        '- pickedUpAtEpoch: Long',
      ],
      methods: [],
    },
    {
      name: 'LockerAllocationStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ selectCandidate(lockersInBank, requiredSize, excludeIds): Optional<Locker>',
      ],
    },
    {
      name: 'SmallestFitFirstAllocationStrategy',
      fields: ['implements LockerAllocationStrategy'],
      methods: ['+ selectCandidate(...): Optional<Locker>  // smallest EMPTY locker that still fits'],
    },
    {
      name: 'FirstFitAllocationStrategy',
      fields: ['implements LockerAllocationStrategy'],
      methods: ['+ selectCandidate(...): Optional<Locker>  // first EMPTY locker (scan order) that fits'],
    },
    {
      name: 'LockerAllocationStrategyFactory',
      stereotype: 'factory',
      fields: [],
      methods: ['+ forPolicy(policy: AllocationPolicy): LockerAllocationStrategy'],
    },
    {
      name: 'AllocationPolicy',
      stereotype: 'enum',
      fields: ['SMALLEST_FIT', 'FIRST_FIT'],
      methods: [],
    },
    {
      name: 'PickupCodeFactory',
      stereotype: 'factory',
      fields: [],
      methods: ['+ generate(activeCodes: Set<String>): String'],
    },
  ],
  relationships: [
    { from: 'LockerService', to: 'LockerRepository', label: 'reads/writes' },
    { from: 'LockerService', to: 'LockerAllocationStrategyFactory', label: 'resolves policy via' },
    { from: 'LockerAllocationStrategyFactory', to: 'LockerAllocationStrategy', label: 'creates' },
    { from: 'LockerAllocationStrategyFactory', to: 'AllocationPolicy', label: 'keyed by' },
    { from: 'SmallestFitFirstAllocationStrategy', to: 'LockerAllocationStrategy', label: 'implements', dashed: true },
    { from: 'FirstFitAllocationStrategy', to: 'LockerAllocationStrategy', label: 'implements', dashed: true },
    { from: 'LockerService', to: 'PickupCodeFactory', label: 'uses' },
    { from: 'LockerRepository', to: 'LockerBank', label: 'stores' },
    { from: 'LockerRepository', to: 'Locker', label: 'stores' },
    { from: 'LockerRepository', to: 'Parcel', label: 'stores' },
    { from: 'Locker', to: 'LockerBank', label: 'belongs to' },
    { from: 'Locker', to: 'LockerStatus', label: 'has' },
    { from: 'Locker', to: 'LockerSize', label: 'has' },
    { from: 'Parcel', to: 'Locker', label: 'assigned to' },
    { from: 'Parcel', to: 'LockerSize', label: 'requires' },
  ],
};
