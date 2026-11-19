// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SolidPrinciplesDiagram from '../learning/diagrams/SolidPrinciplesDiagram';
import LessonDiagram from '../learning/LessonDiagram';
import { LESSON_DIAGRAM_KINDS, lessonDiagramLabel } from '../learning/lessonDiagramKinds';
import authoredModel from '../learning/diagrams/solid-principles';

// Independent authored fixture: pictures consume text and local node IDs, never Java execution.
const examples = [
  { id: 'srp', name: 'Single Responsibility', subject: 'Report', role: 'ReportFormatter', question: 'Which actor asks for this change?', contract: 'Keep the same report values.', tradeoff: 'A separate formatter adds a collaborator.' },
  { id: 'ocp', name: 'Open/Closed', subject: 'FeeCalculator', role: 'FeePolicy', question: 'Where can a fee policy vary?', contract: 'Preserve the agreed fee for existing policies.', tradeoff: 'A policy boundary needs a stable contract.' },
  { id: 'lsp', name: 'Liskov Substitution', subject: 'BalanceReader', role: 'ReadOnlyBalance', question: 'Can the caller keep its promises?', contract: 'A read must not change the balance.', tradeoff: 'A smaller capability can need a different type.' },
  { id: 'isp', name: 'Interface Segregation', subject: 'ReceiptClient', role: 'ReceiptReader', question: 'Which capabilities does this caller need?', contract: 'Reading a receipt does not require printing.', tradeoff: 'More focused interfaces add names.' },
  { id: 'dip', name: 'Dependency Inversion', subject: 'AlertService', role: 'AlertSender', question: 'Which direction does policy depend?', contract: 'One accepted alert reaches the chosen sender.', tradeoff: 'Assembly must choose an adapter explicitly.' },
];

const model = {
  kind: 'principles', title: 'SOLID responsibility pictures', summary: 'Compare the responsibility boundary and preserve the stated contract.',
  principles: examples.map(example => ({
    ...example,
    before: {
      title: `${example.subject} coupled`,
      nodes: [
        { id: 'client', title: `${example.subject} caller`, lines: ['requests the capability', '  keep  spacing  '] },
        { id: 'policy', title: `${example.subject} concrete dependency`, lines: ['owns several decisions', '\tvalue = "  saved  ";'] },
      ],
      edges: [{ from: 'client', to: 'policy', label: `depends directly on ${example.subject}` }],
      caption: `${example.subject}: the change boundary is coupled.`,
    },
    after: {
      title: `${example.subject} separated`,
      nodes: [
        { id: 'client', title: `${example.subject} caller`, lines: ['uses the promised capability'] },
        { id: 'policy', title: example.role, lines: ['states the focused contract', 'preserves the agreed behavior'] },
        { id: 'adapter', title: `${example.role} adapter`, lines: ['fulfils the contract'] },
      ],
      edges: [
        { from: 'client', to: 'policy', label: `requires ${example.role}` },
        { from: 'adapter', to: 'policy', label: `fulfils ${example.role}` },
      ],
      caption: `${example.subject}: the boundary isolates the stated responsibility.`,
    },
    sourcePaths: [`solid/${example.id}/${example.subject}.java`, `solid/${example.id}/contracts/${example.role}.java`],
  })),
  notes: ['Arrows express the authored relationship, not time.', '  Read the contract\nbefore choosing a boundary.  '],
};

afterEach(() => vi.restoreAllMocks());

function transcript() {
  return screen.getByRole('region', { name: 'Complete text explanation — all five principles' });
}

