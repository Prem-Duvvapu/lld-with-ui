import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { CURRICULUM_GROUPS, LESSONS, PUBLISHED_LESSONS, findLesson } from '../learning/curriculum';
import lesson from '../learning/lessons/classes-and-objects';
import { loadLesson } from '../learning/lessonLoader';

describe('Curriculum inventory and publication contract', () => {
  it('accounts for all requested families and identifies the five proposed additions', () => {
    expect(LESSONS).toHaveLength(69);
    expect(LESSONS.filter(entry => ['oop', 'relationships'].includes(entry.group))).toHaveLength(15);
    expect(LESSONS.filter(entry => entry.group === 'creational')).toHaveLength(5);
    expect(LESSONS.filter(entry => entry.group === 'structural')).toHaveLength(7);
    expect(LESSONS.filter(entry => entry.group === 'behavioral')).toHaveLength(11);
    expect(LESSONS.filter(entry => entry.group === 'uml')).toHaveLength(5);
    expect(LESSONS.filter(entry => entry.proposed).map(entry => entry.id)).toEqual(['constructors', 'access-modifiers', 'overloading-and-overriding', 'static-and-instance', 'interpreter']);
    expect(CURRICULUM_GROUPS.find(group => group.id === 'concurrency-basics').title).toBe('Concurrency 101');
    expect(findLesson('introduction-to-concurrency').title).toBe('Introduction to Concurrency');
  });

  it('has stable unique IDs, valid groups, and prerequisites without self-dependencies', () => {
    expect(new Set(LESSONS.map(entry => entry.id)).size).toBe(LESSONS.length);
    for (const entry of LESSONS) {
      expect(entry.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(CURRICULUM_GROUPS.some(group => group.id === entry.group)).toBe(true);
      expect(entry.prerequisites).not.toContain(entry.id);
      for (const prerequisite of entry.prerequisites) expect(findLesson(prerequisite)).toBeDefined();
    }
  });

  it('publishes content only when a matching lazy-loaded file exists', async () => {
    const files = Object.keys(import.meta.glob('../learning/lessons/*.js'));
    expect(files.sort()).toEqual(PUBLISHED_LESSONS.map(entry => `../learning/lessons/${entry.id}.js`).sort());
    expect(PUBLISHED_LESSONS.map(entry => entry.id)).toEqual(['classes-and-objects', 'constructors', 'access-modifiers', 'enums', 'interfaces', 'encapsulation']);
    expect(lesson.id).toBe(PUBLISHED_LESSONS[0].id);
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    expect((await loadLesson('classes-and-objects')).id).toBe('classes-and-objects');
    expect((await loadLesson('enums')).id).toBe('enums');
    expect((await loadLesson('interfaces')).id).toBe('interfaces');
    await expect(loadLesson('abstraction')).rejects.toThrow('no published content');
  });

  it('uses the actual Java files and pins output and visual data to the Java contract tests', () => {
    for (const block of lesson.code) {
      const actual = fs.readFileSync(new URL(`../learning/examples/${block.filename}`, import.meta.url), 'utf8');
      expect(block.source).toBe(actual);
    }
    expect(lesson.output).toContain('first: Objects, reviews=2');
    expect(lesson.visual.snapshots[2].items[0].fields.find(field => field.name === 'reviewCount').value).toBe(2);
    for (const path of lesson.module.sources) expect(fs.existsSync(new URL(`../../../${path}`, import.meta.url))).toBe(true);
    expect(fs.readFileSync(new URL('../../../backend/src/test/java/com/lld/learning/ClassesAndObjectsExampleTest.java', import.meta.url), 'utf8')).toContain('illustrationSnapshotsMatchTheActualJavaStates');
  });

  it.each(['classes-and-objects', 'constructors', 'access-modifiers', 'enums', 'interfaces', 'encapsulation'])('keeps %s self-contained with canonical Java and readable illustration fields', async id => {
    const content = await loadLesson(id);
    expect(content.id).toBe(id);
    for (const block of content.code) {
      expect(block.source).toBe(fs.readFileSync(new URL(`../learning/examples/${block.filename}`, import.meta.url), 'utf8'));
      expect(content.run).toContain(block.filename);
    }
    expect(content.quiz.options.filter(option => option.correct)).toHaveLength(1);
    for (const snapshot of content.visual.snapshots) {
      expect(snapshot.items.length).toBeGreaterThan(0);
      expect(new Set(snapshot.items.map(item => item.label)).size).toBe(snapshot.items.length);
      for (const item of snapshot.items) {
        expect(item.typeLabel || content.visual.typeLabel).toBeTruthy();
        expect(item.fields.length).toBeGreaterThan(0);
        expect(new Set(item.fields.map(field => field.name)).size).toBe(item.fields.length);
        expect(item.fields.every(field => ['string', 'number', 'boolean'].includes(typeof field.value))).toBe(true);
      }
    }
    for (const source of content.module.sources) expect(fs.existsSync(new URL(`../../../${source}`, import.meta.url))).toBe(true);
  });

  it('orders published prerequisites before dependents and keeps duration in the manifest', async () => {
    expect(PUBLISHED_LESSONS).toHaveLength(LESSONS.filter(entry => entry.status === 'published').length);
    for (const [index, entry] of PUBLISHED_LESSONS.entries()) {
      expect(entry.duration).toMatch(/^\d+–\d+ minutes$/);
      expect((await loadLesson(entry.id)).duration).toBeUndefined();
      for (const prerequisite of entry.prerequisites) {
        const earlier = PUBLISHED_LESSONS.findIndex(lesson => lesson.id === prerequisite);
        if (earlier !== -1) expect(earlier).toBeLessThan(index);
      }
    }
  });

  it('registers the catalog and lesson routes lazily and makes learning discoverable', () => {
    const app = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    expect(app).toMatch(/lazy\(\(\) => import\('\.\/pages\/Learn'\)\)/);
    expect(app).toMatch(/lazy\(\(\) => import\('\.\/pages\/Lesson'\)\)/);
    expect(app).toContain('path="/learn"');
    expect(app).toContain('path="/learn/:lessonId"');
    expect(app).toContain('<PageErrorBoundary key={pathname}>');
    for (const page of ['Home', 'LearningPath']) {
      expect(fs.readFileSync(new URL(`../pages/${page}.jsx`, import.meta.url), 'utf8')).toContain('to="/learn"');
    }
  });
});
