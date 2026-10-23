import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { LESSONS, findLesson } from '../learning/curriculum';
import atmDesign from '../data/design/atm';
import atmDiagram from '../data/diagrams/atm';
import kvDesign from '../data/design/kvstore';
import kvDiagram from '../data/diagrams/kvstore';
import kvSequence from '../data/sequences/kvstore';
import { getModulePatterns } from '../data/modulePatterns';

function read(path) {
  return fs.readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
}

function rows() {
  return read('LLD_CURRICULUM_COVERAGE.md').split(/\r?\n/)
    .filter(line => /^\| `[a-z-]+` /.test(line))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
}

describe('Curriculum evidence audit', () => {
  it('does not advertise ATM transaction records as a Template Method implementation', () => {
    expect(atmDesign.designPatterns.find(pattern => pattern.name === 'Template Method Pattern').used).toBe(false);
    expect(getModulePatterns('atm')).not.toContain('Template Method');
    expect(getModulePatterns('kvstore')).toContain('Template Method');
  });

  it('does not invent an ATM Transaction.execute method in either learning view', () => {
    expect(atmDesign.entities.find(entity => entity.name === 'Transaction (Abstract)').methods.some(method => method.name.startsWith('execute('))).toBe(false);
    expect(atmDiagram.classes.find(entity => entity.name === 'Transaction').methods.join(' ')).not.toMatch(/execute\(/);
    expect(read('backend/src/main/java/com/lld/atm/model/Transaction.java')).not.toMatch(/\bexecute\s*\(/);
    expect(read('backend/src/main/java/com/lld/kvstore/template/KvReadTemplate.java')).toMatch(/public final T read\(/);
    const repository = read('backend/src/main/java/com/lld/kvstore/repository/KvStoreRepository.java');
    expect(repository).toContain('new GetOperation().read(store, key)');
    expect(repository).toContain('new PeekOperation().read(store, key)');
  });

  it('does not teach per-key atomic compute as a lock-free progress guarantee', () => {
    const teaching = [kvDesign.summary, ...kvDesign.requirements, ...kvDesign.tradeoffs, ...kvDesign.highlights,
      ...kvDesign.extensibility.map(entry => entry.description),
      ...kvDesign.entities.map(entry => entry.description),
      ...kvDiagram.classes.flatMap(entry => entry.methods), JSON.stringify(kvSequence)].join(' ');
    expect(teaching).not.toMatch(/(?:CAS is lock-free|(?:genuinely|fully) lock-free|race proven directly, lock-free|lock-free premise|lock-free, via)/i);
    expect(JSON.stringify(kvSequence)).not.toMatch(/lock-free|no ReentrantLock anywhere/i);
    expect(teaching).toContain('may block');
    expect(read('backend/src/main/java/com/lld/kvstore/repository/KvStoreRepository.java')).toContain('store.compute(key, (k, existing) ->');
    expect(kvDesign.oopConcepts.some(entry => entry.name === 'Immutable Value Objects')).toBe(false);
    expect(kvDesign.summary).toContain('not persistence across a process restart');
    expect(read('frontend/src/lld/kvstore/KvStorePage.jsx')).not.toMatch(/Durability Proof|Lock-Free Compare-and-Swap/);
  });

  it('lets shared pattern cards shrink below their desktop minimum on narrow screens', () => {
    expect(read('frontend/src/components/design/PatternsTab.jsx')).toContain('minmax(min(320px, 100%), 1fr)');
  });

  it('covers every canonical topic once with an outcome, exercise, evidence decision and delivery gap', () => {
    const coverage = rows();
    expect(coverage.map(row => row[0].match(/`([^`]+)`/)[1])).toEqual(LESSONS.map(lesson => lesson.id));
    for (const row of coverage) {
      expect(row).toHaveLength(6);
      expect(row[1].length).toBeGreaterThan(20);
      expect(row[3].length).toBeGreaterThan(15);
      expect(row[4].length).toBeGreaterThan(20);
      const id = row[0].match(/`([^`]+)`/)[1];
      expect(row[5]).toMatch(findLesson(id).status === 'published' ? /^Delivered/ : /^G:/);
    }
  });

  it('keeps the audited prerequisites in sync with the manifest and rejects cycles', () => {
    for (const row of rows()) {
      const id = row[0].match(/`([^`]+)`/)[1];
      const prerequisites = [...row[2].matchAll(/`([^`]+)`/g)].map(match => match[1]);
      expect(prerequisites, id).toEqual(findLesson(id).prerequisites);
    }
    const checked = new Set();
    const inspect = (id, ancestors = new Set()) => {
      expect(ancestors.has(id), `prerequisite cycle at ${id}`).toBe(false);
      if (checked.has(id)) return;
      const lesson = findLesson(id);
      expect(lesson, `unknown prerequisite ${id}`).toBeDefined();
      for (const prerequisite of lesson.prerequisites) inspect(prerequisite, new Set([...ancestors, id]));
      checked.add(id);
    };
    LESSONS.forEach(lesson => inspect(lesson.id));
    expect(findLesson('abstract-factory').prerequisites).toContain('factory-method');
    expect(findLesson('state').prerequisites).toContain('state-machine-diagram');
    expect(findLesson('condition-variables').prerequisites).toContain('mutex');
    expect(findLesson('timed-locking').prerequisites).toContain('deadlock');
  });

  it('has no broken repository evidence links or unmapped evidence anchors', () => {
    const audit = read('LLD_CURRICULUM_COVERAGE.md');
    const anchors = new Set([...audit.matchAll(/<a id="(e\d+)"/g)].map(match => match[1]));
    expect(anchors.size).toBeGreaterThanOrEqual(20);
    for (const reference of audit.matchAll(/\]\(#(e\d+)\)/g)) expect(anchors.has(reference[1])).toBe(true);
    for (const reference of audit.matchAll(/\]\(((?:backend|frontend)\/[^)#]+)(?:#[^)]*)?\)/g)) {
      expect(fs.existsSync(new URL(`../../../${reference[1]}`, import.meta.url)), reference[1]).toBe(true);
    }
  });

  it('distinguishes real singleton state instances and rule interpretation from labels alone', () => {
    const singleton = read('backend/src/main/java/com/lld/atm/state/IdleSessionState.java');
    expect(singleton).toContain('public static final IdleSessionState INSTANCE = new IdleSessionState()');
    expect(singleton).toContain('private IdleSessionState()');
    expect(read('backend/src/main/java/com/lld/atm/state/SessionStates.java')).toContain('BY_STATUS.put(ATMState.IDLE, IdleSessionState.INSTANCE)');
    expect(read('backend/src/main/java/com/lld/featureflag/condition/ConditionTreeBuilder.java')).toContain('case "AND"');
    expect(read('backend/src/main/java/com/lld/featureflag/condition/AndCondition.java')).toContain('child.evaluate(ctx)');
    expect(read('backend/src/main/java/com/lld/featureflag/controller/FeatureFlagController.java')).toContain('ConditionTreeBuilder.build(rule)');
  });

  it('does not confuse unknown teaching coverage with completed topics or different concurrency contracts', () => {
    const audit = read('LLD_CURRICULUM_COVERAGE.md').replace(/\s+/g, ' ');
    expect(audit).toContain('six published lessons and 63 undelivered topics');
    expect(audit).toContain('not a claim of repository-wide absence');
    expect(audit).toContain('not a timed lock acquisition');
    expect(audit).toContain('not JVM thread states');
    expect(audit).toContain('not a Reader-Writer implementation');
  });
});
