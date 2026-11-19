import classModel from '../class-models/state-machine-diagram';
import diagram from '../diagrams/state-machine-diagram';
import stateSource from '../examples/statemachine/ReservationState.java?raw';
import reservationSource from '../examples/statemachine/Reservation.java?raw';
import demoSource from '../examples/statemachine/StateMachineDemo.java?raw';
import output from '../examples/statemachine-output.txt?raw';
import snapshots from '../examples/statemachine-snapshots.json';

export default {
  id: 'state-machine-diagram',
  classModel,
  diagram,
  summary: 'Describe one domain object over time: which events it accepts, which guards enable a transition, which effects occur, and when its lifecycle completes. Check the drawing against a reservation implemented in canonical Java.',
  prerequisites: 'Enums: read a finite set of named domain values. Basic classes, methods and conditionals support the companion Java. A class diagram is useful for comparing viewpoints but is not an extra prerequisite.',
  objectives: [
    'Choose one domain object as the subject and distinguish its lifecycle from Java types, thread states and object destruction.',
    'Read initial and final vertices, directed transitions, event [guard] / effect labels and explicit logical-time boundaries.',
    'Distinguish a guarded external self-transition from internal handling by predicting entry, exit and other observable effects.',
    'Trace accepted and rejected commands through Java; verify unchanged state after rejection and all commands rejected after completion.',
  ],
  problem: 'A reservation can be held for ten minutes, renewed while unexpired, confirmed before its deadline, or cancelled. A developer treats any enum assignment as legal, draws inspection and renewal as identical loops, and assumes a browser timer deletes an expired object. How do you specify the actual accepted commands and show that a rejected confirmation changes nothing?',
  explanation: [
    { title: 'Scope one object’s lifecycle', text: 'The subject is one Reservation instance, not the checkout screen, every reservation in a store, or a Java thread. Construction yields DRAFT. hold enters HELD; confirm produces CONFIRMED; cancel or expire produces CANCELLED. The class model separately shows Reservation and ReservationState types. An enum lists names but does not enforce which command may run; the guarded methods enforce that policy. This small example uses no class-per-state State pattern and adds no production backend workflow.' },
    { title: 'Read an event, condition and effect separately', text: 'An arrow points from the active source to its target. hold(now) [timeOK && deadlineFits] / set deadline = now + 10; remember now reads as a command with a condition and resulting work. DRAFT is also required by the arrow’s source. Guards inspect values without changing them. Effects occur only after acceptance, with HELD entry and exit behaviors shown in its compartment. Each command is synchronous Java in this example; the drawing is not an implementation of UML event dispatch. For this subset, source, time, state-specific conditions and arithmetic checks all precede mutation.' },
    { title: 'Make time a precise input', text: 'All time values are integer logical minutes from an arbitrary origin. HOLD_MINUTES is 10. timeOK means now >= 0 and now >= lastMinute; accepted commands remember their supplied minute. Equal minutes are permitted. unexpired means now < expiresAtMinute, so equality is expired. hold(10) sets deadline 20, inspect(11) preserves it, and renew(12) sets 22. No sleeping, browser clock, real timestamp conversion or automatic expiry occurs. expire(now) is an explicitly dispatched command, not UML after(10). Simply passing minute 22 does not run Java or change HELD.' },
    { title: 'Distinguish external re-entry from internal handling', text: 'renew(now) is an external HELD → HELD self-transition. After its guards pass it runs exitHeld, resets the deadline, then runs enterHeld. The state name is unchanged, yet heldExits and heldEntries each increase. inspect(now) is an internal transition written inside HELD: it increments inspections and remembers now without exiting, re-entering or changing the deadline. In the recorded run, inspect leaves entries/exits at 1/0; renew changes them to 2/1. A loop alone would misrepresent inspection. Both commands require an unexpired hold; a failed guard runs neither their effect nor entry/exit.' },
    { title: 'Follow rejection paths without inventing transitions', text: 'After renewal the deadline is 22. confirm(22) rejects with Hold expired and preserves HELD, deadline 22, entries 2, exits 1, inspections 1 and lastMinute 12. The rejected input does not advance lastMinute. expire(22) then succeeds, increments exits once and retains CANCELLED. An invalid DRAFT confirmation, a duplicate hold, premature expiry, negative or backwards time also rejects before writing. In general UML, a disabled transition does not prescribe a Java exception; this API explicitly chooses exceptions for rejected commands. Rejection is not a successful self-transition, automatic cancellation or rollback of an earlier accepted call.' },
    { title: 'Check overflow before leaving a state', text: 'A long deadline must fit exactly. Math.addExact(now, 10) runs before any write in hold and before exitHeld in renew. At Long.MAX_VALUE - 10, holding succeeds with deadline Long.MAX_VALUE; adding another minute to the starting input would overflow and throw ArithmeticException. Tests exercise both hold and renew overflow with full-field preservation, plus the last valid minute and equality boundary for confirmation and expiry. The UI only presents these recorded Java observations; it does not reimplement arithmetic or validate a live booking.' },
    { title: 'Start and complete with deliberate semantics', text: 'The solid circle is the initial pseudostate; its unguarded, triggerless arrow targets DRAFT. CONFIRMED and CANCELLED are retained outcome states with no entry/do work and no further accepted commands. Their unlabeled completion arrows immediately reach the final bullseye: the only region is complete, so this state-machine execution is complete. Java maps that completion to isTerminated() returning true while keeping the outcome enum; no extra finish() command or fifth final enum constant exists. This is a final vertex, not the distinct UML terminate pseudostate. Getters still work and the object remains reachable. Nothing here is JVM Thread.State, Java object destruction, garbage collection, or a promise of secure data erasure.' },
    { title: 'Compare independent outcomes and implementation structure', text: 'A separate reservation holds at 30 and confirms at 39, before its deadline 40: it ends CONFIRMED with one entry and one exit. A third cancels directly from DRAFT at 0 with zero HELD entries/exits. cancel also accepts HELD at or after the deadline if time is valid, unlike confirm/inspect/renew; it is a user cancellation policy, not an unexpired rule. Deadline values remain historical after completion. The companion class model describes the actual enum field and methods; the lifecycle graph does not mean DRAFT, HELD and final are Java classes or objects allocated for each transition.' },
    { title: 'Keep the model bounded', text: 'This is a flat, single-region, sequential lifecycle. It implements no composite states, history, concurrent regions, local transitions into nested states, do-activities, deferred events or generic event pool. UML supports those features; this lesson omits them rather than drawing unsupported behavior. It is in memory, has no payment, capacity allocation, authentication, persistence or concurrency protocol, and its small integer observation counters are for the bounded demo, not an unbounded telemetry service. Tests compile the exact displayed Java 17 sources and verify output, independent boundaries and every recorded scalar. The browser is a recorded illustration and diagram inspector, not a JVM.' },
  ],
  visual: {
    title: 'Recorded lifecycle: internal effects, re-entry and unchanged rejection',
    summary: 'Nine canonical Java observations include exact expiry equality, explicit termination, successful confirmation and direct draft cancellation. These are recorded results, not browser-executed transitions.',
    snapshots,
  },
  code: [
    { filename: 'statemachine/ReservationState.java', source: stateSource },
    { filename: 'statemachine/Reservation.java', source: reservationSource },
    { filename: 'statemachine/StateMachineDemo.java', source: demoSource },
  ],
  run: 'javac --release 17 -d out statemachine/ReservationState.java statemachine/Reservation.java statemachine/StateMachineDemo.java\njava -cp out com.lld.learning.examples.statemachine.StateMachineDemo',
  output,
  quiz: {
    prompt: 'Predict: hold(10), inspect(11), renew(12), then confirm(22). What remains immediately after the rejected confirmation?',
    options: [
      { id: 'preserved', text: 'HELD, deadline 22, entries 2, exits 1, inspections 1, lastMinute 12; the lifecycle remains open.', correct: true, feedback: 'Correct. Inspection is internal; renewal exits and re-enters. Confirmation requires now < 22, so equality rejects before every write, including lastMinute. Only a later accepted expire or cancel would complete this reservation.' },
      { id: 'auto-expire', text: 'CANCELLED, exits 2 and lastMinute 22, because reaching the deadline dispatches expiry automatically.', feedback: 'The example has no timer or after event. confirm(22) fails its guard. Only an explicit accepted expire(22) would add the exit, remember 22 and retain CANCELLED.' },
      { id: 'inspection-loop', text: 'HELD, entries 3 and exits 2, because inspect and renew each run exit and entry.', feedback: 'Only external renew runs exit and entry. Internal inspect changes inspections and lastMinute while leaving entry/exit counts at 1/0. After renewal they are 2/1, and rejection adds nothing.' },
      { id: 'inclusive', text: 'CONFIRMED, exits 2 and terminated true, because a deadline is inclusive for confirmation.', feedback: 'This contract uses strict now < deadline for confirmation. At equality the hold is expired. Expiry accepts now >= deadline, while confirmation, inspection and renewal reject and preserve fields.' },
    ],
  },
  exercise: 'Independently design a parcel collection permit. A new permit starts ISSUED. activate(now) grants a five-minute ACTIVE window; inspect(now) is internal and increments a check counter only while unexpired; refresh(now) is an external self-transition that resets the deadline only while unexpired. collect(now) before the deadline completes as COLLECTED; expire(now) at/after it or revoke(now) from either open state completes as REVOKED. Define nonnegative, nondecreasing logical-minute input and overflow rejection. Draw the initial target, guarded arrows with effects, ACTIVE entry/exit behavior, internal handling and a final vertex. Write Java 17 or explicit acceptance tests for a successful collection, refresh vs inspection counts, exact deadline rejection without mutation, checked overflow, direct revocation and all commands rejected after completion. Make your own predicted trace before consulting the reservation results. Explain why the saved permit can remain readable after its domain lifecycle ends.',
  rubric: [
    'Subject and notation: one permit instance, rounded states, an initial arrow to ISSUED, directed event [guard] / effect labels, and final completion only after an actual terminal outcome.',
    'Time contract: logical minutes, duration five, strict now < deadline for collection/refresh/inspection, now >= deadline for explicit expiry, and valid nondecreasing time. Reject overflow before mutating anything.',
    'Self vs internal: refresh exits and re-enters ACTIVE while inspect changes its check counter without either behavior. Verify both counters and the deadline rather than relying on the unchanged state name.',
    'Rejections: compare every stored scalar before/after invalid source, negative/backwards time, boundary failure and overflow. Rejecting collect at equality must not automatically expire the permit.',
    'Completion: support direct ISSUED revocation and ACTIVE collection/expiry/revocation; reject every later command while preserving readable outcomes. Explain final-region completion separately from object destruction.',
    'Evidence and limits: provide independent predicted traces and assertions, distinguish your policy choices from UML semantics, and state omitted scheduling, concurrency and persistence behavior.',
  ],
  pitfalls: [
    'A state machine is a behavior view of one chosen subject. A class diagram, workflow step list and JVM Thread.State answer different questions.',
    'A false guard does not execute an effect. This API throws on rejection; UML notation alone does not specify that exception policy.',
    'Internal handling is not the external self-transition loop: matching source and target names alone do not tell you whether entry and exit run.',
    'No wall clock advances this example. expire(now) must be invoked; no after event, background cleanup or browser-side business rule exists.',
    'Final completion rejects commands without deleting the Java object. The historical deadline stays readable; the two outcome enum values map to completion without adding a finish command.',
    'Checked deadline arithmetic precedes mutation. A failed renew must not increment an exit counter or partially replace a deadline. This sequential example is not a transaction or concurrency guarantee.',
  ],
  module: {
    title: 'Trace a bounded Uber ride lifecycle',
    path: '/uber',
    text: 'Inspect RideStatus.ALLOWED, canTransitionTo and isTerminal. COMPLETED and CANCELLED have empty target sets; PAYMENT_FAILED is retryable, with PAYMENT_PENDING and COMPLETED targets. UberService.transition checks the current status against that table before setStatus. At the call site, completeTrip rejects a terminal ride before payment processing and may walk intermediate statuses; a service call is not necessarily one arrow. RideStatusTest pins terminal targets and retryability; UberServiceTest.completedRideCannotBeCompletedAgain and cancelledRideCannotBeCompleted pin those concrete rejections. As practice, draw this selected status projection and annotate the completeTrip call’s possible transitions from its code. Do not invent HELD, reservation deadlines, external self-transitions or internal inspection in Uber: RideStatusTest explicitly disallows status self-transitions. The table does not alone describe payment effects, all service guards, thread safety or every UI behavior. This source inspection supports a lifecycle comparison, not a full quality audit or a claim that these module tests were run for this lesson.',
    sources: [
      'backend/src/main/java/com/lld/uber/model/RideStatus.java',
      'backend/src/main/java/com/lld/uber/service/UberService.java',
      'backend/src/test/java/com/lld/uber/RideStatusTest.java',
      'backend/src/test/java/com/lld/uber/UberServiceTest.java',
    ],
  },
  summaryPoints: [
    'Choose a single subject and distinguish source state, event, read-only guard and accepted effect.',
    'An external self-transition runs exit and entry; an internal transition does not. Use observables to verify the distinction.',
    'Specify time units and boundaries, validate before writing, and test unchanged fields after rejection.',
    'Final completion ends this lifecycle’s command acceptance; Java references and readable outcomes can survive.',
  ],
  references: [
    { title: 'OMG UML 2.5.1 — §14.2.3.6 FinalState, §14.2.3.8.1 transition kinds, §14.2.3.8.3 completion and guards, §14.2.4 notation', url: 'https://www.omg.org/spec/UML/2.5.1/PDF' },
    { title: 'Java SE 17 Math.addExact(long, long) — checked deadline addition', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Math.html#addExact(long,long)' },
    { title: 'JLS 17 §8.9 — enum classes and named instances', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.9' },
  ],
};
