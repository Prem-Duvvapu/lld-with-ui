// classDiagrams — carRental
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Car Rental — Class Diagram',
  classes: [
    {
      name: 'Vehicle',
      fields: [
        '- id: String',
        '- make: String',
        '- model: String',
        '- year: int',
        '- type: VehicleType',
        '- licensePlate: String',
        '- hourlyRate: double',
        '- available: boolean'
      ],
      methods: [
        '+ setAvailable(avail): void',
        '+ getRate(): double'
      ]
    },
    {
      name: 'Customer',
      fields: [
        '- id: String',
        '- name: String',
        '- licenseNo: String',
        '- phone: String',
        '- reservations: List<Reservation>'
      ],
      methods: [
        '+ makeReservation(vehicle, hours): Reservation',
        '+ cancelReservation(id): void'
      ]
    },
    {
      name: 'Reservation',
      fields: [
        '- id: String',
        '- customer: Customer',
        '- vehicle: Vehicle',
        '- startTime: LocalDateTime',
        '- endTime: LocalDateTime',
        '- totalAmount: double',
        '- status: String'
      ],
      methods: [
        '+ calculateAmount(): double',
        '+ complete(): void'
      ]
    },
    {
      name: 'RentalBranch',
      fields: [
        '- id: String',
        '- name: String',
        '- location: String',
        '- vehicles: List<Vehicle>'
      ],
      methods: [
        '+ addVehicle(vehicle): void',
        '+ getAvailableVehicles(type): List<Vehicle>'
      ]
    },
    {
      name: 'Payment',
      fields: [
        '- id: String',
        '- reservation: Reservation',
        '- amount: double',
        '- method: String',
        '- status: String',
        '- timestamp: LocalDateTime'
      ],
      methods: [
        '+ process(): boolean',
        '+ refund(): void'
      ]
    },
    {
      name: 'VehicleType',
      stereotype: 'enum',
      fields: [
        'SEDAN',
        'SUV',
        'HATCHBACK',
        'TRUCK',
        'VAN'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Customer',
      to: 'Reservation',
      label: 'makes'
    },
    {
      from: 'Reservation',
      to: 'Vehicle',
      label: 'books'
    },
    {
      from: 'Reservation',
      to: 'Payment',
      label: 'has'
    },
    {
      from: 'RentalBranch',
      to: 'Vehicle',
      label: 'contains'
    },
    {
      from: 'Vehicle',
      to: 'VehicleType',
      label: 'has type'
    },
    {
      from: 'Customer',
      to: 'RentalBranch',
      label: 'visits'
    }
  ]
};
