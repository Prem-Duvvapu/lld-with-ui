// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LessonClassModel from '../learning/LessonClassModel';
import composition from '../learning/lessons/composition';

// Explicit integration contract: the SAME children element can be rendered twice
// by a viewer retaining inline content while also showing fullscreen content.
vi.mock('../components/DiagramViewer', async importOriginal => {
  const { default: Viewer } = await importOriginal();
  return { default: props => <><div data-copy="retained-inline">{props.children}</div><Viewer {...props} /></> };
});

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

it('allocates unique marker definitions inside each separately rendered copy of the same children', () => {
  const { container } = render(<LessonClassModel model={composition.classModel} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
  const svgs = [...container.querySelectorAll('svg')];
  expect(svgs).toHaveLength(2);
  const ids = [...document.querySelectorAll('marker')].map(marker => marker.id);
  expect(ids).toHaveLength(8);
  expect(new Set(ids).size).toBe(ids.length);
  for (const svg of svgs) {
    const id = svg.querySelector('.lesson-class-model-edge').getAttribute('marker-start').slice(5, -1);
    expect(svg.querySelector(`[id="${id}"]`)).not.toBeNull();
  }
  expect(svgs[0].querySelector('marker').id).not.toBe(svgs[1].querySelector('marker').id);
  fireEvent.click(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
  expect(screen.getByRole('dialog')).toHaveAttribute('open');
  expect(document.querySelectorAll('svg')).toHaveLength(2);
  const fullscreenIds = [...document.querySelectorAll('marker')].map(marker => marker.id);
  expect(fullscreenIds).toHaveLength(8);
  expect(new Set(fullscreenIds).size).toBe(fullscreenIds.length);
  document.querySelectorAll('svg').forEach(svg => {
    const id = svg.querySelector('.lesson-class-model-edge').getAttribute('marker-start').slice(5, -1);
    expect(svg.querySelector(`[id="${id}"]`)).not.toBeNull();
  });
});
