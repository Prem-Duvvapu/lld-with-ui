// Sequence diagram content for payment.
// Grounded directly in PaymentService#charge/chargeWithIdempotency and
// PaymentConcurrencyTest#repeatedDoubleSubmitRaceNeverChargesTwice: a client retrying the same
// idempotencyKey (e.g. after a timeout) concurrently, both requests racing to be "the one" that
// actually charges. A class diagram shows the idempotency cache and lock maps; it does not show
// why the loser has to BLOCK on the winner rather than just checking a flag and moving on.
export default {
  title: 'Payment Gateway — Two Concurrent Retries of the Same Idempotency Key',
  description:
    'A per-idempotency-key lock object (lazily created via computeIfAbsent) wraps the whole "check cache -> charge -> populate cache" sequence, mirroring shoppingcart.service.ShoppingCartService#placeOrder\'s idempotent-checkout precedent exactly. This is deliberately NOT a lock-free ConcurrentHashMap.putIfAbsent claim: that could only atomically claim that a payment id owns the key, not that the actual Payment behind it has finished being created and charged — a lock-free loser could read a "claimed" key before the winner ever finishes. The synchronized block instead makes the loser physically block until the winner is completely done, then read the now-populated cache.',
  flows: [
    {
      id: 'concurrent-double-submit-same-idempotency-key',
      label: 'Request A and Request B both retry the same idempotencyKey — only one charge is ever processed',
      description:
        'A client\'s charge request times out client-side but actually reached the server; the client retries with the SAME idempotencyKey while the original request is still in flight. Both threads call charge() with idempotencyKey="IDEMP-42" at nearly the same instant (see PaymentConcurrencyTest, CountDownLatch-released threads). Whichever thread wins the race to enter the synchronized block runs the fraud chain and the payment strategy exactly once; the loser blocks on the SAME lock object, then reads the winner\'s finished Payment straight from the now-populated cache — never re-running the charge.',
      participants: [
        { id: 'reqA', name: 'Request A\n(retry after timeout)', kind: 'actor' },
        { id: 'reqB', name: 'Request B\n(original, still in flight)', kind: 'actor' },
        { id: 'service', name: 'PaymentService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'idempotencyKeyLocks\n.get("IDEMP-42")', kind: 'component', stereotype: 'lock' },
        { id: 'cache', name: 'idempotencyCache', kind: 'component' },
        { id: 'chain', name: 'FraudCheckChainFactory', kind: 'component' },
        { id: 'processor', name: 'PaymentGatewayProcessor', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['cache'], text: 'idempotencyCache has no entry yet for "IDEMP-42" — neither thread has finished.' },
        { from: 'reqA', to: 'service', text: 'charge("IDEMP-42", "payer-1", 500, UPI)' },
        { from: 'reqB', to: 'service', text: 'charge("IDEMP-42", "payer-1", 500, UPI)  — arrives ~simultaneously' },
        { from: 'service', to: 'lock', text: '[A] synchronized(keyLock)  — acquired', activate: 'lock' },
        { from: 'service', to: 'lock', text: '[B] synchronized(keyLock)  — BLOCKS, A holds it' },
        { from: 'service', to: 'cache', text: '[A] cache.get("IDEMP-42") -> null (cache miss)' },
        { from: 'service', to: 'chain', text: '[A] run fraud chain -> approved' },
        { from: 'service', to: 'processor', text: '[A] process(paymentId, 500, UPI)' },
        { from: 'processor', to: 'service', text: 'return "TX-UPI-A1B2C3D4"', type: 'return' },
        { from: 'service', to: 'cache', text: '[A] cache.put("IDEMP-42", Payment(CAPTURED))' },
        { from: 'service', to: 'lock', text: '[A] exit synchronized block', deactivate: 'lock' },
        { from: 'service', to: 'reqA', text: 'return Payment(id="PAY-1001", CAPTURED, tx="TX-UPI-A1B2C3D4")', type: 'return' },
        { from: 'lock', to: 'service', text: '[Request B] synchronized() finally returns — B is now inside', activate: 'lock' },
        { type: 'note', over: ['cache'], text: 'This is the step a lock-free putIfAbsent claim could NOT guarantee: B must see the FULLY POPULATED cache entry, not just "someone claimed this key."' },
        { from: 'service', to: 'cache', text: '[B] cache.get("IDEMP-42") -> Payment(id="PAY-1001", CAPTURED)  — cache hit!' },
        { from: 'service', to: 'lock', text: '[B] exit synchronized block', deactivate: 'lock' },
        { from: 'service', to: 'reqB', text: 'return the IDENTICAL Payment("PAY-1001") — no second fraud check, no second charge', type: 'return' },
        { type: 'note', over: ['reqA', 'reqB'], text: 'Exactly one payment created, exactly one call to the payment strategy, one transaction id shared by both responses. See PaymentConcurrencyTest#repeatedDoubleSubmitRaceNeverChargesTwice, run for 300 rounds.' },
      ],
    },
  ],
};
