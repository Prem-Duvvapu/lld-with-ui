export default {
  title: 'StudyCard class model',
  summary: 'One declaration describes every StudyCard instance. The recorded illustration separately shows objects and aliases.',
  classes: [{
    name: 'StudyCard', kind: 'public final class', source: 'StudyCard.java',
    description: 'Stores one card’s topic and review count.',
    fields: ['- topic: String {final}', '- reviewCount: int'],
    methods: ['+ StudyCard(topic: String)', '+ review(): void', '+ getTopic(): String', '+ getReviewCount(): int'],
  }],
  relationships: [],
  noRelationships: 'No relationship between domain types is needed here. first, second and alias are demo variables, not fields or classes.',
  notes: ['Both fields belong to each instance. A final topic reference prevents reassignment after construction; reviewCount remains mutable.', 'Equal topic values do not merge objects. This class view does not count runtime instances or references.', 'review() uses int increment without overflow checks or synchronization.'],
};
