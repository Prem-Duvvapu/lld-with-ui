import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LLD = path.join(SRC, 'lld');

function pageSources() {
  return fs.readdirSync(LLD).flatMap((dir) => fs.readdirSync(path.join(LLD, dir))
    .filter((file) => file.endsWith('.jsx'))
    .map((file) => ({ file: `${dir}/${file}`, source: fs.readFileSync(path.join(LLD, dir, file), 'utf8') })));
}

// A conditionally rendered error/status banner: `{error && <div ...>` or `{error && (\n <div ...>`.
const BANNER = /\{(message|statusMsg\.text|banner|notice|error|simError|err|simErr|loadError) && \(?\s*<div\b([^>]*)>/g;

describe('Accessibility contracts', () => {
  it('every conditional banner or error in a module page is a live region', () => {
    const silent = [];
    let scanned = 0;
    for (const { file, source } of pageSources()) {
      for (const match of source.matchAll(BANNER)) {
        scanned++;
        if (!/\brole=/.test(match[2])) {
          const line = source.slice(0, match.index).split('\n').length;
          silent.push(`${file}:${line} {${match[1]} && <div …> has no role="status"/"alert"`);
        }
      }
    }
    expect(scanned).toBeGreaterThan(70); // the pattern must keep matching real banners
    expect(silent).toEqual([]);
  });

  it('status colours stay readable as text on their own tinted backgrounds in both themes', () => {
    const theme = fs.readFileSync(path.join(SRC, 'styles', 'theme.css'), 'utf8');
    const block = (name) => theme.slice(theme.indexOf(`[data-theme='${name}']`), theme.indexOf('}', theme.indexOf(`[data-theme='${name}']`)));
    const token = (css, name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))[1].trim();
    const rgb = (value) => {
      const hex = value.match(/^#([0-9a-f]{6})$/i);
      if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
      return value.match(/[\d.]+/g).slice(0, 3).map(Number);
    };
    const alpha = (value) => Number(value.match(/[\d.]+/g)[3] ?? 1);
    const luminance = (channels) => {
      const [r, g, b] = channels.map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    const failures = [];
    for (const name of ['light', 'dark']) {
      const css = block(name);
      for (const surface of ['bg-card', 'bg-primary']) {
        const base = rgb(token(css, surface));
        for (const status of ['success', 'danger', 'warning', 'info']) {
          const tint = token(css, `${status}-bg`);
          const a = alpha(tint);
          const mixed = rgb(tint).map((c, i) => a * c + (1 - a) * base[i]);
          const contrast = ratio(rgb(token(css, status)), mixed);
          if (contrast < 4.5) failures.push(`${name} --${status} on --${status}-bg over --${surface}: ${contrast.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
