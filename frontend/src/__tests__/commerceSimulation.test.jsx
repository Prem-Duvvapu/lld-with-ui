// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ZomatoSimulation from '../lld/zomato/ZomatoSimulation';
import SplitwiseSimulation from '../lld/splitwise/SplitwiseSimulation';
import MovieTicketSimulation from '../lld/movieticket/MovieTicketSimulation';
import * as food from '../lld/zomato/api';
import * as expenses from '../lld/splitwise/api';
import * as cinema from '../lld/movieticket/api';
import { ApiError } from '../utils/api';

vi.mock('../lld/zomato/api');
vi.mock('../lld/splitwise/api');
vi.mock('../lld/movieticket/api');

beforeEach(() => {
  vi.resetAllMocks();
  let order = null;
  let foodEvents = [];
  const foodLog = type => foodEvents.push({ id: foodEvents.length + 1, type, actor: 'Sandbox', message: type });
  food.simReset.mockImplementation(async () => { order = null; foodEvents = []; });
  food.simRace.mockResolvedValue({ attempts: 5, winner: 'Order-2', rejected: 4 });
  food.simOrder.mockImplementation(async ({ paymentMethod }) => {
    order = { id: 'ORDER-42', restaurantName: 'Spice Garden', status: 'PLACED', deliveryOtp: '4321', totalAmount: 425, itemTotal: 370, deliveryFee: 30, tax: 25, payment: { method: paymentMethod, status: 'COMPLETED' } };
    foodLog('ORDER_PLACED');
    return structuredClone(order);
  });
  for (const [method, status] of [['simConfirm', 'CONFIRMED'], ['simPrepare', 'PREPARING'], ['simReady', 'OUT_FOR_DELIVERY']]) {
    food[method].mockImplementation(async () => { order.status = status; foodLog(status); return structuredClone(order); });
  }
  food.simCancel.mockRejectedValue(new ApiError(409, 'Cannot cancel dispatched order', { code: 'InvalidOrderTransitionException' }));
  food.simDeliver.mockImplementation(async (orderId, otp) => {
    if (otp !== order.deliveryOtp) throw new ApiError(400, 'Invalid delivery OTP', { code: 'InvalidDeliveryOtpException' });
    order.status = 'DELIVERED';
    foodLog('DELIVERED');
    return structuredClone(order);
  });
  food.simState.mockImplementation(async () => ({ orders: order ? [structuredClone(order)] : [], agents: [{ id: 'AGENT-201', name: 'Ravi', available: !order || order.status === 'DELIVERED' }], restaurants: [] }));
  food.simEvents.mockImplementation(async () => structuredClone(foodEvents));

  let nextUser = 0;
  let settled = false;
  let expenseEvents = [];
  expenses.simReset.mockImplementation(async () => { nextUser = 0; settled = false; expenseEvents = []; });
  expenses.simCreateUser.mockImplementation(async name => ({ id: ++nextUser * 11, name }));
  expenses.simCreateGroup.mockResolvedValue({ id: 77, name: 'Goa Trip 2026' });
  expenses.simAddExpense.mockImplementation(async (description, amount, paidBy, groupId, splits) => {
    expenseEvents.push({ id: expenseEvents.length + 1, type: 'EXPENSE_ADDED', actor: 'Participant', description });
    return { description, amount, paidBy: { name: 'Participant' }, splits: splits.length ? splits : [{ type: 'EQUAL' }] };
  });
  expenses.simSettleUp.mockImplementation(async () => {
    settled = true;
    expenseEvents.push({ id: 4, type: 'SETTLEMENT', actor: 'Diana', description: 'Diana paid Alice' });
    return { fromUser: { name: 'Diana' }, toUser: { name: 'Alice' }, amount: 1000 };
  });
  expenses.simGetBalances.mockImplementation(async () => settled ? {} : { Alice: { Diana: 1000 }, Diana: { Alice: -1000 } });
  expenses.simGetSimplifiedDebts.mockImplementation(async () => settled ? [] : [{ fromUser: { name: 'Diana' }, toUser: { name: 'Alice' }, amount: 1000 }]);
  expenses.simGetEvents.mockImplementation(async () => structuredClone(expenseEvents));

  let seats = [];
  let cinemaEvents = [];
  cinema.simReset.mockImplementation(async () => {
    seats = [1, 2, 3, 7, 8, 19, 20].map(id => ({ id, row: 1, col: id, status: 'AVAILABLE' }));
    cinemaEvents = [];
  });
  const changeSeats = (ids, status, heldByUserId = null) => {
    seats = seats.map(seat => ids.includes(seat.id) ? { ...seat, status, heldByUserId } : seat);
  };
  cinema.simHold.mockImplementation(async (showId, ids, user) => {
    if (ids.includes(2) && user === 'user2') throw new ApiError(409, 'Seat 2 is held by Alice', { code: 'SeatNotAvailableException' });
    changeSeats(ids, 'HELD', user);
    return {};
  });
  cinema.simBook.mockImplementation(async (showId, ids, user) => {
    changeSeats(ids, 'BOOKED', user);
    return { id: user === 'user1' ? 42 : 99, status: 'CONFIRMED' };
  });
  cinema.simExpire.mockImplementation(async (showId, ids) => { changeSeats(ids, 'AVAILABLE'); });
  cinema.simCancel.mockImplementation(async id => {
    changeSeats([1, 2], 'AVAILABLE');
    cinemaEvents.push({ id: 1, eventType: 'BOOKING_CANCELLED', actorName: 'Alice', description: `Cancelled booking ${id}` });
    return { id, status: 'CANCELLED' };
  });
  cinema.simGetSeats.mockImplementation(async () => structuredClone(seats));
  cinema.simGetEvents.mockImplementation(async () => structuredClone(cinemaEvents));
});

