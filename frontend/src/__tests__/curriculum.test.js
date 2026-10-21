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
    expect(files).toEqual(PUBLISHED_LESSONS.map(entry => `../learning/lessons/${entry.id}.js`));
    expect(PUBLISHED_LESSONS.map(entry => entry.id)).toEqual(['classes-and-objects']);
    expect(lesson.id).toBe(PUBLISHED_LESSONS[0].id);
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    expect((await loadLesson('classes-and-objects')).id).toBe('classes-and-objects');
    await expect(loadLesson('enums')).rejects.toThrow('no published content');
  });

  it('uses the actual Java files and pins output and visual data to the Java contract tests', () => {
    for (const block of lesson.code) {
      const actual = fs.readFileSync(new URL(`../learning/examples/${block.filename}`, import.meta.url), 'utf8');
      expect(block.source).toBe(actual);
    }
    expect(lesson.output).toContain('first: Objects, reviews=2');
    expect(lesson.visual.snapshots[2].objects[0].reviewCount).toBe(2);
    for (const path of lesson.module.sources) expect(fs.existsSync(new URL(`../../../${path}`, import.meta.url))).toBe(true);
    expect(fs.readFileSync(new URL('../../../backend/src/test/java/com/lld/learning/ClassesAndObjectsExampleTest.java', import.meta.url), 'utf8')).toContain('illustrationSnapshotsMatchTheActualJavaStates');
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
