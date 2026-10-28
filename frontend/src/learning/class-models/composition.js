export default {
  title: 'Document composite ownership',
  summary: 'Document exclusively creates and manages Page parts. Removal and deletion retire page content under an explicit no-transfer policy.',
  classes: [{
    name: 'Document', kind: 'public final class', source: 'composition/Document.java', description: 'Controls creation, edits, membership and retirement of its pages.',
    fields: ['- name: String {final}', '- pages: List<Page> {final}', '- deleted: boolean'],
    methods: ['+ Document(name: String)', '+ getName(): String', '+ isDeleted(): boolean', '+ getPages(): List<Page>', '+ createPage(text: String): Page', '+ revise(page: Page, text: String): void', '+ removePage(page: Page): void', '+ delete(): void', '- requireOwnedActive(page: Page): void', '- requireActive(): void', '- required(value: String, label: String): String {static}'],
  }, {
    name: 'Document.Page', kind: 'public static final nested class', source: 'composition/Document.java', description: 'Keeps a fixed owner and rejects reading retired content; metadata remains readable.',
    fields: ['- owner: Document {final}', '- text: String', '- deleted: boolean'],
    methods: ['- Page(owner: Document, text: String)', '+ getOwnerName(): String', '+ isDeleted(): boolean', '+ read(): String', '- requireActive(): void', '- retire(): void'],
  }],
  relationships: [{ from: 'Document', to: 'Document.Page', kind: 'Composition', explanation: 'Document is the composite whole. Only its creation path invokes the private Page constructor, fixes owner identity and attaches the page. Foreign edits are rejected; removing a page retires it, and deleting the document retires all current pages. No transfer API exists.', multiplicity: 'Each document → 0..* current pages; each created page → exactly 1 fixed owner document, including after retirement. A retired page is absent from current membership.', navigation: 'Document → current pages through pages/getPages. Page → owner through its private owner field and getOwnerName; it does not return the owner object.' }],
  notes: ['Static nesting alone does not establish composition; ownership is supported by construction, identity validation and all retirement paths.', 'No-transfer is stronger than the general at-most-one-composite rule. A retired page still retains its owner reference but cannot read its cleared text.', 'getPages returns detached membership with shared Page identities. Saved lists and page references can remain after domain deletion; no garbage-collection timing, secure erasure or JVM destruction is promised.'],
};
