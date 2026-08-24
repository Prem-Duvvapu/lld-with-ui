// Sequence diagram content for zomato.
// Grounded directly in the real classes and the RCA-007 incident: ZomatoController ->
// ZomatoService -> DeliveryAssignmentService.assignAgent(orderId) — the pool-scan path
// production code (markReadyForPickup) and the /sim/* engine (simReady) actually call, NOT
// the secondary assign(orderId, agentId) path. Scenario mirrors
// ZomatoConcurrencyTest#repeatedAssignAgentRaceNeverProducesTwoWinners (ORD-1/ORD-2 racing
// for AGENT-1).
export default {
  title: 'Zomato — Delivery Agent Assignment',
  description:
    'How two orders racing for the last available delivery agent resolve to exactly one winner. The class diagram lists DeliveryAssignmentService and its two lock maps, but only a sequence diagram shows why an order-scoped lock has to be taken before the agent-scoped lock, and why the agent has to be re-read a second time once that agent lock is actually held.',
  flows: [
    {
      id: 'race',
      label: 'Two orders, one agent',
      description:
        'ORD-1 and ORD-2 are both marked READY_FOR_PICKUP at effectively the same instant, and AGENT-1 is the only available delivery agent (ZomatoConcurrencyTest#repeatedAssignAgentRaceNeverProducesTwoWinners). The per-order ReentrantLock added in RCA-007 stops a single order from being claimed twice; it does NOT by itself serialize ORD-1 against ORD-2 — that is still the job of the per-agent ReentrantLock and the re-read taken inside it.',
      participants: [
        { id: 'restaurantA', name: 'Restaurant — Order 1', kind: 'actor' },
        { id: 'restaurantB', name: 'Restaurant — Order 2', kind: 'actor' },
        { id: 'controller', name: 'ZomatoController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ZomatoService', kind: 'component', stereotype: 'facade' },
        { id: 'assign', name: 'DeliveryAssignment\nService', kind: 'component' },
        { id: 'orderLock', name: 'orderLock(orderId)', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'agentLock', name: 'agentLock("AGENT-1")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'ZomatoRepository', kind: 'store' },
      ],
      steps: [
        { from: 'restaurantA', to: 'controller', text: 'PUT /orders/ORD-1/ready',
          detail: 'ORD-1 is READY_FOR_PICKUP; marking it ready is what triggers delivery-agent assignment inside markReadyForPickup().' },
        { from: 'controller', to: 'service', text: 'markReadyForPickup("ORD-1")', activate: 'service',
          detail: 'Controller only translates HTTP. ZomatoService owns the status transition and then calls DeliveryAssignmentService.assignAgent — the pool-scan path production code and the /sim/* engine both use, not the secondary assign(orderId, agentId) path.' },
        { from: 'restaurantB', to: 'controller', text: 'PUT /orders/ORD-2/ready' },
        { from: 'controller', to: 'service', text: 'markReadyForPickup("ORD-2")' },
        { type: 'note', over: ['controller', 'service'],
          text: 'Both HTTP threads are inside ZomatoService concurrently — nothing has serialized yet.' },
        { from: 'service', to: 'assign', text: 'assignAgent("ORD-1")', activate: 'assign' },
        { from: 'assign', to: 'orderLock', text: 'orderLockFor("ORD-1").lock()',
          detail: 'RCA-007: order lock is taken first, before any agent lock. Lock ordering is always order-then-agent, so the two lock types can never deadlock.' },
        { from: 'assign', to: 'repo', text: 'claimableOrder("ORD-1")' },
        { from: 'repo', to: 'assign', text: 'READY_FOR_PICKUP → OUT_FOR_DELIVERY OK', type: 'return' },
        { from: 'assign', to: 'repo', text: 'getAvailableDeliveryAgents()' },
        { from: 'repo', to: 'assign', text: 'return [AGENT-1]', type: 'return' },
        { from: 'assign', to: 'agentLock', text: 'lockFor("AGENT-1").lock() — ORD-1 wins' },
        { from: 'service', to: 'assign', text: 'assignAgent("ORD-2")' },
        { from: 'assign', to: 'orderLock', text: 'orderLockFor("ORD-2").lock() — different key',
          detail: 'ORD-2 gets its own order lock immediately. The order lock only protects THIS order from being claimed twice — it does not serialize ORD-2 against ORD-1. What actually decides the shared-agent race is the agent lock below.' },
        { from: 'assign', to: 'repo', text: 'claimableOrder("ORD-2")' },
        { from: 'repo', to: 'assign', text: 'READY_FOR_PICKUP → OUT_FOR_DELIVERY OK', type: 'return' },
        { from: 'assign', to: 'repo', text: 'getAvailableDeliveryAgents()' },
        { from: 'repo', to: 'assign', text: 'return [AGENT-1]  (still looks free)', type: 'return' },
        { from: 'assign', to: 'agentLock', text: 'lockFor("AGENT-1").lock() — ORD-2 attempts' },
        { type: 'note', over: ['assign', 'agentLock'], blocked: true,
          text: 'ORD-2 blocks on the same AGENT-1 lock — queued behind ORD-1, not racing it.' },
        { from: 'assign', to: 'repo', text: 'getDeliveryAgent("AGENT-1") — re-read INSIDE the lock',
          detail: 'Both orders saw AGENT-1 in their candidate scan — that scan alone is stale by the time a lock is granted. This re-read is what ZomatoConcurrencyTest#fiveOrdersRacingForOneAgentViaAssignAgent_onlyOneWins and #repeatedAssignAgentRaceNeverProducesTwoWinners pin down: the claim decision is made here, never on the earlier scan.' },
        { from: 'repo', to: 'assign', text: 'available == true', type: 'return' },
        { from: 'assign', to: 'repo', text: 'save AGENT-1 unavailable; ORD-1 → OUT_FOR_DELIVERY' },
        { from: 'assign', to: 'agentLock', text: 'unlock()  (finally)' },
        { from: 'assign', to: 'orderLock', text: 'orderLockFor("ORD-1").unlock()  (finally)' },
        { from: 'assign', to: 'service', text: 'return AGENT-1', type: 'return', deactivate: 'assign' },
        { from: 'service', to: 'controller', text: 'return ORD-1 (OUT_FOR_DELIVERY, agent=AGENT-1)', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'restaurantA', text: '200 OK — AGENT-1 out for delivery', type: 'return' },
        { from: 'assign', to: 'agentLock', text: 'lockFor("AGENT-1").lock() — now free, ORD-2 proceeds', activate: 'assign' },
        { from: 'assign', to: 'repo', text: 'getDeliveryAgent("AGENT-1") — re-read INSIDE the lock',
          detail: 'Same re-read, same lock — this is what makes ORD-2\'s rejection correct instead of a coin flip, and the exact call path RCA-007 flagged as untested before this suite existed (the original regression test only covered assign(orderId, agentId), never assignAgent(orderId)).' },
        { from: 'repo', to: 'assign', text: 'available == false', type: 'return' },
        { from: 'assign', to: 'agentLock', text: 'unlock()  (finally)' },
        { from: 'assign', to: 'orderLock', text: 'orderLockFor("ORD-2").unlock()  (finally)' },
        { from: 'assign', to: 'service', text: 'throw NoAgentAvailableException("ORD-2")', type: 'return', deactivate: 'assign',
          detail: 'A typed DomainException with @ResponseStatus — but unlike Uber\'s DriverUnavailableException, markReadyForPickup() catches this ONE specific exception itself instead of letting it propagate to the controller.' },
        { type: 'note', over: ['service'],
          text: 'ZomatoService catches NoAgentAvailableException — the order stays READY_FOR_PICKUP and a "waiting for agent" notification is sent instead of an HTTP error.' },
        { from: 'service', to: 'controller', text: 'return ORD-2 (READY_FOR_PICKUP, no agent yet)', type: 'return' },
        { from: 'controller', to: 'restaurantB', text: '200 OK — waiting for delivery agent', type: 'return' },
      ],
    },
  ],
};
