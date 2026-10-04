// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ElevatorSimulation from '../lld/elevator/ElevatorSimulation';
import TrafficSignalSimulation from '../lld/traffic-signal/TrafficSignalSimulation';
import CarRentalSimulation from '../lld/car-rental/CarRentalSimulation';
import * as elevator from '../lld/elevator/api';
import * as traffic from '../lld/traffic-signal/api';
import * as rental from '../lld/car-rental/api';
import { ApiError } from '../utils/api';

vi.mock('../lld/elevator/api');
vi.mock('../lld/traffic-signal/api');
vi.mock('../lld/car-rental/api');

beforeEach(() => {
  vi.resetAllMocks();
  let elevatorSnapshot;
  let tickCount = 0;
  let requestCount = 0;
  elevator.simReset.mockImplementation(async () => {
    tickCount = 0; requestCount = 0;
    elevatorSnapshot = { elevators: {
      11: { id: 11, name: 'First car', currentFloor: 1, state: 'IDLE', direction: 'IDLE', occupancy: 0, capacity: 8, upStops: [], downStops: [] },
      22: { id: 22, name: 'Second car', currentFloor: 5, state: 'IDLE', direction: 'IDLE', occupancy: 0, capacity: 6, upStops: [], downStops: [] },
    }, pendingRequests: [], events: [] };
    return structuredClone(elevatorSnapshot);
  });
  elevator.simRequest.mockImplementation(async () => {
    const carId = ++requestCount === 1 ? 11 : 22;
    elevatorSnapshot.elevators[carId].state = carId === 11 ? 'DOOR_OPEN' : 'MOVING_DOWN';
    elevatorSnapshot.events.push({ id: requestCount, eventType: 'ELEVATOR_ASSIGNED', actorName: 'Server', description: 'Assigned by dispatch', data: { assignedElevatorId: carId } });
    return structuredClone(elevatorSnapshot);
  });
  elevator.simStep.mockImplementation(async () => {
    const states = ['DOOR_OPEN', 'MOVING_UP', 'MOVING_UP', 'DOOR_OPEN', 'DOOR_OPEN', 'IDLE'];
    const floors = [1, 1, 2, 3, 3, 3];
    if (tickCount < states.length) {
      elevatorSnapshot.elevators[11].state = states[tickCount];
      elevatorSnapshot.elevators[11].currentFloor = floors[tickCount++];
    }
    return structuredClone(elevatorSnapshot);
  });
  elevator.simMaintenance.mockImplementation(async (carId, maintenance) => {
    elevatorSnapshot.elevators[carId].state = maintenance ? 'MAINTENANCE' : 'IDLE';
    return structuredClone(elevatorSnapshot);
  });
  elevator.simGetSnapshots.mockImplementation(async () => structuredClone(elevatorSnapshot));

  let trafficSnapshot;
  traffic.simReset.mockImplementation(async () => {
    trafficSnapshot = { intersection: { emergencyActive: false, lights: ['North', 'South', 'East', 'West'].map((position, id) => ({ id, position, currentState: id === 0 ? 'GREEN' : 'RED', timer: 8 })) }, events: [], phaseChangeLog: [] };
    return structuredClone(trafficSnapshot);
  });
  traffic.simTick.mockImplementation(async (seconds, step) => {
    const lights = trafficSnapshot.intersection.lights;
    if (step === 2) lights[0].currentState = 'YELLOW';
    if (step === 3) { lights[0].currentState = 'RED'; lights[1].currentState = 'GREEN'; }
    if (step === 4) lights[1].timer = 4;
    if (step === 8) { lights[3].currentState = 'RED'; lights[0].currentState = 'GREEN'; }
    trafficSnapshot.events.push({ id: step, eventType: 'TICK', stepNumber: step, description: `Advanced ${seconds} seconds` });
    return structuredClone(trafficSnapshot);
  });
  traffic.simEmergency.mockImplementation(async () => {
    trafficSnapshot.intersection.emergencyActive = true;
    trafficSnapshot.intersection.lights.forEach(light => { light.currentState = light.id === 3 ? 'GREEN' : 'RED'; });
    return structuredClone(trafficSnapshot);
  });
  traffic.simResume.mockImplementation(async () => {
    trafficSnapshot.intersection.emergencyActive = false;
    trafficSnapshot.intersection.lights[3].currentState = 'YELLOW';
    trafficSnapshot.phaseChangeLog.push({ position: 'West', previousPhase: 'GREEN', newPhase: 'YELLOW' });
    return structuredClone(trafficSnapshot);
  });
  traffic.simGetSnapshot.mockImplementation(async () => structuredClone(trafficSnapshot));

  let vehicle;
  let reservations = [];
  let customerCount = 0;
  rental.simReset.mockImplementation(async () => { vehicle = null; reservations = []; customerCount = 0; });
  rental.simSeedVehicle.mockImplementation(async value => { vehicle = { ...value, id: 'VEH-42' }; return structuredClone(vehicle); });
  rental.simSeedCustomer.mockImplementation(async value => ({ ...value, id: `CUST-${++customerCount * 11}` }));
  rental.simReserve.mockImplementation(async (customerId, vehicleId, startDate, endDate) => {
    if (customerId === 'CUST-22') throw new ApiError(409, 'Dates overlap', { code: 'VehicleNotAvailableException' });
    const reservation = { id: customerId === 'CUST-11' ? 'RES-42' : 'RES-99', customerId, vehicleId, startDate, endDate, status: 'PENDING', estimatedCost: 15000, pricingStrategyName: 'STANDARD' };
    reservations.push(reservation);
    return structuredClone(reservation);
  });
  const updateReservation = (id, status) => {
    const reservation = reservations.find(candidate => candidate.id === id);
    reservation.status = status;
    return reservation;
  };
  rental.simConfirm.mockImplementation(async id => structuredClone(updateReservation(id, 'CONFIRMED')));
  rental.simPickup.mockImplementation(async id => { vehicle.status = 'RENTED'; return structuredClone(updateReservation(id, 'ACTIVE')); });
  rental.simReturn.mockImplementation(async (id, odometer) => {
    vehicle.status = 'AVAILABLE'; vehicle.odometer = odometer;
    const reservation = updateReservation(id, 'COMPLETED'); reservation.actualCost = 14500;
    return structuredClone(reservation);
  });
  rental.simCancel.mockImplementation(async id => structuredClone(updateReservation(id, 'CANCELLED')));
  rental.simGetVehicles.mockImplementation(async () => vehicle ? [structuredClone(vehicle)] : []);
  rental.simGetReservations.mockImplementation(async () => structuredClone(reservations));
});

