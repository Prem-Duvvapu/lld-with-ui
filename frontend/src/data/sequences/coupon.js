// Sequence diagram content for coupon.
// Grounded directly in CouponService#doApply and
// CouponConcurrencyTest#repeatedRedemptionRaceNeverOvershootsTheLimit: many workers racing to
// redeem a coupon with only 3 redemptions left. A class diagram shows Coupon owns a lock and a
// currentRedemptions counter; it does not show why the whole "read count, compare, increment"
// sequence has to run under ONE lock acquisition, or why the eligibility chain runs BEFORE the
// lock is ever touched.
export default {
  title: 'Coupon / Promotion Engine — Redemption-Limit Race on a Scarce Coupon',
  description:
    'Coupon "SIM-SCARCE" has exactly 3 redemptions remaining. Eight workers call apply() concurrently. The eligibility chain runs first for every worker, entirely unlocked -- it only reads immutable coupon config and the caller-supplied cart, nothing worth racing on. Only once a worker passes eligibility does it acquire the coupon\'s own lock and call tryRedeem(), which holds "is count still below the limit? increment if so" as one atomic block. The first 3 workers to acquire the lock each see room and succeed; the remaining 5 each acquire the lock only after the limit is already exhausted and are cleanly rejected.',
  flows: [
    {
      id: 'redemption-limit-race',
      label: 'Eight workers racing a coupon with 3 redemptions left',
      description:
        'All eight workers start together via a CountDownLatch (see CouponConcurrencyTest, run for 300 rounds). Exactly 3 succeed; the other 5 receive a clean RedemptionLimitExceededException, and the coupon\'s own counter lands at exactly its limit, never over.',
      participants: [
        { id: 'worker1', name: 'Worker 1..3\n(will succeed)', kind: 'actor' },
        { id: 'worker4', name: 'Worker 4..8\n(will be rejected)', kind: 'actor' },
        { id: 'service', name: 'CouponService', kind: 'component', stereotype: 'facade' },
        { id: 'chain', name: 'EligibilityChainFactory', kind: 'component' },
        { id: 'coupon', name: 'Coupon "SIM-SCARCE"\n(3 redemptions left)', kind: 'component' },
        { id: 'lock', name: 'coupon.couponLock\n(ReentrantLock, fair)', kind: 'component', stereotype: 'lock' },
      ],
      steps: [
        { type: 'note', over: ['coupon'], text: 'currentRedemptions=0, maxRedemptions=3 -- exactly 3 slots available.' },
        { from: 'worker1', to: 'service', text: 'apply("SIM-SCARCE", cart)  x3, ~simultaneously' },
        { from: 'worker4', to: 'service', text: 'apply("SIM-SCARCE", cart)  x5, ~simultaneously' },
        { from: 'service', to: 'chain', text: '[all 8] run(coupon, cart)  -- unlocked, reads only immutable config' },
        { from: 'chain', to: 'service', text: 'return EligibilityResult.eligible()  -- for all 8', type: 'return' },
        { type: 'note', over: ['chain'], text: 'Eligibility never touches currentRedemptions -- nothing to race on here, so no lock is needed for this step.' },
        { from: 'service', to: 'lock', text: '[Workers 1-3] lock.lock()  -- acquired one at a time, each in turn', activate: 'lock' },
        { from: 'service', to: 'coupon', text: '[Worker 1] tryRedeem(): count 0<3 -> true, count now 1' },
        { from: 'service', to: 'coupon', text: '[Worker 2] tryRedeem(): count 1<3 -> true, count now 2' },
        { from: 'service', to: 'coupon', text: '[Worker 3] tryRedeem(): count 2<3 -> true, count now 3', deactivate: 'lock' },
        { from: 'service', to: 'lock', text: '[Workers 4-8] lock.lock()  -- each acquires only after the limit is already gone', activate: 'lock' },
        { type: 'note', over: ['coupon'], text: 'This is the step a two-locked-steps design would get wrong: every one of Workers 4-8 must re-read count=3 NOW, under the SAME lock, not a stale value seen before blocking.' },
        { from: 'service', to: 'coupon', text: '[Workers 4-8] tryRedeem(): count 3>=3 -> false, count UNCHANGED', deactivate: 'lock' },
        { from: 'service', to: 'worker4', text: 'throw RedemptionLimitExceededException  x5', type: 'return' },
        { from: 'service', to: 'worker1', text: 'return ApplyResult(...)  x3', type: 'return' },
        { type: 'note', over: ['worker1', 'worker4'], text: 'Exactly 3 succeed, exactly 5 cleanly rejected, coupon ends at currentRedemptions=3 -- never overshot. See CouponConcurrencyTest, 300 rounds.' },
      ],
    },
  ],
};
