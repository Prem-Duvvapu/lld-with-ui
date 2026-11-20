export const LESSON_DIAGRAM_KINDS = {
  'use-case': { label: 'Use case diagram', load: () => import('./diagrams/UseCaseDiagram') },
  sequence: { label: 'Sequence diagram', load: () => import('./diagrams/LessonSequenceDiagram') },
  activity: { label: 'Activity diagram', load: () => import('./diagrams/LessonActivityDiagram') },
  'state-machine': { label: 'State machine diagram', load: () => import('./diagrams/LessonStateMachineDiagram') },
  principles: { label: 'SOLID before and after', load: () => import('./diagrams/SolidPrinciplesDiagram') },
};

export function lessonDiagramLabel(kind) {
  return Object.hasOwn(LESSON_DIAGRAM_KINDS, kind) ? LESSON_DIAGRAM_KINDS[kind].label : 'Diagram';
}
