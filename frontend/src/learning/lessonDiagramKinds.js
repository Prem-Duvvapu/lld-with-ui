export const LESSON_DIAGRAM_KINDS = {
  'use-case': { label: 'Use case diagram', load: () => import('./diagrams/UseCaseDiagram') },
};

export function lessonDiagramLabel(kind) {
  return Object.hasOwn(LESSON_DIAGRAM_KINDS, kind) ? LESSON_DIAGRAM_KINDS[kind].label : 'Diagram';
}
