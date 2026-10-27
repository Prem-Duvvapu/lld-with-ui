import classModel from '../class-models/composition';
import documentSource from '../examples/composition/Document.java?raw';
import demoSource from '../examples/composition/CompositionDemo.java?raw';
import output from '../examples/composition-output.txt?raw';
import snapshots from '../examples/composition-snapshots.json';

export default {
  classModel,
  id: 'composition',
  summary: 'Turn whole/part intent into an enforced ownership boundary. A document creates its own pages, rejects foreign edits and retires page content explicitly when pages or the document are deleted.',
  prerequisites: 'Association: links, multiplicities and reference identity. Private fields, constructors and validation; the explanation contrasts shared aggregation without requiring that lesson first.',
  objectives: [
    'Explain UML composite ownership and distinguish exclusive membership from exclusive Java reachability.',
    'Trace the API restrictions and lifecycle guards that implement this document’s composition contract.',
    'Predict what outside page references and historical membership lists can do after domain deletion.',
  ],
  problem: 'An editor must prevent a page from being part of two documents at once. Deleting a document must also retire all pages it still owns, including pages held by outside observers. Merely clearing a list would leave their content usable. Which construction, mutation and deletion rules will make the intended ownership true?',
  explanation: [
    { title: 'Strengthen the relationship with a precise contract', text: 'Association establishes possible links without necessarily saying whole/part. Shared aggregation can express a whole/part interpretation with domain-specific rules, such as independently managed catalog tracks. UML composite aggregation adds an at-most-one-composite constraint for a part object at a time and deletion of object parts with their composite. A filled diamond at the whole communicates this stronger contract. The specification intentionally leaves detailed lifecycle and creation mechanics open. A diamond is a modeling commitment; Java requires an implementation.' },
    { title: 'Read ownership separately from navigation and multiplicity', text: 'Document [1] ◆—pages— [0..*] Page means one fixed owning document per page in this example and zero or more current pages per document. The filled diamond sits at Document, the whole. UML permits at most one composite owner at a time; this API chooses the stricter policy of no transfer during a page’s lifecycle. Document can navigate its pages; a page can expose its owner’s name. Neither navigation nor the number of references tells you how many composite owners exist. Other variables may observe a part without becoming its owners.' },
    { title: 'Close the construction and membership boundary', text: 'Document.createPage constructs every Page with this as owner and adds it to private membership storage. The public nested Page type has a private constructor, a final owner reference and no owner setter or public attach method. Its outer Document can access its private members under Java access-control rules. Nesting is used to express that boundary; nesting alone would not enforce lifecycle rules. A top-level class with a carefully restricted factory could implement a similar contract. Constructing parts internally is our choice, not a universal requirement of UML composition.' },
    { title: 'Validate the owner before any content mutation', text: 'revise and removePage call requireOwnedActive. It rejects a deleted document, null, a foreign owner, a retired page and inconsistent membership before changing content or the list. The comparison page.owner != this uses identity; two documents with equal names are still distinct owners. The public Page API offers content reads and metadata, but no mutation that bypasses Document. getPages returns an unmodifiable, detached membership list containing the actual pages. These ordinary Java checks enforce the boundary for normal API use, without reflection or other privileged access.' },
    { title: 'Define deletion as observable domain behavior', text: 'Removing a page in this domain retires it: retire clears its content and marks it deleted, then removePage removes membership. Deleting a document retires every remaining page, clears the list and marks the document deleted. Repeating document deletion succeeds without doing more work. A retired page still exposes deletion status and its historical owner’s name, but read fails. New pages and revisions on a deleted document fail too. This is logical deletion in a small in-memory model, not secure erasure, persistence or JVM object destruction.' },
    { title: 'Outside aliases survive, but the domain guard still applies', text: 'intro and saved.get(0) can identify the very same Page even after Draft is deleted. The Java object remains callable, so isDeleted works and read throws because the explicit state guard runs. Clearing the document’s list alone would not invalidate either alias. This contrasts with the playlist policy: a saved track stays active after its playlist ends, whereas a saved page becomes unusable for content after its owning document ends. A String value read before deletion is also outside this guard; deleting a page cannot revoke data a caller already copied.' },
    { title: 'Treat detach, transfer and copying as separate policies', text: 'UML allows a part to be removed before composite deletion where the model otherwise permits it; such a detached part need not be deleted with the old whole. Therefore “a part can never outlive any whole it once belonged to” is too broad. Our model intentionally offers removal-as-deletion and no reparenting. A transfer feature would need to remove the old membership, establish the new one and prevent overlap. Copying text into a freshly created page is a different identity and does not transfer ownership. Document has no document-valued part here, so no recursive composition cycle is introduced.' },
    { title: 'Do not confuse composition, cleanup and garbage collection', text: 'Java has no UML ownership keyword or diamond-driven deletion. final stops reassignment of the owner field but does not freeze page text or retire it automatically. Memory reclamation follows reachability, independently of our deletion status. This example invokes delete explicitly and makes no claim about collection time. It does not manage files or sockets, so it supplies no AutoCloseable resource protocol. It is single-threaded; a concurrent editor would need a lock or transaction around each complete validation-and-mutation workflow.' },
  ],
  visual: { title: 'Inspect document ownership and page retirement', summary: 'Filled diamond at Document · fixed owner identity · explicit lifecycle guards', snapshots },
  code: [
    { filename: 'composition/Document.java', source: documentSource },
    { filename: 'composition/CompositionDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out composition/Document.java composition/CompositionDemo.java\njava -cp out com.lld.learning.examples.composition.CompositionDemo',
  quiz: {
    prompt: 'saved holds Draft’s pages before draft.delete(). What happens when code calls saved.get(0).read() after deletion?',
    options: [
      { id: 'guarded-alias', text: 'The same page object is reached, but read throws because the page was explicitly retired', feedback: 'Correct. saved still retains the page reference. Document.delete called retire on its current pages; Page.read checks that state and throws Page is deleted.', correct: true },
      { id: 'list-only', text: 'It still returns Hello Java because saved is a detached list', feedback: 'The list’s membership is detached, but its page elements are shared references. Deletion retires the actual page, so saved cannot bypass its read guard.' },
      { id: 'jvm-erased', text: 'The JVM has erased the page, so even isDeleted cannot be called', feedback: 'Domain deletion is implemented by ordinary fields and methods. The retained object still exposes metadata; no garbage-collection timing or object-erasure behavior follows from a filled diamond.' },
    ],
  },
  exercise: 'Add copyPage(source) to your copy of Document. Require an active destination and readable source, then create a fresh owned Page with the source text. Copy within one document and between documents, including two documents with the same name. Verify the copied page has a different identity, editing or deleting the original does not retire the copy, and deleting the destination retires the copy. Reject a retired source and a deleted destination without changing membership. Explain why this is copying rather than transferring a part. Keep the example single-threaded.',
  rubric: [
    'Validate the destination and source before adding a page; reuse the existing creation and content checks.',
    'Construct a new Page with destination owner identity; never insert the source Page reference into a second document.',
    'Test copying inside and across documents, same-name owners, and independent content revision and lifecycle outcomes.',
    'Test retired-source and deleted-destination failures with unchanged membership, including previously saved lists and page aliases.',
    'Explain exclusive composite ownership, permitted observers, the chosen no-transfer policy and logical deletion without claiming garbage-collection control or revocation of previously read strings.',
  ],
  pitfalls: [
    'A private final List or an internal new expression alone does not prove exclusive ownership or cascade deletion. Audit every construction, attachment and removal path.',
    'Composition restricts composite membership, not all references. Returning a part can be valid if its API still preserves the ownership and lifecycle contract.',
    'An unmodifiable list does not deep-copy its pages. Historical memberships can retain references to pages that are now retired.',
    'Matching owner names is not an ownership check; the example compares the actual Document objects.',
    'The removed-page policy here is stricter than UML’s general detach allowance. Do not present no-transfer or constructor-only creation as universal composition rules.',
    'Retiring content does not erase previously returned String values, securely wipe memory, close resources or coordinate concurrent callers.',
  ],
  module: {
    path: '/tic-tac-toe',
    title: 'Audit Board and Cell ownership in Tic Tac Toe',
    text: 'Game constructs its Board internally and Board constructs a distinct Cell per coordinate. Board.reset clears symbols on the existing cells rather than replacing them; the focused lesson test checks both construction identity and reset identity. These operations illustrate controlled initial assembly and reuse, but not the document lesson’s complete lifecycle contract. Game.getBoardObj exposes the board and Board.getGrid exposes the actual mutable Cell[][], so external code can even put one board’s cell into another board’s grid. Cells have no owner validation or retirement state, and these sources implement no game-deletion cascade. The test demonstrates that exposure on local objects, without changing the module. Use the module as an ownership-boundary audit, not as proof of enforced UML composition or automatic part deletion.',
    sources: [
      'backend/src/main/java/com/lld/tictactoe/model/Game.java',
      'backend/src/main/java/com/lld/tictactoe/model/Board.java',
      'backend/src/main/java/com/lld/tictactoe/model/Cell.java',
      'backend/src/test/java/com/lld/learning/CompositionLessonExampleTest.java',
    ],
  },
  summaryPoints: [
    'Composite aggregation commits to at most one composite owner at a time and deletion of current object parts with the whole; detailed policies still need specification.',
    'This API enforces fixed ownership with private construction and membership, identity checks and explicit retirement guards, while permitting observers.',
    'Logical deletion is observable domain behavior. It cannot be inferred from a field, a final modifier, a diagram or garbage-collection reachability.',
  ],
  references: [
    { title: 'OMG UML 2.5.1: Properties (§9.5.3) and Association notation (§11.5.4)', url: 'https://www.omg.org/spec/UML/2.5.1' },
    { title: 'Java 17 Language Specification: Determining Accessibility (§6.6.1)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-6.html#jls-6.6.1' },
    { title: 'Java 17 Language Specification: final Variables (§4.12.4)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.12.4' },
    { title: 'Java 17 Language Specification: Reachability (§12.6.1)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.6.1' },
    { title: 'Java 17 List.copyOf: unmodifiable lists and shared elements', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html#copyOf(java.util.Collection)' },
  ],
};
