// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import { findLesson, PUBLISHED_LESSONS } from '../learning/curriculum';
import { loadLesson } from '../learning/lessonLoader';
import lesson from '../learning/lessons/use-case-diagram';
import useCaseModel from '../learning/diagrams/use-case-diagram';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const example = file => read(`frontend/src/learning/examples/${file}`);

function openLesson() {
  return render(<MemoryRouter initialEntries={['/learn/use-case-diagram']}>
    <LessonContent lesson={lesson} metadata={findLesson(lesson.id)} />
  </MemoryRouter>);
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('Dedicated Use Case Diagram lesson', () => {
  it('publishes the canonical ID after its introductory prerequisite and imports only canonical Java/fixtures', async () => {
    const metadata = findLesson('use-case-diagram');
    expect(metadata.status).toBe('published');
    expect(metadata.group).toBe('uml');
    expect(metadata.duration).toBe('35–45 minutes');
    expect(metadata.prerequisites).toEqual(['how-to-learn-lld']);
    expect(metadata.outcome).toContain('external roles');
    for (const prerequisite of metadata.prerequisites) {
      expect(PUBLISHED_LESSONS.findIndex(entry => entry.id === prerequisite)).toBeLessThan(PUBLISHED_LESSONS.indexOf(metadata));
    }
    expect(PUBLISHED_LESSONS.findIndex(entry => entry.id === 'class-diagram')).toBeLessThan(PUBLISHED_LESSONS.indexOf(metadata));
    expect(await loadLesson(metadata.id)).toBe(lesson);
    expect(lesson.diagram).toBe(useCaseModel);
    expect(lesson.code).toHaveLength(4);
    for (const block of lesson.code) {
      expect(block.source).toBe(example(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('--release 17');
    expect(lesson.run).toContain('com.lld.learning.examples.usecase.UseCaseDemo');
    expect(lesson.output).toBe(example('use-case-diagram-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(example('use-case-diagram-snapshots.json')));
  });

  it('provides semantic data for the parent renderer without treating the companion Java classes as actors', () => {
    expect(useCaseModel.kind).toBe('use-case');
    expect(useCaseModel.actors.map(actor => actor.id)).toEqual(['member', 'librarian']);
    expect(useCaseModel.useCases.map(useCase => useCase.id)).toEqual(['borrow', 'renew', 'eligibility', 'receipt', 'return']);
    const actorIds = new Set(useCaseModel.actors.map(actor => actor.id));
    const caseIds = new Set(useCaseModel.useCases.map(useCase => useCase.id));
    const allIds = new Set([...actorIds, ...caseIds]);
    expect(allIds.size).toBe(useCaseModel.actors.length + useCaseModel.useCases.length);
    expect(new Set(useCaseModel.relationships.map(edge => edge.id)).size).toBe(useCaseModel.relationships.length);
    expect(useCaseModel.boundary.description).toContain('does not assert UML ownership');
    for (const node of [...useCaseModel.actors, ...useCaseModel.useCases]) {
      expect(node.label.length).toBeGreaterThan(3);
      expect(node.description.length).toBeGreaterThan(50);
    }
    for (const edge of useCaseModel.relationships) {
      expect(allIds.has(edge.from)).toBe(true);
      expect(allIds.has(edge.to)).toBe(true);
      expect(edge.description.length).toBeGreaterThan(50);
      if (edge.kind === 'association') {
        expect(actorIds.has(edge.from)).toBe(true);
        expect(caseIds.has(edge.to)).toBe(true);
      } else if (edge.kind === 'generalization') {
        expect(actorIds.has(edge.from)).toBe(actorIds.has(edge.to));
      } else {
        expect(['include', 'extend']).toContain(edge.kind);
        expect(caseIds.has(edge.from) && caseIds.has(edge.to)).toBe(true);
      }
    }
    expect(useCaseModel.notes.join(' ')).toContain('neither a call graph nor a flowchart');
    expect(useCaseModel.notes.join(' ')).toContain('hollow triangle');
    expect(lesson.classModel.classes.map(type => type.name)).toEqual(['Member', 'Loan', 'LibraryPortal']);
    expect(lesson.classModel.relationships.map(edge => edge.kind)).not.toContain('Generalization');
    expect(lesson.classModel.notes.join(' ')).toContain('not deeply immutable');
  });

  it('directs include to required behavior, extend to its independent base and specialization to the general actor', () => {
    const includes = useCaseModel.relationships.filter(edge => edge.kind === 'include');
    expect(includes.map(edge => [edge.from, edge.to])).toEqual([['borrow', 'eligibility'], ['renew', 'eligibility']]);
    const extension = useCaseModel.relationships.find(edge => edge.kind === 'extend');
    expect(extension).toMatchObject({ from: 'receipt', to: 'borrow', extensionPoint: 'loan confirmed' });
    expect(extension.condition).toBe('receiptRequested is true when loan confirmed is reached');
    const base = useCaseModel.useCases.find(useCase => useCase.id === extension.to);
    expect(base.extensionPoints).toContain(extension.extensionPoint);
    expect(base.description).toContain('without a receipt');
    expect(useCaseModel.relationships.find(edge => edge.kind === 'generalization'))
      .toMatchObject({ from: 'librarian', to: 'member' });
    expect(useCaseModel.actors.find(actor => actor.id === 'librarian').description).toContain('same borrowing and renewal rights and restrictions');
  });

  it('keeps all actor figures and case ellipses within the view and outside/inside the stated boundary', () => {
    const { boundary, width, height, actors, useCases, relationships } = useCaseModel;
    expect(boundary.x).toBeGreaterThan(0);
    expect(boundary.x + boundary.width).toBeLessThan(width);
    expect(boundary.y + boundary.height).toBeLessThan(height);
    for (const actor of actors) {
      expect(actor.x - 22).toBeGreaterThan(0);
      expect(actor.x + 22).toBeLessThan(boundary.x);
      expect(actor.y - 44).toBeGreaterThan(0);
      expect(actor.y + 62).toBeLessThan(height);
    }
    for (const useCase of useCases) {
      expect(useCase.x - useCase.rx).toBeGreaterThan(boundary.x);
      expect(useCase.x + useCase.rx).toBeLessThan(boundary.x + boundary.width);
      expect(useCase.y - useCase.ry).toBeGreaterThan(boundary.y);
      expect(useCase.y + useCase.ry).toBeLessThan(boundary.y + boundary.height);
      expect(useCase.labelLines?.length || 1).toBeLessThanOrEqual(2);
    }
    for (const edge of relationships) {
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
      for (const [x, y] of edge.points) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(width);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(height);
      }
      for (const [id, point] of [[edge.from, edge.points[0]], [edge.to, edge.points.at(-1)]]) {
        const node = useCases.find(useCase => useCase.id === id);
        if (node) {
          const [x, y] = point;
          expect(((x - node.x) / node.rx) ** 2 + ((y - node.y) / node.ry) ** 2).toBeCloseTo(1, 3);
        }
      }
    }
    // These bounds validate the curated data contract, not browser visual fidelity.
  });

  it('renders every recorded observation, canonical source and companion class text', async () => {
    openLesson();
    expect(screen.getByRole('heading', { name: 'Use Case Diagram', level: 1 })).toHaveFocus();
    expect(await screen.findByRole('heading', { name: lesson.classModel.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Use case diagram', exact: true })).toHaveAttribute('href', '#lesson-diagram');
    expect(await screen.findByRole('heading', { name: useCaseModel.title, level: 2 })).toBeVisible();
    const primary = document.querySelector('.lesson-use-case');
    const selector = within(primary).getByRole('combobox', { name: 'Use case relationship' });
    const fullText = within(primary).getByText('Text explanation', { selector: 'summary' }).parentElement;
    fullText.open = true;
    for (const edge of useCaseModel.relationships) {
      fireEvent.change(selector, { target: { value: edge.id } });
      expect(primary.querySelectorAll('[data-node]')).toHaveLength(7);
      expect(primary.querySelectorAll('[data-relationship]')).toHaveLength(1);
      for (const relationship of useCaseModel.relationships) expect(fullText).toHaveTextContent(relationship.description);
    }
    const visual = screen.getByRole('heading', { name: lesson.visual.title }).closest('section');
    for (const [index, snapshot] of lesson.visual.snapshots.entries()) {
      const control = screen.getByRole('button', { name: `${index + 1}. ${snapshot.title}` });
      fireEvent.click(control);
      expect(control).toHaveAttribute('aria-pressed', 'true');
      expect(within(visual).getByText(snapshot.explanation)).toBeVisible();
      for (const item of snapshot.items) {
        const card = within(visual).getByRole('heading', { name: `${item.label} : ${item.typeLabel}` }).parentElement;
        for (const field of item.fields) {
          const term = within(card).getAllByRole('term').find(entry => entry.textContent === field.name);
          expect(term).toBeVisible();
          expect(term.nextElementSibling.textContent).toBe(String(field.value));
        }
      }
    }
    for (const block of lesson.code) {
      expect(screen.getByRole('region', { name: `${block.filename}, scrollable code` }).textContent).toBe(block.source.trim());
    }
    const explanation = within(document.querySelector('.lesson-class-model')).getByText('Text explanation', { selector: 'summary' }).parentElement;
    explanation.open = true;
    for (const type of lesson.classModel.classes) {
      expect(within(explanation).getByRole('heading', { name: `${type.name} — ${type.kind}` })).toBeVisible();
      expect(explanation).toHaveTextContent(type.description);
    }
  });

  it('gives distinct prediction feedback and an independent scenario exercise with an inspectable rubric', () => {
    openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeVisible();
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    expect(new Set(lesson.quiz.options.map(option => option.feedback)).size).toBe(lesson.quiz.options.length);
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
    }
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeVisible();
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent).toBe(lesson.output.trim());
  });

  it('explains boundaries and representation limits and distinguishes source-backed practice from proposed actors', () => {
    openLesson();
    for (const title of ['Start with the subject and external roles', 'Read participation without inventing a sequence',
      'Include required incorporated behavior', 'Extend an independently meaningful base', 'Justify a hollow triangle with a policy',
      'Write the behavior that the ellipses omit', 'Change the boundary deliberately and state limits']) {
      expect(screen.getByRole('heading', { name: title })).toBeVisible();
    }
    expect(screen.getByText(lesson.module.text)).toBeVisible();
    expect(lesson.module.text).toContain('candidate external roles');
    expect(lesson.module.text).toContain('does not implement these user roles or role-based authorization');
    expect(lesson.module.text).toContain('does not require a prior scan');
    expect(screen.getByRole('link', { name: /Review Parking Lot’s goals and proposed boundary/ })).toHaveAttribute('href', '/parking-lot');
    fireEvent.click(screen.getByText('Inspect the verified module source', { selector: 'summary' }));
    for (const source of lesson.module.sources) {
      expect(read(source).length).toBeGreaterThan(50);
      expect(screen.getByRole('link', { name: source })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${source}`));
    }
    const parkingSource = read('backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java');
    const payMethod = parkingSource.split('public Ticket payAndExit(')[1].split('// Single-step Exit')[0];
    expect(payMethod).toContain('repository.completeExit(');
    expect(payMethod).toContain('repository.releaseSpot(');
    expect(payMethod).not.toContain('scanTicket(');
    for (const reference of lesson.references) expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
  });
});