function assertCompleteTranscript(expectedModel = model) {
  const text = transcript();
  const summary = within(text).getByText('Read all five principles as text', { selector: 'summary' });
  if (!summary.parentElement.open) fireEvent.click(summary);
  expect(summary.parentElement).toHaveAttribute('open');
  expect(text).toBeVisible();
  for (const principle of expectedModel.principles) {
    const section = within(text).getByRole('region', { name: principle.name });
    expect(section).toBeVisible();
    expect(within(section).getByRole('heading', { name: principle.name, level: 4 })).toBeVisible();
    for (const field of ['question', 'contract', 'tradeoff']) expect(section).toHaveTextContent(principle[field]);
    for (const [stage, side] of [['Before', principle.before], ['After', principle.after]]) {
      const sideSection = within(section).getByRole('heading', { name: `${stage}: ${side.title}`, level: 5 }).parentElement;
      expect(sideSection).toHaveTextContent(side.caption);
      for (const node of side.nodes) {
        expect(within(sideSection.querySelector('.solid-nodes')).getByText(node.title, { exact: true })).toBeVisible();
        const lines = sideSection.querySelectorAll('.solid-node-lines');
        expect([...lines].some(element => element.textContent === node.lines.join('\n'))).toBe(true);
      }
      if (side.edges.length) {
        const arrows = within(sideSection).getByRole('list', { name: 'Connections' });
        expect(within(arrows).getAllByRole('listitem')).toHaveLength(side.edges.length);
        side.edges.forEach((edge, index) => {
          const arrow = within(arrows).getAllByRole('listitem')[index];
          const source = side.nodes.find(node => node.id === edge.from).title;
          const target = side.nodes.find(node => node.id === edge.to).title;
          expect(arrow).toHaveTextContent(`From ${source}`);
          expect(arrow).toHaveTextContent(edge.label);
          expect(arrow).toHaveTextContent(`To ${target}`);
        });
      } else expect(within(sideSection).getByText('No arrows in this view.')).toBeVisible();
    }
    for (const path of principle.sourcePaths) expect(within(section).getByText(path, { exact: true })).toBeVisible();
  }
  for (const note of expectedModel.notes) expect([...text.querySelectorAll('.solid-notes li')].some(element => element.textContent === note)).toBe(true);
}

