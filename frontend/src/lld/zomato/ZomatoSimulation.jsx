import { useState } from 'react';
import * as api from './api';
import { Select } from '../../components/ui/Input';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import { expectSimulationRejection } from '../../utils/simulation';
import ZomatoSimulationScene from './ZomatoSimulationScene';
import '../../components/SimulationPanel.css';

const STEPS = [
  { title: 'Prepare the food delivery sandbox', detail: 'Reset the order, restaurant, and delivery-agent state. Choose a payment method before placing your order.' },
  { title: 'Race for a delivery agent', detail: 'Ask the server to run five concurrent assignment attempts against one agent and inspect the outcomes.' },
  { title: 'Place an order', detail: 'Order the sandbox meal. The server calculates item prices, delivery fee, tax, and total.' },
  { title: 'Confirm the order', detail: 'The restaurant accepts the order.' },
  { title: 'Prepare the meal', detail: 'The kitchen starts cooking. Watch the order move to preparing.' },
  { title: 'Assign a delivery agent', detail: 'Mark the food ready and let the server claim an available agent.' },
  { title: 'Check the cancellation guard', detail: 'Try cancelling after dispatch. Only the expected order-transition rejection counts as a successful demonstration.' },
  { title: 'Try an incorrect OTP', detail: 'Attempt delivery with 0000. The server must reject it and keep the agent assigned.' },
  { title: 'Deliver with the correct OTP', detail: 'Use the order’s actual delivery OTP to complete delivery and release its agent.' },
  { title: 'Check the final delivery state', detail: 'Refresh order status, agent availability, payment details, and activity.' },
];

export default function ZomatoSimulation() {
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    let order = previous?.order || null;
    let race = previous?.race || null;
    let cancelRejection = previous?.cancelRejection || '';
    let otpRejection = previous?.otpRejection || '';
    if (index === 0) {
      await api.simReset();
      order = null;
      race = null;
      cancelRejection = '';
      otpRejection = '';
    }
    if (index === 1) race = await api.simRace('AGENT-201', 5);
    if (index === 2) order = await api.simOrder({ paymentMethod });
    if (index === 3) order = await api.simConfirm(order.id);
    if (index === 4) order = await api.simPrepare(order.id);
    if (index === 5) {
      order = await api.simReady(order.id);
      if (order.status !== 'OUT_FOR_DELIVERY') throw new Error('No delivery agent was assigned. Reset the sandbox to start a fresh run.');
    }
    if (index === 6) cancelRejection = await expectSimulationRejection(() => api.simCancel(order.id, 'Cancel while out for delivery'), 409, 'InvalidOrderTransitionException');
    if (index === 7) otpRejection = await expectSimulationRejection(() => api.simDeliver(order.id, '0000'), 400, 'InvalidDeliveryOtpException');
    if (index === 8) order = await api.simDeliver(order.id, order.deliveryOtp);
    const [state, events] = await Promise.all([api.simState(), api.simEvents()]);
    if (order) order = state.orders.find(candidate => candidate.id === order.id) || order;
    return { order, race, cancelRejection, otpRejection, state, events };
  });
  const { order, race, cancelRejection, otpRejection, state, events = [] } = playback.result || {};
  const agents = state?.agents || [];

  return (
    <div className="simulation-panel zomato-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <fieldset className="simulation-panel-card" disabled={playback.busy || playback.playing || playback.completed > 2}>
        <legend>Order settings</legend>
        <Select label="Payment method" id="zomato-sim-payment" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>
          <option value="UPI">UPI</option><option value="CARD">Card</option><option value="CASH">Cash</option>
        </Select>
        <p>Reset to change settings after an order is placed.</p>
      </fieldset>
      <ZomatoSimulationScene order={order} />
      <section className="simulation-panel-card" aria-label="Food delivery summary">
        <h3>{playback.done ? 'Final delivery summary' : 'Order and delivery status'}</h3>
        <p><strong>Order status: {order?.status || (state ? 'Sandbox ready' : 'Ready to start')}</strong></p>
        {order && <>
          <p>{order.restaurantName} · Order {order.id}</p>
          <dl>
            <div><dt>Items</dt><dd>₹{order.itemTotal?.toFixed(2)}</dd></div>
            <div><dt>Delivery fee</dt><dd>₹{order.deliveryFee?.toFixed(2)}</dd></div>
            <div><dt>Tax</dt><dd>₹{order.tax?.toFixed(2)}</dd></div>
            <div><dt>Total</dt><dd>₹{order.totalAmount?.toFixed(2)}</dd></div>
            <div><dt>Assigned agent</dt><dd>{order.deliveryAgentName || 'Unassigned'}</dd></div>
            <div><dt>Delivery OTP</dt><dd>{order.deliveryOtp}</dd></div>
            <div><dt>Payment</dt><dd>{order.payment?.method} · {order.payment?.status}</dd></div>
          </dl>
        </>}
        {race && <p className="simulation-panel-note">Assignment race: {race.attempts} attempts · Winner: {race.winner} · {race.rejected} rejected.</p>}
        {cancelRejection && <p className="simulation-panel-note">Cancellation rejected: {cancelRejection}</p>}
        {otpRejection && <p className="simulation-panel-note">Incorrect OTP rejected: {otpRejection}</p>}
        <h4>Delivery agents</h4>
        <ul>{agents.map(agent => <li key={agent.id}>{agent.name} · {agent.available ? 'Available' : 'Assigned'}</li>)}</ul>
        {!state && <p>Start the simulation to load the delivery agents.</p>}
      </section>
      <details className="simulation-panel-card" open>
        <summary>Sandbox activity ({events.length})</summary>
        <ol>{events.slice().reverse().map(event => <li key={event.id}><strong>{event.type}</strong> · {event.actor}<p>{event.message}</p></li>)}</ol>
      </details>
    </div>
  );
}
