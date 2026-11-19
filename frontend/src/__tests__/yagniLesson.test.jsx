// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import LessonClassModel from '../learning/LessonClassModel';
import { findLesson, PUBLISHED_LESSONS } from '../learning/curriculum';
import { loadLesson } from '../learning/lessonLoader';
import lesson from '../learning/lessons/yagni';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(testDirectory, '../learning/examples');
const readExample = filename => fs.readFileSync(path.join(examples, filename), 'utf8');

async function openLesson() {
  await act(async () => {
    render(<MemoryRouter initialEntries={['/learn/yagni']}>
      <LessonContent lesson={lesson} metadata={findLesson('yagni')} />
    </MemoryRouter>);
    await import('../learning/LessonClassModel');
  });
  await screen.findByRole('heading', { name: lesson.classModel.title, level: 2 });
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('YAGNI lesson', () => {
  it('publishes its existing topic after DRY with only the canonical prerequisite', async () => {
    expect(await loadLesson('yagni')).toBe(lesson);
    expect(findLesson('yagni')).toMatchObject({ status: 'published', group: 'principles', prerequisites: ['classes-and-objects'], duration: '25–30 minutes', proposed: false });
    expect(PUBLISHED_LESSONS.indexOf(findLesson('yagni'))).toBe(PUBLISHED_LESSONS.indexOf(findLesson('dry')) + 1);
    expect(findLesson('yagni').outcome).toContain('validation or tests');
    expect(lesson.code).toHaveLength(4);
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('com.lld.learning.examples.yagni.YagniDemo');
    expect(lesson.output).toBe(readExample('yagni-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('yagni-snapshots.json')));
    expect(lesson.visual.snapshots).toHaveLength(5);
    const source = fs.readFileSync(path.resolve(testDirectory, '../learning/lessons/yagni.js'), 'utf8');
    expect(source.match(/\.java\?raw'/g)).toHaveLength(4);
    expect(source).not.toContain('public final class');
  });

  it('renders every recorded scalar step, exact Java source and the rejected-input distinction', async () => {
    await openLesson();
    expect(screen.getByRole('heading', { name: 'YAGNI Principle', level: 1 })).toHaveFocus();
    expect(screen.getByText(/A recorded illustration verified against the Java example/)).toBeVisible();
    const visual = screen.getByRole('heading', { name: lesson.visual.title }).closest('section');
    for (const [index, snapshot] of lesson.visual.snapshots.entries()) {
      const button = screen.getByRole('button', { name: `${index + 1}. ${snapshot.title}` });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(within(visual).getByText(snapshot.explanation)).toBeVisible();
      expect(new Set(snapshot.items.map(item => item.label)).size).toBe(snapshot.items.length);
      for (const item of snapshot.items) {
        const card = within(visual).getByRole('heading', { name: `${item.label} : ${item.typeLabel}` }).parentElement;
        const fields = within(card).getAllByRole('term');
        expect(fields).toHaveLength(item.fields.length);
        expect(new Set(item.fields.map(field => field.name)).size).toBe(item.fields.length);
        for (const field of item.fields) {
          expect(['string', 'number', 'boolean']).toContain(typeof field.value);
          const term = fields.find(entry => entry.textContent === field.name);
          expect(term).toBeVisible();
          expect(term.nextElementSibling).toHaveTextContent(String(field.value));
        }
      }
    }
    for (const block of lesson.code) {
      const region = screen.getByRole('region', { name: `${block.filename}, scrollable code` });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region.textContent).toBe(block.source.trim());
    }
  });

  it('gives distinct feedback for the fixed-discount and automatic-mutation misconceptions', async () => {
    await openLesson();
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    expect(new Set(lesson.quiz.options.map(option => option.feedback)).size).toBe(lesson.quiz.options.length);
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeVisible();
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
    }
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent).toBe(lesson.output.trim());
  });

  it('teaches explicit expansion evidence, separate principle tradeoffs and an independent transfer task', async () => {
    await openLesson();
    for (const title of ['Account for presumption, carrying and repair', 'Record a trigger, not a dormant feature', 'When the requirement changes, implement that requirement', 'YAGNI, KISS and DRY ask different questions', 'Adequate includes rejection and independent evidence'])
      expect(screen.getByRole('heading', { name: title })).toBeVisible();
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    expect(lesson.exercise).toContain('workshop');
    expect(lesson.exercise).toContain('900');
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeVisible();
    for (const point of lesson.pitfalls) expect(screen.getByText(point)).toBeVisible();
    expect(screen.getByText(lesson.module.text)).toBeVisible();
    expect(screen.getByRole('link', { name: /Review Tic Tac Toe scope against its source/ })).toHaveAttribute('href', '/tic-tac-toe');
    fireEvent.click(screen.getByText('Inspect the verified module source', { selector: 'summary' }));
    for (const source of lesson.module.sources) {
      expect(fs.existsSync(path.resolve(testDirectory, '../../..', source))).toBe(true);
      expect(screen.getByRole('link', { name: source })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${source}`));
    }
    for (const reference of lesson.references)
      expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
    expect(lesson.references.some(reference => reference.url === 'https://martinfowler.com/bliki/Yagni.html')).toBe(true);
  });

  it('exposes every source-curated member, relationship and semantic limit in the complete text', () => {
    render(<LessonClassModel model={lesson.classModel} />);
    const toggle = screen.getByText('Text explanation', { selector: 'summary' });
    fireEvent.click(toggle);
    toggle.parentElement.open = true;
    const text = toggle.parentElement;
    for (const type of lesson.classModel.classes) {
      expect(text).toHaveTextContent(`${type.name} — ${type.kind}`);
      expect(text).toHaveTextContent(`Source: ${type.source}`);
      expect(text).toHaveTextContent(type.description);
      for (const member of [...type.fields, ...type.methods]) expect(text).toHaveTextContent(member);
      expect(lesson.code.find(block => block.filename === type.source).source).toContain(`class ${type.name}`);
    }
    for (const relationship of lesson.classModel.relationships) {
      expect(text).toHaveTextContent(`${relationship.kind}: ${relationship.from} → ${relationship.to}`);
      expect(text).toHaveTextContent(relationship.explanation);
      expect(text).toHaveTextContent(relationship.multiplicity);
      expect(text).toHaveTextContent(relationship.navigation);
    }
    for (const note of lesson.classModel.notes) expect(text).toHaveTextContent(note);
  });

  it('selects only the retained collaborator association, without inventing a speculative engine dependency', () => {
    const { container } = render(<LessonClassModel model={lesson.classModel} />);
    expect(lesson.classModel.relationships).toHaveLength(1);
    expect(lesson.classModel.relationships[0]).toMatchObject({ from: 'PickupParcelQuote', to: 'CurrentParcelQuote', kind: 'Association' });
    fireEvent.change(screen.getByLabelText('Class model view'), { target: { value: '0' } });
    const canvas = container.querySelector('.lesson-class-model-canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas.querySelectorAll('.lesson-class-model-type')).toHaveLength(2);
    expect(canvas.querySelector('[data-type="SpeculativeQuoteEngine"]')).toBeNull();
    const edge = canvas.querySelector('[data-kind="Association"] .lesson-class-model-edge');
    expect(edge).not.toHaveAttribute('stroke-dasharray');
    expect(edge).not.toHaveAttribute('marker-start');
    expect(edge).not.toHaveAttribute('marker-end');
  });

  it('loads the model lazily within the full lesson and retains prerequisite and previous-lesson links', async () => {
    await openLesson();
    expect(await screen.findByRole('heading', { name: lesson.classModel.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Class model', exact: true })).toHaveAttribute('href', '#lesson-class-model');
    expect(screen.getByRole('link', { name: 'Review Classes and Objects' })).toHaveAttribute('href', '/learn/classes-and-objects');
    expect(screen.getByRole('link', { name: '← DRY Principle' })).toHaveAttribute('href', '/learn/dry');
  });
});
