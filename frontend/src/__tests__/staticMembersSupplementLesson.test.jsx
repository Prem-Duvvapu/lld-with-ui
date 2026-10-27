// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import { findLesson } from '../learning/curriculum';
import lesson from '../learning/lessons/static-and-instance';

const directory = path.dirname(fileURLToPath(import.meta.url));
const readExample = filename => fs.readFileSync(path.resolve(directory, '../learning/examples', filename), 'utf8');
// Test the assigned lesson directly; the parent owns publication and route integration.
function openLesson() {
  return render(<MemoryRouter><LessonContent lesson={lesson}
    metadata={{ ...findLesson(lesson.id), duration: '25–30 minutes' }} /></MemoryRouter>);
}
beforeEach(() => localStorage.clear());

describe('Static and instance supplemental lesson', () => {
  it('imports canonical Java, fixture state and executable save/run paths', () => {
    expect(lesson.id).toBe('static-and-instance');
    expect(lesson.code).toHaveLength(4);
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(block.filename).toMatch(/^memberstate\/\w+\.java$/);
      expect(block.source).toContain('package com.lld.learning.examples.memberstate;');
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('java -cp out com.lld.learning.examples.memberstate.MembersDemo');
    expect(lesson.output).toBe(readExample(`${lesson.id}-output.txt`));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample(`${lesson.id}-snapshots.json`)));
    expect(lesson.visual.snapshots).toHaveLength(5);
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
  });

  it('renders every class/object field and the distinct hiding/dispatch results', () => {
    const { container } = openLesson();
    expect(screen.getByRole('heading', { name: 'Static vs Instance Members', level: 1 })).toHaveFocus();
    lesson.visual.snapshots.forEach((snapshot, index) => {
      fireEvent.click(screen.getByRole('button', { name: `${index + 1}. ${snapshot.title}` }));
      const visual = within(container.querySelector('.learn-visual'));
      expect(visual.getByText(snapshot.explanation)).toBeInTheDocument();
      for (const item of snapshot.items) {
        const card = visual.getByRole('heading', { name: `${item.label} : ${item.typeLabel}` }).parentElement;
        expect(new Set(item.fields.map(field => field.name)).size).toBe(item.fields.length);
        for (const field of item.fields) {
          expect(['string', 'number', 'boolean']).toContain(typeof field.value);
          const row = within(card).getByText(field.name, { selector: 'dt' }).parentElement;
          expect(row.querySelector('dd').textContent).toBe(String(field.value));
        }
      }
    });
    expect(screen.getByRole('region', { name: 'memberstate/InitializationLog.java, scrollable code' })).toHaveAttribute('tabindex', '0');
  });

  it('corrects shared-instance and receiverless-helper prediction mistakes', () => {
    openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeInTheDocument();
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent)
      .toBe(lesson.output.trim());
  });

  it('offers a reset exercise, honest synchronization limits and verified source links', () => {
    openLesson();
    expect(screen.getByText(lesson.exercise)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeInTheDocument();
    expect(screen.getByText(/Static does not mean constant, singleton, immutable, persistent or thread-safe/)).toBeInTheDocument();
    expect(screen.getByText(/shared Spring bean is an application scope choice/)).toBeInTheDocument();
    const disclosure = screen.getByText('Inspect the verified module source', { selector: 'summary' }).parentElement;
    for (const source of lesson.module.sources) {
      expect(fs.existsSync(path.resolve(directory, '../../..', source))).toBe(true);
      expect(within(disclosure).getByRole('link', { name: source }).getAttribute('href')).toContain(`/blob/main/${source}`);
    }
    for (const reference of lesson.references) {
      expect(new URL(reference.url).hostname).toBe('docs.oracle.com');
      expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
    }
  });
});
