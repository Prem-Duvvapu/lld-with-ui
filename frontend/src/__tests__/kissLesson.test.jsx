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
import lesson from '../learning/lessons/kiss';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(testDirectory, '../learning/examples');
const readExample = filename => fs.readFileSync(path.join(examples, filename), 'utf8');

async function openLesson() {
  let view;
  await act(async () => {
    view = render(<MemoryRouter initialEntries={['/learn/kiss']}>
      <LessonContent lesson={lesson} metadata={findLesson('kiss')} />
    </MemoryRouter>);
  });
  return view;
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('KISS Principle lesson', () => {
  it('publishes the existing topic with its original prerequisite and canonical raw sources', async () => {
    expect(await loadLesson('kiss')).toBe(lesson);
    expect(findLesson('kiss')).toMatchObject({
      status: 'published', prerequisites: ['classes-and-objects'], duration: '25–30 minutes',
      group: 'principles', proposed: false,
    });
    // Relative order survives parent integration of YAGNI between DRY and KISS.
    expect(PUBLISHED_LESSONS.indexOf(findLesson('dry'))).toBeLessThan(PUBLISHED_LESSONS.indexOf(findLesson('kiss')));
    expect(lesson.code.map(block => block.filename)).toEqual([
      'kiss/RuleBasedParcelFees.java', 'kiss/ParcelFees.java', 'kiss/KissDemo.java',
    ]);
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('com.lld.learning.examples.kiss.KissDemo');
    expect(lesson.output).toBe(readExample('kiss-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('kiss-snapshots.json')));
    expect(lesson.visual.snapshots).toHaveLength(5);
    const source = fs.readFileSync(path.resolve(testDirectory, '../learning/lessons/kiss.js'), 'utf8');
    expect(source.match(/\.java\?raw'/g)).toHaveLength(3);
    expect(source).not.toContain('public final class');
  });

  it('renders every recorded result with named scalar values including absence', async () => {
    await openLesson();
    expect(screen.getByRole('heading', { name: 'KISS Principle', level: 1 })).toHaveFocus();
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
        const terms = within(card).getAllByRole('term');
        expect(terms).toHaveLength(3);
        for (const field of item.fields) {
          expect(field.value === null || ['string', 'number', 'boolean'].includes(typeof field.value)).toBe(true);
          const term = terms.find(entry => entry.textContent === field.name);
          expect(term).toBeVisible();
          expect(term.nextElementSibling.textContent).toBe(String(field.value));
        }
      }
    }
    for (const block of lesson.code) {
      const region = screen.getByRole('region', { name: `${block.filename}, scrollable code` });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region.textContent).toBe(block.source.trim());
    }
  });

  it('gives distinct corrective feedback for clamping, boundary and invented state predictions', async () => {
    await openLesson();
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    expect(new Set(lesson.quiz.options.map(option => option.feedback)).size).toBe(4);
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

  it('offers an independent transfer contract, real variation and explicit limits', async () => {
    await openLesson();
    for (const title of ['Adequate comes before simple', 'Trace the hidden ordering decision',
      'When variation earns a boundary', 'Separate KISS, YAGNI and DRY decisions']) {
      expect(screen.getByRole('heading', { name: title })).toBeVisible();
    }
    expect(lesson.exercise).toContain('community-room');
    expect(lesson.exercise).toContain('Reject invalid guest counts before validating duration');
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeVisible();
    for (const point of lesson.pitfalls) expect(screen.getByText(point)).toBeVisible();
    expect(screen.getByText(lesson.module.text)).toBeVisible();
    expect(screen.getByRole('link', { name: /Inspect one fixed Parking Lot pricing policy/ })).toHaveAttribute('href', '/parking-lot');
    fireEvent.click(screen.getByText('Inspect the verified module source', { selector: 'summary' }));
    for (const source of lesson.module.sources) {
      expect(fs.existsSync(path.resolve(testDirectory, '../../..', source))).toBe(true);
      expect(screen.getByRole('link', { name: source })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${source}`));
    }
    for (const reference of lesson.references)
      expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
  });

  it('keeps every member and source-supported relationship in the complete text alternative', () => {
    render(<LessonClassModel model={lesson.classModel} />);
    const toggle = screen.getByText('Text explanation', { selector: 'summary' });
    fireEvent.click(toggle);
    toggle.parentElement.open = true;
    const transcript = toggle.parentElement;
    for (const type of lesson.classModel.classes) {
      expect(transcript).toHaveTextContent(`${type.name} — ${type.kind}`);
      expect(transcript).toHaveTextContent(`Source: ${type.source}`);
      expect(transcript).toHaveTextContent(type.description);
      for (const member of [...type.fields, ...type.methods]) expect(transcript).toHaveTextContent(member);
      expect(lesson.code.find(block => block.filename === type.source).source)
        .toMatch(new RegExp(`class\\s+${type.name.split('.').at(-1)}\\b`));
    }
    for (const relationship of lesson.classModel.relationships) {
      expect(transcript).toHaveTextContent(`${relationship.kind}: ${relationship.from} → ${relationship.to}`);
      expect(transcript).toHaveTextContent(relationship.explanation);
      expect(transcript).toHaveTextContent(relationship.multiplicity);
      expect(transcript).toHaveTextContent(relationship.navigation);
    }
    for (const note of lesson.classModel.notes) expect(transcript).toHaveTextContent(note);
  });

  it('selects the retained rule association without inventing a relationship between alternatives', () => {
    const { container } = render(<LessonClassModel model={lesson.classModel} />);
    expect(lesson.classModel.relationships).toEqual([
      expect.objectContaining({ from: 'RuleBasedParcelFees', to: 'RuleBasedParcelFees.Rule', kind: 'Association' }),
    ]);
    fireEvent.change(screen.getByLabelText('Class model view'), { target: { value: '0' } });
    const canvas = container.querySelector('.lesson-class-model-canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas.querySelectorAll('.lesson-class-model-type')).toHaveLength(2);
    expect(canvas.querySelector('[data-type="ParcelFees"]')).toBeNull();
    const edge = canvas.querySelector('[data-kind="Association"] .lesson-class-model-edge');
    expect(edge).not.toHaveAttribute('marker-start');
    expect(edge).not.toHaveAttribute('marker-end');
    expect(edge).not.toHaveAttribute('stroke-dasharray');
    const toggle = screen.getByText('Text explanation', { selector: 'summary' });
    fireEvent.click(toggle);
    toggle.parentElement.open = true;
    expect(toggle.parentElement).toHaveTextContent('ParcelFees — public final class');
  });

  it('loads the shared model lazily and links the unchanged prerequisite', async () => {
    await openLesson();
    expect(await screen.findByRole('heading', { name: lesson.classModel.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Class model', exact: true })).toHaveAttribute('href', '#lesson-class-model');
    expect(screen.getByRole('link', { name: 'Review Classes and Objects' })).toHaveAttribute('href', '/learn/classes-and-objects');
  });
});
