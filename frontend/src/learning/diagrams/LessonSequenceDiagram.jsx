import { useId } from 'react';
import SequenceDiagram from '../../components/SequenceDiagram';
import './LessonSequenceDiagram.css';

export default function LessonSequenceDiagram({ model }) {
  const titleId = useId();
  const transcriptId = useId();
  return <section className="lesson-sequence" aria-labelledby={titleId}>
    <h2 id={titleId}>{model.title}</h2>
    <p>{model.summary}</p>
    <SequenceDiagram key={model.title} customData={model.data} />
    <section className="lesson-sequence-transcript" aria-labelledby={transcriptId}>
      <h3 id={transcriptId}>All flows at reading size</h3>
      <p>This complete text stays visible when the drawing changes. Call and return labels abbreviate values; the explanations give the full results.</p>
      {model.data.flows.map(flow => <section key={flow.id} aria-label={`${flow.label} complete transcript`}>
        <h4>{flow.label}</h4>
        <p>{flow.description}</p>
        <h5>Object lifelines</h5>
        <ul>{flow.participants.map(participant => <li key={participant.id}>
          <strong>{participant.name}</strong> — {participant.description}
        </li>)}</ul>
        <h5>Calls, replies and execution boundaries</h5>
        <ol>{flow.steps.map((step, index) => {
          const name = id => flow.participants.find(participant => participant.id === id).name;
          return <li key={index}>
            <strong>{name(step.from)} → {name(step.to)} ({step.type === 'return' ? 'reply' : 'synchronous call'})</strong>
            <p><code>{step.text}</code></p>
            <p>{step.detail}</p>
            {step.activate && <p>Execution begins: {name(step.activate)}.</p>}
            {step.deactivate && <p>Execution ends: {name(step.deactivate)}.</p>}
          </li>;
        })}</ol>
      </section>)}
      <h4>Notation and limits</h4>
      <ul>{model.notes.map(note => <li key={note}>{note}</li>)}</ul>
    </section>
  </section>;
}
