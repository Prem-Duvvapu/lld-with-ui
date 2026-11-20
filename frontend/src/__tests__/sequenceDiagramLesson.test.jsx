// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LessonSequenceDiagram from '../learning/diagrams/LessonSequenceDiagram';
import LessonClassModel from '../learning/LessonClassModel';
import lesson from '../learning/lessons/sequence-diagram';
import model from '../learning/diagrams/sequence-diagram';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const example = file => read(`frontend/src/learning/examples/${file}`);
const transcript = () => screen.getByRole('heading', { name: 'All flows at reading size' }).closest('section');

// Parent integrates the lazy kind registry and publication manifest. These tests
// exercise real standalone components and data; global route wiring is not verified here.
describe('Dedicated Sequence Diagram lesson: standalone draft', () => {
  it('imports all displayed Java and fixtures canonically without depending on publication', () => {
    expect(lesson.id).toBe('sequence-diagram');
    expect(lesson.diagram).toBe(model);
    expect(model.kind).toBe('sequence');
    expect(lesson.code.map(block => block.filename)).toEqual([
      'sequence/InteractionTrace.java', 'sequence/ParcelFees.java', 'sequence/ReceiptWriter.java',
      'sequence/QuoteDesk.java', 'sequence/QuoteClient.java', 'sequence/SequenceDemo.java',
    ]);
    for (const block of lesson.code) {
      expect(block.source).toBe(example(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('--release 17');
    expect(lesson.run).toContain('com.lld.learning.examples.sequence.SequenceDemo');
    expect(lesson.output).toBe(example('sequence-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(example('sequence-snapshots.json')));
    expect(lesson.visual.snapshots).toHaveLength(5);
    const source = read('frontend/src/learning/lessons/sequence-diagram.js');
    expect(source.match(/\.java\?raw'/g)).toHaveLength(6);
    expect(source).not.toContain('public final class');
    for (const field of ['summary', 'prerequisites', 'problem', 'exercise', 'run', 'output'])
      expect(lesson[field].length).toBeGreaterThan(50);
    for (const field of ['objectives', 'explanation', 'rubric', 'pitfalls', 'summaryPoints', 'references'])
      expect(lesson[field].length).toBeGreaterThan(2);
  });

  it('pairs every synchronous call and activation with the right returned completion', () => {
    expect(model.data.flows.map(flow => flow.id)).toEqual(['accepted', 'rejected']);
    for (const flow of model.data.flows) {
      const names = new Map(flow.participants.map(participant => [participant.id, participant.name]));
      expect([...names.keys()]).toEqual(['client', 'desk', 'fees', 'receipts']);
      expect(new Set(names.values()).size).toBe(4);
      const stack = [];
      for (const step of flow.steps) {
        expect(names.has(step.from) && names.has(step.to)).toBe(true);
        expect(step.text.length).toBeLessThanOrEqual(56); // shared viewer abbreviates longer labels
        expect(step.detail.length).toBeGreaterThan(60);
        if (step.type === 'return') {
          const call = stack.pop();
          expect([step.from, step.to]).toEqual([call.to, call.from]);
          expect(step.deactivate).toBe(call.activate);
          expect(step.activate).toBeUndefined();
        } else {
          expect(step.activate).toBe(step.to);
          expect(step.deactivate).toBeUndefined();
          stack.push(step);
        }
      }
      expect(stack).toHaveLength(0);
    }
    const rejected = model.data.flows[1];
    expect(rejected.steps).toHaveLength(4);
    expect(rejected.steps.some(step => step.from === 'receipts' || step.to === 'receipts')).toBe(false);
    expect(rejected.description).toContain('not a UML neg fragment or a thrown exception');
    expect(model.notes.join(' ')).toContain('partial order');
    expect(model.notes.join(' ')).toContain('UML also permits filled reply heads');
    expect(model.notes.join(' ')).toContain('not an alt combined-fragment frame');
  });

  it('matches each authored flow to its complete recorded Java trace without recalculating fees', () => {
    for (const [index, flow] of model.data.flows.entries()) {
      const item = lesson.visual.snapshots[index].items[0];
      const recordedTrace = item.fields.find(field => field.name === 'trace').value;
      const diagramTrace = flow.steps.map(step => `${step.type === 'return' ? 'return' : 'call'} ${step.from} -> ${step.to}: ${step.text}`).join('\n');
      expect(diagramTrace).toBe(recordedTrace);
    }
    for (const snapshot of lesson.visual.snapshots) {
      expect(snapshot.title).toBeTruthy();
      expect(snapshot.explanation.length).toBeGreaterThan(50);
      expect(snapshot.items).toHaveLength(1);
      const item = snapshot.items[0];
      expect(item.label).toMatch(/^Request at \d+ g$/);
      expect(item.typeLabel).toBe('QuoteDesk.Result');
      expect(item.fields.map(field => field.name)).toEqual([
        'weightGrams', 'accepted', 'feeCents', 'receipt', 'rejection', 'call count', 'reply count', 'trace',
      ]);
      for (const field of item.fields)
        expect(field.value === null || ['number', 'string', 'boolean'].includes(typeof field.value)).toBe(true);
    }
  });

  it('renders the shared drawing beneath h2 and retains full normal-size text for both flows', () => {
    const { container } = render(<LessonSequenceDiagram model={model} />);
    expect(screen.getByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: model.data.title, level: 3 })).toBeVisible();
    expect(screen.getByRole('heading', { name: /Quote and receipt messages.*viewer/, level: 4 })).toBeVisible();
    const full = transcript();
    expect(full.closest('details')).toBeNull();
    for (const flow of model.data.flows) {
      const text = within(full).getByRole('region', { name: `${flow.label} complete transcript` });
      expect(text).toBeVisible();
      expect(text).toHaveTextContent(flow.description);
      for (const participant of flow.participants) {
        expect(text).toHaveTextContent(participant.name);
        expect(text).toHaveTextContent(participant.description);
      }
      const labels = within(text).getAllByText(/.+/, { selector: 'code' });
      expect(labels.map(label => label.textContent)).toEqual(flow.steps.map(step => step.text));
      for (const label of labels) expect(label).toBeVisible();
      for (const step of flow.steps) expect(within(text).getByText(step.detail)).toBeVisible();
    }
    for (const note of model.notes) expect(within(full).getByText(note)).toBeVisible();
    const svg = container.querySelector('.seq-scroller svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.seq-participant-name')).toHaveLength(4);
  });

  it('selects rejection with a focusable native button while keeping every lifeline and both transcripts', () => {
    const { container } = render(<LessonSequenceDiagram model={model} />);
    const button = screen.getByRole('button', { name: 'Rejected: 0 g' });
    expect(button.tagName).toBe('BUTTON');
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Accepted: 1000 g' })).toHaveAttribute('aria-pressed', 'false');
    expect([...container.querySelectorAll('.seq-participant-name')].map(node => node.textContent)).toEqual([
      'client : QuoteClient', 'desk : QuoteDesk', 'fees : ParcelFees', 'receipts : ReceiptWriter',
    ]);
    const svg = container.querySelector('.seq-scroller svg');
    expect(svg.querySelectorAll('line[stroke-dasharray="5,4"]')).toHaveLength(4);
    expect(svg.querySelectorAll('rect[width="12"]')).toHaveLength(2); // desk + fees, no receipts execution
    expect(svg.querySelectorAll('line[marker-end]')).toHaveLength(4);
    for (const flow of model.data.flows)
      expect(within(transcript()).getByRole('region', { name: `${flow.label} complete transcript` })).toBeVisible();
    expect(within(transcript()).getByText('"Parcel 1000 g: 300 cents"', { selector: 'code' })).toBeVisible();
  });

  it('uses filled synchronous heads and dashed open replies, and hover never removes object context', () => {
    const { container } = render(<LessonSequenceDiagram model={model} />);
    const svg = container.querySelector('.seq-scroller svg');
    const filled = svg.querySelector('marker[id$="-solid"] path');
    const open = svg.querySelector('marker[id$="-open"] path');
    expect(filled).toHaveAttribute('fill', 'var(--accent)');
    expect(open).toHaveAttribute('fill', 'none');
    const arrows = [...svg.querySelectorAll('line[marker-end]')];
    expect(arrows).toHaveLength(6);
    for (const [index, step] of model.data.flows[0].steps.entries()) {
      expect(arrows[index]).toHaveAttribute('stroke-dasharray', step.type === 'return' ? '6,4' : 'none');
      expect(arrows[index].getAttribute('marker-end')).toContain(step.type === 'return' ? '-open)' : '-solid)');
      fireEvent.mouseEnter(arrows[index].parentElement);
      expect(container.querySelectorAll('.seq-participant-name')).toHaveLength(4);
      expect(container.querySelectorAll('line[stroke-dasharray="5,4"]')).toHaveLength(4);
      expect(within(transcript()).getByText(step.detail)).toBeVisible();
      expect(within(transcript()).getByRole('region', { name: 'Rejected: 0 g complete transcript' })).toBeVisible();
      fireEvent.mouseLeave(arrows[index].parentElement);
    }
    expect(svg.querySelectorAll('rect[width="12"]')).toHaveLength(3); // desk, fees, receipts
    expect(screen.getByRole('region', { name: /scrollable diagram/ })).toHaveAttribute('tabindex', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('110%');
    expect(transcript().style.transform).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');
  });

  it('uses a separate source-curated class model with complete declarations and supported relationships', () => {
    render(<LessonClassModel model={lesson.classModel} />);
    const details = screen.getByText('Text explanation', { selector: 'summary' }).parentElement;
    details.open = true;
    for (const type of lesson.classModel.classes) {
      expect(details).toHaveTextContent(`${type.name} — ${type.kind}`);
      expect(details).toHaveTextContent(type.description);
      expect(details).toHaveTextContent(type.source);
      const source = lesson.code.find(block => block.filename === type.source).source;
      expect(source).toMatch(new RegExp(`(?:class|record)\\s+${type.name.split('.').at(-1)}\\b`));
      for (const member of [...type.fields, ...type.methods]) expect(details).toHaveTextContent(member);
    }
    for (const relationship of lesson.classModel.relationships) {
      expect(details).toHaveTextContent(relationship.explanation);
      expect(details).toHaveTextContent(relationship.navigation);
      if (relationship.multiplicity) expect(details).toHaveTextContent(relationship.multiplicity);
    }
    for (const note of lesson.classModel.notes) expect(details).toHaveTextContent(note);
    fireEvent.change(screen.getByLabelText('Class model view'), { target: { value: '2' } });
    expect(details).toHaveTextContent('ReceiptWriter — public final class');
    expect(details).toHaveTextContent('ParcelFees.Quote — public record (nested)');
    expect(lesson.classModel.relationships.map(edge => edge.kind)).not.toContain('Composition');
  });

  it('provides one correct prediction, distinct feedback, transfer practice and explicit semantic limits', () => {
    expect(lesson.quiz.options.filter(option => option.correct === true)).toHaveLength(1);
    expect(new Set(lesson.quiz.options.map(option => option.feedback)).size).toBe(lesson.quiz.options.length);
    expect(new Set(lesson.quiz.options.map(option => option.id)).size).toBe(lesson.quiz.options.length);
    for (const option of lesson.quiz.options) expect(option.feedback.length).toBeGreaterThan(100);
    expect(lesson.exercise).toContain('community-room');
    expect(lesson.exercise).toContain('1, 4, 0 and 5 hours');
    expect(lesson.rubric.join(' ')).toContain('Independent evidence');
    expect(lesson.explanation.map(section => section.title)).toContain('Order events carefully and state alternative guards');
    expect(lesson.explanation.map(section => section.text).join(' ')).toContain('it never executes the JVM');
    expect(lesson.pitfalls.join(' ')).toContain('Returned rejection and thrown exception');
  });

  it('maps only source-backed Parking preview calls and cites primary semantics', () => {
    expect(lesson.module.path).toBe('/parking-lot');
    for (const filename of lesson.module.sources) expect(read(filename).length).toBeGreaterThan(100);
    const service = read(lesson.module.sources[0]);
    const scan = service.split('public Ticket scanTicket(')[1].split('// Step 2:')[0];
    expect(scan).toContain('PricingStrategy pricingStrategy = pricingStrategyFactory.getStrategy(pricingStrategyName)');
    expect(scan).toContain('pricingStrategy.calculatePrice(previewTicket)');
    expect(scan).toContain('previewTicket.setAmount(amount)');
    expect(scan).not.toContain('payAndExit(');
    expect(scan).not.toContain('releaseSpot(');
    expect(scan).not.toContain('ReceiptWriter');
    expect(read(lesson.module.sources[3])).toContain('FLAT_RATE_CAR = 50.0');
    expect(lesson.module.text).toContain('50.0 rupees');
    expect(lesson.module.text).toContain('throw typed exceptions');
    expect(lesson.references.filter(reference => reference.url.startsWith('https://www.omg.org/spec/UML/2.5.1'))).toHaveLength(2);
    expect(lesson.references[0].title).toContain('§17.3 lifelines');
  });
});
