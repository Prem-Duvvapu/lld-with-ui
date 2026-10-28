export default {
  title: 'Companion implementation: lending state and operations',
  summary: 'Selected Java declarations illustrate the requirements. These boxes are internal types, not external actors or use cases. Role specialization in the use-case view is a domain policy; Member has no Librarian Java subclass.',
  classes: [
    {
      name: 'Member', kind: 'public final class', source: 'usecase/Member.java',
      description: 'Caller-supplied identity and role data. Every staff borrower passes the same active-membership rule as other members. This type neither authenticates people nor implements Java role inheritance.',
      fields: ['- id: String {final}', '- active: boolean {final}', '- librarian: boolean {final}'],
      methods: ['+ Member(id: String, active: boolean, librarian: boolean)', '+ id(): String', '+ active(): boolean', '+ librarian(): boolean'],
    },
    {
      name: 'Loan', kind: 'public final class', source: 'usecase/Loan.java',
      description: 'One title represents one copy. A loan stores the borrower identifier, due-day offset and renewal/return state. Package-visible mutation is not a security boundary.',
      fields: ['- memberId: String {final}', '- title: String {final}', '- dueDay: int', '- renewed: boolean', '- active: boolean'],
      methods: ['~ Loan(memberId: String, title: String)', '+ memberId(): String', '+ title(): String', '+ dueDay(): int', '+ renewed(): boolean', '+ active(): boolean', '~ renew(): void', '~ close(): void'],
    },
    {
      name: 'LibraryPortal', kind: 'public final class', source: 'usecase/LibraryPortal.java',
      description: 'Coordinates eligibility, title availability, renewal ownership and staff return checks. Returns a Borrowing record or immutable trace list; all operations are sequential and in memory.',
      fields: ['- catalog: Set<String> {final}', '- loans: Map<String, Loan> {final}'],
      methods: ['+ LibraryPortal(catalog: Set<String>)', '+ borrow(member: Member, title: String, receiptRequested: boolean): Borrowing', '+ renew(member: Member, title: String): List<String>', '+ recordReturn(operator: Member, title: String): List<String>', '+ loan(title: String): Loan', '- checkEligibility(member: Member, trace: List<String>): void', '- issueReceipt(loan: Loan, trace: List<String>): String', '- requireTitle(title: String): void'],
    },
  ],
  relationships: [
    { from: 'LibraryPortal', to: 'Member', kind: 'Dependency',
      explanation: 'Operations read a supplied Member argument for identity, eligibility and staff status without storing that Member object. This parameter use is not an external actor association or actor generalization.',
      navigation: 'Portal reads Member through method arguments. No Member field refers back to a portal.' },
    { from: 'LibraryPortal', to: 'Loan', kind: 'Association',
      explanation: 'The portal retains Loan objects in its map, keyed by title. Borrow replaces an earlier returned loan; retained caller references can still refer to that earlier object. No composition or automatic Java destruction is asserted.',
      multiplicity: 'each portal → 0..* stored loans (at most one map entry per catalog title); no reverse portal bound is asserted by this selected view',
      navigation: 'Portal can look up Loan. Loan stores memberId/title scalar values, not Member or Portal references.' },
  ],
  notes: [
    'The class view omits the demo, JDK implementation types and nested Borrowing record’s generated members. Borrowing contains a live Loan reference, optional receipt String and copied immutable trace list; the result is not deeply immutable.',
    'The use-case diagram has a Member actor and this implementation has a Member class; matching names do not make them the same modeling element. Staff role data does not imply a Java subtype or authenticated authority.',
    'Day 14 and day 21 are fixed teaching offsets. These classes supply no real clock, fine policy, multi-copy catalog, production authorization, persistence or concurrency protocol.',
  ],
};
