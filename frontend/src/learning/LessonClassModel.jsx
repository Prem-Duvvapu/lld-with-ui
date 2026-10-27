import { useId } from 'react';
import DiagramViewer from '../components/DiagramViewer';
import './LessonClassModel.css';

function Relationship({ relationship }) {
  return <>
    <strong>{relationship.kind}: {relationship.from} → {relationship.to}</strong>
    <p>{relationship.explanation}</p>
    {relationship.multiplicity && <p>Multiplicity: {relationship.multiplicity}</p>}
    {relationship.navigation && <p>Navigation: {relationship.navigation}</p>}
  </>;
}

// A bounded, two-column declaration view. Relationships are explicit rows rather
// than geometry inferred from JavaScript objects or an automatic graph layout.
export default function LessonClassModel({ model }) {
  const titleId = useId();
  const legend = <>
    <p>Each box has type, field and operation compartments. + means public, - means private, # means protected, and ~ means package access. Braces name Java modifiers; static belongs to the class. Constructors have no return type.</p>
    <p>Each relationship row names its kind and reads from the first type to the second. Generalization means extends; realization means implements; dependency means uses. Association describes a retained link. Shared aggregation and composition require the stated domain rules. Navigation and multiplicities are written explicitly when established; an arrow alone does not assert ownership or a reverse link.</p>
    <p>These are annotated class views of canonical Java, not object snapshots, JVM execution or memory layouts. Only listed declarations and relationships are shown. Inherited members, implicit constructors, JDK types and demo/trace plumbing may be omitted. The text explanation repeats every box, member and relationship at normal reading size.</p>
  </>;
  const transcript = <>
    <p>{model.summary}</p>
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
    <DiagramViewer title={model.title} width={720} legend={legend} transcript={transcript}>
      <div className="lesson-class-model-canvas" aria-hidden="true">
        <div className="lesson-class-model-types">
          {model.classes.map(type => <div className="lesson-class-model-type" key={type.name}>
            <header><span>{type.kind}</span><h3>{type.name}</h3><p>{type.description}</p><small>{type.source}</small></header>
            <div><h4>Fields</h4>{type.fields.length ? <ul>{type.fields.map(member => <li key={member}><code>{member}</code></li>)}</ul> : <p>None declared in this view.</p>}</div>
            <div><h4>Operations</h4>{type.methods.length ? <ul>{type.methods.map(member => <li key={member}><code>{member}</code></li>)}</ul> : <p>None declared in this view.</p>}</div>
          </div>)}
        </div>
        <div className="lesson-class-model-relationships">
          <h3>Relationships</h3>
          {model.relationships.length ? model.relationships.map((relationship, index) => <div key={index}><Relationship relationship={relationship} /></div>) : <p>{model.noRelationships}</p>}
        </div>
        <div className="lesson-class-model-constraints"><h3>Reading constraints</h3><ul>{model.notes.map(note => <li key={note}>{note}</li>)}</ul></div>
      </div>
    </DiagramViewer>
  </section>;
}
