import { useId, useState } from 'react';
import DiagramViewer from '../components/DiagramViewer';
import DiagramMarkers from '../components/DiagramMarkers';
import './LessonClassModel.css';

const CONNECTORS = {
  Generalization: { end: 'triangle', description: 'Solid line with a hollow triangle at the supplier (to) type.' },
  Realization: { end: 'triangle', dashed: true, description: 'Dashed line with a hollow triangle at the supplier (to) type.' },
  Dependency: { end: 'arrow', dashed: true, description: 'Dashed line with an open arrow at the supplier (to) type.' },
  Association: { description: 'Plain solid line without arrowheads. Navigation is specified separately in text.' },
  'Shared aggregation': { start: 'aggregation', description: 'Solid line with a hollow diamond at the whole (from) type. Navigation is specified separately in text.' },
  Composition: { start: 'composition', description: 'Solid line with a filled diamond at the whole (from) type. Navigation is specified separately in text.' },
};

function Relationship({ relationship }) {
  return <>
    <strong>{relationship.kind}: {relationship.from} → {relationship.to}</strong>
    <p>Connector: {CONNECTORS[relationship.kind]?.description || 'No connector notation is provided for this kind.'}</p>
    <p>{relationship.explanation}</p>
    {relationship.multiplicity && <p>Multiplicity: {relationship.multiplicity}</p>}
    {relationship.navigation && <p>Navigation: {relationship.navigation}</p>}
  </>;
}

function ClassBox({ type }) {
  return <div className="lesson-class-model-type" data-type={type.name}>
    <header><span>{type.kind}</span><h3>{type.name}</h3><p>{type.description}</p><small>{type.source}</small></header>
    <div><h4>Fields</h4>{type.fields.length ? <ul>{type.fields.map(member => <li key={member}><code>{member}</code></li>)}</ul> : <p>None declared in this view.</p>}</div>
    <div><h4>Operations</h4>{type.methods.length ? <ul>{type.methods.map(member => <li key={member}><code>{member}</code></li>)}</ul> : <p>None declared in this view.</p>}</div>
  </div>;
}

