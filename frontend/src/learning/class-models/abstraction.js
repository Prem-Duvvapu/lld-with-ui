export default {
  title: 'Bounded label abstraction',
  summary: 'The interface describes the caller contract; the abstract base centralizes validation and delegates shortening to concrete subclasses.',
  classes: [{
    name: 'TopicLabel', kind: 'public interface', source: 'TopicLabel.java', description: 'Requires a nonblank bounded label, preserving stripped text when it fits.',
    fields: [], methods: ['+ render(topic: String): String {abstract}'],
  }, {
    name: 'BoundedTopicLabel', kind: 'public abstract class', source: 'BoundedTopicLabel.java', description: 'Validates the limit and input; final render calls an abstract shortening hook.',
    fields: ['- maxChars: int {final}'], methods: ['# BoundedTopicLabel(maxChars: int)', '+ render(topic: String): String {final}', '# shorten(text: String, maxChars: int): String {abstract}'],
  }, {
    name: 'EllipsisTopicLabel', kind: 'public final class', source: 'EllipsisTopicLabel.java', description: 'Shortens with three trailing dots.',
    fields: [], methods: ['+ EllipsisTopicLabel(maxChars: int)', '# shorten(text: String, maxChars: int): String'],
  }, {
    name: 'ClippedTopicLabel', kind: 'public final class', source: 'ClippedTopicLabel.java', description: 'Shortens by taking the first maxChars units.',
    fields: [], methods: ['+ ClippedTopicLabel(maxChars: int)', '# shorten(text: String, maxChars: int): String'],
  }],
  relationships: [{ from: 'BoundedTopicLabel', to: 'TopicLabel', kind: 'Realization', explanation: 'implements provides the final render operation while leaving shorten abstract.' }, { from: 'EllipsisTopicLabel', to: 'BoundedTopicLabel', kind: 'Generalization', explanation: 'extends inherits render and implements the protected shorten hook.' }, { from: 'ClippedTopicLabel', to: 'BoundedTopicLabel', kind: 'Generalization', explanation: 'extends uses the same validation with a different shorten implementation.' }],
  notes: ['The abstract base cannot be directly instantiated. Private maxChars is not duplicated in subclass compartments.', 'final render prevents overriding that method; it does not prove a subclass hook satisfies the behavioral contract.', 'Limits count Java String.length() UTF-16 units, not graphemes or screen pixels. No retained collaborator association is shown.'],
};
