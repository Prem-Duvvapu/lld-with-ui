// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ParkingLotPage from '../lld/parking/ParkingLotPage';
import UberPage from '../lld/uber/UberPage';
import * as parking from '../lld/parking/api';
import * as uber from '../lld/uber/api';

vi.mock('../components/LldPage', () => ({ default: ({ children, module }) => children(module === 'uber' ? 'demo' : 'simulation') }));
vi.mock('../lld/parking/api');
vi.mock('../lld/uber/api');

const ticket = { ticketNumber: 'SIM-TKT-00001', spotId: 'SF2-T1', vehicleNumber: 'TRUCK-42', vehicleType: 'TRUCK' };
const spots = [
  { id: 'SF1-C1', floorNumber: 1, vehicleType: 'CAR', occupied: false },
  { id: 'SF2-T1', floorNumber: 2, vehicleType: 'TRUCK', occupied: false },
];
const emptyLot = { entryGateId: 'SIM-G1', exitGateId: 'SIM-G2', spots, activeTickets: [], events: [] };
const occupiedLot = { ...emptyLot, spots: spots.map(spot => ({ ...spot, occupied: spot.id === ticket.spotId })), activeTickets: [ticket] };
const paidLot = { ...emptyLot, events: [{ id: 1, eventType: 'VEHICLE_EXITED', description: 'Ticket paid and space released', data: { ticketNumber: ticket.ticketNumber, amount: 87.65, paymentMethod: 'CARD' } }] };

beforeEach(() => {
  vi.resetAllMocks();
  parking.simReset.mockResolvedValue(emptyLot);
  parking.simEntry.mockResolvedValue(occupiedLot);
  parking.simScan.mockResolvedValue({ ...occupiedLot, previewAmount: 80 });
  parking.simPay.mockResolvedValue(paidLot);
  parking.simState.mockResolvedValue(paidLot);

  let snapshot = {
    rider: { name: 'Priya' }, ride: null, events: [],
    drivers: [{ id: 'D1', name: 'Ramesh', vehicleType: 'UBER_GO', status: 'AVAILABLE' }, { id: 'D2', name: 'Kavya', vehicleType: 'UBER_GO', status: 'AVAILABLE' }],
  };
  const log = title => { snapshot.events.push({ id: snapshot.events.length + 1, title, description: title, status: 'SUCCESS' }); };
  uber.simReset.mockImplementation(async () => {
    snapshot = { ...snapshot, ride: null, events: [], drivers: snapshot.drivers.map(driver => ({ ...driver, status: 'AVAILABLE' })) };
    return structuredClone(snapshot);
  });
  uber.simGetSnapshot.mockImplementation(async () => structuredClone(snapshot));
  uber.simEstimate.mockImplementation(async () => {
    log('Fare estimated');
    return { estimate: { fare: 100, distanceKm: 5, estimatedMinutes: 15, pricingStrategy: 'STANDARD' } };
  });
  uber.simRequest.mockImplementation(async () => {
    snapshot.ride = { id: 'SIM-RIDE-1', otp: '4321', status: 'REQUESTED', fare: 100 };
    log('Ride requested');
    return { ride: structuredClone(snapshot.ride), broadcastTo: ['Ramesh', 'Kavya'] };
  });
  uber.simRace.mockImplementation(async () => {
    snapshot.ride.status = 'ACCEPTED';
    snapshot.drivers[0].status = 'ON_TRIP';
    log('Race resolved');
    return { ride: structuredClone(snapshot.ride), winnerDriverId: 'D1', loserDriverId: 'D2', outcomes: { D1: 'ACCEPTED', D2: 'REJECTED' } };
  });
  uber.simVerifyOtp.mockImplementation(async otp => {
    const accepted = otp === '4321';
    if (accepted) snapshot.ride.status = 'ONGOING';
    log(accepted ? 'OTP accepted' : 'OTP rejected');
    return { ride: structuredClone(snapshot.ride), accepted };
  });
  uber.simArrive.mockImplementation(async () => {
    snapshot.ride.status = 'PAYMENT_PENDING';
    log('Arrived at destination');
    return { ride: structuredClone(snapshot.ride) };
  });
  uber.simComplete.mockImplementation(async () => {
    snapshot.ride.status = 'COMPLETED';
    snapshot.ride.payment = { method: 'UPI', status: 'COMPLETED' };
    snapshot.drivers[0].status = 'AVAILABLE';
    log('Trip paid and driver released');
    return { ride: structuredClone(snapshot.ride) };
  });
});

async function advance(completed) {
  fireEvent.click(screen.getByRole('button', { name: completed === 1 ? 'Start simulation' : 'Next step' }));
  await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe(String(completed)));
}

