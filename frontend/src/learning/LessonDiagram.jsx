import { lazy } from 'react';
import { LESSON_DIAGRAM_KINDS } from './lessonDiagramKinds';

const renderers = Object.fromEntries(Object.entries(LESSON_DIAGRAM_KINDS).map(([kind, entry]) => [kind, lazy(entry.load)]));

export default function LessonDiagram({ model }) {
  const Renderer = Object.hasOwn(renderers, model?.kind) ? renderers[model.kind] : null;
  if (!Renderer) throw new Error('This lesson diagram type is not supported.');
  return <Renderer model={model} />;
}
