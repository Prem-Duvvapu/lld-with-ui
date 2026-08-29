// Sequence diagram content for linkedin.
// Grounded directly in LinkedInService#sendConnectionRequest, canonical pair locking
// (pairKey = min(u1, u2) + "#" + max(u1, u2)), and notification dispatch.
export default {
  title: 'LinkedIn — Connection Request with Canonical Pair Locking',
  description:
    'How LinkedInService uses canonical pair locking (min(u1, u2) + "#" + max(u1, u2)) to serialize bidirectional connection requests. This eliminates race conditions where two users simultaneously request to connect with each other, avoiding deadlocks and duplicate connection records.',
  flows: [
    {
      id: 'canonical-pair-lock-connection',
      label: 'Bidirectional simultaneous connection requests resolve cleanly',
      description:
        'Alice (user-01) and Bob (user-02) send connection requests to each other at the exact same instant. Both compute the identical canonical key "user-01#user-02" and contend for the same ReentrantLock. Alice acquires the lock first and creates a PENDING connection; Bob\'s thread then sees the active request and fails gracefully without deadlocking.',
      participants: [
        { id: 'userA', name: 'User A\n(Alice: user-01)', kind: 'actor' },
        { id: 'userB', name: 'User B\n(Bob: user-02)', kind: 'actor' },
        { id: 'controller', name: 'LinkedIn\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'LinkedIn\nService', kind: 'component', stereotype: 'facade' },
        { id: 'pairLock', name: 'pairLock\n("user-01#user-02")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'Connection Maps\n& Repositories', kind: 'store' },
        { id: 'notifier', name: 'Notification\nObservers', kind: 'component', stereotype: 'observer' },
      ],
      steps: [
        { from: 'userA', to: 'controller', text: 'POST /api/linkedin/connections/request {sender: "user-01", receiver: "user-02"}' },
        { from: 'controller', to: 'service', text: 'sendConnectionRequest("user-01", "user-02")', activate: 'service' },
        { from: 'userB', to: 'controller', text: 'POST /api/linkedin/connections/request {sender: "user-02", receiver: "user-01"}' },
        { from: 'controller', to: 'service', text: 'sendConnectionRequest("user-02", "user-01")' },
        { from: 'service', to: 'service', text: '[Alice] compute pairKey: "user-01" < "user-02" → "user-01#user-02"' },
        { from: 'service', to: 'service', text: '[Bob] compute pairKey: "user-01" < "user-02" → "user-01#user-02"' },
        { from: 'service', to: 'pairLock', text: '[Alice] pairLock.lock() — ACQUIRED', activate: 'pairLock' },
        { from: 'service', to: 'pairLock', text: '[Bob] pairLock.lock() — BLOCKS on canonical pair key' },
        { from: 'service', to: 'repo', text: '[Alice] activeConnectionPairs.get("user-01#user-02") → null' },
        { from: 'service', to: 'repo', text: '[Alice] create Connection {id: "conn-1", PENDING} ; put("user-01#user-02", "conn-1")' },
        { from: 'service', to: 'notifier', text: '[Alice] dispatchNotification(CONNECTION_REQUEST to Bob)' },
        { from: 'service', to: 'pairLock', text: '[Alice] pairLock.unlock()', deactivate: 'pairLock' },
        { from: 'service', to: 'controller', text: '[Alice] return Connection conn-1 (PENDING)', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'userA', text: '200 OK — Connection request sent to Bob', type: 'return' },
        { type: 'note', over: ['pairLock'], text: 'Lock freed. Bob unblocks and re-checks inside the lock.' },
        { from: 'service', to: 'pairLock', text: '[Bob] pairLock.lock() — ACQUIRED', activate: 'pairLock' },
        { from: 'service', to: 'repo', text: '[Bob] activeConnectionPairs.get("user-01#user-02") → "conn-1"' },
        { from: 'service', to: 'repo', text: '[Bob] connectionsById.get("conn-1") → Connection {status: PENDING}' },
        { from: 'service', to: 'service', text: '[Bob] throw ConnectionException("A connection request is already pending.")' },
        { from: 'service', to: 'pairLock', text: '[Bob] pairLock.unlock()', deactivate: 'pairLock' },
        { from: 'service', to: 'controller', text: '[Bob] propagate ConnectionException', type: 'return' },
        { from: 'controller', to: 'userB', text: '400 Bad Request — Connection request already pending', type: 'return' },
      ],
    },
  ],
};
