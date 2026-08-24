import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import designDetails from '../data/designDetails.js';
import classDiagrams from '../data/classDiagrams.js';
import { ALIAS_MAP, resolveModuleKey, resolveModuleData } from '../data/moduleKeys.js';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Modules that deliberately have no design content yet: the nine concurrency
 * primitives, which are scheduled to get a real Java backend and be documented
 * against it. Removing a module from this list must make the suite pass, and
 * adding a NEW page without content must make it fail — that is the point.
 */
const PENDING_DESIGN_CONTENT = [
  'bloom-filter',
  'concurrent-hashmap',
  'fizz-buzz',
  'foo-bar',
  'h2o',
  'merge-sort',
  'zero-even-odd',
];

// ---------------------------------------------------------------- source scan

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function pageFiles() {
  const base = path.join(SRC, 'lld');
  return fs
    .readdirSync(base)
    .flatMap((dir) => {
      const d = path.join(base, dir);
      if (!fs.statSync(d).isDirectory()) return [];
      return fs
        .readdirSync(d)
        .filter((f) => f.endsWith('Page.jsx'))
        .map((f) => ({ module: dir, file: path.join(d, f) }));
    });
}

/**
 * Every module id a page hands to DesignDetails / ClassDiagram, from either
 * position: the `module` prop on <LldPage> (which renders the built-in design
 * tabs itself) or a direct <ClassDiagram module="..."> in the page body.
 */
function requestedModuleIds() {
  const ids = new Map(); // id -> Set of page dirs that request it
  for (const { module, file } of pageFiles()) {
    const src = read(file);
    const found = new Set();
    const lld = src.match(/<LldPage[\s\S]*?module="([^"]+)"/);
    if (lld) found.add(lld[1]);
    for (const m of src.matchAll(/<(?:ClassDiagram|DesignDetails)\s+module="([^"]+)"/g)) {
      found.add(m[1]);
    }
    for (const id of found) {
      if (!ids.has(id)) ids.set(id, new Set());
      ids.get(id).add(module);
    }
  }
  return ids;
}

const REQUESTED = requestedModuleIds();

// ---------------------------------------------------------------- coverage

describe('design data coverage', () => {
  it('finds module ids to check', () => {
    expect(REQUESTED.size).toBeGreaterThan(40);
  });

  it('every module a page asks for has designDetails content', () => {
    const missing = [];
    for (const [id, pages] of REQUESTED) {
      if (PENDING_DESIGN_CONTENT.includes(id)) continue;
      if (!resolveModuleData(designDetails, id)) missing.push(`${id} (used by ${[...pages].join(', ')})`);
    }
    expect(missing).toEqual([]);
  });

  it('every module a page asks for has a class diagram', () => {
    const missing = [];
    for (const [id, pages] of REQUESTED) {
      if (PENDING_DESIGN_CONTENT.includes(id)) continue;
      if (!resolveModuleData(classDiagrams, id)) missing.push(`${id} (used by ${[...pages].join(', ')})`);
    }
    expect(missing).toEqual([]);
  });

  it('pending modules are really still pending, so the list stays honest', () => {
    const nowCovered = PENDING_DESIGN_CONTENT.filter(
      (id) => resolveModuleData(designDetails, id) && resolveModuleData(classDiagrams, id),
    );
    expect(nowCovered, 'remove these from PENDING_DESIGN_CONTENT').toEqual([]);
  });
});

// ---------------------------------------------------------------- shape

describe('designDetails entry shape', () => {
  const entries = Object.entries(designDetails);

  it('has an entry per shipped module', () => {
    expect(entries.length).toBeGreaterThan(30);
  });

  it.each(entries)('%s has a title', (_key, data) => {
    expect(typeof data.title).toBe('string');
    expect(data.title.trim().length).toBeGreaterThan(0);
  });

  it.each(entries)('%s has requirements, entities and design patterns', (_key, data) => {
    for (const field of ['requirements', 'entities', 'designPatterns']) {
      expect(Array.isArray(data[field]), `${field} must be an array`).toBe(true);
      expect(data[field].length, `${field} must not be empty`).toBeGreaterThan(0);
    }
  });

  it.each(entries)('%s entities each name a class', (_key, data) => {
    for (const e of data.entities) {
      expect(typeof e === 'string' ? e : e.name).toBeTruthy();
    }
  });
});