describe('SOLID before and after pictures', () => {
  it('starts with a native collapsed disclosure, retains all text in the DOM and leaves focus on the summary', () => {
    render(<SolidPrinciplesDiagram model={model} />);
    const text = transcript();
    expect(within(text).getByRole('heading', { name: 'Complete text explanation — all five principles', level: 3 })).toBeVisible();
    const summary = within(text).getByText('Read all five principles as text', { selector: 'summary' });
    const details = summary.parentElement;
    expect(details.tagName).toBe('DETAILS');
    expect(details).not.toHaveAttribute('open');
    for (const principle of model.principles) {
      expect(within(text).getByText(principle.question, { exact: true })).toBeInTheDocument();
      expect(within(text).getByText(principle.question, { exact: true })).not.toBeVisible();
    }
    for (const note of model.notes) expect(text).toHaveTextContent(note.replace(/\s+/g, ' ').trim());
    summary.focus();
    fireEvent.click(summary);
    expect(summary).toHaveFocus();
    assertCompleteTranscript();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dip' } });
    expect(details).toHaveAttribute('open');
    expect(summary).toHaveFocus();
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveFocus();
    expect(within(text).getByText(model.principles[0].question, { exact: true })).not.toBeVisible();
    expect(text.querySelectorAll('.solid-transcript-principle')).toHaveLength(5);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ocp' } });
    expect(details).not.toHaveAttribute('open');
    expect(text.querySelectorAll('.solid-transcript-principle')).toHaveLength(5);
  });

  it('renders all ten views from the shared canonical model with its specific arrow relations', () => {
    render(<SolidPrinciplesDiagram model={authoredModel} />);
    expect(authoredModel.principles.map(principle => principle.id)).toEqual(['srp', 'ocp', 'lsp', 'isp', 'dip']);
    expect(screen.getByRole('heading', { name: authoredModel.title, level: 2 })).toBeVisible();
    expect(screen.getByText(authoredModel.summary)).toBeVisible();
    for (const principle of authoredModel.principles) {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: principle.id } });
      for (const [index, side] of [principle.before, principle.after].entries()) {
        const picture = screen.getAllByRole('figure')[index];
        expect(picture).toHaveAccessibleDescription(side.caption);
        expect(picture.querySelectorAll('.solid-node')).toHaveLength(side.nodes.length);
        const arrows = picture.querySelectorAll('.solid-arrows > li');
        expect(arrows).toHaveLength(side.edges.length);
        side.edges.forEach((edge, edgeIndex) => {
          expect(arrows[edgeIndex]).toHaveTextContent(`From ${side.nodes.find(node => node.id === edge.from).title}`);
          expect(arrows[edgeIndex]).toHaveTextContent(edge.label);
          expect(arrows[edgeIndex]).toHaveTextContent(`To ${side.nodes.find(node => node.id === edge.to).title}`);
        });
      }
    }
    assertCompleteTranscript(authoredModel);
  });

  it('switches all five comparisons with a native labelled selector and retains focus and the complete transcript', () => {
    render(<SolidPrinciplesDiagram model={model} />);
    const selector = screen.getByRole('combobox', { name: 'SOLID principle' });
    expect(selector.tagName).toBe('SELECT');
    expect(within(selector).getAllByRole('option').map(option => option.value)).toEqual(['srp', 'ocp', 'lsp', 'isp', 'dip']);
    expect(selector).toHaveAccessibleDescription(/complete text explanation.*all five principles/);
    assertCompleteTranscript();
    selector.focus();
    for (const principle of model.principles) {
      fireEvent.change(selector, { target: { value: principle.id } });
      expect(selector).toHaveFocus();
      expect(selector).toHaveValue(principle.id);
      const selection = screen.getByRole('heading', { name: principle.name, level: 3 }).parentElement;
      expect(selection).toHaveClass('solid-selected');
      expect(screen.getByRole('status')).toHaveTextContent(`Showing ${principle.name}: before and after.`);
      const pictures = screen.getAllByRole('figure');
      expect(pictures).toHaveLength(2);
      for (const [index, stage] of ['Before', 'After'].entries()) {
        const side = principle[stage.toLowerCase()];
        expect(pictures[index]).toHaveAccessibleName(new RegExp(`${stage}.*${side.title}.*${principle.name} responsibility diagram`));
        expect(pictures[index]).toHaveAccessibleDescription(side.caption);
        expect(within(pictures[index]).getByRole('heading', { level: 4 })).toBeVisible();
        expect(pictures[index].querySelectorAll('.solid-node')).toHaveLength(side.nodes.length);
        const arrows = within(pictures[index]).getByRole('list', { name: 'Connections' });
        side.edges.forEach((edge, edgeIndex) => {
          const arrow = within(arrows).getAllByRole('listitem')[edgeIndex];
          expect(arrow).toHaveTextContent(`From ${side.nodes.find(node => node.id === edge.from).title}`);
          expect(arrow).toHaveTextContent(edge.label);
          expect(arrow).toHaveTextContent(`To ${side.nodes.find(node => node.id === edge.to).title}`);
          expect(arrow.querySelector('.solid-arrow')).toHaveAttribute('aria-hidden', 'true');
        });
      }
      assertCompleteTranscript();
    }
  });

  it('uses h2, h3, h4 and h5 in order and explains the conceptual reading limits', () => {
    render(<SolidPrinciplesDiagram model={model} />);
    assertCompleteTranscript();
    expect(screen.getByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    const levels = screen.getAllByRole('heading').map(heading => Number(heading.tagName.slice(1)));
    levels.forEach((level, index) => { if (index) expect(level).toBeLessThanOrEqual(levels[index - 1] + 1); });
    expect(screen.getByText(/conceptual responsibility and contract views, not UML diagrams, object snapshots or execution/)).toBeVisible();
    expect(screen.getByText(/their position does not establish call order/)).toBeVisible();
  });

  it('preserves significant whitespace in diagram lines and the full text alternative', () => {
    render(<SolidPrinciplesDiagram model={model} />);
    const before = screen.getAllByRole('figure')[0];
    expect(before.querySelector('.solid-node-lines').textContent).toBe('requests the capability\n  keep  spacing  ');
    expect(before.querySelectorAll('.solid-node-lines')[1].textContent).toBe('owns several decisions\n\tvalue = "  saved  ";');
    assertCompleteTranscript();
  });

  it('resets to the replacement model’s first principle even when IDs are reused and the original returns', () => {
    const { rerender } = render(<SolidPrinciplesDiagram model={model} />);
    const selector = screen.getByRole('combobox');
    selector.focus();
    fireEvent.change(selector, { target: { value: 'dip' } });
    const replacement = structuredClone(model);
    replacement.title = 'Second lesson responsibility pictures';
    replacement.principles.reverse();
    replacement.principles[0].before.nodes[0].title = 'Replacement caller';
    replacement.notes = ['Second lesson reading note.'];
    rerender(<SolidPrinciplesDiagram model={replacement} />);
    expect(selector).toHaveValue('dip');
    expect(selector).toHaveFocus();
    expect(screen.getByRole('heading', { name: replacement.title, level: 2 })).toBeVisible();
    expect(screen.getAllByRole('figure')[0]).toHaveTextContent('Replacement caller');
    expect(transcript()).toHaveTextContent('Second lesson reading note.');
    expect(transcript()).not.toHaveTextContent(model.notes[0]);
    fireEvent.change(selector, { target: { value: 'isp' } });
    rerender(<SolidPrinciplesDiagram model={model} />);
    expect(selector).toHaveValue('srp');
    expect(selector).toHaveFocus();
    expect(screen.queryByText('Replacement caller')).not.toBeInTheDocument();
    assertCompleteTranscript();
  });

  it('handles an explicitly disconnected view without fabricating a connection', () => {
    const disconnected = structuredClone(model);
    disconnected.principles[0].before.edges = [];
    disconnected.principles[0].before.nodes[0].lines = [];
    render(<SolidPrinciplesDiagram model={disconnected} />);
    const before = screen.getAllByRole('figure')[0];
    expect(within(before).getByText('No arrows in this view.')).toBeVisible();
    expect(within(before).queryByRole('list', { name: 'Connections' })).not.toBeInTheDocument();
    expect(before.querySelectorAll('.solid-node')).toHaveLength(2);
  });

  it('keeps generated labels unique for multiple instances', () => {
    const { container } = render(<><SolidPrinciplesDiagram model={model} /><SolidPrinciplesDiagram model={model} /></>);
    const ids = [...container.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const element of container.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
      for (const attribute of ['aria-labelledby', 'aria-describedby']) {
        for (const id of (element.getAttribute(attribute) || '').split(' ').filter(Boolean)) expect(document.getElementById(id)).not.toBeNull();
      }
    }
  });

  it('does not change page focus, storage, URL, theme, title or scroll styles on mount, selection and unmount', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const clear = vi.spyOn(Storage.prototype, 'clear');
    const fetch = vi.spyOn(globalThis, 'fetch');
    const bodyStyle = document.body.style.cssText;
    const rootStyle = document.documentElement.style.cssText;
    const theme = document.documentElement.getAttribute('data-theme');
    const title = document.title, href = window.location.href;
    const external = document.createElement('button');
    document.body.append(external);
    try {
      external.focus();
      const { unmount } = render(<SolidPrinciplesDiagram model={model} />);
      expect(external).toHaveFocus();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lsp' } });
      expect(external).toHaveFocus();
      unmount();
      expect(external).toHaveFocus();
      expect(document.body.style.cssText).toBe(bodyStyle);
      expect(document.documentElement.style.cssText).toBe(rootStyle);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      expect(document.title).toBe(title);
      expect(window.location.href).toBe(href);
      for (const spy of [setItem, removeItem, clear, fetch]) expect(spy).not.toHaveBeenCalled();
    } finally { external.remove(); }
  });

  it('registers the requested label and lazily renders through the existing lesson registry', async () => {
    expect(lessonDiagramLabel('principles')).toBe('SOLID before and after');
    expect(LESSON_DIAGRAM_KINDS.principles.load).toBeTypeOf('function');
    render(<Suspense fallback={<p>Loading picture</p>}><LessonDiagram model={model} /></Suspense>);
    expect(await screen.findByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'SOLID principle' })).toHaveValue('srp');
  });
});