function Connector({ relationship }) {
  // The viewer may render children in separate inline/fullscreen copies. IDs
  // belong to each rendered connector, not to the outer model or child element.
  const markerPrefix = `lesson-model-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const notation = CONNECTORS[relationship.kind];
  if (!notation) return null;
  return <svg className="lesson-class-model-connector" viewBox="0 0 128 64" width="128" height="64" aria-hidden="true" focusable="false" data-kind={relationship.kind}>
    <DiagramMarkers prefix={markerPrefix} hollowClassName="lesson-class-model-hollow" />
    <path className="lesson-class-model-edge" d="M0 32 H128" fill="none"
      strokeDasharray={notation.dashed ? '8 5' : undefined}
      markerStart={notation.start ? `url(#${markerPrefix}-${notation.start})` : undefined}
      markerEnd={notation.end ? `url(#${markerPrefix}-${notation.end})` : undefined} />
  </svg>;
}

// Fixed pair geometry uses only the curated kind/from/to relationship. Neither
// Java references nor English navigation prose determine connector or arrowheads.
export default function LessonClassModel({ model }) {
  const titleId = useId();
  const selectorId = useId();
  const helpId = useId();
  const [view, setView] = useState({ model, relationship: null });
  // Reset on model identity changes, including a return to an earlier model.
  // Guarded render-time adjustment prevents a stale pair from resurfacing.
  if (view.model !== model) setView({ model, relationship: null });
  const selected = view.model === model && model.relationships.includes(view.relationship) ? view.relationship : null;
  const types = selected ? [selected.from, selected.to].map(name => model.classes.find(type => type.name === name)) : model.classes;
  const legend = <>
    <p>Each box has type, field and operation compartments. + means public, - means private, # means protected, and ~ means package access. Braces name Java modifiers; static belongs to the class. Constructors have no return type.</p>
    <p>Select a relationship to connect its two endpoint boxes across the fixed gap. Generalization uses a solid line and hollow triangle at the supplier; realization uses a dashed line and hollow triangle; dependency uses a dashed line and open arrow. Shared aggregation has a hollow diamond at the whole/source; composition has a filled diamond there. Association uses a plain solid line. No arrowheads are added to association or diamond connectors; their navigation and multiplicities remain explicit in text. A plain line does not assert bidirectional navigation.</p>
    <p>Relationship labels read from the first curated type to the second. Generalization means extends; realization means implements; dependency means uses. The association examples here show retained links. Shared aggregation and composition require the stated domain rules. The All types overview shows all listed declarations and relationship descriptions; select an individual relationship to see its connector.</p>
    <p>These are annotated class views of canonical Java, not object snapshots, JVM execution or memory layouts. Only listed declarations and relationships are shown. Inherited members, implicit constructors, JDK types and demo/trace plumbing may be omitted. The text explanation repeats every box, member and relationship at normal reading size.</p>
  </>;
  const transcript = <>
    <p>{model.summary}</p>
    <p>{selected ? `Current pair: ${selected.kind}, ${selected.from} to ${selected.to}. Only these two endpoint boxes are shown; the complete model follows below.` : 'Current view: All types overview. Choose a relationship to display its connector.'}</p>
    {model.classes.map(type => <div key={type.name}>
      <h4>{type.name} — {type.kind}</h4>
      <p>Source: {type.source}</p>
      <p>{type.description}</p>
      <p>Fields: {type.fields.length ? type.fields.join('; ') : 'None declared in this view.'}</p>
      <p>Operations: {type.methods.length ? type.methods.join('; ') : 'None declared in this view.'}</p>
    </div>)}
    <h4>Relationships</h4>
    {model.relationships.length ? <ul>{model.relationships.map((relationship, index) => <li key={index}><Relationship relationship={relationship} /></li>)}</ul> : <p>{model.noRelationships}</p>}
    <h4>Reading constraints</h4>
    <ul>{model.notes.map(note => <li key={note}>{note}</li>)}</ul>
  </>;

  return <section className="lesson-class-model" aria-labelledby={titleId}>
    <h2 id={titleId}>{model.title}</h2>
    <p>{model.summary}</p>
    <label className="lesson-class-model-selector" htmlFor={selectorId}>Class model view
      <select id={selectorId} aria-describedby={helpId} value={selected ? String(model.relationships.indexOf(selected)) : 'all'} onChange={event => setView({ model, relationship: event.target.value === 'all' ? null : model.relationships[Number(event.target.value)] })}>
        <option value="all">All types</option>
        {model.relationships.map((relationship, index) => <option key={index} value={index}>{relationship.kind}: {relationship.from} / {relationship.to}</option>)}
      </select>
    </label>
    <p id={helpId}>All types preserves the overview. Choose a relationship to show its two endpoint classes and connector. Only listed declarations are shown; inherited members, implicit constructors and demo plumbing may be omitted. The text explanation always includes every type and relationship.</p>
    <div className="lesson-class-model-selection" aria-live="polite">
      {selected ? <Relationship relationship={selected} /> : <p>Showing all {model.classes.length} types. {model.relationships.length ? 'Choose a relationship to inspect its connector.' : model.noRelationships}</p>}
    </div>
    <DiagramViewer title={model.title} headingLevel={3} width={720} legend={legend} transcript={transcript}>
      <div className="lesson-class-model-canvas" aria-hidden="true">
        {selected && <p>Selected relationship: {selected.kind}. From: {selected.from}. To: {selected.to}. Other types are omitted from this pair view.</p>}
        <div className={`lesson-class-model-types${selected ? ' lesson-class-model-pair' : ''}`}>
          {types.map(type => <ClassBox key={type.name} type={type} />)}
          {selected && <Connector relationship={selected} />}
        </div>
        <div className="lesson-class-model-relationships">
          <h3>Relationships</h3>
          {model.relationships.length ? (selected ? [selected] : model.relationships).map((relationship, index) => <div key={index}><Relationship relationship={relationship} /></div>) : <p>{model.noRelationships}</p>}
        </div>
        <div className="lesson-class-model-constraints"><h3>Reading constraints</h3><ul>{model.notes.map(note => <li key={note}>{note}</li>)}</ul></div>
      </div>
    </DiagramViewer>
  </section>;
}