describe('classDiagrams entry shape', () => {
  const entries = Object.entries(classDiagrams);

  it.each(entries)('%s has a title and at least one class', (_key, data) => {
    expect(typeof data.title).toBe('string');
    expect(data.title.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(data.classes)).toBe(true);
    expect(data.classes.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s classes all have unique names', (_key, data) => {
    const names = data.classes.map((c) => c.name);
    expect(names.filter((n) => !n)).toEqual([]);
    expect(new Set(names).size, `duplicate class names in ${_key}`).toBe(names.length);
  });

  // The renderer looks up each relationship endpoint with
  // querySelector(`[data-class="..."]`) and silently drops the edge when it
  // misses, so a typo produces an invisible half-drawn diagram.
  it.each(entries)('%s relationship endpoints all reference a declared class', (key, data) => {
    const names = new Set(data.classes.map((c) => c.name));
    const dangling = [];
    for (const rel of data.relationships || []) {
      if (!names.has(rel.from)) dangling.push(`${key}: from "${rel.from}"`);
      if (!names.has(rel.to)) dangling.push(`${key}: to "${rel.to}"`);
    }
    expect(dangling).toEqual([]);
  });
});

// ---------------------------------------------------------------- barrels

describe('data barrels', () => {
  const cases = [
    { label: 'designDetails', barrel: 'designDetails.js', dir: 'design', store: designDetails },
    { label: 'classDiagrams', barrel: 'classDiagrams.js', dir: 'diagrams', store: classDiagrams },
  ];

  it.each(cases)('$label registers every file in its directory', ({ barrel, dir, store }) => {
    const src = read(path.join(SRC, 'data', barrel));
    const files = fs.readdirSync(path.join(SRC, 'data', dir)).filter((f) => f.endsWith('.js'));
    const unregistered = files.filter((f) => !src.includes(`./${dir}/${f}`));
    expect(unregistered, 'files present but not imported in the barrel').toEqual([]);
    expect(Object.keys(store).length).toBe(files.length);
  });

  // The original single-file stores had 7 duplicate literal keys, and JavaScript
  // silently kept whichever came last — discarding 653 lines of richer content.
  it.each(cases)('$label declares each key exactly once', ({ barrel }) => {
    const src = read(path.join(SRC, 'data', barrel));
    const body = src.slice(src.indexOf('= {'), src.indexOf('};'));
    const keys = [...body.matchAll(/^\s{2}'?([A-Za-z][A-Za-z0-9_-]*)'?\s*:/gm)].map((m) => m[1]);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes).toEqual([]);
  });

  it.each(cases)('$label has no module file that fails to resolve', ({ store }) => {
    for (const [key, value] of Object.entries(store)) {
      expect(value, `${key} resolved to nothing`).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------- resolver

describe('module key resolver', () => {
  it('every alias points at a key that exists in at least one store', () => {
    const broken = Object.entries(ALIAS_MAP).filter(
      ([, target]) => !(target in designDetails) && !(target in classDiagrams),
    );
    expect(broken).toEqual([]);
  });

  it('resolves the shapes pages actually use', () => {
    expect(resolveModuleKey(designDetails, 'parking-lot')).toBe('parking');
    expect(resolveModuleKey(designDetails, 'coffeemachine')).toBe('coffee');
    expect(resolveModuleKey(designDetails, 'digital-wallet')).toBe('wallet');
    expect(resolveModuleKey(designDetails, 'tic-tac-toe')).toBe('tictactoe');
    expect(resolveModuleKey(designDetails, 'task-management')).toBe('taskManagement');
    expect(resolveModuleKey(designDetails, 'lrucache')).toBe('lru-cache');
    expect(resolveModuleKey(designDetails, 'lru-cache')).toBe('lru-cache');
  });

  it('returns null rather than throwing for an unknown module', () => {
    expect(resolveModuleKey(designDetails, 'does-not-exist')).toBeNull();
    expect(resolveModuleData(designDetails, 'does-not-exist')).toBeNull();
    expect(resolveModuleKey(designDetails, undefined)).toBeNull();
    expect(resolveModuleData(null, 'parking')).toBeNull();
  });
});

// ---------------------------------------------------------------- content recovered

describe('content recovered from duplicate keys', () => {
  // Regression guards for the specific entries that duplicate keys had shadowed.
  it('zomato keeps the fuller write-up and diagram', () => {
    expect(designDetails.zomato.tradeoffs?.length).toBeGreaterThan(0);
    expect(designDetails.zomato.requirements.length).toBeGreaterThanOrEqual(8);
    expect(classDiagrams.zomato.classes.length).toBeGreaterThanOrEqual(13);
  });

  it('movieticket has a title again', () => {
    expect(designDetails.movieticket.title).toBeTruthy();
  });

  it('coffee machine keeps the detailed diagram', () => {
    expect(classDiagrams.coffee.classes.length).toBeGreaterThanOrEqual(19);
  });

  it('stock brokerage has a diagram and the fuller write-up', () => {
    expect(classDiagrams.stockbroker.classes.length).toBeGreaterThan(0);
    expect(designDetails.stockbroker.principles?.length).toBeGreaterThan(0);
  });

  it('pubsub keeps SOLID and OOP sections', () => {
    expect(designDetails.pubsub.principles?.length).toBeGreaterThan(0);
    expect(designDetails.pubsub.oopConcepts?.length).toBeGreaterThan(0);
  });

  it('lru cache keeps the fuller pattern list', () => {
    expect(designDetails['lru-cache'].designPatterns.length).toBeGreaterThanOrEqual(5);
  });

  it('library and inventory have the diagrams that were missing', () => {
    expect(classDiagrams.library.classes.length).toBeGreaterThan(0);
    expect(classDiagrams.inventory.classes.length).toBeGreaterThan(0);
  });
});
