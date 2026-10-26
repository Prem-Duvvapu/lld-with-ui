// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClassDiagram from '../components/ClassDiagram';
import { readFileSync } from 'node:fs';

const themeCss = readFileSync('src/styles/theme.css', 'utf8');

const diagram = {
  title: 'Palette and connections',
  classes: Array.from({ length: 11 }, (_, index) => ({
    name: `Class${index}`, stereotype: index % 2 ? 'interface' : 'service',
    fields: [`- value${index}: String`], methods: [`+ read${index}(): String`],
  })),
  relationships: Array.from({ length: 10 }, (_, index) => ({
    from: `Class${index}`, to: `Class${index + 1}`, label: `reads ${index + 1}`, dashed: index % 2 === 1,
  })),
};

function channels(color) {
  if (color.startsWith('#')) return color.slice(1).match(/../g).map(value => parseInt(value, 16));
  return color.match(/[\d.]+/g).slice(0, 3).map(Number);
}

function contrast(first, second) {
  const luminance = color => channels(color).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

let themeStyle;
beforeEach(() => {
  themeStyle = document.createElement('style');
  themeStyle.textContent = themeCss;
  document.head.append(themeStyle);
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => {
  themeStyle.remove();
  document.documentElement.removeAttribute('data-theme');
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('Class diagram readability and selection', () => {
  it.each(['light', 'dark'])('keeps the full palette and stereotype text readable in %s theme', theme => {
    document.documentElement.dataset.theme = theme;
    const { container } = render(<ClassDiagram module="palette" customData={diagram} />);
    const headers = [...container.querySelectorAll('.cd-class-header')];
    expect(headers).toHaveLength(11);
    for (const header of headers) {
      const style = getComputedStyle(header);
      expect(contrast(style.color, style.backgroundColor), header.textContent).toBeGreaterThanOrEqual(4.5);
      const stereotype = getComputedStyle(header.querySelector('.cd-stereotype'));
      const opacity = Number(stereotype.opacity || 1);
      const composite = channels(stereotype.color).map((value, index) => value * opacity + channels(style.backgroundColor)[index] * (1 - opacity));
      expect(contrast(`rgb(${composite.join(',')})`, style.backgroundColor), header.textContent).toBeGreaterThanOrEqual(4.5);
    }
    const borders = [...container.querySelectorAll('.cd-class-box')].map(card => getComputedStyle(card).borderTopColor);
    expect(new Set(borders).size).toBe(10);
    expect(borders[0]).toBe(borders[10]);
    const identities = Object.fromEntries(diagram.classes.map((cls, index) => [cls.name, borders[index]]));

    fireEvent.click(screen.getByRole('button', { name: /Relationships List/ }));
    const labels = [...container.querySelectorAll('.cd-relationship-class')];
    expect(labels).toHaveLength(20);
    for (const label of labels) {
      const surface = label.closest('.cd-relationship-card');
      expect(getComputedStyle(label).borderLeftColor).toBe(identities[label.textContent]);
      expect(contrast(getComputedStyle(label).color, getComputedStyle(surface).backgroundColor), label.textContent).toBeGreaterThanOrEqual(4.5);
    }
    for (const relationship of diagram.relationships) {
      expect(screen.getByText(`${relationship.from} → ${relationship.to}: ${relationship.label} (${relationship.dashed ? 'extends / implements' : 'association'}).`)).toBeDefined();
    }
  });

  it('returns focus to the selected graph card when Clear removes the focused button', () => {
    render(<ClassDiagram module="palette" customData={diagram} />);
    const card = screen.getByRole('button', { name: 'Highlight Class3 connections' });
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });
    const clear = screen.getByRole('button', { name: /Selected: Class3.*Clear/ });
    expect(getComputedStyle(clear).minHeight).toBe('44px');
    clear.focus();
    fireEvent.click(clear, { detail: 0 });
    expect(screen.queryByRole('button', { name: /Selected:.*Clear/ })).toBeNull();
    expect(document.activeElement).toBe(card);
    expect(card.getAttribute('aria-pressed')).toBe('false');
    fireEvent.keyDown(card, { key: ' ' });
    expect(card.getAttribute('aria-pressed')).toBe('true');
  });

  it('returns focus to the named heading when the selected card is absent in list view', () => {
    render(<ClassDiagram module="palette" customData={diagram} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Highlight Class3 connections' }), { key: ' ' });
    fireEvent.click(screen.getByRole('button', { name: /Relationships List/ }));
    const clear = screen.getByRole('button', { name: /Selected: Class3.*Clear/ });
    expect(getComputedStyle(clear).minHeight).toBe('44px');
    clear.focus();
    fireEvent.click(clear, { detail: 0 });
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: diagram.title, exact: true }));
    expect(screen.getByRole('button', { name: /Relationships List/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '📐 Graph View' }));
    expect(screen.getByRole('button', { name: 'Highlight Class3 connections' }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
    expect(screen.getByRole('dialog', { name: `${diagram.title} viewer` })).toBeDefined();
    expect(screen.getByText('Fields: - value3: String')).toBeDefined();
    expect(screen.getByText('Methods: + read3(): String')).toBeDefined();
  });
});