async function advance(completed) {
  fireEvent.click(screen.getByRole('button', { name: completed === 1 ? 'Start simulation' : 'Next step' }));
  await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe(String(completed)));
}

describe('Commerce simulation playback', () => {
  it('runs cancellation and OTP guards, then refreshes delivered order and agent availability', async () => {
    render(<ZomatoSimulation />);
    expect(food.simReset).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'CARD' } });
    for (let completed = 1; completed <= 8; completed++) await advance(completed);
    expect(food.simOrder).toHaveBeenCalledWith({ paymentMethod: 'CARD' });
    expect(food.simCancel).toHaveBeenCalledWith('ORDER-42', 'Cancel while out for delivery');
    expect(food.simDeliver).toHaveBeenCalledWith('ORDER-42', '0000');
    expect(screen.getByText('Order status: OUT_FOR_DELIVERY')).toBeDefined();
    expect(screen.getByText(/Incorrect OTP rejected:/)).toBeDefined();
    await advance(9);
    await advance(10);
    expect(food.simDeliver).toHaveBeenLastCalledWith('ORDER-42', '4321');
    expect(screen.getByText('Order status: DELIVERED')).toBeDefined();
    expect(screen.getByText('Ravi · Available')).toBeDefined();
    expect(food.simState).toHaveBeenCalledTimes(10);
    expect(food.placeOrder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText(/Incorrect OTP rejected:/)).toBeNull();
    expect(screen.queryByText('Order status: DELIVERED')).toBeNull();
  });

  it('stops when the cancellation guard receives a server failure instead of a domain rejection', async () => {
    food.simCancel.mockRejectedValue(new ApiError(503, 'Delivery service unavailable', { code: 'InvalidOrderTransitionException' }));
    render(<ZomatoSimulation />);
    for (let completed = 1; completed <= 6; completed++) await advance(completed);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Delivery service unavailable'));
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('6');
    expect(food.simDeliver).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play' }).disabled).toBe(true);
  });

  it('uses returned participant IDs for all split types and refreshes the ledger after settlement', async () => {
    render(<SplitwiseSimulation />);
    expect(expenses.simReset).not.toHaveBeenCalled();
    for (let completed = 1; completed <= 9; completed++) await advance(completed);
    expect(expenses.simCreateGroup).toHaveBeenCalledWith('Goa Trip 2026', [11, 22, 33, 44]);
    expect(expenses.simAddExpense.mock.calls).toEqual([
      ['Hotel Booking', 4000, 11, 77, []],
      ['Beach Dinner', 1200, 22, 77, [11, 22, 33, 44].map(userId => ({ userId, type: 'PERCENTAGE', percentage: userId === 22 ? 40 : 20 }))],
      ['Cab Fare', 800, 33, 77, [11, 22, 33, 44].map(userId => ({ userId, type: 'EXACT', amount: 200 }))],
    ]);
    expect(expenses.simSettleUp).toHaveBeenCalledWith(44, 11, 77, 1000);
    expect(expenses.simGetSimplifiedDebts).toHaveBeenCalledTimes(3);
    expect(screen.getByText('No suggested transfers remain.')).toBeDefined();
    expect(screen.getByText('SETTLEMENT', { selector: 'strong' })).toBeDefined();
    expect(screen.queryByText('Owes Alice: ₹1000.00')).toBeNull();
    expect(expenses.addExpense).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText('SETTLEMENT', { selector: 'strong' })).toBeNull();
  });

  it('does not retry partially completed participant creation after a lost response', async () => {
    expenses.simCreateUser.mockResolvedValueOnce({ id: 11, name: 'Alice' }).mockRejectedValueOnce(new Error('Connection lost creating Bob'));
    render(<SplitwiseSimulation />);
    await advance(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Connection lost creating Bob'));
    expect(expenses.simCreateUser).toHaveBeenCalledTimes(2);
    expect(expenses.simCreateGroup).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(false));
    expect(expenses.simCreateUser).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('runs hold conflict, expiry, both bookings, and cancels the returned Alice booking ID', async () => {
    render(<MovieTicketSimulation />);
    expect(cinema.simReset).not.toHaveBeenCalled();
    for (let completed = 1; completed <= 11; completed++) await advance(completed);
    expect(cinema.simBook.mock.calls.map(call => call.slice(0, 3))).toEqual([[1, [1, 2], 'user1'], [1, [19], 'user4']]);
    expect(cinema.simExpire).toHaveBeenCalledWith(1, [19, 20], 'System');
    expect(cinema.simCancel).toHaveBeenCalledWith(42, 'Alice');
    expect(cinema.simGetSeats).toHaveBeenCalledTimes(11);
    expect(screen.getByText('Alice’s booking #42: CANCELLED')).toBeDefined();
    expect(screen.getByText('Diana’s booking #99: CONFIRMED')).toBeDefined();
    expect(screen.getByText('Overlapping hold rejected: Seat 2 is held by Alice')).toBeDefined();
    expect(cinema.bookSeats).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1'));
    expect(screen.queryByText('Alice’s booking #42: CANCELLED')).toBeNull();
  });

  it('does not mistake an unrelated 409 response for the expected seat conflict', async () => {
    render(<MovieTicketSimulation />);
    await advance(1);
    await advance(2);
    cinema.simHold.mockRejectedValueOnce(new ApiError(409, 'Different domain failure', { code: 'OtherException' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Different domain failure'));
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('2');
    expect(cinema.simBook).not.toHaveBeenCalled();
  });

  it('stops if the supposedly conflicting hold unexpectedly succeeds', async () => {
    render(<MovieTicketSimulation />);
    await advance(1);
    await advance(2);
    cinema.simHold.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('expected rejection did not occur'));
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('2');
    expect(cinema.simBook).not.toHaveBeenCalled();
  });
});
