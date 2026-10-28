export default {
  title: 'Library structure: declarations and justified relationships',
  summary: 'A selected implementation view of canonical Java. Start with All types, then choose each relationship to inspect its connector. The recorded steps above show instances; these boxes describe types.',
  classes: [{
    name: 'Resource', kind: 'public abstract class', source: 'classdiagram/Resource.java',
    description: 'Defines a required title and an abstract label operation. It cannot be instantiated directly.',
    fields: ['- title: String {final}'],
    methods: ['# Resource(title: String)', '+ title(): String {final}', '+ label(): String {abstract}'],
  }, {
    name: 'Labelled', kind: 'public interface', source: 'classdiagram/Labelled.java',
    description: 'A label contract; the Java interface method is implicitly public and abstract.',
    fields: [], methods: ['+ label(): String {abstract}'],
  }, {
    name: 'Book', kind: 'public final class', source: 'classdiagram/Book.java',
    description: 'Extends Resource and explicitly implements Labelled. Inherits title(), overrides label(), and declares no fields.',
    fields: [], methods: ['+ Book(title: String)', '+ label(): String'],
  }, {
    name: 'Shelf', kind: 'public final class', source: 'classdiagram/Shelf.java',
    description: 'Groups shared books by identity and can preview a supplied label without retaining that argument.',
    fields: ['- books: List<Book> {final}'],
    methods: ['+ add(book: Book): void', '+ books(): List<Book>', '+ clear(): void', '+ preview(item: Labelled): String'],
  }, {
    name: 'Loan', kind: 'public final class', source: 'classdiagram/Loan.java',
    description: 'Keeps a required book and optionally creates one owned receipt. Closing retires the receipt and prevents new issuance.',
    fields: ['- book: Book {final}', '- receipt: Receipt', '- closed: boolean'],
    methods: ['+ Loan(book: Book)', '+ book(): Book', '+ receipt(): Receipt', '+ isClosed(): boolean', '+ issueReceipt(): Receipt', '+ close(): void'],
  }, {
    name: 'Loan.Receipt', kind: 'public static final nested class', source: 'classdiagram/Loan.java',
    description: 'Has one fixed owner, exposes a read-only lifecycle query, and rejects reading after retirement.',
    fields: ['- owner: Loan {final}', '- text: String', '- active: boolean'],
    methods: ['- Receipt(owner: Loan, text: String)', '+ isFor(loan: Loan): boolean', '+ isActive(): boolean', '+ read(): String', '- retire(): void'],
  }],
  relationships: [{
    from: 'Book', to: 'Resource', kind: 'Generalization',
    explanation: 'Book extends Resource. The hollow triangle points to the general type, Resource. The constructor calls super(title); title() is inherited and label() is overridden. This is a subtype relation, not a link to a second Resource object.',
  }, {
    from: 'Book', to: 'Labelled', kind: 'Realization',
    explanation: 'Book implements Labelled and supplies label(). The dashed line and hollow triangle point to the interface. Matching a method name without implements would not establish this Java type relationship.',
  }, {
    from: 'Shelf', to: 'Book', kind: 'Shared aggregation',
    explanation: 'We choose a hollow diamond at Shelf to emphasize a shareable grouping. add accepts an existing Book, suppresses duplicate identity, and clear only removes membership. Ordinary association would also communicate the retained link; the hollow diamond alone supplies no universal deletion rule.',
    multiplicity: 'Each shelf → 0..* distinct books; each book ← 0..* shelves. Both ends may be empty; the upper bounds are unbounded in this model.',
    navigation: 'Shelf → books through its field and books(). Book has no shelf field. The plain diamond connector makes no arrowhead claim; this text specifies navigation.',
  }, {
    from: 'Loan', to: 'Book', kind: 'Association',
    explanation: 'The constructor rejects null and stores the supplied Book. It neither creates nor retires that book. A final reference prevents rebinding; it is not evidence of composite ownership.',
    multiplicity: 'Each loan → exactly 1 book; each book ← 0..* loans. This simplified API allows multiple loans for the same book and keeps the link after close.',
    navigation: 'Loan → book through its field and book(). Book stores no reverse loan link. Reverse multiplicity describes possible links, not a reverse Java collection.',
  }, {
    from: 'Loan', to: 'Loan.Receipt', kind: 'Composition',
    explanation: 'The filled diamond is at the whole, Loan. Only issueReceipt constructs a Receipt, with this as its fixed owner. Repeated issuance returns the same part. close retires the part, clears its text and rejects subsequent issuance. There is no attach or transfer API. These policies, rather than nesting, justify composition.',
    multiplicity: 'Each loan → 0..1 receipt, including a retained retired receipt after close; each created receipt → exactly 1 fixed owner loan. Our no-transfer rule is stronger than the UML at-most-one-composite rule.',
    navigation: 'Loan → receipt through receipt()/its field; Receipt → owner through its private field, consulted by isFor. Returning or saving a receipt reference does not transfer ownership.',
  }, {
    from: 'Shelf', to: 'Labelled', kind: 'Dependency',
    explanation: 'preview accepts Labelled and calls label() without retaining that argument. The dashed open arrow points from client Shelf to supplier Labelled. A book passed to preview might already be on the shelf; this operation does not add it.',
  }],
  notes: [
    'This viewer is an annotated Java class view, not a complete UML editor. +, -, # and ~ are visibility symbols. Java modifiers in braces, Java generic field types and constructor signatures are explanatory conventions; standard UML commonly underlines static members and italicizes abstract ones.',
    'Multiplicities and navigation are supplied in text, not attached to graphical endpoints. Read the count near the target in a conventional drawing as the number of target objects for one source. A plain line does not mean bidirectional navigation; omitted navigation is unspecified.',
    'Shelf.books is the implementation of the same membership modeled by Shelf–Book, not a second independent relationship. Collection syntax alone cannot prove non-null entries, uniqueness or a lower bound of one.',
    'Only selected relationships are shown. Inherited members, implicit Shelf constructor, JDK types, demo variables and validation dependencies are omitted. This is neither an exhaustive dependency graph nor a database schema.',
    'UML deletion of a composite cascades to its current object parts. Here close models logical domain retirement; closed loans and retired receipts are still reachable Java objects. Domain retirement makes read() fail; it makes no claim about JVM destruction, garbage collection timing or secure erasure.',
    'This single-threaded structural example has no library-wide lending registry, exclusive checkout invariant, persistence or concurrency protocol. Structure does not specify call order or prove a behavioral contract.',
  ],
};
