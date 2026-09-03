import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = fs.readFileSync(path.join(SRC, 'App.jsx'), 'utf8');
const homeSrc = fs.readFileSync(path.join(SRC, 'pages', 'Home.jsx'), 'utf8');

const routes = [...appSrc.matchAll(/\{\s*path:\s*'([^']+)',\s*title:\s*'[^']*',\s*module:\s*'([^']+)'\s*\}/g)].map(
  (m) => ({ path: m[1], module: m[2] }),
);

/** Every destination a home-page card can navigate to: routeMap values plus per-item `key` overrides. */
function homeTargets() {
  const routeMapBlock = homeSrc.slice(homeSrc.indexOf('const routeMap'), homeSrc.indexOf('export default function Home'));
  const mapped = [...routeMapBlock.matchAll(/'[^']+':\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
  const keyed = [...homeSrc.matchAll(/key:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
  return [...new Set([...mapped, ...keyed])];
}

const cards = [...homeSrc.matchAll(/\{\s*title:\s*'([^']+)',\s*icon:/g)].map((m) => m[1]);

describe('routing', () => {
  it('parses routes and home cards', () => {
    expect(routes.length).toBeGreaterThan(45);
    expect(cards.length).toBe(48);
  });

  // Snake & Ladders shipped broken this way: the card linked to /snakeladders
  // while only /snake-ladders was registered, and with no catch-all route the
  // result was a blank page rather than a visible error.
  it('every home-page card links to a registered route', () => {
    const known = new Set(routes.map((r) => r.path));
    const broken = homeTargets().filter((t) => !known.has(t));
    expect(broken).toEqual([]);
  });

  // A card with neither a routeMap entry nor an inline `key` renders <Link to="/undefined">.
  it('every card has a link target', () => {
    const routeMapBlock = homeSrc.slice(homeSrc.indexOf('const routeMap'), homeSrc.indexOf('export default function Home'));
    const missing = cards.filter((title) => {
      if (routeMapBlock.includes(`'${title}':`)) return false;
      const start = homeSrc.indexOf(`title: '${title}'`);
      const block = homeSrc.slice(start, homeSrc.indexOf('},', start));
      return !/key:\s*'/.test(block);
    });
    expect(missing).toEqual([]);
  });

  it('every route points at a page file that exists', () => {
    const missing = routes.filter((r) => !fs.existsSync(path.join(SRC, r.module.replace('./', ''))));
    expect(missing.map((r) => r.module)).toEqual([]);
  });

  it('every page file is reachable through some route', () => {
    const referenced = new Set(routes.map((r) => r.module));
    const onDisk = [];
    const base = path.join(SRC, 'lld');
    for (const dir of fs.readdirSync(base)) {
      const d = path.join(base, dir);
      if (!fs.statSync(d).isDirectory()) continue;
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith('Page.jsx')) onDisk.push(`./lld/${dir}/${f}`);
      }
    }
    const orphans = onDisk.filter((f) => !referenced.has(f));
    expect(orphans, 'unroutable page files are dead weight in the bundle').toEqual([]);
  });

  it('has a catch-all route so an unknown path is visible, not blank', () => {
    expect(appSrc).toMatch(/path="\*"/);
  });

  it('declares no duplicate route paths', () => {
    const paths = routes.map((r) => r.path);
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });
});
