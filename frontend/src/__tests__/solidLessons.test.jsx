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
import pictures from '../learning/lessons/solid-pictures';
import code from '../learning/lessons/solid-code';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(testDirectory, '../learning/examples');
const readExample = filename => fs.readFileSync(path.join(examples, filename), 'utf8');
const canonicalFiles = ['FeePolicy', 'StandardFee', 'PickupFee', 'FreeFee', 'BulkyOnlyFee', 'CounterExamples', 'SolidDemo']
  .map(name => `solid/${name}.java`);
const principles = ['srp', 'ocp', 'lsp', 'isp', 'dip'];

async function openLesson(lesson) {
  let view;
  await act(async () => {
    view = render(<MemoryRouter initialEntries={[`/learn/${lesson.id}`]}>
      <LessonContent lesson={lesson} metadata={findLesson(lesson.id)} />
    </MemoryRouter>);
  });
  return view;
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe.each([['solid-pictures', pictures], ['solid-code', code]])('%s lesson', (id, lesson) => {
  it('loads published material with canonical Java, shared execution evidence and runnable save paths', async () => {
    expect(await loadLesson(id)).toBe(lesson);
    expect(findLesson(id)).toMatchObject({ status: 'published', group: 'principles', proposed: false });
    expect(lesson.id).toBe(id);
    expect(lesson.code.map(block => block.filename).sort()).toEqual([...canonicalFiles].sort());
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('com.lld.learning.examples.solid.SolidDemo');
    expect(lesson.run).toContain('javac --release 17');
    expect(lesson.output).toBe(readExample('solid-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('solid-snapshots.json')));
    expect(lesson.visual.snapshots).toHaveLength(5);
    const lessonSource = fs.readFileSync(path.resolve(testDirectory, `../learning/lessons/${id}.js`), 'utf8');
    expect(lessonSource).toMatch(/import\s*\{[^}]*\bcode\b[^}]*\}\s*from\s*'\.\.\/solidLessonAssets'/);
    const assetSource = fs.readFileSync(path.resolve(testDirectory, '../learning/solidLessonAssets.js'), 'utf8');
    for (const filename of canonicalFiles) expect(assetSource).toContain(`${filename}?raw`);
    expect(assetSource.match(/\.java\?raw'/g)).toHaveLength(canonicalFiles.length);
    expect(lessonSource).not.toContain('public final class');
    expect(assetSource).not.toContain('public final class');
  });

  it('shows every recorded scalar including absent results and both intentional counterexample failures', async () => {
    await openLesson(lesson);
    expect(screen.getByRole('heading', { name: findLesson(id).title, level: 1 })).toHaveFocus();
    expect(screen.getByText(/A recorded illustration verified against the Java example, not a live JVM/)).toBeVisible();
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
        expect(terms).toHaveLength(item.fields.length);
        for (const field of item.fields) {
          expect(field.value === null || ['string', 'number', 'boolean'].includes(typeof field.value)).toBe(true);
          const term = terms.find(entry => entry.textContent === field.name);
          expect(term).toBeVisible();
          expect(term.nextElementSibling.textContent).toBe(String(field.value));
        }
      }
    }
    const lsp = lesson.visual.snapshots[2];
    expect(lsp.items.map(item => Object.fromEntries(item.fields.map(field => [field.name, field.value])))).toEqual([
      { weightGrams: 1, feeCents: 300, rejection: null },
      { weightGrams: 1, feeCents: 200, rejection: null },
      { weightGrams: 1, feeCents: 0, rejection: null },
      { weightGrams: 1, feeCents: null, rejection: 'IllegalArgumentException: Bulky parcels only' },
    ]);
    expect(lesson.visual.snapshots[3].items[0].fields).toContainEqual({
      name: 'rejection', value: 'UnsupportedOperationException: Online station cannot print',
    });
  });

  it('displays the exact Java and verified output through keyboard reachable code regions', async () => {
    await openLesson(lesson);
    for (const block of lesson.code) {
      const region = screen.getByRole('region', { name: `${block.filename}, scrollable code` });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region.textContent).toBe(block.source.trim());
    }
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent)
      .toBe(lesson.output.trim());
  });

  it('gives each prediction its own correction and clears stale feedback when changing an answer', async () => {
    await openLesson(lesson);
    const options = lesson.quiz.options;
    expect(options.filter(option => option.correct)).toHaveLength(1);
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(new Set(options.map(option => option.feedback)).size).toBe(options.length);
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeVisible();
    let previous;
    for (const option of options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      if (previous) expect(screen.queryByText(previous.feedback)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
      previous = option;
    }
  });

  it('makes the exercise, limitations, module evidence and prerequisite links available', async () => {
    await openLesson(lesson);
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeVisible();
    for (const point of lesson.pitfalls) expect(screen.getByText(point)).toBeVisible();
    expect(screen.getByText(lesson.module.text)).toBeVisible();
    const moduleLink = screen.getByRole('link', { name: `${lesson.module.title} →` });
    expect(moduleLink).toHaveAttribute('href', id === 'solid-pictures' ? '/parking-lot' : '/coffee-machine');
    fireEvent.click(screen.getByText('Inspect the verified module source', { selector: 'summary' }));
    for (const source of lesson.module.sources) {
      expect(fs.existsSync(path.resolve(testDirectory, '../../..', source))).toBe(true);
      expect(screen.getByRole('link', { name: source })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${source}`));
    }
    for (const reference of lesson.references) {
      expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
    }
    const nav = screen.getByRole('navigation', { name: 'Prerequisite lessons' });
    for (const prerequisite of findLesson(id).prerequisites) {
      expect(within(nav).getByRole('link', { name: `Review ${findLesson(prerequisite).title}` }))
        .toHaveAttribute('href', `/learn/${prerequisite}`);
    }
    expect(screen.getByRole('link', { name: 'Class model', exact: true })).toHaveAttribute('href', '#lesson-class-model');
    expect(await screen.findByRole('heading', { name: lesson.classModel.title, level: 2 })).toBeVisible();
    expect(await screen.findByRole('heading', { name: lesson.diagram.title, level: 2 })).toBeVisible();
  });

  it('retains every source-supported class, member and relationship in the complete class-model text', () => {
    render(<LessonClassModel model={lesson.classModel} />);
    const toggle = screen.getByText('Text explanation', { selector: 'summary' });
    fireEvent.click(toggle);
    toggle.parentElement.open = true;
    const transcript = toggle.parentElement;
    const checkCompleteText = () => {
      for (const type of lesson.classModel.classes) {
        expect(transcript).toHaveTextContent(`${type.name} — ${type.kind}`);
        expect(transcript).toHaveTextContent(`Source: ${type.source}`);
        expect(transcript).toHaveTextContent(type.description);
        for (const member of [...type.fields, ...type.methods]) expect(transcript).toHaveTextContent(member);
        const declarationName = type.name.split('.').at(-1);
        const source = lesson.code.find(block => block.filename === type.source).source;
        expect(source).toMatch(new RegExp(`(?:class|interface)\\s+${declarationName}\\b`));
      }
      for (const relationship of lesson.classModel.relationships) {
        expect(transcript).toHaveTextContent(`${relationship.kind}: ${relationship.from} → ${relationship.to}`);
        expect(transcript).toHaveTextContent(relationship.explanation);
        if (relationship.multiplicity) expect(transcript).toHaveTextContent(relationship.multiplicity);
        if (relationship.navigation) expect(transcript).toHaveTextContent(relationship.navigation);
      }
      for (const note of lesson.classModel.notes) expect(transcript).toHaveTextContent(note);
    };
    checkCompleteText();
    for (const [index] of lesson.classModel.relationships.entries()) {
      fireEvent.change(screen.getByLabelText('Class model view'), { target: { value: String(index) } });
      checkCompleteText();
    }
  });
});

describe('SOLID lesson progression and semantic boundaries', () => {
  it('preserves the existing prerequisite graph and places pictures before the deeper Java lesson', () => {
    expect(findLesson('solid-pictures').prerequisites).toEqual(['abstraction', 'polymorphism', 'dependency', 'composition']);
    expect(findLesson('solid-code').prerequisites).toEqual(['solid-pictures']);
    for (const prerequisite of findLesson('solid-pictures').prerequisites) {
      expect(PUBLISHED_LESSONS.indexOf(findLesson(prerequisite))).toBeLessThan(PUBLISHED_LESSONS.indexOf(findLesson('solid-pictures')));
    }
    expect(PUBLISHED_LESSONS.indexOf(findLesson('solid-pictures'))).toBeLessThan(PUBLISHED_LESSONS.indexOf(findLesson('solid-code')));
  });

  it('uses consistent pictures and execution evidence while distinguishing conceptual arrows from Java relationships', () => {
    expect(pictures.diagram).toEqual(code.diagram);
    expect(pictures.output).toBe(code.output);
    expect(pictures.visual.snapshots).toEqual(code.visual.snapshots);
    expect(pictures.diagram.kind).toBe('principles');
    expect(pictures.diagram.principles.map(principle => principle.id)).toEqual(principles);
    for (const principle of pictures.diagram.principles) {
      for (const source of principle.sourcePaths) expect(canonicalFiles).toContain(source);
      expect(principle.contract.length).toBeGreaterThan(0);
      expect(principle.tradeoff.length).toBeGreaterThan(0);
      for (const side of [principle.before, principle.after]) {
        const nodeIds = side.nodes.map(node => node.id);
        expect(new Set(nodeIds).size).toBe(nodeIds.length);
        for (const edge of side.edges) {
          expect(nodeIds).toContain(edge.from);
          expect(nodeIds).toContain(edge.to);
        }
      }
    }
    expect(pictures.diagram.notes.join(' ')).toMatch(/conceptual.*not UML/i);
    expect(pictures.diagram.notes.join(' ')).toMatch(/do not compile or run Java in the browser/i);
    expect(pictures.diagram.principles.find(principle => principle.id === 'lsp').after.caption)
      .toMatch(/different.*prices.*compatible/i);
    expect(pictures.diagram.principles.find(principle => principle.id === 'dip').tradeoff)
      .toMatch(/concrete ReceiptFormatter/);
    expect(pictures.classModel.relationships).toContainEqual(expect.objectContaining({
      from: 'BulkyOnlyFee', to: 'FeePolicy', kind: 'Realization', explanation: expect.stringMatching(/violates.*behavioral contract/i),
    }));
    expect(code.classModel.relationships).toContainEqual(expect.objectContaining({
      from: 'CounterExamples.QuoteService', to: 'CounterExamples.ReceiptFormatter', kind: 'Association',
    }));
  });

  it('corrects distinct behavioral substitution misconceptions in the pictures prediction', () => {
    const options = Object.fromEntries(pictures.quiz.options.map(option => [option.id, option]));
    expect(options.contract.correct).toBe(true);
    expect(options.contract.feedback).toMatch(/permits differing prices.*not rejection of\s*1 gram/i);
    expect(options['same-price'].feedback).toMatch(/only if.*promised.*formula/i);
    expect(options.signature.feedback).toMatch(/does not prove.*input domain/i);
    expect(options['remove-input'].feedback).toMatch(/migrate.*clients|remove a promise existing clients/i);
  });

  it('corrects floor, domain and concrete-type misconceptions in the distinct code prediction', () => {
    const options = Object.fromEntries(code.quiz.options.map(option => [option.id, option]));
    expect(options['floor-and-validate'].correct).toBe(true);
    expect(options['floor-and-validate'].feedback).toMatch(/floors\s*0 minus\s*100 at\s*0.*rejects\s*0/i);
    expect(options.negative.feedback).toMatch(/Math.max.*cannot produce a negative quote/i);
    expect(options['skip-validation'].feedback).toMatch(/valid price.*not permission to accept invalid input/i);
    expect(options.concrete.feedback).toMatch(/stores FeePolicy.*not other conforming implementations/i);
    expect(pictures.quiz.prompt).not.toBe(code.quiz.prompt);
    expect(pictures.quiz.options.map(option => option.feedback)).not.toEqual(code.quiz.options.map(option => option.feedback));
  });
});
