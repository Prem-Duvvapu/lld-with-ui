import { useId, useState } from 'react';
import DiagramViewer from '../../components/DiagramViewer';
import DiagramMarkers from '../../components/DiagramMarkers';
import { USE_CASE_RELATIONSHIPS, validateUseCaseModel } from './useCaseModel';
import './UseCaseDiagram.css';

function RelationshipText({ edge, nodes }) {
  return <>
    <strong>{USE_CASE_RELATIONSHIPS[edge.kind].name}: {nodes.get(edge.from).label} / {nodes.get(edge.to).label}</strong>
    <p>{USE_CASE_RELATIONSHIPS[edge.kind].explanation}</p>
    <p>{edge.description}</p>
    {edge.condition && <p>Condition: {edge.condition}</p>}
    {edge.extensionPoint && <p>Base extension point: {edge.extensionPoint}</p>}
  </>;
}

// Allocate IDs inside each rendered SVG, including retained inline/modal copies.
function Canvas({ model, selected }) {
  const prefix = `use-case-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const edges = selected ? [selected] : model.relationships;
  const boundary = model.boundary;
  return <svg className="lesson-use-case-canvas" width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} aria-hidden="true" focusable="false">
    <DiagramMarkers prefix={prefix} />
    <rect className="use-case-boundary" x={boundary.x} y={boundary.y} width={boundary.width} height={boundary.height} />
    <text className="use-case-boundary-title" x={boundary.x + 16} y={boundary.y + 28}>{boundary.label}</text>
    {edges.map(edge => {
      const notation = USE_CASE_RELATIONSHIPS[edge.kind];
      const first = edge.points[0], last = edge.points.at(-1);
      const label = edge.labelPosition || { x: (first[0] + last[0]) / 2, y: (first[1] + last[1]) / 2 - 10 };
      return <g key={edge.id} data-relationship={edge.id} data-kind={edge.kind} data-from={edge.from} data-to={edge.to}>
        <polyline className="use-case-relationship" points={edge.points.map(p => p.join(',')).join(' ')} fill="none" strokeDasharray={notation.dashed ? '8 5' : undefined} markerEnd={notation.marker ? `url(#${prefix}-${notation.marker})` : undefined} />
        {notation.label && <g className="use-case-edge-label">
          <rect x={label.x - 53} y={label.y - 16} width={106} height={24} rx={4} />
          <text x={label.x} y={label.y} textAnchor="middle">{notation.label}</text>
        </g>}
      </g>;
    })}
    {model.actors.map(actor => <g key={actor.id} className="use-case-actor" data-node={actor.id} transform={`translate(${actor.x} ${actor.y})`}>
      <circle cx={0} cy={-32} r={12} /><path d="M0 -20 V12 M-22 -8 H22 M0 12 L-18 38 M0 12 L18 38" fill="none" />
      <text x={0} y={62} textAnchor="middle">{actor.label}</text>
    </g>)}
    {model.useCases.map(useCase => {
      const lines = useCase.labelLines || [useCase.label];
      return <g key={useCase.id} className="use-case-goal" data-node={useCase.id}>
        <ellipse cx={useCase.x} cy={useCase.y} rx={useCase.rx} ry={useCase.ry} />
        <text x={useCase.x} y={useCase.y - (lines.length - 1) * 10 + 5} textAnchor="middle">{lines.map((line, index) => <tspan key={index} x={useCase.x} dy={index ? 20 : 0}>{line}</tspan>)}</text>
      </g>;
    })}
  </svg>;
}

export default function UseCaseDiagram({ model }) {
  const nodes = validateUseCaseModel(model);
  const titleId = useId(), selectId = useId(), helpId = useId();
  const [view, setView] = useState({ model, selected: null });
  if (view.model !== model) setView({ model, selected: null });
  const selected = view.model === model && model.relationships.includes(view.selected) ? view.selected : null;
  const transcript = <>
    <h4>Subject boundary: {model.boundary.label}</h4><p>{model.boundary.description}</p>
    <h4>Actors outside the boundary</h4>
    <ul>{model.actors.map(actor => <li key={actor.id}><strong>{actor.label}</strong><p>{actor.description}</p></li>)}</ul>
    <h4>Use cases within the boundary</h4>
    <ul>{model.useCases.map(useCase => <li key={useCase.id}><strong>{useCase.label}</strong><p>{useCase.description}</p>
      {useCase.extensionPoints?.length > 0 && <p>Extension points: {useCase.extensionPoints.join('; ')}</p>}
    </li>)}</ul>
    <h4>All relationships</h4>
    <ul>{model.relationships.map(edge => <li key={edge.id}><RelationshipText edge={edge} nodes={nodes} /></li>)}</ul>
    <h4>Reading constraints</h4><ul>{model.notes.map(note => <li key={note}>{note}</li>)}</ul>
  </>;
  return <section className="lesson-use-case" aria-labelledby={titleId}>
    <h2 id={titleId}>{model.title}</h2><p>{model.summary}</p>
    <label className="lesson-use-case-selector" htmlFor={selectId}>Use case relationship
      <select id={selectId} aria-describedby={helpId} value={selected?.id || 'all'} onChange={event => setView({ model, selected: model.relationships.find(edge => edge.id === event.target.value) || null })}>
        <option value="all">All relationships</option>
        {model.relationships.map(edge => <option key={edge.id} value={edge.id}>{USE_CASE_RELATIONSHIPS[edge.kind].name}: {nodes.get(edge.from).label} / {nodes.get(edge.to).label}</option>)}
      </select>
    </label>
    <p id={helpId}>Every view keeps the subject, actors and goals in place. Selecting a relationship shows only that line; other relationship lines are omitted. The text explanation always includes the complete diagram.</p>
    <div className="lesson-use-case-selection" aria-live="polite">{selected ? <RelationshipText edge={selected} nodes={nodes} /> : <p>Showing all {model.relationships.length} relationships. The diagram shows roles and goals, not call order or Java inheritance.</p>}</div>
    <DiagramViewer title={model.title} headingLevel={3} width={model.width} transcript={transcript} legend={<>
      <p>Stick figures represent external roles, ellipses represent use cases, and the rectangle marks the subject being considered. Containment in this boundary does not establish ownership.</p>
      <p>Participation uses a plain line. Include and extend use dashed open arrows toward the included and base case respectively. Generalization uses a solid line and hollow triangle toward the general role or case. Conditions and extension points are specified in the normal-size text explanation.</p>
      <p>Layout, connecting lines and selection do not execute the Java or impose a sequence. These are authored views of the stated requirements, with mapping limits explained in the lesson.</p>
    </>}>
      <Canvas model={model} selected={selected} />
    </DiagramViewer>
  </section>;
}
