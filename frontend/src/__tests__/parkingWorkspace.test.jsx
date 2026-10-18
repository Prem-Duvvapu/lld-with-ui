// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ParkingLotPage from '../lld/parking/ParkingLotPage';
import ParkingSimulation from '../lld/parking/ParkingSimulation';
import * as parking from '../lld/parking/api';
import { ApiError } from '../utils/api';

vi.mock('../lld/parking/api');

const gates = [{ id: 'G1', name: 'Main entry', type: 'ENTRY' }, { id: 'G3', name: 'Main exit', type: 'EXIT' }];
const ticket = { ticketNumber: 'TKT-1', vehicleNumber: 'CAR-42', vehicleType: 'CAR', spotId: 'F1-C1', entryTime: '2026-10-18T10:00:00.123456789', amount: 20, elapsedMinutes: 37 };
const floors = [{ floorNumber: 1, spots: [{ id: 'F1-C1', vehicleType: 'CAR', occupied: false }] }];

function openParking(tab = 'entry') {
  sessionStorage.setItem('lld-tab-parking', tab);
  return render(<MemoryRouter><ParkingLotPage /></MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  parking.getGates.mockResolvedValue(gates);
  parking.getFloors.mockResolvedValue(floors);
  parking.getActiveTickets.mockResolvedValue([ticket]);
  parking.vehicleEntry.mockResolvedValue(ticket);
  parking.scanVehicleExit.mockResolvedValue(ticket);
  parking.payVehicleExit.mockResolvedValue({ ...ticket, amount: 25, paymentMethod: 'CARD' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Parking live workspace', () => {
  it.each(['entry', 'exit'])('%s exposes gate errors and an explicit recovery action', async (tab) => {
    parking.getGates.mockRejectedValueOnce(new ApiError(503, 'Gate directory unavailable', {}));
    openParking(tab);
    expect(await screen.findByRole('alert')).toHaveTextContent('Gate directory unavailable');
    const submit = screen.getByRole('button', { name: tab === 'entry' ? /Park Vehicle/ : /Scan Ticket/ });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: tab === 'entry' ? 'Main entry' : 'Main exit' })).toBeInTheDocument();
    expect(submit).not.toBeDisabled();
  });

  it('explains an empty gate directory instead of enabling an impossible entry', async () => {
    parking.getGates.mockResolvedValue([]);
    openParking();
    expect(await screen.findByText('No entry gates are configured.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Park Vehicle/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh gates' })).toBeInTheDocument();
  });

  it('rejects whitespace input without issuing a ticket', async () => {
    openParking();
    await screen.findByRole('option', { name: 'Main entry' });
    fireEvent.change(screen.getByLabelText('Vehicle Number'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByRole('button', { name: /Park Vehicle/ }).closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a vehicle number');
    expect(parking.vehicleEntry).not.toHaveBeenCalled();
  });

  it('serializes entry, preserves rejected input, and focuses the issued ticket', async () => {
    let rejectEntry;
    parking.vehicleEntry.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectEntry = reject; }));
    openParking();
    await screen.findByRole('option', { name: 'Main entry' });
    fireEvent.change(screen.getByLabelText('Vehicle Number'), { target: { value: ' CAR-42 ' } });
    const submit = screen.getByRole('button', { name: /Park Vehicle/ });
    fireEvent.submit(submit.closest('form'));
    fireEvent.submit(submit.closest('form'));
    expect(parking.vehicleEntry).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Vehicle Type')).toBeDisabled();
    await act(async () => rejectEntry(new ApiError(409, 'No CAR spots remain', {})));
    expect(screen.getByRole('alert')).toHaveTextContent('No CAR spots remain');
    expect(screen.getByLabelText('Vehicle Number')).toHaveValue(' CAR-42 ');
    fireEvent.submit(submit.closest('form'));
    const result = await screen.findByRole('heading', { name: /Ticket Issued/ });
    expect(result).toHaveFocus();
    expect(screen.getByText('2026-10-18 10:00:00')).toBeInTheDocument();
    expect(parking.vehicleEntry.mock.calls[1].slice(0, 4)).toEqual(['G1', 'CAR-42', 'CAR', 'NEAREST']);
  });

  it('explains uncertain entry outcomes without automatically repeating the mutation', async () => {
    parking.vehicleEntry.mockRejectedValue(new ApiError(0, 'Request timed out', null));
    openParking();
    await screen.findByRole('option', { name: 'Main entry' });
    fireEvent.change(screen.getByLabelText('Vehicle Number'), { target: { value: 'CAR-42' } });
    fireEvent.submit(screen.getByRole('button', { name: /Park Vehicle/ }).closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check Active Tickets before trying again');
    expect(parking.vehicleEntry).toHaveBeenCalledTimes(1);
  });

  it('uses one payment, freezes its inputs, and shows the actual receipt rather than the preview', async () => {
    let finishPayment;
    parking.payVehicleExit.mockImplementationOnce(() => new Promise(resolve => { finishPayment = resolve; }));
    openParking('exit');
    await screen.findByRole('option', { name: 'Main exit' });
    fireEvent.change(screen.getByLabelText('Ticket Number'), { target: { value: ' TKT-1 ' } });
    fireEvent.submit(screen.getByRole('button', { name: /Scan Ticket/ }).closest('form'));
    const pay = await screen.findByRole('button', { name: /Pay & Exit/ });
    fireEvent.change(screen.getByLabelText('Select Payment Method'), { target: { value: 'CARD' } });
    fireEvent.click(pay);
    fireEvent.click(pay);
    expect(parking.payVehicleExit).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Select Payment Method')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back to ticket scan' })).toBeDisabled();
    await act(async () => finishPayment({ ...ticket, amount: 25, paymentMethod: 'CARD' }));
    expect(screen.getByText('₹25.00 (CARD)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Payment Successful/ })).toHaveFocus();
    expect(parking.payVehicleExit.mock.calls[0].slice(0, 4)).toEqual(['G3', 'TKT-1', 'HOURLY', 'CARD']);
  });

  it('requires a fresh scan after an uncertain payment and keeps the ticket draft', async () => {
    parking.payVehicleExit.mockRejectedValueOnce(new ApiError(0, 'Payment response lost', null));
    openParking('exit');
    await screen.findByRole('option', { name: 'Main exit' });
    fireEvent.change(screen.getByLabelText('Ticket Number'), { target: { value: 'TKT-1' } });
    fireEvent.submit(screen.getByRole('button', { name: /Scan Ticket/ }).closest('form'));
    fireEvent.click(await screen.findByRole('button', { name: /Pay & Exit/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Rescan this ticket before paying again');
    expect(screen.getByRole('button', { name: /Pay & Exit/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to ticket scan' }));
    expect(screen.getByLabelText('Ticket Number')).toHaveValue('TKT-1');
    expect(screen.getByLabelText('Ticket Number')).toHaveFocus();
    fireEvent.submit(screen.getByRole('button', { name: /Scan Ticket/ }).closest('form'));
    expect(await screen.findByRole('button', { name: /Pay & Exit/ })).not.toBeDisabled();
    expect(parking.payVehicleExit).toHaveBeenCalledTimes(1);
  });

  it.each(['spots', 'tickets'])('%s retains its last snapshot when polling fails and supports retry', async (tab) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const read = tab === 'spots' ? parking.getFloors : parking.getActiveTickets;
    openParking(tab);
    await screen.findByText(tab === 'spots' ? 'Floor 1' : 'TKT-1');
    read.mockRejectedValueOnce(new ApiError(503, 'Snapshot unavailable', {}));
    await act(async () => vi.advanceTimersByTimeAsync(5100));
    expect(screen.getByRole('alert')).toHaveTextContent('Snapshot unavailable');
    expect(screen.getByRole('alert')).toHaveTextContent('last successful snapshot');
    expect(screen.getByText(tab === 'spots' ? 'Floor 1' : 'TKT-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('does not repeatedly pay a preview after a known already-exited rejection', async () => {
    parking.payVehicleExit.mockRejectedValueOnce(new ApiError(409, 'Ticket already exited', { code: 'TicketAlreadyExitedException' }));
    openParking('exit');
    await screen.findByRole('option', { name: 'Main exit' });
    fireEvent.change(screen.getByLabelText('Ticket Number'), { target: { value: 'TKT-1' } });
    fireEvent.submit(screen.getByRole('button', { name: /Scan Ticket/ }).closest('form'));
    fireEvent.click(await screen.findByRole('button', { name: 'Pay & Exit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ticket already exited');
    expect(screen.getByRole('button', { name: 'Pay & Exit' })).toBeDisabled();
    expect(screen.getByText(/Return to the ticket scan/)).toBeInTheDocument();
    expect(parking.payVehicleExit).toHaveBeenCalledTimes(1);
  });

  it('bounds ticket pages and labels the spot filter', async () => {
    parking.getActiveTickets.mockResolvedValue(Array.from({ length: 60 }, (_unused, index) => ({ ...ticket, ticketNumber: `TKT-${index + 1}` })));
    openParking('tickets');
    await screen.findByText('TKT-1');
    expect(screen.getAllByText('37 min')).toHaveLength(25);
    expect(screen.queryByText('TKT-26')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next ticket page' }));
    expect(screen.getByText('TKT-26')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Spots', exact: true }));
    expect(await screen.findByLabelText('Show parking spots')).toBeInTheDocument();
  });

  it('aborts pending reads and entry on departure and ignores a late success', async () => {
    let finishEntry;
    parking.vehicleEntry.mockImplementationOnce(() => new Promise(resolve => { finishEntry = resolve; }));
    const view = openParking();
    await screen.findByRole('option', { name: 'Main entry' });
    fireEvent.change(screen.getByLabelText('Vehicle Number'), { target: { value: 'CAR-42' } });
    fireEvent.submit(screen.getByRole('button', { name: /Park Vehicle/ }).closest('form'));
    const signal = parking.vehicleEntry.mock.calls[0][4].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => finishEntry(ticket));
    expect(screen.queryByText('Ticket Issued')).not.toBeInTheDocument();
  });

  it.each(['entry', 'spots', 'tickets'])('%s aborts its pending read and never restarts polling after departure', async (tab) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const read = tab === 'entry' ? parking.getGates : tab === 'spots' ? parking.getFloors : parking.getActiveTickets;
    let finishRead;
    read.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    const view = openParking(tab);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    const signal = read.mock.calls[0][0].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { finishRead([]); await vi.advanceTimersByTimeAsync(65000); });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('coalesces a manual retry with a scheduled poll instead of starting a second read', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    parking.getFloors.mockRejectedValueOnce(new ApiError(503, 'Layout unavailable', {}));
    openParking('spots');
    await screen.findByRole('alert');
    let finishRetry;
    parking.getFloors.mockImplementationOnce(() => new Promise(resolve => { finishRetry = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(async () => vi.advanceTimersByTimeAsync(11000));
    expect(parking.getFloors).toHaveBeenCalledTimes(2);
    await act(async () => finishRetry(floors));
    expect(screen.getByText('Floor 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Parking sandbox lifecycle', () => {
  const empty = { spots: [], activeTickets: [], events: [], entryGateId: 'SIM-G1', exitGateId: 'SIM-G2' };

  it('rejects blank configuration without a reset request and recovers explicitly', async () => {
    parking.simReset.mockResolvedValue(empty);
    render(<ParkingSimulation />);
    fireEvent.change(screen.getByLabelText('Vehicle number'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start simulation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a vehicle number');
    expect(parking.simReset).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Vehicle number'), { target: { value: 'SIM-42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(parking.simReset).toHaveBeenCalledTimes(1);
  });

  it('aborts a pending sandbox action on departure without issuing later steps', async () => {
    parking.simReset.mockImplementation(() => new Promise(() => {}));
    const view = render(<ParkingSimulation />);
    fireEvent.click(screen.getByRole('button', { name: 'Start simulation' }));
    const signal = parking.simReset.mock.calls[0][0].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    expect(parking.simEntry).not.toHaveBeenCalled();
  });

  it('bounds returned activity while preserving the total event count', async () => {
    parking.simReset.mockResolvedValue({ ...empty, events: Array.from({ length: 70 }, (_unused, index) => ({ id: index, eventType: 'RECORDED', description: `Event ${index}`, timestamp: '10:00:00' })) });
    render(<ParkingSimulation />);
    fireEvent.click(screen.getByRole('button', { name: 'Start simulation' }));
    expect(await screen.findByText('Showing the latest 50 of 70 events.')).toBeInTheDocument();
    expect(screen.queryByText('Event 0')).not.toBeInTheDocument();
    expect(screen.getByText('Event 69')).toBeInTheDocument();
  });
});