describe('Parking and Uber guided playback', () => {
  it('uses selected parking policies, highlights the server-assigned spot and displays the actual paid amount', async () => {
    render(<ParkingLotPage />);
    expect(parking.simReset).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Vehicle number'), { target: { value: 'TRUCK-42' } });
    fireEvent.change(screen.getByLabelText('Vehicle type'), { target: { value: 'TRUCK' } });
    fireEvent.change(screen.getByLabelText('Spot assignment'), { target: { value: 'FARTHEST' } });
    fireEvent.change(screen.getByLabelText('Pricing strategy'), { target: { value: 'DYNAMIC' } });
    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'CARD' } });
    await advance(1);
    await advance(2);
    expect(parking.simEntry).toHaveBeenCalledWith('TRUCK-42', 'TRUCK', 'FARTHEST');
    const assigned = screen.getByText('SF2-T1', { selector: '.parking-sim-spot strong' }).parentElement;
    expect(assigned.className).toContain('assigned');
    expect(within(assigned).getByText('Occupied')).toBeDefined();
    expect(screen.getByLabelText('Vehicle type').closest('fieldset').disabled).toBe(true);
    for (let completed = 3; completed <= 9; completed++) await advance(completed);
    expect(parking.simScan).toHaveBeenCalledWith(ticket.ticketNumber, 'DYNAMIC');
    expect(parking.simPay).toHaveBeenCalledWith(ticket.ticketNumber, 'DYNAMIC', 'CARD');
    expect(parking.simState).toHaveBeenCalledTimes(1);
    expect(screen.getByText('₹87.65 via CARD')).toBeDefined();
    expect(within(assigned).getByText('Available')).toBeDefined();
    expect(parking.vehicleEntry).not.toHaveBeenCalled();
    expect(parking.payVehicleExit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText('₹87.65 via CARD')).toBeNull();
    expect(screen.getByLabelText('Vehicle type').closest('fieldset').disabled).toBe(false);
  });

  it('serializes parking entry and stops after a failed scan until the sandbox resets', async () => {
    let finishEntry;
    parking.simEntry.mockImplementationOnce(() => new Promise(resolve => { finishEntry = resolve; }));
    parking.simScan.mockRejectedValueOnce(new Error('Connection lost during scan'));
    render(<ParkingLotPage />);
    await advance(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(parking.simEntry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Reset sandbox' }).disabled).toBe(true);
    finishEntry(occupiedLot);
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('2'));
    for (let completed = 3; completed <= 5; completed++) await advance(completed);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Connection lost during scan'));
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('5');
    expect(screen.getByRole('button', { name: 'Play' }).disabled).toBe(true);
    expect(parking.simPay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(parking.simScan).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1');
  });

  it('executes both OTP outcomes and refreshes completion, payment, driver availability and final events', async () => {
    render(<UberPage />);
    for (let completed = 1; completed <= 5; completed++) await advance(completed);
    expect(uber.simVerifyOtp).toHaveBeenCalledWith('0000', 4);
    expect(screen.getByText('Ride status: ACCEPTED')).toBeDefined();
    expect(screen.getByText('Incorrect OTP rejected — trip has not started.')).toBeDefined();
    await advance(6);
    expect(uber.simVerifyOtp).toHaveBeenLastCalledWith('4321', 5);
    expect(screen.getByText('Ride status: ONGOING')).toBeDefined();
    for (let completed = 7; completed <= 9; completed++) await advance(completed);
    expect(uber.simArrive).toHaveBeenCalledWith(6);
    expect(uber.simComplete).toHaveBeenCalledWith(7);
    expect(uber.simGetSnapshot).toHaveBeenCalledTimes(8);
    expect(screen.getByText('Ride status: COMPLETED')).toBeDefined();
    expect(screen.getByText(/UPI: COMPLETED/)).toBeDefined();
    expect(screen.getAllByText('AVAILABLE')).toHaveLength(2);
    expect(screen.getByText('Trip paid and driver released', { selector: 'strong' })).toBeDefined();
    expect(uber.requestRide).not.toHaveBeenCalled();
    expect(uber.completeTrip).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText('Ride status: COMPLETED')).toBeNull();
    expect(screen.queryByText(/UPI: COMPLETED/)).toBeNull();
  });

  it('does not repeat an Uber mutation when its following snapshot request fails', async () => {
    render(<UberPage />);
    await advance(1);
    await advance(2);
    uber.simGetSnapshot.mockRejectedValueOnce(new Error('Snapshot unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Snapshot unavailable'));
    expect(uber.simRequest).toHaveBeenCalledTimes(1);
    expect(uber.simRace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(uber.simRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1');
  });
});
