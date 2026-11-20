// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LessonStateMachineDiagram from '../learning/diagrams/LessonStateMachineDiagram';
import { validateStateMachineModel } from '../learning/diagrams/stateMachineModel';
import lesson from '../learning/lessons/state-machine-diagram';
import model from '../learning/diagrams/state-machine-diagram';
import { findLesson } from '../learning/curriculum';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const example = file => read(`frontend/src/learning/examples/${file}`);

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('Unpublished dedicated State Machine Diagram lesson', () => {
  it('uses canonical raw Java, output and all recorded scalar fixtures without registering publication', () => {
    expect(lesson.id).toBe('state-machine-diagram');
    // Metadata is used only for identity/prerequisites. Publication belongs to parent integration.
    expect(findLesson(lesson.id).prerequisites).toEqual(['enums']);
    expect(lesson.diagram).toBe(model);
    expect(lesson.code.map(block => block.filename)).toEqual([
      'statemachine/ReservationState.java', 'statemachine/Reservation.java', 'statemachine/StateMachineDemo.java',
    ]);
    for (const block of lesson.code) {
      expect(block.source).toBe(example(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('javac --release 17');
    expect(lesson.run).toContain('java -cp out com.lld.learning.examples.statemachine.StateMachineDemo');
    expect(lesson.output).toBe(example('statemachine-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(example('statemachine-snapshots.json')));
    expect(lesson.visual.snapshots).toHaveLength(9);
    for (const snapshot of lesson.visual.snapshots) {
      expect(snapshot.explanation.length).toBeGreaterThan(20);
      expect(snapshot.items).toHaveLength(1);
      const fields = snapshot.items[0].fields;
      expect(new Set(fields.map(field => field.name)).size).toBe(fields.length);
      for (const field of fields) expect(field.value === null || ['string', 'number', 'boolean'].includes(typeof field.value)).toBe(true);
    }
  });

  it('separates a source-curated class model from lifecycle states and provides one unambiguous assessment', () => {
    expect(lesson.classModel.classes.map(type => type.name)).toEqual(['Reservation', 'ReservationState']);
    for (const type of lesson.classModel.classes) {
      expect(lesson.code.find(block => block.filename === type.source)?.source).toContain(type.name);
    }
    expect(lesson.classModel.relationships[0]).toMatchObject({ from: 'Reservation', to: 'ReservationState', kind: 'Association' });
    expect(lesson.quiz.options.filter(option => option.correct === true)).toHaveLength(1);
    expect(new Set(lesson.quiz.options.map(option => option.id)).size).toBe(4);
    expect(new Set(lesson.quiz.options.map(option => option.feedback)).size).toBe(4);
    expect(lesson.quiz.options.find(option => option.correct)?.id).toBe('preserved');
    for (const option of lesson.quiz.options) expect(option.feedback.length).toBeGreaterThan(80);
    expect(lesson.exercise).toContain('parcel collection permit');
    expect(lesson.rubric).toHaveLength(6);
    expect(lesson.references.some(reference => reference.url === 'https://www.omg.org/spec/UML/2.5.1/PDF')).toBe(true);
    for (const source of lesson.module.sources) expect(fs.existsSync(path.join(root, source))).toBe(true);
    expect(lesson.module.text).toContain('not a full quality audit');
    expect(lesson.explanation.map(section => section.text).join(' ')).toContain('Nothing here is JVM Thread.State, Java object destruction');
  });

  it('authors a precise initial target, internal inspection, external re-entry and terminal completion', () => {
    const nodes = validateStateMachineModel(model);
    expect(model.kind).toBe('state-machine');
    expect([model.width, model.height]).toEqual([1200, 1080]);
    const transition = id => model.transitions.find(edge => edge.id === id);
    expect(transition('initialize')).toMatchObject({ from: 'initial', to: 'draft', event: '', guard: '' });
    expect(nodes.get('draft').label).toBe('DRAFT');
    expect(transition('renew')).toMatchObject({ kind: 'external-self', from: 'held', to: 'held' });
    expect(transition('inspect')).toMatchObject({ kind: 'internal', from: 'held', to: 'held' });
    expect(transition('inspect').points).toBeUndefined();
    expect(transition('confirm').guard).toBe('timeOK && unexpired');
    expect(transition('expire').guard).toBe('timeOK && now >= deadline');
    expect(transition('cancel-held').guard).toBe('timeOK');
    expect(nodes.get('done').kind).toBe('final');
    expect(model.transitions.filter(edge => edge.from === 'done')).toEqual([]);
    expect(model.transitions.filter(edge => edge.to === 'done').map(edge => edge.id)).toEqual(['confirmed-completion', 'cancelled-completion']);
    for (const edge of model.transitions.filter(edge => edge.kind === 'completion')) {
      expect([edge.event, edge.guard, edge.effect]).toEqual(['', '', '']);
      expect(edge.labelLines).toEqual([]);
    }
    expect(model.definitions.join(' ')).toContain('now < deadline');
    expect(model.definitions.join(' ')).toContain('Math.addExact');
  });

  it('records the boundary rejection separately from accepted transitions', () => {
    const fields = step => Object.fromEntries(lesson.visual.snapshots[step].items[0].fields.map(field => [field.name, field.value]));
    expect(fields(2)).toMatchObject({ state: 'HELD', expiresAtMinute: 20, heldEntries: 1, heldExits: 0, inspections: 1 });
    expect(fields(3)).toMatchObject({ state: 'HELD', expiresAtMinute: 22, heldEntries: 2, heldExits: 1 });
    const { rejection, ...after } = fields(4);
    expect(rejection).toBe('Hold expired');
    expect(after).toEqual(fields(3));
    expect(fields(5)).toMatchObject({ state: 'CANCELLED', terminated: true, heldExits: 2 });
    const { rejection: terminalError, ...terminal } = fields(6);
    expect(terminalError).toBe('Lifecycle terminated');
    expect(terminal).toEqual(fields(5));
    expect(fields(7)).toMatchObject({ state: 'CONFIRMED', terminated: true });
    expect(fields(8)).toMatchObject({ state: 'CANCELLED', heldEntries: 0, heldExits: 0 });
  });
});

describe('State machine diagram inspector', () => {
  it('keeps every node, endpoint and transition plus the full normal-size transcript under every selection', () => {
    const { container } = render(<LessonStateMachineDiagram model={model} />);
    expect(screen.getByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: `${model.title} viewer`, level: 3 })).toBeVisible();
    const select = screen.getByRole('combobox', { name: 'State machine transition' });
    expect(within(select).getAllByRole('option')).toHaveLength(11);
    const transcript = screen.getByText('Text explanation', { selector: 'summary' }).parentElement;
    transcript.open = true;
    select.focus();
    for (const edge of model.transitions) {
      fireEvent.change(select, { target: { value: edge.id } });
      expect(select).toHaveFocus();
      expect(container.querySelectorAll('[data-node]')).toHaveLength(6);
      expect(container.querySelectorAll('[data-transition]')).toHaveLength(10);
      const selected = container.querySelector('[data-selected="true"]');
      expect(selected).toHaveAttribute('data-transition', edge.id);
      expect(selected).toHaveAttribute('data-from', edge.from);
      expect(selected).toHaveAttribute('data-to', edge.to);
      for (const node of model.nodes) {
        expect(container.querySelector(`[data-node="${node.id}"]`)).toBeInTheDocument();
        expect(transcript).toHaveTextContent(node.description);
        expect(transcript).toHaveTextContent(node.source);
        for (const line of node.lines || []) expect(transcript).toHaveTextContent(line);
      }
      for (const entry of model.transitions) {
        for (const text of [entry.event, entry.guard, entry.effect, entry.description, entry.source].filter(Boolean)) {
          expect(transcript).toHaveTextContent(text);
        }
      }
      for (const definition of model.definitions) expect(transcript).toHaveTextContent(definition);
    }
    fireEvent.change(select, { target: { value: 'all' } });
    expect(container.querySelector('[data-selected="true"]')).toBeNull();
  });

  it('draws rounded states, initial circle, final bullseye, directed arrows and internal text without a loop', () => {
    const { container } = render(<LessonStateMachineDiagram model={model} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg.querySelectorAll('a,button,[tabindex]')).toHaveLength(0);
    expect(svg.querySelectorAll('.state-machine-state[rx="18"]')).toHaveLength(4);
    expect(svg.querySelectorAll('.state-machine-initial')).toHaveLength(1);
    expect(svg.querySelectorAll('.state-machine-final-ring')).toHaveLength(1);
    expect(svg.querySelectorAll('.state-machine-final-dot')).toHaveLength(1);
    expect(svg.querySelector('[data-transition="inspect"] polyline')).toBeNull();
    expect(svg.querySelector('[data-transition="renew"] polyline')).not.toBeNull();
    for (const arrow of svg.querySelectorAll('polyline')) {
      const markerId = arrow.getAttribute('marker-end').slice(5, -1);
      expect(svg.querySelector(`[id="${markerId}"]`)).not.toBeNull();
      const edge = model.transitions.find(entry => entry.id === arrow.parentElement.dataset.transition);
      expect(arrow.getAttribute('points').split(' ').at(-1)).toBe(edge.points.at(-1).join(','));
    }
    for (const edge of model.transitions) for (const line of edge.labelLines) expect(svg).toHaveTextContent(line);
  });

  it('allocates SVG-local unique marker IDs across viewers and fullscreen and restores focus on exit', () => {
    const { container } = render(<><LessonStateMachineDiagram model={model} /><LessonStateMachineDiagram model={model} /></>);
    const checkIds = () => {
      const svgs = [...container.querySelectorAll('svg')];
      expect(svgs).toHaveLength(2);
      const ids = svgs.flatMap(svg => [...svg.querySelectorAll('[id]')].map(node => node.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const svg of svgs) for (const arrow of svg.querySelectorAll('[marker-end]')) {
        expect(svg.querySelector(`[id="${arrow.getAttribute('marker-end').slice(5, -1)}"]`)).not.toBeNull();
      }
    };
    checkIds();
    fireEvent.click(screen.getAllByRole('button', { name: 'Fullscreen', exact: true })[0]);
    const dialog = screen.getByRole('dialog', { name: `${model.title} viewer` });
    expect(dialog).toHaveAttribute('open');
    expect(document.body.style.overflow).toBe('hidden');
    checkIds();
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Fullscreen', exact: true })[0]).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    checkIds();
  });

  it('resets selection for a replacement model, including a return to the original', () => {
    const { rerender } = render(<LessonStateMachineDiagram model={model} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'inspect' } });
    rerender(<LessonStateMachineDiagram model={{ ...model, title: 'Other reservation view' }} />);
    expect(screen.getByRole('combobox')).toHaveValue('all');
    rerender(<LessonStateMachineDiagram model={model} />);
    expect(screen.getByRole('combobox')).toHaveValue('all');
  });
});

describe('Authored state machine subset validation', () => {
  it.each([
    ['missing endpoint', m => { m.transitions[1].to = 'unknown'; }],
    ['duplicate vertex', m => { m.nodes[1].id = 'initial'; }],
    ['duplicate transition', m => { m.transitions[1].id = 'initialize'; }],
    ['outgoing final', m => { m.transitions[1].from = 'done'; }],
    ['incoming initial', m => { m.transitions[1].to = 'initial'; }],
    ['initial guard', m => { m.transitions[0].guard = 'ready'; }],
    ['completion trigger', m => { m.transitions.at(-1).event = 'finish()'; }],
    ['internal arrow', m => { m.transitions[3].points = [[0, 0], [1, 1]]; }],
    ['internal target mismatch', m => { m.transitions[3].to = 'draft'; }],
    ['self target mismatch', m => { m.transitions[2].to = 'cancelled'; }],
    ['nonfinite geometry', m => { m.transitions[1].points[0][0] = Infinity; }],
    ['off-canvas vertex', m => { m.nodes[1].x = 2000; }],
  ])('rejects %s instead of silently drawing a misleading model', (_name, mutate) => {
    const invalid = structuredClone(model);
    mutate(invalid);
    expect(() => validateStateMachineModel(invalid)).toThrow('Invalid state machine diagram');
  });
  it('keeps rejected logical time and the chosen demo ending out of exclusive feedback claims', () => {
    const correct = lesson.quiz.options.find(option => option.correct);
    const expiry = lesson.quiz.options.find(option => option.id === 'auto-expire');
    expect(correct.feedback).toMatch(/Only accepted commands advance lastMinute/);
    expect(correct.feedback).toContain('confirm(13)');
    expect(correct.feedback).toContain('cancel(22)');
    expect(expiry.feedback).toContain('expire(22) or cancel(22)');
    expect(expiry.feedback).not.toMatch(/Only.*expire/);
  });

});
