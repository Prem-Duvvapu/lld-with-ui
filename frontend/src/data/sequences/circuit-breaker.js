// Sequence diagram content for circuit-breaker.
// Grounded directly in CircuitBreaker#attemptCall, ClosedState#onFailure, and
// OpenState/HalfOpenState (State + Strategy patterns).
export default {
  title: 'Circuit Breaker — Trip, Cooldown & Half-Open Recovery',
  description:
    'How a run of failures trips the breaker to OPEN, how OPEN rejects calls without attempting them, and how the next call after the cooldown elapses becomes the HALF_OPEN trial that either closes the circuit or reopens it.',
  flows: [
    {
      id: 'trip-and-recover-flow',
      label: 'Consecutive failures trip the breaker, then it recovers through HALF_OPEN',
      description:
        'payment-service fails 3 calls in a row, tripping the breaker to OPEN. A call attempted immediately afterward is rejected without ever reaching the downstream. Once the cooldown has elapsed, the next call becomes the HALF_OPEN trial — here it succeeds, closing the circuit.',
      participants: [
        { id: 'caller', name: 'Caller', kind: 'actor' },
        { id: 'controller', name: 'CircuitBreaker\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'CircuitBreaker\nService', kind: 'component', stereotype: 'facade' },
        { id: 'breaker', name: 'CircuitBreaker\n(payment-service)', kind: 'component', stereotype: 'context' },
        { id: 'state', name: 'CircuitState\n(Closed/Open/HalfOpen)', kind: 'component', stereotype: 'state' },
        { id: 'policy', name: 'TripPolicy', kind: 'component', stereotype: 'strategy' },
      ],
      steps: [
        { from: 'caller', to: 'controller', text: 'POST /api/circuitbreaker/payment-service/call {simulateSuccess:false}  (x3)' },
        { from: 'controller', to: 'service', text: 'call("payment-service", false)', activate: 'service' },
        { from: 'service', to: 'breaker', text: 'attemptCall(false)', activate: 'breaker' },
        { from: 'breaker', to: 'state', text: 'ClosedState.onFailure(this)' },
        { from: 'state', to: 'policy', text: 'shouldTrip(breaker) — 3rd consecutive failure' },
        { from: 'policy', to: 'state', text: 'true', type: 'return' },
        { from: 'state', to: 'breaker', text: 'transitionTo(OpenState.INSTANCE)' },
        { from: 'breaker', to: 'service', text: 'return CallOutcome(phase=OPEN)', type: 'return', deactivate: 'breaker' },
        { from: 'service', to: 'controller', text: 'return outcome', type: 'return', deactivate: 'service' },
        { from: 'caller', to: 'controller', text: 'POST .../call {simulateSuccess:true}  — next call, immediately' },
        { from: 'controller', to: 'service', text: 'call("payment-service", true)', activate: 'service' },
        { from: 'service', to: 'breaker', text: 'attemptCall(true)', activate: 'breaker' },
        { from: 'breaker', to: 'state', text: 'OpenState.allowCall() — cooldown not elapsed' },
        { from: 'state', to: 'breaker', text: 'false', type: 'return' },
        { from: 'breaker', to: 'service', text: 'throw CircuitOpenException — rejected, downstream never attempted', type: 'return', deactivate: 'breaker' },
        { from: 'service', to: 'controller', text: '409 Conflict', type: 'return', deactivate: 'service' },
        { from: 'caller', to: 'controller', text: 'POST .../call {simulateSuccess:true}  — after the cooldown has elapsed' },
        { from: 'controller', to: 'service', text: 'call("payment-service", true)', activate: 'service' },
        { from: 'service', to: 'breaker', text: 'attemptCall(true)', activate: 'breaker' },
        { from: 'breaker', to: 'breaker', text: 'cooldownElapsed() — true' },
        { from: 'breaker', to: 'state', text: 'transitionTo(HalfOpenState.INSTANCE)' },
        { from: 'breaker', to: 'state', text: 'HalfOpenState.onSuccess(this) — the trial call' },
        { from: 'state', to: 'breaker', text: 'transitionTo(ClosedState.INSTANCE)' },
        { from: 'breaker', to: 'service', text: 'return CallOutcome(phase=CLOSED)', type: 'return', deactivate: 'breaker' },
        { from: 'service', to: 'controller', text: '200 OK — circuit recovered', type: 'return', deactivate: 'service' },
      ],
    },
  ],
};
