import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statuses = ['success', 'danger', 'warning', 'info'];
const theme = fs.readFileSync(path.join(sourceRoot, 'styles/theme.css'), 'utf8');

function themeTokens(name) {
  const readBlock = (selected) => {
    const start = theme.indexOf(`[data-theme='${selected}']`);
    return Object.fromEntries([...theme.slice(start, theme.indexOf('}', start))
      .matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
  };
  return { ...readBlock('light'), ...readBlock(name) };
}

function channels(hex) {
  expect(hex).toMatch(/^#[\da-f]{6}$/i);
  return [0, 2, 4].map((offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16));
}

function contrast(first, second) {
  const luminance = (color) => color.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.(css|jsx)$/.test(file) ? [file] : [];
  });
}

describe('Filled status surfaces', () => {
  for (const name of ['light', 'dark']) {
    it(`${name} filled statuses support normal text and existing enabled hover effects`, () => {
      const tokens = themeTokens(name);
      const foreground = channels(tokens['on-status-solid']);
      for (const status of statuses) {
        const background = channels(tokens[`${status}-solid`]);
        expect(contrast(foreground, background), status).toBeGreaterThanOrEqual(4.5);
        const brighter = background.map((channel) => Math.min(255, channel * 1.1));
        expect(contrast(foreground, brighter), `${status} bright hover`).toBeGreaterThanOrEqual(4.5);
        for (const surface of ['bg-card', 'bg-primary']) {
          const base = channels(tokens[surface]);
          const opacity = status === 'danger' ? 0.85 : 0.9;
          const composite = (color) => color.map((channel, index) => opacity * channel + (1 - opacity) * base[index]);
          expect(contrast(composite(foreground), composite(background)), `${status} hover over ${surface}`)
            .toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }

  it('CSS reserves raw status fills for text-free indicators and pairs solid fills explicitly', () => {
    const graphics = new Set([
      '.ui-step-dot--done', '.step-dot.done', '.sb-step-dot.done', '.sn-step-dot.done',
      '.el-step-dot.done', '.js-step-dot.done', '.stepper-line.done', '.step-rule.done',
      '.el-live-dot', '.el-shaft-header-dot.moving', '.el-shaft-header-dot.door-open', '.cap-fill.full',
    ]);
    const failures = [];
    let paired = 0;
    for (const file of sourceFiles(sourceRoot)) {
      const source = fs.readFileSync(file, 'utf8');
      const styles = file.endsWith('.css') ? [source] : [...source.matchAll(/const (?:CSS|styles) = `([^`]+)`/g)].map((match) => match[1]);
      for (const css of styles) {
        for (const match of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
          const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
          const declarations = match[2];
          if (/background(?:-color)?:\s*var\(--(?:success|danger|warning|info)\)/.test(declarations)
            && !graphics.has(selector)) failures.push(`${path.relative(sourceRoot, file)} ${selector}: raw status fill`);
          if (/background(?:-color)?:\s*var\(--(?:success|danger|warning|info)-solid\)/.test(declarations)) {
            paired++;
            if (!/color:\s*var\(--on-status-solid\)/.test(declarations)) failures.push(`${selector}: missing solid foreground`);
          }
        }
      }
    }
    expect(paired).toBeGreaterThanOrEqual(30);
    expect(failures).toEqual([]);
  });

  it('inline solid status controls declare their foreground rather than inherit a text tone', () => {
    const failures = [];
    let paired = 0;
    for (const file of sourceFiles(sourceRoot).filter((file) => file.endsWith('.jsx'))) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/style=\{\{([^{}]+)\}\}/g)) {
        const declarations = match[1];
        if (!/background(?:Color)?:\s*'var\(--(?:success|danger|warning|info)(?:-solid)?\)'/.test(declarations)) continue;
        paired++;
        if (!/background(?:Color)?:\s*'var\(--(?:success|danger|warning|info)-solid\)'/.test(declarations)
          || !/color:\s*'var\(--on-status-solid\)'/.test(declarations)) failures.push(path.relative(sourceRoot, file));
      }
    }
    expect(paired).toBeGreaterThanOrEqual(15);
    expect(failures).toEqual([]);
  });
});
