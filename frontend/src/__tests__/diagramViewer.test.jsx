// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiagramViewer from '../components/DiagramViewer';
import ClassDiagram from '../components/ClassDiagram';
import SequenceDiagram from '../components/SequenceDiagram';

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

function viewer() {
  return render(<DiagramViewer title="Example" width={1000} legend={<p>Arrow meanings</p>} transcript={<p>Full explanation</p>}><p>Diagram content</p></DiagramViewer>);
}

describe('Shared diagram viewer', () => {
  it('bounds zoom, fits narrow screens, and resets scroll and scale', () => {
    viewer();
    const viewport = screen.getByRole('region', { name: 'Example scrollable diagram' });
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 237 });
    const scroll = vi.spyOn(viewport, 'scrollTo');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Zoom level').textContent).toBe('110%');
    for (let index = 0; index < 20; index++) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByRole('button', { name: 'Zoom in' }).disabled).toBe(true);
    expect(screen.getByLabelText('Zoom level').textContent).toBe('200%');
    fireEvent.click(screen.getByRole('button', { name: 'Fit width' }));
    expect(viewport.firstElementChild.style.width).toBe('237px');
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByLabelText('Zoom level').textContent).toBe('100%');
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    for (let index = 0; index < 15; index++) fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByLabelText('Zoom level').textContent).toBe('10%');
    expect(screen.getByRole('button', { name: 'Zoom out' }).disabled).toBe(true);
  });

  it('opens one native dialog, retains zoom, and restores focus on Escape', () => {
    viewer();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
    expect(screen.getByRole('dialog', { name: 'Example viewer' })).toBeDefined();
    expect(screen.getAllByText('Diagram content')).toHaveLength(1);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Exit fullscreen' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByLabelText('Zoom level').textContent).toBe('110%');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
  });

  it('restores page scrolling if an expanded viewer unmounts', () => {
    document.body.style.overflow = 'auto';
    const view = viewer();
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
    view.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});

const classes = {
  title: 'Example classes',
  classes: [{ name: 'Sender', fields: ['- receiver: Receiver'], methods: ['+ send(message): void'] }, { name: 'Receiver', fields: [], methods: ['+ receive(message): void'] }],
  relationships: [{ from: 'Sender', to: 'Receiver', label: 'delivers message' }],
};
const sequence = {
  title: 'Example sequence',
  flows: [{ id: 'send', label: 'Send message', participants: [{ id: 'sender', name: 'Sender', kind: 'actor' }, { id: 'receiver', name: 'Receiver' }], steps: [
    { from: 'sender', to: 'receiver', text: 'This is a complete message label deliberately longer than fifty-six characters, never truncated in the transcript.', detail: 'The receiver validates the complete message.', activate: 'receiver' },
    { type: 'return', from: 'receiver', to: 'sender', text: 'Acknowledged', deactivate: 'receiver' },
    { type: 'note', over: ['receiver'], text: 'Waiting for lock', blocked: true },
  ] }, { id: 'empty', label: 'Empty flow', participants: [], steps: [] }],
};

describe('Diagram integrations', () => {
  it('provides keyboard class selection and complete member/relationship text', () => {
    render(<ClassDiagram module="example" customData={classes} />);
    const card = screen.getByRole('button', { name: 'Highlight Sender connections' });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(card.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(card, { key: ' ' });
    expect(card.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Fields: - receiver: Receiver')).toBeDefined();
    expect(screen.getByText('Methods: + send(message): void')).toBeDefined();
    expect(screen.getByText('Sender → Receiver: delivers message (association).')).toBeDefined();
  });

  it('normalizes connector positions to unscaled diagram coordinates', async () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.classList.contains('cd-container')) return new DOMRect(100, 50, 2000, 1000);
      if (this.dataset.class === 'Sender') return new DOMRect(110, 70, 200, 100);
      if (this.dataset.class === 'Receiver') return new DOMRect(710, 70, 200, 100);
      return original.call(this);
    });
    const { container } = render(<ClassDiagram module="example" customData={classes} />);
    await waitFor(() => {
      const line = container.querySelector('.cd-lines path[marker-end]');
      expect(line?.getAttribute('d')).toBe('M105,35 Q205,35 305,35');
    });
  });

  it('keeps full sequence labels, details, participants and notes in the transcript', () => {
    render(<SequenceDiagram module="example" customData={sequence} />);
    expect(screen.getByText(sequence.flows[0].steps[0].text)).toBeDefined();
    expect(screen.getByText('The receiver validates the complete message.')).toBeDefined();
    expect(screen.getByText('Blocked note over Receiver')).toBeDefined();
    expect(screen.getByText('Activation starts: Receiver.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Empty flow' }));
    expect(screen.getByRole('button', { name: 'Empty flow' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('No steps listed for this flow.')).toBeDefined();
  });

  it('falls back safely when the replacement module has fewer flows', async () => {
    const view = render(<SequenceDiagram module="example" customData={sequence} />);
    fireEvent.click(screen.getByRole('button', { name: 'Empty flow' }));
    view.rerender(<SequenceDiagram module="replacement" customData={{ ...sequence, flows: [sequence.flows[0]] }} />);
    await waitFor(() => expect(screen.getByText(sequence.flows[0].steps[0].text)).toBeDefined());
  });

  it('does not reuse SVG marker identifiers between diagram instances', () => {
    const { container } = render(<><ClassDiagram module="one" customData={classes} /><ClassDiagram module="two" customData={classes} /><SequenceDiagram module="one" customData={sequence} /><SequenceDiagram module="two" customData={sequence} /></>);
    const ids = [...container.querySelectorAll('marker')].map(marker => marker.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(6);
  });
});
