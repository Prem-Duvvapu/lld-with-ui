// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LessonActivityDiagram from '../learning/diagrams/LessonActivityDiagram';
import model from '../learning/diagrams/activity-diagram';
import lesson from '../learning/lessons/activity-diagram';
import { findLesson } from '../learning/curriculum';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const example = file => read(`frontend/src/learning/examples/${file}`);
const mount = () => render(<LessonActivityDiagram model={model} />);

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('Activity Diagram lesson slice before shared registration', () => {
  it('uses the existing curriculum ID/prerequisite and imports exactly the canonical Java and fixtures', () => {
    const metadata = findLesson(lesson.id);
    expect(metadata).toMatchObject({ id: 'activity-diagram', group: 'uml', prerequisites: ['how-to-learn-lld'] });
    // Publication and renderer registration are integration responsibilities, not bypassed here.
    expect(lesson.diagram).toBe(model);
    expect(model.kind).toBe('activity');
    expect(lesson.code.map(block => block.filename)).toEqual([
      'activity/BookingRequest.java', 'activity/BookingResult.java', 'activity/RoomBookingService.java', 'activity/ActivityDemo.java',
    ]);
    for (const block of lesson.code) {
      expect(block.source).toBe(example(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('javac --release 17');
    expect(lesson.run).toContain('com.lld.learning.examples.activity.ActivityDemo');
    expect(lesson.output).toBe(example('activity-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(example('activity-snapshots.json')));
    expect(lesson.output.trim().split('\n')).toHaveLength(5);
    expect(example('activity/RoomBookingService.java')).not.toMatch(/System\.out|Thread|Executor|synchronized/);
    expect(example('activity/ActivityDemo.java').indexOf('service.request(request)')).toBeLessThan(example('activity/ActivityDemo.java').indexOf('System.out.println'));
  });

  it('has two guarded decisions, a distinct alternative merge and no invented fork, join or loop', () => {
    expect(new Set(model.nodes.map(node => node.id)).size).toBe(11);
    expect(new Set(model.edges.map(edge => edge.id)).size).toBe(12);
    expect(model.nodes.filter(node => node.kind === 'initial')).toHaveLength(1);
    expect(model.nodes.filter(node => node.kind === 'activity-final')).toHaveLength(1);
    expect(model.nodes.filter(node => node.kind === 'decision').map(node => node.id)).toEqual(['valid', 'available']);
    for (const [id, guards] of [['valid', ['not valid', 'valid']], ['available', ['available', 'not available']]]) {
      expect(model.edges.filter(edge => edge.to === id)).toHaveLength(1);
      expect(model.edges.filter(edge => edge.from === id).map(edge => edge.guard)).toEqual(guards);
    }
    expect(model.edges.filter(edge => edge.to === 'merge').map(edge => edge.from)).toEqual(['reject-invalid', 'confirm', 'reject-occupied']);
    expect(model.edges.filter(edge => edge.from === 'merge').map(edge => edge.to)).toEqual(['return']);
    expect(model.nodes.some(node => ['fork', 'join', 'flow-final'].includes(node.kind))).toBe(false);
    const nodes = new Set(model.nodes.map(node => node.id));
    for (const edge of model.edges) { expect(nodes.has(edge.from)).toBe(true); expect(nodes.has(edge.to)).toBe(true); }
    const routes = (id, visited = []) => {
      expect(visited).not.toContain(id); // A loop would need an implemented repetition contract.
      const outgoing = model.edges.filter(edge => edge.from === id);
      return outgoing.length ? outgoing.flatMap(edge => routes(edge.to, [...visited, id])) : [[...visited, id]];
    };
    expect(routes('initial')).toEqual([
      ['initial', 'validate', 'valid', 'reject-invalid', 'merge', 'return', 'final'],
      ['initial', 'validate', 'valid', 'check-slot', 'available', 'confirm', 'merge', 'return', 'final'],
      ['initial', 'validate', 'valid', 'check-slot', 'available', 'reject-occupied', 'merge', 'return', 'final'],
    ]);
    expect(model.edges.filter(edge => edge.guard)).toHaveLength(4);
  });

  it('keeps all geometry inside the authored canvas and connects arrows to node boundaries', () => {
    expect([model.width, model.height]).toEqual([940, 1040]);
    for (const node of model.nodes) {
      expect(node.description.length).toBeGreaterThan(65);
      expect(node.source).toBe('activity/RoomBookingService.java');
    }
    const nodes = new Map(model.nodes.map(node => [node.id, node]));
    for (const edge of model.edges) {
      expect(edge.description.length).toBeGreaterThan(40);
      expect(example(edge.source)).toContain('class RoomBookingService');
      for (const [x, y] of edge.points) {
        expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(model.width);
        expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(model.height);
      }
      for (const [id, [x, y]] of [[edge.from, edge.points[0]], [edge.to, edge.points.at(-1)]]) {
        const node = nodes.get(id), dx = Math.abs(x - node.x), dy = Math.abs(y - node.y);
        if (node.kind === 'action') expect((dx === 120 && dy <= 30) || (dy === 30 && dx <= 120)).toBe(true);
        else if (['decision', 'merge'].includes(node.kind)) expect(dx + dy).toBe(node.kind === 'decision' ? 48 : 22);
        else expect(Math.hypot(dx, dy)).toBe(node.kind === 'initial' ? 12 : 20);
      }
    }
    // Geometry tests do not claim browser layout or 320px visual validation.
  });

  it('renders accurate initial, rounded actions, empty decision/merge diamonds and activity-final bullseye', () => {
    const { container } = mount();
    expect(screen.getByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: `${model.title} viewer`, level: 3 })).toBeVisible();
    const canvas = container.querySelector('.activity-canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveAttribute('focusable', 'false');
    expect(canvas.querySelector('[data-kind="initial"] circle')).toHaveClass('activity-solid');
    for (const node of canvas.querySelectorAll('[data-kind="action"]')) expect(node.querySelector('rect')).toHaveAttribute('rx', '18');
    for (const node of canvas.querySelectorAll('[data-kind="decision"], [data-kind="merge"]')) expect(node.querySelector('polygon')).toHaveClass('activity-hollow');
    expect(canvas.querySelectorAll('[data-kind="activity-final"] circle')).toHaveLength(2);
    expect(canvas.querySelector('[data-kind="activity-final"] circle.activity-solid')).toHaveAttribute('r', '12');
    expect(canvas.querySelector('[data-kind="activity-final"] circle.activity-hollow')).toHaveAttribute('r', '20');
    for (const edge of canvas.querySelectorAll('.activity-edge')) expect(edge).not.toHaveAttribute('stroke-dasharray');
    expect(canvas.querySelector('marker path')).toHaveAttribute('fill', 'none');
    expect(canvas.querySelectorAll('.activity-guard text')).toHaveLength(4);
  });

  it('retains every node, edge, guard and full normal-size text while selecting any flow with stable focus', () => {
    const { container } = mount();
    const selector = screen.getByRole('combobox', { name: 'Activity control flow' });
    expect(within(selector).getAllByRole('option')).toHaveLength(13);
    const transcript = screen.getByText('Text explanation', { selector: 'summary' }).parentElement;
    transcript.open = true;
    selector.focus();
    for (const edge of model.edges) {
      fireEvent.change(selector, { target: { value: edge.id } });
      expect(selector).toHaveFocus();
      expect(container.querySelectorAll('[data-node]')).toHaveLength(11);
      expect(container.querySelectorAll('[data-edge]')).toHaveLength(12);
      expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
      expect(container.querySelector(`[data-edge="${edge.id}"]`)).toHaveAttribute('data-selected', 'true');
      for (const node of model.nodes) {
        expect(transcript).toHaveTextContent(node.label);
        expect(transcript).toHaveTextContent(node.description);
        expect(transcript).toHaveTextContent(node.source);
      }
      for (const item of model.edges) {
        expect(transcript).toHaveTextContent(item.description);
        expect(transcript).toHaveTextContent(item.source);
        if (item.guard) expect(transcript).toHaveTextContent(`Guard: [${item.guard}]`);
      }
      for (const note of model.notes) expect(transcript).toHaveTextContent(note);
    }
    fireEvent.change(selector, { target: { value: '' } });
    expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(0);
    expect(selector).toHaveFocus();
  });

  it('uses unique scoped arrow markers across instances and restores focus after fullscreen', () => {
    const { container } = render(<><LessonActivityDiagram model={model} /><LessonActivityDiagram model={model} /></>);
    const assertMarkers = () => {
      const svgs = container.querySelectorAll('.activity-canvas');
      const ids = [...svgs].map(svg => svg.querySelector('marker').id);
      expect(new Set(ids).size).toBe(svgs.length);
      for (const svg of svgs) for (const edge of svg.querySelectorAll('.activity-edge')) {
        const id = edge.getAttribute('marker-end').slice(5, -1);
        expect(svg.querySelector(`[id="${id}"]`)).not.toBeNull();
      }
    };
    assertMarkers();
    const first = container.querySelector('.lesson-activity');
    fireEvent.click(within(first).getByRole('button', { name: 'Fullscreen' }));
    const dialog = within(first).getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Exit fullscreen' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    assertMarkers();
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    expect(within(first).queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Fullscreen' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    assertMarkers();
  });

  it('resets a stale selection on model identity changes', () => {
    const { container, rerender } = mount();
    const selector = screen.getByRole('combobox', { name: 'Activity control flow' });
    fireEvent.change(selector, { target: { value: 'occupied' } });
    const replacement = { ...model, title: 'Independent request activity' };
    rerender(<LessonActivityDiagram model={replacement} />);
    expect(selector).toHaveValue('');
    expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(0);
    rerender(<LessonActivityDiagram model={model} />);
    expect(selector).toHaveValue('');
  });

  it('curates actual Java types and typed structural links independently of activity nodes', () => {
    expect(lesson.classModel.classes.map(type => type.name)).toEqual(['BookingRequest', 'BookingResult', 'RoomBookingService']);
    expect(lesson.classModel.relationships.map(edge => [edge.from, edge.to, edge.kind])).toEqual([
      ['RoomBookingService', 'BookingRequest', 'Association'], ['RoomBookingService', 'BookingResult', 'Dependency'],
    ]);
    for (const type of lesson.classModel.classes) {
      expect(example(type.source)).toMatch(new RegExp(`(?:class|record) ${type.name}\\b`));
      expect(type.fields.length).toBeGreaterThan(0);
      expect(type.methods.length).toBeGreaterThan(0);
    }
    expect(lesson.classModel.notes.join(' ')).toContain('unrelated to class ownership diamonds');
    expect(model.nodes.some(node => lesson.classModel.classes.some(type => type.name === node.label))).toBe(false);
  });

  it('records only named scalars and supplies one correct prediction with distinct explanatory feedback', () => {
    expect(lesson.visual.title).toBeTruthy();
    expect(lesson.visual.summary).toContain('after return');
    expect(lesson.visual.snapshots).toHaveLength(5);
    let scalars = 0;
    for (const snapshot of lesson.visual.snapshots) for (const item of snapshot.items) {
      expect(item.label).toBeTruthy(); expect(item.typeLabel).toBeTruthy();
      expect(new Set(item.fields.map(field => field.name)).size).toBe(item.fields.length);
      for (const field of item.fields) { expect(field.value === null || ['string', 'number', 'boolean'].includes(typeof field.value)).toBe(true); scalars++; }
    }
    expect(scalars).toBe(35);
    expect(lesson.quiz.options.filter(option => option.correct === true)).toHaveLength(1);
    expect(new Set(lesson.quiz.options.map(option => option.id)).size).toBe(lesson.quiz.options.length);
    expect(new Set(lesson.quiz.options.map(option => option.feedback)).size).toBe(lesson.quiz.options.length);
    for (const option of lesson.quiz.options) expect(option.feedback.length).toBeGreaterThan(90);
    expect(lesson.exercise).toContain('workshop seat request');
    expect(lesson.exercise).toContain('age 16');
    expect(lesson.rubric).toHaveLength(6);
    expect(lesson.explanation.map(section => section.text).join(' ')).toContain('35–45 minutes');
  });

  it('grounds bounded module practice in the actual allocation order and lock without claiming a full module audit', () => {
    for (const source of lesson.module.sources) expect(read(source).length).toBeGreaterThan(50);
    expect(lesson.module.path).toBe('/parking-lot');
    const service = read(lesson.module.sources[0]);
    const entry = service.split('public Ticket entry(String gateId, String vehicleNumber, String vehicleTypeStr, String strategyName)')[1].split('// Step 1:')[0];
    expect(entry.indexOf('requireGate(')).toBeLessThan(entry.indexOf('repository.occupySpot('));
    expect(entry.indexOf('parseVehicleType(')).toBeLessThan(entry.indexOf('repository.occupySpot('));
    expect(entry.indexOf('repository.occupySpot(')).toBeLessThan(entry.indexOf('repository.saveTicket('));
    const repository = read(lesson.module.sources[1]);
    const occupy = repository.split('public ParkingSpot occupySpot(')[1].split('public void releaseSpot(')[0];
    expect(occupy.indexOf('spotLock.lock()')).toBeLessThan(occupy.indexOf('strategy.findSpot('));
    expect(occupy.indexOf('spot.setOccupied(true)')).toBeLessThan(occupy.indexOf('spotLock.unlock()'));
    expect(lesson.module.text).toContain('no encompassing transaction');
    expect(lesson.module.text).toContain('not a full module audit');
    expect(lesson.references[0].url).toBe('https://www.omg.org/spec/UML/2.5.1/PDF');
    expect(lesson.references[0].title).toContain('§15.3');
    expect(lesson.references.every(reference => reference.url.startsWith('https://www.omg.org/') || reference.url.startsWith('https://docs.oracle.com/'))).toBe(true);
  });

  it('scopes theme tokens, containment, readable transcript and 44px controls without treating DOM tests as visual evidence', () => {
    const css = read('frontend/src/learning/diagrams/LessonActivityDiagram.css');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    expect(css).toContain('var(--text-primary)');
    expect(css).toContain('var(--bg-card)');
    expect(css).toContain('min-width: 0');
    expect(css).toContain('max-width: 100%');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('.lesson-activity .diagram-viewer-details { font-size: 1rem; }');
    expect(css).toContain('[data-selected="true"] .activity-edge { stroke-width: 4; }');
    expect(css).not.toContain('opacity:');
    // Parent owns real 320px light/dark, actual route and deployed MIME checks.
  });
});