async function advance(completed) {
  fireEvent.click(screen.getByRole('button', { name: completed === 1 ? 'Start simulation' : 'Next step' }));
  await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe(String(completed)));
}

describe('Fleet simulation walkthroughs', () => {
  it('preserves custom elevator requests, ticking, and maintenance after the guide', async () => {
    render(<ElevatorSimulation />);
    expect(screen.queryByText('Explore the sandbox')).toBeNull();
    for (let completed = 1; completed <= 12; completed++) await advance(completed);
    fireEvent.change(screen.getByLabelText('Source floor'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Destination floor'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request ride' }));
    await waitFor(() => expect(elevator.simRequest).toHaveBeenLastCalledWith(2, 7));
    await waitFor(() => expect(screen.getByText(/12\/12 steps complete/).textContent).not.toContain('Waiting'));
    fireEvent.click(screen.getByRole('button', { name: 'Take offline E11' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restore E11' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Advance one tick' }));
    await waitFor(() => expect(elevator.simStep).toHaveBeenCalledTimes(7));
    await waitFor(() => expect(screen.getByText(/12\/12 steps complete/).textContent).not.toContain('Waiting'));
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('12');
    fireEvent.change(screen.getByLabelText('Source floor'), { target: { value: '7' } });
    expect(screen.getByRole('button', { name: 'Request ride' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText('Explore the sandbox')).toBeNull();
  });

  it('tracks backend assignments, ticks, maintenance, and the final elevator snapshot', async () => {
    render(<ElevatorSimulation />);
    expect(elevator.simReset).not.toHaveBeenCalled();
    for (let completed = 1; completed <= 12; completed++) await advance(completed);
    expect(elevator.simRequest.mock.calls).toEqual([[1, 3], [1, 3]]);
    expect(elevator.simStep).toHaveBeenCalledTimes(6);
    expect(elevator.simMaintenance.mock.calls).toEqual([[11, true], [11, false]]);
    expect(elevator.simGetSnapshots).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/First assignment: E11/).textContent).toContain('Second assignment: E22');
    expect(screen.getByText('F5 · MOVING_DOWN')).toBeDefined();
    expect(elevator.requestElevator).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText(/First assignment:/)).toBeNull();
  });

  it('stops visibly on an elevator failure and requires reset instead of repeating a request', async () => {
    render(<ElevatorSimulation />);
    await advance(1);
    elevator.simRequest.mockRejectedValueOnce(new Error('Assignment response lost'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Assignment response lost'));
    expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(false));
    expect(elevator.simReset).toHaveBeenCalledTimes(2);
    expect(elevator.simRequest).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a stale elevator assignment when a new request is queued', async () => {
    render(<ElevatorSimulation />);
    await advance(1);
    elevator.simRequest.mockResolvedValueOnce({ elevators: {}, events: [{ eventType: 'ELEVATOR_ASSIGNED', data: { assignedElevatorId: 11 } }, { eventType: 'REQUEST_QUEUED' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('did not return a car assignment'));
    expect(elevator.simStep).not.toHaveBeenCalled();
  });

  it('advances explicit signal clocks, preserves the override, and reads final observer activity', async () => {
    render(<TrafficSignalSimulation />);
    expect(traffic.simReset).not.toHaveBeenCalled();
    for (let completed = 1; completed <= 6; completed++) await advance(completed);
    expect(screen.getByText('Emergency override: Active')).toBeDefined();
    const west = screen.getByRole('region', { name: 'Intersection status' });
    expect(within(west).getByText('West').parentElement.textContent).toContain('GREEN');
    await advance(7); await advance(8); await advance(9);
    expect(traffic.simTick.mock.calls).toEqual([[8, 2], [3, 3], [4, 4], [5, 6], [3, 8]]);
    expect(traffic.simEmergency).toHaveBeenCalledWith(3, 5);
    expect(traffic.simResume).toHaveBeenCalledWith(7);
    expect(traffic.simGetSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByText('West: GREEN → YELLOW')).toBeDefined();
    expect(traffic.transition).not.toHaveBeenCalled();
    expect(traffic.emergency).not.toHaveBeenCalled();
  });

  it('does not offer to retry an ambiguous signal-clock mutation', async () => {
    render(<TrafficSignalSimulation />);
    await advance(1);
    traffic.simTick.mockRejectedValueOnce(new Error('Clock response lost'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Clock response lost'));
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1');
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(false));
    expect(traffic.simTick).toHaveBeenCalledTimes(1);
  });

  it('keeps pickup and return separate and uses real IDs for the race cancellation', async () => {
    render(<CarRentalSimulation />);
    expect(rental.simReset).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'CREDIT_CARD' } });
    for (let completed = 1; completed <= 7; completed++) await advance(completed);
    expect(rental.simConfirm).toHaveBeenCalledWith('RES-42', 'CREDIT_CARD');
    expect(screen.getByText('Cleo won')).toBeDefined();
    expect(screen.getByText(/VEH-42 · RENTED/)).toBeDefined();
    expect(rental.simReturn).not.toHaveBeenCalled();
    await advance(8); await advance(9); await advance(10);
    expect(rental.simReturn).toHaveBeenCalledWith('RES-42', 8500);
    expect(rental.simCancel).toHaveBeenCalledWith('RES-99');
    expect(screen.getByText('₹14500.00')).toBeDefined();
    expect(screen.getByText(/VEH-42 · AVAILABLE · 8500/)).toBeDefined();
    expect(rental.simGetReservations).toHaveBeenCalledTimes(10);
    expect(rental.reserveVehicle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText('Cleo won')).toBeNull();
  });

  it.each(['transport', 'wrong-code', 'both-success', 'both-conflict'])('stops rather than naming an invalid rental race winner: %s', async failure => {
    render(<CarRentalSimulation />);
    for (let completed = 1; completed <= 4; completed++) await advance(completed);
    if (failure === 'transport') rental.simReserve.mockRejectedValue(new ApiError(503, 'Race service unavailable', { code: 'VehicleNotAvailableException' }));
    if (failure === 'wrong-code') rental.simReserve.mockRejectedValue(new ApiError(409, 'Different conflict', { code: 'OtherException' }));
    if (failure === 'both-success') rental.simReserve.mockResolvedValue({ id: 'unexpected', status: 'PENDING' });
    if (failure === 'both-conflict') rental.simReserve.mockRejectedValue(new ApiError(409, 'Dates overlap', { code: 'VehicleNotAvailableException' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('4');
    expect(screen.queryByText(/Cleo won|Ben won/)).toBeNull();
    expect(rental.simPickup).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(true);
  });

  it('does not repeat partially committed customer seeding after a failed response', async () => {
    render(<CarRentalSimulation />);
    await advance(1);
    rental.simSeedCustomer.mockResolvedValueOnce({ id: 'CUST-11', name: 'Ava' }).mockRejectedValueOnce(new Error('Customer response lost'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Customer response lost'));
    expect(rental.simSeedCustomer).toHaveBeenCalledTimes(2);
    expect(rental.simReserve).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(false));
    expect(rental.simSeedVehicle).toHaveBeenCalledTimes(1);
    expect(rental.simReset).toHaveBeenCalledTimes(2);
  });
});
