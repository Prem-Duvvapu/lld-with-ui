const participants = [
  { id: 'client', name: 'client : QuoteClient', kind: 'component',
    description: 'The actual caller object constructed in SequenceDemo. request calls desk.quote. QuoteClient is its Java class, not a separate caller or a human actor.' },
  { id: 'desk', name: 'desk : QuoteDesk', kind: 'component',
    description: 'The coordinating object constructed with fees, receipts and trace. Its quote execution waits for each nested synchronous call to finish.' },
  { id: 'fees', name: 'fees : ParcelFees', kind: 'component',
    description: 'The fee collaborator object. quote returns a Quote value containing either a fee in cents or a rejection reason.' },
  { id: 'receipts', name: 'receipts : ReceiptWriter', kind: 'component',
    description: 'The text collaborator object. render returns a receipt String only after an accepted quote. It still exists when the rejected flow makes no call to it.' },
];

export default {
  kind: 'sequence',
  title: 'Sequence diagram: one quote request',
  summary: 'Two separate scenarios for the same four existing objects. Choose a flow to inspect messages; both complete transcripts remain below at normal reading size. These are recorded Java calls, not browser execution.',
  data: {
    title: 'Quote and receipt messages',
    description: 'Solid lines with filled heads are synchronous calls. Dashed lines with open heads are replies in this view. Lifelines represent named objects; no constructors, exceptions or external services are drawn.',
    flows: [
      {
        id: 'accepted', label: 'Accepted: 1000 g', participants,
        description: 'Scenario condition: weight is 1000 g, within the supported 1 to 2000 g range. The returned fee is 300 cents and the receipt is text. This is one complete interaction, not an operand displayed inside an alt frame.',
        steps: [
          { from: 'client', to: 'desk', text: 'quote(1000)', activate: 'desk',
            detail: 'Within client.request(1000), the client object invokes desk.quote(1000). The desk execution begins; client waits for the returned Result.' },
          { from: 'desk', to: 'fees', text: 'quote(1000)', activate: 'fees',
            detail: 'desk invokes fees.quote(1000). This execution uses the lower fee band: weights 1 through 1000 g cost 300 cents. desk waits for the Quote value.' },
          { type: 'return', from: 'fees', to: 'desk', text: 'fee = 300 cents', deactivate: 'fees',
            detail: 'The Quote value has weightGrams 1000, feeCents 300 and rejection null. The fees execution ends. This is a reply to the preceding desk-to-fees call, not a new reverse operation.' },
          { from: 'desk', to: 'receipts', text: 'render(accepted quote)', activate: 'receipts',
            detail: 'desk reads accepted() and passes that same accepted Quote to receipts.render. The receipt execution begins only after fees has returned.' },
          { type: 'return', from: 'receipts', to: 'desk', text: '"Parcel 1000 g: 300 cents"', deactivate: 'receipts',
            detail: 'render returns the exact String Parcel 1000 g: 300 cents. Its execution ends. This is neither physical printing nor evidence that any amount was paid.' },
          { type: 'return', from: 'desk', to: 'client', text: 'accepted result', deactivate: 'desk',
            detail: 'desk returns a Result holding the accepted Quote and receipt String. The desk execution ends; client.request can continue. accepted is true, feeCents is 300 and rejection is null.' },
        ],
      },
      {
        id: 'rejected', label: 'Rejected: 0 g', participants,
        description: 'Scenario condition: weight is 0 g. A rejected Quote is returned normally; desk returns a rejected Result without invoking receipts. This is a permitted business outcome, not a UML neg fragment or a thrown exception.',
        steps: [
          { from: 'client', to: 'desk', text: 'quote(0)', activate: 'desk',
            detail: 'Within client.request(0), client invokes desk.quote(0). The desk execution begins and client waits.' },
          { from: 'desk', to: 'fees', text: 'quote(0)', activate: 'fees',
            detail: 'desk calls fees.quote(0). The lower bound rejects zero before any receipt rendering.' },
          { type: 'return', from: 'fees', to: 'desk', text: 'rejected: Weight must be 1 to 2000 g', deactivate: 'fees',
            detail: 'fees returns Quote(0, null, "Weight must be 1 to 2000 g"). Its execution ends normally. A dashed reply is appropriate because no exception is thrown on this path.' },
          { type: 'return', from: 'desk', to: 'client', text: 'rejected result', deactivate: 'desk',
            detail: 'desk sees accepted() false and returns Result with receipt null. accepted is false, feeCents is null and rejection is Weight must be 1 to 2000 g. The desk execution ends. receipts has neither a message nor an activation; its lifeline remains.' },
        ],
      },
    ],
  },
  notes: [
    'Read objectName : ClassName as a named participant typed by a Java class. Every diagram participant is a pre-existing object constructed in main. Object creation, request entry into client, result-record construction, accessors and trace instrumentation are deliberately omitted.',
    'Each activation is associated with the indicated call reception and matching return. The shared viewer gives bars small visual padding around those rows; rectangle edges are schematic, not measured timestamps. desk remains within its execution while waiting for its nested calls; activation does not mean continuous CPU use. The caller’s surrounding request execution is outside this selected view.',
    'Calls use solid lines and filled arrowheads. Replies use dashed lines and open arrowheads here; UML also permits filled reply heads. A solid open head normally denotes an asynchronous message, not a synchronous call. No asynchronous sends, exception propagation, destruction marks or control-flow arrows are modeled.',
    'Time proceeds downward along each lifeline; message send precedes its receive. General interactions impose a partial order, not an automatic global order between unrelated lifelines. These particular sequential Java calls and matching replies support the listed order; row spacing has no duration scale.',
    'Separate flow buttons choose complete example traces. They are not an alt combined-fragment frame. To model alternatives together, alt operands need guards such as [quote accepted] and [quote rejected]; opt denotes optional behavior and loop repeated behavior. This bounded viewer does not implement those frames, strict sequencing, par fragments or a universal UML engine.',
    'Both flows retain all four lifelines, even for an idle collaborator. Pointer highlighting changes only message emphasis. All messages, return values, activation explanations and scenario conditions for both authored flows remain in this complete transcript independently of the selected flow or highlighted step.',
  ],
};
