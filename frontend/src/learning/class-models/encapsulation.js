export default {
  title: 'Shelf mutation boundaries',
  summary: 'Two alternative shelf designs show why access to collection elements matters as well as access to a field.',
  classes: [{
    name: 'LeakyShelf', kind: 'public final class · counterexample', source: 'LeakyShelf.java', description: 'Exposes a mutable list, allowing callers to bypass addTopic validation.',
    fields: ['+ topics: List<String> {final}'], methods: ['+ addTopic(topic: String): void'],
  }, {
    name: 'ReadingShelf', kind: 'public final class', source: 'ReadingShelf.java', description: 'Enforces positive capacity and validated additions behind private state.',
    fields: ['- capacity: int {final}', '- topics: List<String> {final}'],
    methods: ['+ ReadingShelf(capacity: int)', '+ addTopic(topic: String): void', '+ getCapacity(): int', '+ getTopics(): List<String>'],
  }],
  relationships: [],
  noRelationships: 'These are independent alternatives, with no extends, implements or retained link between the two shelf classes.',
  notes: ['final prevents reassigning the list field; it does not make the list unmodifiable.', 'ReadingShelf.getTopics returns a detached unmodifiable membership list via List.copyOf. This is not a general deep-copy guarantee.', 'Neither private fields nor snapshot reads make these sequential classes thread-safe.'],
};
