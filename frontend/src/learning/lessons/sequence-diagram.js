import classModel from '../class-models/sequence-diagram';
import diagram from '../diagrams/sequence-diagram';
import traceSource from '../examples/sequence/InteractionTrace.java?raw';
import feesSource from '../examples/sequence/ParcelFees.java?raw';
import receiptSource from '../examples/sequence/ReceiptWriter.java?raw';
import deskSource from '../examples/sequence/QuoteDesk.java?raw';
import clientSource from '../examples/sequence/QuoteClient.java?raw';
import demoSource from '../examples/sequence/SequenceDemo.java?raw';
import output from '../examples/sequence-output.txt?raw';
import snapshots from '../examples/sequence-snapshots.json';

export default {
  id: 'sequence-diagram',
  classModel,
  diagram,
  summary: 'Explain one scenario by following messages between actual objects. Trace synchronous calls, matching replies and execution spans in a quote-and-receipt example, then compare an accepted request with a returned rejection.',
  prerequisites: 'Dependency and Class Diagram: distinguish a type, an object and a retained collaborator. Read Java method calls, return values and simple conditional branches. Class and use-case views answer different questions; this lesson focuses on ordered interactions.',
  objectives: [
    'Name an interaction’s scope and scenario, then identify object lifelines without confusing caller, class and instance.',
    'Read synchronous call and reply notation; connect each illustrated execution span to its call and completion.',
    'Trace an accepted result and a returned rejection against exact Java calls and values, identifying the collaborator that is not called.',
    'Explain partial ordering, alternative-scenario limits and what neither a diagram nor a recorded trace proves; transfer the method to another small interaction.',
  ],
  problem: 'A reviewer draws QuoteClient, QuoteDesk and ReceiptWriter as three class boxes, adds a solid arrow back for every response, and leaves the receipt call on the rejected path. The code returns a rejected Quote before rendering anything. Which objects actually talk, who waits, and what does the caller receive?',
  explanation: [
    { title: 'Choose a scenario, scope and evidence', text: 'A sequence diagram is an interaction view: it focuses on messages among participants in a chosen scenario. Our scope begins inside client.request when it invokes desk.quote and ends when that call returns. All four collaborator objects already exist. Construction, request entry into the client, record construction, getters and trace logging are outside this selected message view. First write a success scenario for 1000 g and a rejected scenario for 0 g. The Java supplies concrete evidence for those examples; the drawing is a curated abstraction of it, not an automatic source parser or a complete specification of every possible trace.' },
    { title: 'Read an object lifeline, not a class box', text: 'client : QuoteClient names one participant object and its class. SequenceDemo constructs that QuoteClient object and injects the desk object. QuoteClient is a type; client is a local reference naming the illustrated instance; caller is the role that instance plays for desk.quote. main is a static entry method that sets up the objects and calls client.request; it is deliberately outside the interaction boundary. desk, fees and receipts similarly name particular objects. A second QuoteDesk instance would need a distinct lifeline if it participated. A class diagram instead describes possible types and links; a use-case actor describes an external role. Neither automatically becomes this caller object.' },
    { title: 'Follow synchronous calls and matching replies', text: 'A synchronous call has a solid line and filled arrowhead toward its receiver. Here the calling execution waits for the called method to finish. desk calls fees.quote; fees returns a Quote value to that desk. Replies use dashed lines with open heads in this viewer; UML also allows filled reply heads. The reply reverses the matching call’s direction and carries a value, rather than invoking a new operation on the caller. Solid open heads normally denote asynchronous messages. A class dependency also uses a dashed open arrow, but that structural use relation is not a returned value. Read notation in its diagram context.' },
    { title: 'Bound an execution without inventing a clock', text: 'The thin execution rectangles, often called activation bars, correspond to the selected method executions. desk begins with the incoming quote call and ends at its outgoing result reply. fees and receipts each have a nested execution spanning their own call and return. desk remains within its execution while it waits; a bar does not mean continuous CPU activity, a lock, a thread or an allocation. The shared viewer pads rectangle edges around the indicated rows for readability. These are schematic bounds associated with those message events, not measured timestamps or durations. The client’s surrounding request execution and small internal accessor calls are omitted deliberately.' },
    { title: 'Trace the accepted quote and receipt', text: 'For 1000 g, client invokes desk.quote(1000). desk calls fees.quote(1000), which returns a Quote with weightGrams 1000, feeCents 300 and rejection null. Only after that reply does desk call receipts.render with the accepted Quote. render returns Parcel 1000 g: 300 cents, then desk returns a Result holding that Quote and String. The outer message label accepted result abbreviates those fields; read the complete transcript and recorded scalars for the full value. Receipt means text acknowledging the quote here. No payment, printing device, repository, database or network participant is implemented or implied.' },
    { title: 'Trace rejection as the code implements it', text: 'For 0 g, fees.quote returns Quote(0, null, "Weight must be 1 to 2000 g"). desk reads accepted() false and returns a Result containing that Quote and receipt null. Both are normal returned values, so dashed replies accurately describe them. The receipts object still exists and retains its lifeline, but has no message or execution in this scenario. A rejected business outcome is not automatically a UML neg fragment: this rejection is allowed behavior. ReceiptWriter does throw on a direct rejected or null argument; those programming-error paths are not shown. Do not disguise a thrown exception or stack unwinding as an ordinary returned Result. Model and explain such a path separately if you add it.' },
    { title: 'Order events carefully and state alternative guards', text: 'Time runs downward on each lifeline; a message is sent before it is received. Unrelated lifelines are not globally ordered merely by relative height. UML interactions generally impose a partial order, with weak sequencing preserving the relevant ordering on shared lifelines. Our sequential Java calls and matching replies justify this particular nested order. The two buttons choose separate complete scenarios, not an alt frame. To put both paths in a single interaction, use alt operands with guards such as [quote accepted] and [quote rejected] after the fee reply. opt marks optional behavior and loop repetition with a stated condition or bounds. This small viewer does not render those frames; do not infer exclusivity or iteration from flow buttons or whitespace. General ordering, asynchronous sends and parallel fragments require a broader model.' },
    { title: 'Use traces to check claims, then name their limits', text: 'InteractionTrace records selected messages immediately around the real calls and after their returned values are available. Tests compile exactly the displayed Java with JDK 17, check independently specified fees and rejection bounds, exact output, every recorded scalar and message order. Trace is instrumentation, not a fifth business participant, an external logging service or a universal UML interpreter. All five recorded requests reuse the same four objects; valid requests after rejections still succeed. Only two representative requests are authored as sequence flows. The browser selects recorded data and draws it; it never executes the JVM or recalculates the fee. Examples prove neither every possible input nor production timing, persistence, authorization or concurrency guarantees.' },
  ],
  visual: {
    title: 'Recorded requests, returned values and message order',
    summary: 'These scalar observations and trace strings come from the canonical Java. Grams and cents are explicit units. Null denotes an absent fee, receipt or rejection, not a hidden payment state.',
    snapshots,
  },
  code: [
    { filename: 'sequence/InteractionTrace.java', source: traceSource },
    { filename: 'sequence/ParcelFees.java', source: feesSource },
    { filename: 'sequence/ReceiptWriter.java', source: receiptSource },
    { filename: 'sequence/QuoteDesk.java', source: deskSource },
    { filename: 'sequence/QuoteClient.java', source: clientSource },
    { filename: 'sequence/SequenceDemo.java', source: demoSource },
  ],
  output,
  run: 'javac --release 17 -d out sequence/InteractionTrace.java sequence/ParcelFees.java sequence/ReceiptWriter.java sequence/QuoteDesk.java sequence/QuoteClient.java sequence/SequenceDemo.java\njava -cp out com.lld.learning.examples.sequence.SequenceDemo',
  quiz: {
    prompt: 'Predict client.request(2001). Which messages and values agree with the Java, and what happens to the receipts lifeline?',
    options: [
      { id: 'returned-rejection', text: 'fees returns a rejected Quote; desk returns a rejected Result with no fee or receipt. receipts remains present but is not called.', correct: true,
        feedback: 'Correct. 2001 g exceeds the upper bound. The two calls receive two normal replies, with null feeCents and receipt and the stated rejection reason. An idle object does not disappear.' },
      { id: 'render-first', text: 'desk calls receipts before fees returns, then discards the text after the rejection arrives.',
        feedback: 'The synchronous fees call finishes first. desk checks accepted() before the render call. The early return means no receipt is rendered or discarded on this path.' },
      { id: 'exception-reply', text: 'fees throws an exception, which the dashed rejected-result arrow silently converts into a normal Result.',
        feedback: 'ParcelFees.quote returns a rejected Quote value and throws no exception for this input. A reply arrow does not convert an exception; an actual throwing path needs its own accurate behavior and explanation.' },
      { id: 'class-caller', text: 'The QuoteClient class sends a static call and destroys receipts because its activation never begins.',
        feedback: 'request is an instance operation on client. The receipts object already exists; no call means no selected execution, not destruction. No destruction occurrence or static request is implemented.' },
    ],
  },
  exercise: 'Independently model a community-room availability enquiry. Create actual requester, desk, schedule and confirmation-text objects. The requester asks the desk for a whole-number duration: 1 through 4 hours is accepted with a returned availability value and confirmation text; 0 and 5 hours return a rejection with neither a confirmed duration nor text. This is an enquiry only: do not reserve a room, collect money or add a database. Write the contract first, draw one accepted and one rejected interaction with objectName : ClassName lifelines, synchronous calls, matching replies and bounded desk/collaborator executions. Keep the unused text object visible on rejection. Specify where [available] and [rejected] guards would belong if you combined the paths with alt, without drawing a false exception reply. Implement and run a small Java 17 example or explicit acceptance harness. Predict and verify 1, 4, 0 and 5 hours plus a valid enquiry after rejection; record exact returned values and ordered messages. Identify an omitted detail and explain why relative height on unrelated lifelines does not prove a global schedule.',
  rubric: [
    'Scope and identity: name the enquiry boundary and identify each actual object and its class separately. Show one instance per named lifeline and distinguish requester role from a Java class or external actor.',
    'Success: requester calls desk; desk calls schedule; schedule replies with availability; desk then calls the text object, receives text and replies to requester. Use solid filled call heads and dashed reply lines with a stated supported reply head.',
    'Rejection: 0 and 5 hours yield rejected values with no confirmed duration or text and no text-object call. Preserve all lifelines and show no activation for the idle text object; do not invent destruction or exception conversion.',
    'Execution and ordering: associate desk execution with its inbound call and outbound reply; nest collaborator spans within it. Acknowledge waiting within an execution and schematic spacing. Explain send-before-receive and the absence of a universal global ordering rule.',
    'Alternatives: either retain separate complete scenarios or put alt operands after the availability reply with explicit guards tied to returned data. A business rejection remains a permitted trace. Do not label flow-selector UI as UML control flow.',
    'Independent evidence: check the stated duration contract at both accepted bounds and both rejected inputs, exact results and message order, and later acceptance using the same collaborators. Keep the enquiry free of reservation side effects and identify evidence limits.',
  ],
  pitfalls: [
    'A named object lifeline is not a class box, an actor role, a thread or a promise that every method call is drawn. Declare the interaction boundary and omitted setup/accessors.',
    'Reply direction matches a prior synchronous call. Dashed replies are not new reverse operations or class dependencies; open heads on solid lines normally mean asynchronous messages.',
    'Activation spans represent selected executions, including waits for nested calls. Their drawn size is not a duration measurement, CPU-use guarantee or concurrency proof.',
    'Returned rejection and thrown exception are different Java control paths. Our diagram shows the returned case only. A missing receipt call does not remove or destroy its already existing object.',
    'Flow buttons select authored scenarios. They do not implement alt/opt/loop semantics, and vertical placement alone does not impose total order across unrelated lifelines.',
    'The fee Quote and Result public record constructors permit arbitrary caller values. Claims here concern values produced by quote/request, not validation of every directly constructed record or every direct ReceiptWriter invocation.',
  ],
  module: {
    title: 'Trace Parking Lot’s read-only price preview',
    path: '/parking-lot',
    text: 'Inspect ParkingLotService.scanTicket and PricingStrategyFactory.getStrategy. After gate and open-ticket validation, scanTicket constructs a separate preview Ticket, resolves the requested PricingStrategy, calls calculatePrice(previewTicket), sets the returned amount on that preview and returns it. For FLAT and a CAR ticket, FlatRatePricingStrategy returns 50.0 rupees. A proposed focused sequence can name service, factory and the resolved strategy objects, show getStrategy and calculatePrice calls with their replies, and explicitly omit accessors and gate/repository setup. The class PricingStrategy is an interface; the participating FLAT object is a FlatRatePricingStrategy instance. No receipt object or receipt-rendering call exists in this preview path. Unknown strategies and missing/closed tickets throw typed exceptions; they do not return this lesson’s rejected Quote record. The preview neither calls payAndExit nor releases a spot. This is a source-backed subset to draw and review, not a claim that the existing module sequence view already depicts this scenario or that a browser click executes Java locally.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/FlatRatePricingStrategy.java',
    ],
  },
  summaryPoints: [
    'Choose a scenario and scope; name actual objects separately from their classes and caller roles.',
    'Read synchronous calls, matching replies, returned values and executions against the canonical code.',
    'Model the real rejected path, retaining idle lifelines; distinguish returned rejection from exception propagation.',
    'Use complete text and acceptance checks as evidence, state partial-order and renderer limits, and avoid invented external services or runtime guarantees.',
  ],
  references: [
    { title: 'OMG UML 2.5.1 — §17.1 and §17.2 interactions and partial ordering; §17.3 lifelines', url: 'https://www.omg.org/spec/UML/2.5.1/PDF' },
    { title: 'OMG UML 2.5.1 — §17.4 messages and reply notation; §17.5 executions; §17.6 combined fragments; §17.8 sequence diagrams', url: 'https://www.omg.org/spec/UML/2.5.1' },
    { title: 'Java Language Specification 17 — §15.12 method invocation and §15.12.4.5 execution of a method', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12' },
  ],
};
