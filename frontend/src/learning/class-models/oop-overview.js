// Selected declarations and relationships from the capstone's canonical Java.
// Domain constraints are explicit; nesting alone does not establish ownership.
export default {
  title: 'Study plan domain model',
  summary: 'A plan owns its entries, each entry selects a shared catalog topic, and prompt generation uses a policy supplied for that call.',
  classes: [{
    name: 'StudyPlan', kind: 'public final class', source: 'oopoverview/StudyPlan.java', description: 'Guards bounded membership and archives its entries.',
    fields: ['+ DEFAULT_CAPACITY: int {static final}', '- name: String {final}', '- capacity: int {final}', '- entries: List<Entry> {final}', '- state: State'],
    methods: ['+ StudyPlan(name: String)', '+ StudyPlan(name: String, capacity: int)', '+ name(): String', '+ capacity(): int', '+ state(): State', '+ entries(): List<Entry>', '+ add(topic: Topic): Entry', '+ remove(entry: Entry): void', '+ archive(): void', '- requireOpen(): void'],
  }, {
    name: 'StudyPlan.State', kind: 'public nested enum', source: 'oopoverview/StudyPlan.java', description: 'Declares OPEN and ARCHIVED domain states.',
    fields: ['+ OPEN: State {enum constant}', '+ ARCHIVED: State {enum constant}'], methods: [],
  }, {
    name: 'StudyPlan.Entry', kind: 'public static final nested class', source: 'oopoverview/StudyPlan.java', description: 'Keeps a fixed owner and topic, and refuses prompts after retirement.',
    fields: ['- owner: StudyPlan {final}', '- topic: Topic {final}', '- retired: boolean'],
    methods: ['- Entry(owner: StudyPlan, topic: Topic)', '+ topic(): Topic', '+ isRetired(): boolean', '+ prompt(style: PromptStyle): String', '- requireActive(): void'],
  }, {
    name: 'Topic', kind: 'public final class', source: 'oopoverview/Topic.java', description: 'An independently managed mutable catalog topic shared across plans.',
    fields: ['- title: String'], methods: ['+ Topic(title: String)', '+ title(): String', '+ rename(title: String): void'],
  }, {
    name: 'PromptStyle', kind: 'public interface', source: 'oopoverview/PromptStyle.java', description: 'Requires nonblank prompts from stripped nonblank titles.',
    fields: [], methods: ['+ format(title: String): String {abstract}'],
  }, {
    name: 'PlainPrompt', kind: 'public class', source: 'oopoverview/PlainPrompt.java', description: 'Validates and formats a plain review prompt.',
    fields: [], methods: ['+ format(title: String): String'],
  }, {
    name: 'HintedPrompt', kind: 'public final class', source: 'oopoverview/HintedPrompt.java', description: 'Reuses parent validation and appends an example hint.',
    fields: [], methods: ['+ format(title: String): String'],
  }],
  relationships: [{ from: 'StudyPlan', to: 'StudyPlan.Entry', kind: 'Composition', explanation: 'Only add creates and attaches a private-constructor entry with this owner. remove retires one entry and archive retires all current entries. Foreign owners are rejected by identity; entries cannot transfer.', multiplicity: 'Each plan → 0..capacity current entries; each created entry → exactly 1 fixed owner, even after retirement. Retired entries are absent from current membership.', navigation: 'Plan → current entries via entries(). Entry → owner through its private field, with no public owner getter.' }, { from: 'StudyPlan.Entry', to: 'Topic', kind: 'Association', explanation: 'Each entry retains the actual topic identity. Different plans may share a topic; duplicate identity is rejected within one open plan. Retirement does not delete or freeze the topic.', multiplicity: 'Each entry → exactly 1 topic; each topic ← 0..* entries, including retained retired entries.', navigation: 'Entry → topic through topic(). Topic stores no entry or plan links.' }, { from: 'StudyPlan.Entry', to: 'PromptStyle', kind: 'Dependency', explanation: 'prompt uses a nonnull per-call style without storing it. It trusts the returned text and does not roll back policy side effects.' }, { from: 'PlainPrompt', to: 'PromptStyle', kind: 'Realization', explanation: 'implements supplies format.' }, { from: 'HintedPrompt', to: 'PlainPrompt', kind: 'Generalization', explanation: 'extends overrides format and calls super.format.' }],
  notes: ['The State field refers to one enum constant; this is not a composition of state-machine policy objects. Its constants are implicitly public static final. Nesting alone does not establish composition.', 'capacity is positive and DEFAULT_CAPACITY is 2. A final topic reference does not make the shared Topic immutable.', 'entries() copies membership, not Entry objects. Archive is logical retirement with retained metadata and references, not JVM destruction.', 'This selected model omits demo plumbing, JDK relationships and implicit constructors. It is a sequential in-memory design, not a persistence, concurrency or full SOLID proof.'],
};
